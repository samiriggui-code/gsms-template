package router

import (
	"github.com/Tencent/WeKnora/internal/handler"
	"github.com/gin-gonic/gin"
)

// RegisterMeetingsRoutes registers the Teams / Zoom / Google Meet transcript connector.
func RegisterMeetingsRoutes(r *gin.RouterGroup, h *handler.MeetingsHandler, g *rbacGuards) {
	if h == nil {
		return
	}
	// Platform OAuth redirect: unauthenticated (allow-listed in middleware/auth.go),
	// registered outside the group so it cannot clash with :provider.
	r.GET("/integrations/meetings-oauth/callback", h.OAuthCallback)

	group := g.apiKeyGroup(r.Group("/integrations/meetings"), apiKeyFullAccess())
	{
		group.GET("/status", g.Viewer(), h.GetStatus)
		group.PUT("/providers/:provider/app", g.Admin(), h.SaveApp)
		group.POST("/providers/:provider/auth/start", g.Admin(), h.StartAuth)
		group.PUT("/providers/:provider/settings", g.Admin(), h.UpdateSettings)
		group.POST("/providers/:provider/pull", g.Admin(), h.PullNow)
		group.DELETE("/providers/:provider/connection", g.Admin(), h.Disconnect)
	}
}
