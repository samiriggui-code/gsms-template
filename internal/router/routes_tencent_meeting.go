package router

import (
	"github.com/Tencent/WeKnora/internal/handler"
	"github.com/Tencent/WeKnora/internal/types/interfaces"
	"github.com/gin-gonic/gin"
)

// RegisterTencentMeetingRoutes registers Tencent Meeting connector routes when enabled.
func RegisterTencentMeetingRoutes(
	r *gin.RouterGroup,
	svc interfaces.TencentMeetingService,
	h *handler.TencentMeetingHandler,
	g *rbacGuards,
) {
	if svc == nil || h == nil || !svc.Enabled() {
		return
	}
	group := g.apiKeyGroup(r.Group("/integrations/tencent-meeting"), apiKeyFullAccess())
	{
		group.GET("/status", g.Viewer(), h.GetStatus)
		group.POST("/knowledge-bases/:kbId/sync", g.Admin(), h.SyncTranscripts)
	}
}
