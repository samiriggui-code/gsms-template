package handler

import (
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

// OAuthCallback receives the platform redirect, unauthenticated: the single-use state identifies the tenant.
func (h *MeetingsHandler) OAuthCallback(c *gin.Context) {
	ctx := c.Request.Context()
	if e := c.Query("error"); e != "" {
		c.Redirect(http.StatusFound, meetingsSettingsPage+"#meetings_oauth=error&reason="+url.QueryEscape(e))
		return
	}
	provider, err := h.svc.CompleteAuth(ctx, c.Query("state"), c.Query("code"), requestBase(c))
	if err != nil {
		logger.Warnf(ctx, "meetings: oauth callback for %s failed: %v", provider, err)
		c.Redirect(http.StatusFound, meetingsSettingsPage+"#meetings_oauth=error&provider="+url.QueryEscape(provider))
		return
	}
	c.Redirect(http.StatusFound, meetingsSettingsPage+"#meetings_oauth=success&provider="+url.QueryEscape(provider))
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
