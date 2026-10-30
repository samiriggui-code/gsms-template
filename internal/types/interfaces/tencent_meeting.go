package interfaces

import (
	"context"

	"github.com/Tencent/WeKnora/internal/types"
	"github.com/hibiken/asynq"
)

// TencentMeetingService ingests Tencent Meeting transcripts into knowledge bases.
type TencentMeetingService interface {
	Enabled() bool
	Status(context.Context) types.TencentMeetingStatus
	EnqueueSync(context.Context, string, *types.TencentMeetingSyncRequest) (*types.TencentMeetingSyncResult, error)
	ProcessSync(context.Context, *asynq.Task) error
}
