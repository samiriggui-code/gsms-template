package meetings

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	werrors "github.com/Tencent/WeKnora/internal/errors"
	"github.com/Tencent/WeKnora/internal/logger"
	"github.com/Tencent/WeKnora/internal/types"
	"github.com/Tencent/WeKnora/internal/types/interfaces"
	"github.com/Tencent/WeKnora/internal/utils"
	"github.com/hibiken/asynq"
	"github.com/robfig/cron/v3"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
)

const (
	// IngestionChannel is stored on knowledge rows created by this connector.
	IngestionChannel = "meetings"
	// initialPullWindow is how far back the first import looks. Google Meet
	// deletes transcript entries after 30 days, Teams meetings expire after 60.
	initialPullWindow = 30 * 24 * time.Hour
	// pullOverlap re-scans recent meetings whose transcript was not ready yet.
	pullOverlap      = 48 * time.Hour
	oauthStateTTL    = 15 * time.Minute
	autoSyncSchedule = "@hourly"
)

// errReconnect means the platform rejected the stored grant: the admin must reconnect.
var errReconnect = errors.New("meeting platform rejected the connection")

// Service implements interfaces.MeetingsService.
type Service struct {
	providers        []Provider
	knowledgeService interfaces.KnowledgeService
	kbService        interfaces.KnowledgeBaseService
	taskEnqueuer     interfaces.TaskEnqueuer
	repo             *repository
	now              func() time.Time
	// httpClient is used for token exchange and API calls; tests replace it.
	httpClient *http.Client

	mu   sync.Mutex
	cron *cron.Cron
}

// NewService constructs the meetings connector with Teams, Zoom and Google Meet.
func NewService(
	db *gorm.DB,
	knowledgeService interfaces.KnowledgeService,
	kbService interfaces.KnowledgeBaseService,
	taskEnqueuer interfaces.TaskEnqueuer,
) interfaces.MeetingsService {
	return &Service{
		providers:        DefaultProviders(),
		knowledgeService: knowledgeService,
		kbService:        kbService,
		taskEnqueuer:     taskEnqueuer,
		repo:             newRepository(db),
		now:              func() time.Time { return time.Now().UTC() },
		httpClient:       &http.Client{Timeout: 60 * time.Second},
	}
}

func (s *Service) provider(id string) (Provider, error) {
	for _, p := range s.providers {
		if p.ID() == id {
			return p, nil
		}
	}
	return nil, werrors.NewNotFoundError("unknown meeting platform")
}

// appFor returns the OAuth app saved on the connection, or the server-wide
// one from the environment when the admin did not enter one.
func appFor(p Provider, conn *types.MeetingConnection) AppCredentials {
	if conn != nil && strings.TrimSpace(conn.ClientID) != "" {
		return AppCredentials{ClientID: conn.ClientID, ClientSecret: conn.ClientSecret, Tenant: conn.AppTenant}
	}
	return p.EnvCredentials()
}

var errAppMissing = werrors.NewBadRequestError("enter the application client ID and secret first")

func requireTenant(ctx context.Context) (uint64, error) {
	tenantID, ok := types.TenantIDFromContext(ctx)
	if !ok || tenantID == 0 {
		return 0, werrors.NewUnauthorizedError("tenant required")
	}
	return tenantID, nil
}

// Status lists every platform with its configuration and connection state.
func (s *Service) Status(ctx context.Context, requestBase string) types.MeetingsStatus {
	st := types.MeetingsStatus{EncryptionActive: utils.GetAESKey() != nil, RedirectURL: RedirectURL(requestBase)}
	tenantID, _ := types.TenantIDFromContext(ctx)
	conns := map[string]types.MeetingConnection{}
	if tenantID != 0 {
		rows, err := s.repo.listConnections(ctx, tenantID)
		if err != nil {
			logger.Warnf(ctx, "meetings: list connections: %v", err)
		}
		for _, c := range rows {
			conns[c.Provider] = c
		}
	}
	for _, p := range s.providers {
		ps := types.MeetingProviderStatus{Provider: p.ID(), Configured: appFor(p, nil).Complete()}
		if c, ok := conns[p.ID()]; ok {
			ps = s.providerStatus(ctx, p, &c)
		}
		st.Providers = append(st.Providers, ps)
	}
	return st
}

