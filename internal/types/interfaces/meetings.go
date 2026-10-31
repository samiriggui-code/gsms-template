package interfaces

import (
	"context"
	"time"

	"github.com/Tencent/WeKnora/internal/types"
	"github.com/hibiken/asynq"
)

// MeetingsService imports Teams, Zoom and Google Meet transcripts into knowledge bases.
type MeetingsService interface {
	// requestBase is the scheme://host of the incoming request, used for the
	// OAuth redirect URL when MEETINGS_PUBLIC_URL is not set.
	Status(ctx context.Context, requestBase string) types.MeetingsStatus
	StartAuth(ctx context.Context, provider, requestBase string) (*types.MeetingAuthStart, error)
	// CompleteAuth handles the OAuth callback; it returns the provider that was connected.
	CompleteAuth(ctx context.Context, state, code, requestBase string) (string, error)
	Disconnect(ctx context.Context, provider string) error
	UpdateSettings(ctx context.Context, provider string, req *types.MeetingSettingsRequest) (types.MeetingProviderStatus, error)
	EnqueuePull(ctx context.Context, provider string) (*types.MeetingPullResult, error)
	ProcessPull(ctx context.Context, t *asynq.Task) error
	StartScheduler(ctx context.Context) error
	StopScheduler(timeout time.Duration)
}
