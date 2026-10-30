package handler

import (
	"net/http"

	"github.com/Tencent/WeKnora/internal/errors"
	"github.com/Tencent/WeKnora/internal/logger"
	"github.com/Tencent/WeKnora/internal/types"
	"github.com/Tencent/WeKnora/internal/types/interfaces"
	"github.com/gin-gonic/gin"
)

// TencentMeetingHandler exposes the Tencent Meeting connector API.
type TencentMeetingHandler struct {
	svc interfaces.TencentMeetingService
}

// NewTencentMeetingHandler constructs the handler.
func NewTencentMeetingHandler(svc interfaces.TencentMeetingService) *TencentMeetingHandler {
	return &TencentMeetingHandler{svc: svc}
}

// GetStatus returns connector availability.
func (h *TencentMeetingHandler) GetStatus(c *gin.Context) {
	ctx := c.Request.Context()
	c.JSON(http.StatusOK, gin.H{"success": true, "data": h.svc.Status(ctx)})
}

// SyncTranscripts enqueues ingestion of meeting transcripts into a knowledge base.
func (h *TencentMeetingHandler) SyncTranscripts(c *gin.Context) {
	ctx := c.Request.Context()
	if !h.svc.Enabled() {
		c.Error(errors.NewForbiddenError("Tencent Meeting connector is disabled"))
		return
	}

	kbID := c.Param("kbId")
	var req types.TencentMeetingSyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(errors.NewBadRequestError(err.Error()))
		return
	}
	result, err := h.svc.EnqueueSync(ctx, kbID, &req)
	if err != nil {
		if appErr, ok := errors.IsAppError(err); ok {
			c.Error(appErr)
			return
		}
		logger.Error(ctx, "tencent meeting sync enqueue failed", err)
		c.Error(errors.NewInternalServerError("failed to enqueue sync"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}