func (s *Service) providerStatus(ctx context.Context, p Provider, c *types.MeetingConnection) types.MeetingProviderStatus {
	ps := types.MeetingProviderStatus{
		Provider:         p.ID(),
		Added:            true,
		Configured:       appFor(p, c).Complete(),
		ClientID:         c.ClientID,
		SecretConfigured: c.ClientSecret != "",
		AppTenant:        c.AppTenant,
		Connected:        c.Connected(),
		AccountLabel:     c.AccountLabel,
		KnowledgeBaseID:  c.KnowledgeBaseID,
		AutoSync:         c.AutoSync,
		Publish:          c.Publish,
		LastSyncedAt:     c.LastSyncedAt,
		LastSyncError:    c.LastSyncError,
	}
	if n, err := s.repo.countImported(ctx, c.TenantID, p.ID()); err == nil {
		ps.ImportedCount = n
	}
	return ps
}

// SaveApp stores the OAuth app the admin registered with the platform. An
// empty secret keeps the stored one; a new client id drops the old grant.
func (s *Service) SaveApp(
	ctx context.Context,
	providerID string,
	req *types.MeetingAppRequest,
) (types.MeetingProviderStatus, error) {
	tenantID, err := requireTenant(ctx)
	if err != nil {
		return types.MeetingProviderStatus{}, err
	}
	p, err := s.provider(providerID)
	if err != nil {
		return types.MeetingProviderStatus{}, err
	}
	clientID := strings.TrimSpace(req.ClientID)
	if clientID == "" {
		return types.MeetingProviderStatus{}, werrors.NewBadRequestError("client ID required")
	}
	conn, err := s.repo.getConnection(ctx, tenantID, providerID)
	if err != nil {
		return types.MeetingProviderStatus{}, err
	}
	if conn == nil {
		conn = &types.MeetingConnection{TenantID: tenantID, Provider: providerID}
	}
	if conn.ClientID != "" && conn.ClientID != clientID {
		conn.AccessToken, conn.RefreshToken, conn.TokenExpiry = "", "", nil
		conn.AccountID, conn.AccountLabel = "", ""
	}
	conn.ClientID = clientID
	if secret := strings.TrimSpace(req.ClientSecret); secret != "" {
		conn.ClientSecret = secret
	}
	if conn.ClientSecret == "" {
		return types.MeetingProviderStatus{}, werrors.NewBadRequestError("client secret required")
	}
	conn.AppTenant = strings.TrimSpace(req.AppTenant)
	if err := s.repo.saveConnection(ctx, conn); err != nil {
		return types.MeetingProviderStatus{}, err
	}
	return s.providerStatus(ctx, p, conn), nil
}

// StartAuth stores a single-use state and returns the platform consent URL.
func (s *Service) StartAuth(ctx context.Context, providerID, requestBase string) (*types.MeetingAuthStart, error) {
	tenantID, err := requireTenant(ctx)
	if err != nil {
		return nil, err
	}
	p, err := s.provider(providerID)
	if err != nil {
		return nil, err
	}
	conn, err := s.repo.getConnection(ctx, tenantID, providerID)
	if err != nil {
		return nil, err
	}
	if !appFor(p, conn).Complete() {
		return nil, errAppMissing
	}
	if conn == nil {
		conn = &types.MeetingConnection{TenantID: tenantID, Provider: providerID}
	}
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return nil, err
	}
	conn.OAuthState = hex.EncodeToString(raw)
	expires := s.now().Add(oauthStateTTL)
	conn.OAuthStateExpiresAt = &expires
	if err := s.repo.saveConnection(ctx, conn); err != nil {
		return nil, err
	}
	cfg := p.OAuthConfig(appFor(p, conn), RedirectURL(requestBase))
	return &types.MeetingAuthStart{AuthURL: cfg.AuthCodeURL(conn.OAuthState, p.AuthCodeOptions()...)}, nil
}

// CompleteAuth exchanges the authorization code of the callback carrying state.
func (s *Service) CompleteAuth(ctx context.Context, state, code, requestBase string) (string, error) {
	if state == "" || code == "" {
		return "", werrors.NewBadRequestError("missing state or code")
	}
	conn, err := s.repo.getByState(ctx, state)
	if err != nil {
		return "", err
	}
	if conn == nil || conn.OAuthStateExpiresAt == nil || s.now().After(*conn.OAuthStateExpiresAt) {
		return "", werrors.NewBadRequestError("authorization expired, start again")
	}
	// The state is single-use whatever happens next.
	conn.OAuthState = ""
	conn.OAuthStateExpiresAt = nil
	if err := s.repo.saveConnection(ctx, conn); err != nil {
		return "", err
	}
	p, err := s.provider(conn.Provider)
	if err != nil {
		return conn.Provider, err
	}
	app := appFor(p, conn)
	if !app.Complete() {
		return conn.Provider, errAppMissing
	}
	octx := context.WithValue(ctx, oauth2.HTTPClient, s.httpClient)
	cfg := p.OAuthConfig(app, RedirectURL(requestBase))
	tok, err := cfg.Exchange(octx, code)
	if err != nil {
		logger.Warnf(ctx, "meetings: %s code exchange: %v", conn.Provider, err)
		return conn.Provider, werrors.NewBadRequestError("the platform refused the authorization")
	}
	if tok.RefreshToken == "" {
		return conn.Provider, werrors.NewBadRequestError("the platform did not grant offline access")
	}
	acct, err := p.Account(octx, cfg.Client(octx, tok))
	if err != nil {
		logger.Warnf(ctx, "meetings: %s account lookup: %v", conn.Provider, err)
		return conn.Provider, werrors.NewBadRequestError("could not read the connected account")
	}
	applyToken(conn, tok)
	conn.AccountID = acct.ID
	conn.AccountLabel = acct.Label
	conn.LastSyncError = ""
	return conn.Provider, s.repo.saveConnection(ctx, conn)
}

