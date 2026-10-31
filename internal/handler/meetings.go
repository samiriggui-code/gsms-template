package handler

import (
	"fmt"
	"html"
	"net/http"
	"net/url"
	"strings"

	"github.com/Tencent/WeKnora/internal/errors"
	"github.com/Tencent/WeKnora/internal/logger"
	"github.com/Tencent/WeKnora/internal/types"
	"github.com/Tencent/WeKnora/internal/types/interfaces"
	"github.com/gin-gonic/gin"
)

// meetingsSettingsPage is where the OAuth callback sends the browser back.
const meetingsSettingsPage = "/platform/settings?section=integration-meetings"

// MeetingsHandler exposes the Teams / Zoom / Google Meet transcript connector.
type MeetingsHandler struct {
	svc interfaces.MeetingsService
}

// NewMeetingsHandler constructs the handler.
func NewMeetingsHandler(svc interfaces.MeetingsService) *MeetingsHandler {
	return &MeetingsHandler{svc: svc}
}

// requestBase returns scheme://host as seen by the browser, honouring reverse-proxy headers.
func requestBase(c *gin.Context) string {
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	if p := c.GetHeader("X-Forwarded-Proto"); p != "" {
		scheme = strings.TrimSpace(strings.Split(p, ",")[0])
	}
	host := c.Request.Host
	if h := c.GetHeader("X-Forwarded-Host"); h != "" {
		host = strings.TrimSpace(strings.Split(h, ",")[0])
	}
	return scheme + "://" + host
}

func (h *MeetingsHandler) fail(c *gin.Context, err error, msg string) {
	if appErr, ok := errors.IsAppError(err); ok {
		_ = c.Error(appErr)
		return
	}
	logger.Error(c.Request.Context(), msg, err)
	_ = c.Error(errors.NewInternalServerError(msg))
}

// GetStatus lists the platforms and the tenant's connections.
func (h *MeetingsHandler) GetStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": h.svc.Status(c.Request.Context(), requestBase(c))})
}

// StartAuth returns the platform consent page for :provider.
func (h *MeetingsHandler) StartAuth(c *gin.Context) {
	res, err := h.svc.StartAuth(c.Request.Context(), c.Param("provider"), requestBase(c))
	if err != nil {
		h.fail(c, err, "failed to start authorization")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": res})
}

// SaveApp stores the OAuth app (client id/secret) registered with the platform.
func (h *MeetingsHandler) SaveApp(c *gin.Context) {
	var req types.MeetingAppRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(errors.NewBadRequestError(err.Error()))
		return
	}
	st, err := h.svc.SaveApp(c.Request.Context(), c.Param("provider"), &req)
	if err != nil {
		h.fail(c, err, "failed to save application")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": st})
}

// oauthDonePage runs in the sign-in popup: it tells the settings page the
// result and closes itself, or falls back to a redirect when there is no opener.
const oauthDonePage = `<!doctype html><meta charset="utf-8"><title>WeKnora</title>
<body style="font-family:sans-serif;padding:24px">%s
<script>
(function () {
  var msg = {type: "weknora:meetings-oauth", status: %q, provider: %q};
  // Sign-in pages may sever window.opener (COOP); the settings page also polls.
  if (window.opener) {
    window.opener.postMessage(msg, window.location.origin);
  }
  window.close();
  setTimeout(function () { window.location.replace(%q); }, 800);
})();
</script></body>`

func (h *MeetingsHandler) oauthDone(c *gin.Context, status, provider string) {
	text := "Connexion réussie, vous pouvez fermer cette fenêtre."
	if status != "success" {
		text = "La connexion a échoué, vous pouvez fermer cette fenêtre et réessayer."
	}
	fallback := meetingsSettingsPage + "#meetings_oauth=" + status + "&provider=" + url.QueryEscape(provider)
	c.Header("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'")
	c.Data(http.StatusOK, "text/html; charset=utf-8",
		[]byte(fmt.Sprintf(oauthDonePage, html.EscapeString(text), status, provider, fallback)))
}

// OAuthCallback receives the platform redirect, unauthenticated: the single-use state identifies the tenant.
func (h *MeetingsHandler) OAuthCallback(c *gin.Context) {
	ctx := c.Request.Context()
	if e := c.Query("error"); e != "" {
		logger.Warnf(ctx, "meetings: platform returned oauth error %q", e)
		h.oauthDone(c, "error", "")
		return
	}
	provider, err := h.svc.CompleteAuth(ctx, c.Query("state"), c.Query("code"), requestBase(c))
	if err != nil {
		logger.Warnf(ctx, "meetings: oauth callback for %s failed: %v", provider, err)
		h.oauthDone(c, "error", provider)
		return
	}
	h.oauthDone(c, "success", provider)
}

// Disconnect removes the tenant's connection to :provider.
func (h *MeetingsHandler) Disconnect(c *gin.Context) {
	if err := h.svc.Disconnect(c.Request.Context(), c.Param("provider")); err != nil {
		h.fail(c, err, "failed to disconnect")
		return
	}
	c.Status(http.StatusNoContent)
}

// UpdateSettings sets the target knowledge base and automatic import options.
func (h *MeetingsHandler) UpdateSettings(c *gin.Context) {
	var req types.MeetingSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(errors.NewBadRequestError(err.Error()))
		return
	}
	st, err := h.svc.UpdateSettings(c.Request.Context(), c.Param("provider"), &req)
	if err != nil {
		h.fail(c, err, "failed to save settings")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": st})
}

// PullNow queues an immediate import for :provider.
func (h *MeetingsHandler) PullNow(c *gin.Context) {
	res, err := h.svc.EnqueuePull(c.Request.Context(), c.Param("provider"))
	if err != nil {
		h.fail(c, err, "failed to start import")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": res})
}
