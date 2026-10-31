package tencentmeeting

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	werrors "github.com/Tencent/WeKnora/internal/errors"
	"github.com/Tencent/WeKnora/internal/logger"
	"github.com/Tencent/WeKnora/internal/types"
	"github.com/Tencent/WeKnora/internal/types/interfaces"
	"github.com/hibiken/asynq"
)

// Service implements interfaces.TencentMeetingService.
type Service struct {
	cfg              Config
	knowledgeService interfaces.KnowledgeService
	kbService        interfaces.KnowledgeBaseService
	taskEnqueuer     interfaces.TaskEnqueuer
}

// NewService constructs the Tencent Meeting connector service.
func NewService(
	knowledgeService interfaces.KnowledgeService,
	kbService interfaces.KnowledgeBaseService,
	taskEnqueuer interfaces.TaskEnqueuer,
) interfaces.TencentMeetingService {
	return &Service{
		cfg:              LoadConfigFromEnv(),
		knowledgeService: knowledgeService,
		kbService:        kbService,
		taskEnqueuer:     taskEnqueuer,
	}
}

// Enabled reports whether WEKNORA_TENCENT_MEETING_ENABLED turned the connector on.
func (s *Service) Enabled() bool {
	return s.cfg.Enabled
}

// Status describes the connector state for the settings UI.
func (s *Service) Status(ctx context.Context) types.TencentMeetingStatus {
	_ = ctx
	if !s.Enabled() {
		return types.TencentMeetingStatus{
			Enabled: false,
			Message: "connector disabled (set WEKNORA_TENCENT_MEETING_ENABLED=true)",
		}
	}
	return types.TencentMeetingStatus{
		Enabled:        true,
		OAuthConnected: false,
		Message:        "P1: import transcripts via POST …/sync; OAuth API client planned (P2)",
	}
}

// EnqueueSync validates the request and queues one async ingestion task for kbID.
func (s *Service) EnqueueSync(
	ctx context.Context,
	kbID string,
	req *types.TencentMeetingSyncRequest,
) (*types.TencentMeetingSyncResult, error) {
	if !s.Enabled() {
		return nil, werrors.NewForbiddenError("Tencent Meeting connector is disabled")
	}
	if req == nil || len(req.Items) == 0 {
		return nil, werrors.NewBadRequestError("items required")
	}
	if _, err := s.kbService.GetKnowledgeBaseByID(ctx, kbID); err != nil {
		return nil, err
	}

	tenantID, ok := ctx.Value(types.TenantIDContextKey).(uint64)
	if !ok || tenantID == 0 {
		return nil, werrors.NewUnauthorizedError("tenant required")
	}

	payload := &types.TencentMeetingSyncPayload{
		TenantID:        tenantID,
		KnowledgeBaseID: kbID,
		Items:           req.Items,
		Publish:         req.Publish,
		Initiator:       types.TaskInitiatorFromContext(ctx),
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	task := asynq.NewTask(
		types.TypeTencentMeetingSync,
		raw,
		asynq.Queue(types.QueueSync),
		asynq.MaxRetry(3),
		asynq.Timeout(30*time.Minute),
	)
	info, err := s.taskEnqueuer.Enqueue(task)
	if err != nil {
		return nil, err
	}
	return &types.TencentMeetingSyncResult{TaskID: info.ID, Queued: len(req.Items)}, nil
}

// ProcessSync is the asynq handler: it writes each transcript as a manual knowledge entry.
func (s *Service) ProcessSync(ctx context.Context, t *asynq.Task) error {
	if !s.Enabled() {
		return fmt.Errorf("tencent meeting connector disabled")
	}
	var payload types.TencentMeetingSyncPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return err
	}
	if payload.TenantID == 0 || payload.KnowledgeBaseID == "" {
		return fmt.Errorf("invalid tencent meeting sync payload")
	}
	ctx = context.WithValue(ctx, types.TenantIDContextKey, payload.TenantID)

	status := types.ManualKnowledgeStatusDraft
	if payload.Publish {
		status = types.ManualKnowledgeStatusPublish
	}

	for _, item := range payload.Items {
		if strings.TrimSpace(item.Transcript) == "" {
			logger.Warnf(ctx, "skip tencent meeting item with empty transcript meeting_id=%s", item.MeetingID)
			continue
		}
		content := buildDocumentMarkdown(item)
		title := strings.TrimSpace(item.Title)
		if title == "" {
			title = fmt.Sprintf("Tencent Meeting %s", item.MeetingID)
		}
		manual := &types.ManualKnowledgePayload{Title: title, Content: content, Status: status}
		_, err := s.knowledgeService.CreateKnowledgeFromManual(ctx, payload.KnowledgeBaseID, manual, IngestionChannel)
		if err != nil {
			return err
		}
	}
	return nil
}

func buildDocumentMarkdown(item types.TencentMeetingTranscriptItem) string {
	var b strings.Builder
	if s := strings.TrimSpace(item.Summary); s != "" {
		b.WriteString("## Résumé\n\n")
		b.WriteString(s)
		b.WriteString("\n\n")
	}
	b.WriteString("## Transcription\n\n")
	b.WriteString(strings.TrimSpace(item.Transcript))
	if item.RecordedAt != "" {
		b.WriteString("\n\n---\n\n_Enregistré : ")
		b.WriteString(item.RecordedAt)
		b.WriteString("_")
	}
	return b.String()
}