func applyToken(conn *types.MeetingConnection, tok *oauth2.Token) {
	conn.AccessToken = tok.AccessToken
	if tok.RefreshToken != "" {
		conn.RefreshToken = tok.RefreshToken
	}
	if tok.Expiry.IsZero() {
		conn.TokenExpiry = nil
	} else {
		exp := tok.Expiry.UTC()
		conn.TokenExpiry = &exp
	}
}

// Disconnect deletes the tenant's connection to provider (app, tokens and
// settings). Imported knowledge is kept.
func (s *Service) Disconnect(ctx context.Context, providerID string) error {
	tenantID, err := requireTenant(ctx)
	if err != nil {
		return err
	}
	if _, err := s.provider(providerID); err != nil {
		return err
	}
	return s.repo.deleteConnection(ctx, tenantID, providerID)
}

// UpdateSettings sets the target knowledge base and the automatic import options.
func (s *Service) UpdateSettings(
	ctx context.Context,
	providerID string,
	req *types.MeetingSettingsRequest,
) (types.MeetingProviderStatus, error) {
	tenantID, err := requireTenant(ctx)
	if err != nil {
		return types.MeetingProviderStatus{}, err
	}
	p, err := s.provider(providerID)
	if err != nil {
		return types.MeetingProviderStatus{}, err
	}
	conn, err := s.repo.getConnection(ctx, tenantID, providerID)
	if err != nil {
		return types.MeetingProviderStatus{}, err
	}
	if !conn.Connected() {
		return types.MeetingProviderStatus{}, werrors.NewBadRequestError("connect an account first")
	}
	kbID := strings.TrimSpace(req.KnowledgeBaseID)
	if kbID != "" {
		if _, err := s.kbService.GetKnowledgeBaseByID(ctx, kbID); err != nil {
			return types.MeetingProviderStatus{}, err
		}
	} else if req.AutoSync {
		return types.MeetingProviderStatus{}, werrors.NewBadRequestError("choose a knowledge base before enabling automatic import")
	}
	conn.KnowledgeBaseID = kbID
	conn.AutoSync = req.AutoSync
	conn.Publish = req.Publish
	if err := s.repo.saveConnection(ctx, conn); err != nil {
		return types.MeetingProviderStatus{}, err
	}
	return s.providerStatus(ctx, p, conn), nil
}

// EnqueuePull queues an immediate import for the caller's tenant.
func (s *Service) EnqueuePull(ctx context.Context, providerID string) (*types.MeetingPullResult, error) {
	tenantID, err := requireTenant(ctx)
	if err != nil {
		return nil, err
	}
	p, err := s.provider(providerID)
	if err != nil {
		return nil, err
	}
	conn, err := s.repo.getConnection(ctx, tenantID, providerID)
	if err != nil {
		return nil, err
	}
	if !appFor(p, conn).Complete() {
		return nil, errAppMissing
	}
	if !conn.Connected() || conn.KnowledgeBaseID == "" {
		return nil, werrors.NewBadRequestError("connect an account and choose a knowledge base first")
	}
	info, err := s.enqueuePull(tenantID, providerID, types.TaskInitiatorFromContext(ctx), "")
	if err != nil {
		return nil, err
	}
	return &types.MeetingPullResult{TaskID: info.ID}, nil
}

