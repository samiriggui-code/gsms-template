package meetings

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	werrors "github.com/Tencent/WeKnora/internal/errors"
	"github.com/Tencent/WeKnora/internal/types"
	"github.com/Tencent/WeKnora/internal/types/interfaces"
	"github.com/hibiken/asynq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/oauth2"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestVTTTeamsVoiceTags(t *testing.T) {
	vtt := "WEBVTT\n\n00:00:16.246 --> 00:00:17.726\n<v Alice Martin>Bonjour à tous.</v>\n\n" +
		"00:00:18.000 --> 00:00:19.000\n<v Alice Martin>On commence.</v>\n\n" +
		"00:00:20.000 --> 00:00:21.000\n<v Bob>Ok.</v>\n"
	assert.Equal(t, "**Alice Martin** : Bonjour à tous. On commence.\n\n**Bob** : Ok.", vttToMarkdown(vtt))
}

func TestVTTZoomSpeakerLines(t *testing.T) {
	vtt := "WEBVTT\r\n\r\n1\r\n00:00:01.000 --> 00:00:02.000\r\nAlice: Budget validé.\r\n\r\n" +
		"2\r\n00:00:03.000 --> 00:00:04.000\r\nSans locuteur, phrase. Suite: ici\r\n"
	assert.Equal(t, "**Alice** : Budget validé.\n\nSans locuteur, phrase. Suite: ici", vttToMarkdown(vtt))
}

func TestZoomListsCompletedTranscriptsOnly(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		assert.Equal(t, "/users/me/recordings", r.URL.Path)
		_ = json.NewEncoder(w).Encode(map[string]any{"meetings": []map[string]any{{
			"uuid": "u1", "topic": "Comité", "start_time": "2026-10-20T09:00:00Z",
			"recording_files": []map[string]any{
				{"id": "mp4", "file_type": "MP4", "status": "completed", "download_url": "x"},
				{"id": "tr1", "file_type": "TRANSCRIPT", "status": "completed", "download_url": "https://zoom/dl"},
				{"id": "tr2", "file_type": "TRANSCRIPT", "status": "processing", "download_url": "y"},
			},
		}}})
	}))
	defer srv.Close()
	z := newZoom()
	z.apiBase = srv.URL
	until := time.Date(2026, 10, 31, 0, 0, 0, 0, time.UTC)
	recs, err := z.ListRecordings(context.Background(), srv.Client(), Account{}, until.Add(-45*24*time.Hour), until)
	require.NoError(t, err)
	assert.Equal(t, int32(2), calls.Load(), "a 45-day range is split into two windows of at most 30 days")
	require.Len(t, recs, 2, "one transcript per window response")
	assert.Equal(t, "tr1", recs[0].ExternalID)
	assert.Equal(t, "Comité", recs[0].Title)
}

func TestRedirectURL(t *testing.T) {
	t.Setenv(publicURLEnv, "")
	assert.Equal(t, "http://localhost:5173"+CallbackPath, RedirectURL("http://localhost:5173"))
	t.Setenv(publicURLEnv, "https://app.example.com/")
	assert.Equal(t, "https://app.example.com"+CallbackPath, RedirectURL("http://ignored"))
}

// fakeProvider is a platform backed by an httptest OAuth token endpoint.
type fakeProvider struct {
	tokenURL   string
	recordings []Recording
	texts      map[string]string
	listErr    error
}