func (s *Service) enqueuePull(tenantID uint64, providerID string, initiator types.TaskInitiator, taskID string) (*asynq.TaskInfo, error) {
	raw, err := json.Marshal(&types.MeetingPullPayload{TenantID: tenantID, Provider: providerID, Initiator: initiator})
	if err != nil {
		return nil, err
	}
	opts := []asynq.Option{asynq.Queue(types.QueueSync), asynq.MaxRetry(3), asynq.Timeout(time.Hour)}
	if taskID != "" {
		opts = append(opts, asynq.TaskID(taskID))
	}
	return s.taskEnqueuer.Enqueue(asynq.NewTask(types.TypeMeetingsPull, raw), opts...)
}

// ProcessPull is the asynq handler: it imports new transcripts of one platform
// account into the configured knowledge base.
func (s *Service) ProcessPull(ctx context.Context, t *asynq.Task) error {
	var payload types.MeetingPullPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return err
	}
	if payload.TenantID == 0 || payload.Provider == "" {
		return fmt.Errorf("invalid meetings pull payload")
	}
	ctx = payload.Initiator.Apply(ctx)
	ctx = context.WithValue(ctx, types.TenantIDContextKey, payload.TenantID)

	p, err := s.provider(payload.Provider)
	if err != nil {
		return nil
	}
	conn, err := s.repo.getConnection(ctx, payload.TenantID, payload.Provider)
	if err != nil {
		return err
	}
	if !appFor(p, conn).Complete() || !conn.Connected() || conn.KnowledgeBaseID == "" {
		logger.Infof(ctx, "meetings: pull skipped, tenant %d has no %s account or KB", payload.TenantID, payload.Provider)
		return nil
	}
	runStart := s.now()
	imported, pullErr := s.pull(ctx, p, conn)
	if errors.Is(pullErr, errReconnect) {
		// Retrying cannot help: the admin has to reconnect.
		conn.LastSyncError = "La plateforme a refusé la connexion : reconnectez le compte."
		return s.repo.saveConnection(ctx, conn)
	}
	if pullErr != nil {
		conn.LastSyncError = pullErr.Error()
		if err := s.repo.saveConnection(ctx, conn); err != nil {
			logger.Warnf(ctx, "meetings: save sync error: %v", err)
		}
		return pullErr
	}
	conn.LastSyncedAt = &runStart
	conn.LastSyncError = ""
	logger.Infof(ctx, "meetings: tenant %d imported %d %s transcript(s)", payload.TenantID, imported, payload.Provider)
	return s.repo.saveConnection(ctx, conn)
}

// tokenSaver persists refreshed tokens: platforms rotate refresh tokens on every refresh.
type tokenSaver struct {
	base oauth2.TokenSource
	save func(*oauth2.Token)
	mu   sync.Mutex
	last string
}

func (ts *tokenSaver) Token() (*oauth2.Token, error) {
	tok, err := ts.base.Token()
	if err != nil {
		return nil, err
	}
	ts.mu.Lock()
	defer ts.mu.Unlock()
	if tok.AccessToken != ts.last {
		ts.last = tok.AccessToken
		ts.save(tok)
	}
	return tok, nil
}

func (s *Service) pull(ctx context.Context, p Provider, conn *types.MeetingConnection) (int, error) {
	octx := context.WithValue(ctx, oauth2.HTTPClient, s.httpClient)
	tok := &oauth2.Token{AccessToken: conn.AccessToken, RefreshToken: conn.RefreshToken}
	if conn.TokenExpiry != nil {
		tok.Expiry = *conn.TokenExpiry
	}
	var saveErr error
	saver := &tokenSaver{
		base: p.OAuthConfig(appFor(p, conn), "").TokenSource(octx, tok),
		last: conn.AccessToken,
		save: func(t *oauth2.Token) {
			applyToken(conn, t)
			saveErr = s.repo.saveConnection(ctx, conn)
		},
	}
	hc := oauth2.NewClient(octx, saver)
	acct := Account{ID: conn.AccountID, Label: conn.AccountLabel}

	to := s.now()
	from := to.Add(-initialPullWindow)
	if conn.LastSyncedAt != nil {
		from = conn.LastSyncedAt.Add(-pullOverlap)
	}
	recs, err := p.ListRecordings(ctx, hc, acct, from, to)
	if err != nil {
		return 0, classify(err)
	}
	status := types.ManualKnowledgeStatusDraft
	if conn.Publish {
		status = types.ManualKnowledgeStatusPublish
	}
	imported := 0
	for _, rec := range recs {
		ok, err := s.importRecording(ctx, p, hc, acct, conn, rec, status)
		if err != nil {
			return imported, classify(err)
		}
		if ok {
			imported++
		}
	}
	return imported, saveErr
}