func (f *fakeProvider) ID() string       { return "zoom" }
func (f *fakeProvider) Configured() bool { return true }
func (f *fakeProvider) OAuthConfig(redirect string) *oauth2.Config {
	return &oauth2.Config{
		ClientID: "id", ClientSecret: "secret", RedirectURL: redirect,
		Endpoint: oauth2.Endpoint{AuthURL: "https://platform.example/authorize", TokenURL: f.tokenURL, AuthStyle: oauth2.AuthStyleInParams},
	}
}
func (f *fakeProvider) AuthCodeOptions() []oauth2.AuthCodeOption { return nil }
func (f *fakeProvider) Account(ctx context.Context, hc *http.Client) (Account, error) {
	return Account{ID: "acct-1", Label: "alice@example.com"}, nil
}
func (f *fakeProvider) ListRecordings(ctx context.Context, hc *http.Client, _ Account, since, until time.Time) ([]Recording, error) {
	// Force a real request so the token source refreshes when needed.
	if _, err := hc.Get(f.tokenURL + "/ping"); err != nil {
		return nil, err
	}
	return f.recordings, f.listErr
}
func (f *fakeProvider) Transcript(ctx context.Context, hc *http.Client, _ Account, rec Recording) (string, error) {
	return f.texts[rec.ExternalID], nil
}

type fakeKnowledge struct {
	interfaces.KnowledgeService
	created []*types.ManualKnowledgePayload
}

func (f *fakeKnowledge) CreateKnowledgeFromManual(
	ctx context.Context, kbID string, p *types.ManualKnowledgePayload, channel string,
) (*types.Knowledge, error) {
	f.created = append(f.created, p)
	return &types.Knowledge{ID: "k" + p.Title}, nil
}

type fakeKBs struct {
	interfaces.KnowledgeBaseService
}

func (fakeKBs) GetKnowledgeBaseByID(_ context.Context, id string) (*types.KnowledgeBase, error) {
	if id != "kb1" {
		return nil, werrors.NewNotFoundError("knowledge base not found")
	}
	return &types.KnowledgeBase{ID: id}, nil
}

type recordingEnqueuer struct{ tasks []*asynq.Task }

func (r *recordingEnqueuer) Enqueue(t *asynq.Task, _ ...asynq.Option) (*asynq.TaskInfo, error) {
	r.tasks = append(r.tasks, t)
	return &asynq.TaskInfo{ID: "task-1"}, nil
}

type tokenServer struct {
	srv       *httptest.Server
	refreshes atomic.Int32
	revoked   atomic.Bool
}

func newTokenServer(t *testing.T) *tokenServer {
	ts := &tokenServer{}
	ts.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/ping" {
			return
		}
		_ = r.ParseForm()
		w.Header().Set("Content-Type", "application/json")
		if ts.revoked.Load() {
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":"invalid_grant"}`))
			return
		}
		switch r.Form.Get("grant_type") {
		case "authorization_code":
			assert.Equal(t, "the-code", r.Form.Get("code"))
			_, _ = w.Write([]byte(`{"access_token":"at1","refresh_token":"rt1","expires_in":3600,"token_type":"Bearer"}`))
		case "refresh_token":
			ts.refreshes.Add(1)
			_, _ = w.Write([]byte(`{"access_token":"at2","refresh_token":"rt2","expires_in":3600,"token_type":"Bearer"}`))
		}
	}))
	t.Cleanup(ts.srv.Close)
	return ts
}

func newTestService(t *testing.T, p *fakeProvider) (*Service, *fakeKnowledge, *recordingEnqueuer) {
	t.Helper()
	t.Setenv("SYSTEM_AES_KEY", "0123456789abcdef0123456789abcdef")
	t.Setenv(publicURLEnv, "")
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&types.MeetingConnection{}, &types.MeetingImport{}))
	kn := &fakeKnowledge{}
	enq := &recordingEnqueuer{}
	svc := &Service{
		providers:        []Provider{p},
		knowledgeService: kn,
		kbService:        fakeKBs{},
		taskEnqueuer:     enq,
		repo:             newRepository(db),
		now:              time.Now().UTC,
		httpClient:       http.DefaultClient,
	}
	return svc, kn, enq
}

func tenantCtx(id uint64) context.Context {
	return context.WithValue(context.Background(), types.TenantIDContextKey, id)
}

func pullTask(t *testing.T, tenantID uint64) *asynq.Task {
	raw, err := json.Marshal(types.MeetingPullPayload{TenantID: tenantID, Provider: "zoom"})
	require.NoError(t, err)
	return asynq.NewTask(types.TypeMeetingsPull, raw)
}

// connect runs StartAuth then CompleteAuth like the browser would.
func connect(t *testing.T, svc *Service, tenantID uint64) {
	t.Helper()
	start, err := svc.StartAuth(tenantCtx(tenantID), "zoom", "http://localhost:5173")
	require.NoError(t, err)
	u, err := url.Parse(start.AuthURL)
	require.NoError(t, err)
	assert.Equal(t, "http://localhost:5173"+CallbackPath, u.Query().Get("redirect_uri"))
	provider, err := svc.CompleteAuth(context.Background(), u.Query().Get("state"), "the-code", "http://localhost:5173")
	require.NoError(t, err)
	assert.Equal(t, "zoom", provider)
}

func TestConnectImportOnceAndRotateTokens(t *testing.T) {
	ts := newTokenServer(t)
	started := time.Date(2026, 10, 30, 9, 0, 0, 0, time.UTC)
	p := &fakeProvider{
		tokenURL: ts.srv.URL,
		recordings: []Recording{
			{ExternalID: "r1", Title: "Comité", StartedAt: &started},
			{ExternalID: "r2", Title: "Pas prêt"},
		},
		texts: map[string]string{"r1": "**Alice** : Budget validé."},
	}
	svc, kn, _ := newTestService(t, p)
	connect(t, svc, 7)

	st := svc.Status(tenantCtx(7), "http://localhost:5173")
	require.Len(t, st.Providers, 1)
	assert.True(t, st.Providers[0].Connected)
	assert.Equal(t, "alice@example.com", st.Providers[0].AccountLabel)
	assert.True(t, st.EncryptionActive)

	_, err := svc.UpdateSettings(tenantCtx(7), "zoom", &types.MeetingSettingsRequest{KnowledgeBaseID: "kb1", AutoSync: true})
	require.NoError(t, err)

	// Expire the access token so the pull must refresh it.
	conn, err := svc.repo.getConnection(context.Background(), 7, "zoom")
	require.NoError(t, err)
	past := time.Now().Add(-time.Hour)
	conn.TokenExpiry = &past
	require.NoError(t, svc.repo.saveConnection(context.Background(), conn))

	require.NoError(t, svc.ProcessPull(context.Background(), pullTask(t, 7)))
	require.Len(t, kn.created, 1, "the transcript that is not ready is skipped")
	assert.Equal(t, "Comité — 2026-10-30", kn.created[0].Title)
	assert.Contains(t, kn.created[0].Content, "Budget validé.")
	assert.Contains(t, kn.created[0].Content, "Source : Zoom")
	assert.Equal(t, int32(1), ts.refreshes.Load())

	conn, err = svc.repo.getConnection(context.Background(), 7, "zoom")
	require.NoError(t, err)
	assert.Equal(t, "rt2", conn.RefreshToken, "the rotated refresh token is persisted")

	var raw struct{ RefreshToken string }
	require.NoError(t, svc.repo.db.Raw("SELECT refresh_token FROM meeting_connections WHERE tenant_id = 7").Scan(&raw).Error)
	assert.True(t, strings.HasPrefix(raw.RefreshToken, "enc:v1:"), "tokens are encrypted at rest")

	require.NoError(t, svc.ProcessPull(context.Background(), pullTask(t, 7)))
	assert.Len(t, kn.created, 1, "no duplicate on the next pull")
	assert.Equal(t, int64(1), svc.Status(tenantCtx(7), "").Providers[0].ImportedCount)
}

func TestRevokedGrantAsksToReconnect(t *testing.T) {
	ts := newTokenServer(t)
	svc, kn, _ := newTestService(t, &fakeProvider{tokenURL: ts.srv.URL, texts: map[string]string{}})
	connect(t, svc, 7)
	_, err := svc.UpdateSettings(tenantCtx(7), "zoom", &types.MeetingSettingsRequest{KnowledgeBaseID: "kb1"})
	require.NoError(t, err)
	conn, _ := svc.repo.getConnection(context.Background(), 7, "zoom")
	past := time.Now().Add(-time.Hour)
	conn.TokenExpiry = &past
	require.NoError(t, svc.repo.saveConnection(context.Background(), conn))
	ts.revoked.Store(true)

	require.NoError(t, svc.ProcessPull(context.Background(), pullTask(t, 7)), "no asynq retry for a revoked grant")
	assert.Empty(t, kn.created)
	assert.Contains(t, svc.Status(tenantCtx(7), "").Providers[0].LastSyncError, "reconnectez")
}