// classify maps a revoked grant (refresh refused, 401) to errReconnect.
func classify(err error) error {
	var rErr *oauth2.RetrieveError
	if errors.As(err, &rErr) {
		return errReconnect
	}
	var apiErr *apiError
	if errors.As(err, &apiErr) && apiErr.Status == http.StatusUnauthorized {
		return errReconnect
	}
	return err
}

// importRecording writes one transcript unless it was already imported or is
// not ready yet. It reports whether a knowledge entry was created.
func (s *Service) importRecording(
	ctx context.Context,
	p Provider,
	hc *http.Client,
	acct Account,
	conn *types.MeetingConnection,
	rec Recording,
	status string,
) (bool, error) {
	done, err := s.repo.isImported(ctx, conn.TenantID, p.ID(), rec.ExternalID)
	if err != nil || done {
		return false, err
	}
	text, err := p.Transcript(ctx, hc, acct, rec)
	if err != nil {
		if errors.Is(classify(err), errReconnect) {
			return false, err
		}
		// Not ready or not accessible yet: the next pull retries it inside the overlap window.
		logger.Infof(ctx, "meetings: %s transcript %s not imported yet: %v", p.ID(), rec.ExternalID, err)
		return false, nil
	}
	if strings.TrimSpace(text) == "" {
		return false, nil
	}
	knowledge, err := s.knowledgeService.CreateKnowledgeFromManual(ctx, conn.KnowledgeBaseID, &types.ManualKnowledgePayload{
		Title: documentTitle(p.ID(), rec), Content: documentMarkdown(p.ID(), rec, text), Status: status,
	}, IngestionChannel)
	if err != nil {
		return false, err
	}
	imp := &types.MeetingImport{
		TenantID:        conn.TenantID,
		Provider:        p.ID(),
		ExternalID:      rec.ExternalID,
		MeetingID:       rec.MeetingID,
		KnowledgeBaseID: conn.KnowledgeBaseID,
	}
	if knowledge != nil {
		imp.KnowledgeID = knowledge.ID
	}
	return true, s.repo.markImported(ctx, imp)
}

var providerNames = map[string]string{"teams": "Microsoft Teams", "zoom": "Zoom", "google_meet": "Google Meet"}

func documentTitle(provider string, rec Recording) string {
	title := strings.TrimSpace(rec.Title)
	if title == "" {
		title = providerNames[provider]
	}
	if rec.StartedAt != nil {
		title += " — " + rec.StartedAt.Format("2006-01-02")
	}
	return title
}

func documentMarkdown(provider string, rec Recording, transcript string) string {
	var b strings.Builder
	b.WriteString("_Source : ")
	b.WriteString(providerNames[provider])
	if rec.StartedAt != nil {
		b.WriteString(" · ")
		b.WriteString(rec.StartedAt.Format("2006-01-02 15:04 MST"))
	}
	b.WriteString("_\n\n## Transcription\n\n")
	b.WriteString(transcript)
	return b.String()
}

// StartScheduler enqueues an hourly import for every connection with automatic import on.
func (s *Service) StartScheduler(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.cron != nil {
		return nil
	}
	c := cron.New(cron.WithChain(cron.Recover(cron.DefaultLogger)))
	if _, err := c.AddFunc(autoSyncSchedule, func() { s.enqueueAutoSync(context.Background()) }); err != nil {
		return err
	}
	c.Start()
	s.cron = c
	logger.Infof(ctx, "meetings: auto-import scheduler started (%s)", autoSyncSchedule)
	return nil
}

// StopScheduler stops the scheduler, waiting at most timeout for a running job.
func (s *Service) StopScheduler(timeout time.Duration) {
	s.mu.Lock()
	c := s.cron
	s.cron = nil
	s.mu.Unlock()
	if c == nil {
		return
	}
	select {
	case <-c.Stop().Done():
	case <-time.After(timeout):
	}
}

func (s *Service) enqueueAutoSync(ctx context.Context) {
	targets, err := s.repo.autoSyncTargets(ctx)
	if err != nil {
		logger.Warnf(ctx, "meetings: list auto-import targets: %v", err)
		return
	}
	slot := s.now().Truncate(time.Hour).Format("2006010215")
	for _, t := range targets {
		// Deterministic task id: several app instances enqueue each hour only once.
		id := fmt.Sprintf("meetings:%d:%s:%s", t.TenantID, t.Provider, slot)
		if _, err := s.enqueuePull(t.TenantID, t.Provider, types.TaskInitiator{}, id); err != nil &&
			!errors.Is(err, asynq.ErrTaskIDConflict) {
			logger.Warnf(ctx, "meetings: enqueue auto import for tenant %d %s: %v", t.TenantID, t.Provider, err)
		}
	}
}