func TestOAuthStateIsSingleUseAndExpires(t *testing.T) {
	ts := newTokenServer(t)
	svc, _, _ := newTestService(t, &fakeProvider{tokenURL: ts.srv.URL})
	start, err := svc.StartAuth(tenantCtx(7), "zoom", "http://localhost")
	require.NoError(t, err)
	u, _ := url.Parse(start.AuthURL)
	state := u.Query().Get("state")

	_, err = svc.CompleteAuth(context.Background(), state, "the-code", "http://localhost")
	require.NoError(t, err)
	_, err = svc.CompleteAuth(context.Background(), state, "the-code", "http://localhost")
	require.Error(t, err, "a state cannot be replayed")

	start, err = svc.StartAuth(tenantCtx(8), "zoom", "http://localhost")
	require.NoError(t, err)
	u, _ = url.Parse(start.AuthURL)
	svc.now = func() time.Time { return time.Now().UTC().Add(time.Hour) }
	_, err = svc.CompleteAuth(context.Background(), u.Query().Get("state"), "the-code", "http://localhost")
	require.Error(t, err, "an expired state is refused")
	assert.False(t, svc.Status(tenantCtx(8), "").Providers[0].Connected)
}

func TestTenantIsolation(t *testing.T) {
	ts := newTokenServer(t)
	svc, kn, _ := newTestService(t, &fakeProvider{tokenURL: ts.srv.URL, texts: map[string]string{}})
	connect(t, svc, 7)

	assert.False(t, svc.Status(tenantCtx(8), "").Providers[0].Connected, "another tenant does not see the connection")
	require.NoError(t, svc.ProcessPull(context.Background(), pullTask(t, 8)))
	assert.Empty(t, kn.created)
	_, err := svc.EnqueuePull(tenantCtx(8), "zoom")
	require.Error(t, err)
	_, err = svc.UpdateSettings(tenantCtx(8), "zoom", &types.MeetingSettingsRequest{KnowledgeBaseID: "kb1"})
	require.Error(t, err)
}

func TestSettingsValidationAndScheduler(t *testing.T) {
	ts := newTokenServer(t)
	svc, _, enq := newTestService(t, &fakeProvider{tokenURL: ts.srv.URL})
	_, err := svc.StartAuth(tenantCtx(7), "unknown", "http://localhost")
	require.Error(t, err)

	connect(t, svc, 7)
	_, err = svc.UpdateSettings(tenantCtx(7), "zoom", &types.MeetingSettingsRequest{KnowledgeBaseID: "nope"})
	require.Error(t, err, "unknown knowledge base")
	_, err = svc.UpdateSettings(tenantCtx(7), "zoom", &types.MeetingSettingsRequest{AutoSync: true})
	require.Error(t, err, "auto import needs a knowledge base")

	svc.enqueueAutoSync(context.Background())
	assert.Empty(t, enq.tasks, "auto import is off")

	_, err = svc.UpdateSettings(tenantCtx(7), "zoom", &types.MeetingSettingsRequest{KnowledgeBaseID: "kb1", AutoSync: true})
	require.NoError(t, err)
	svc.enqueueAutoSync(context.Background())
	require.Len(t, enq.tasks, 1)
	var p types.MeetingPullPayload
	require.NoError(t, json.Unmarshal(enq.tasks[0].Payload(), &p))
	assert.Equal(t, types.MeetingPullPayload{TenantID: 7, Provider: "zoom"}, p)

	require.NoError(t, svc.Disconnect(tenantCtx(7), "zoom"))
	assert.False(t, svc.Status(tenantCtx(7), "").Providers[0].Connected)
}
