package tencentmeeting

import (
	"testing"

	"github.com/Tencent/WeKnora/internal/types"
	"github.com/stretchr/testify/assert"
)

func TestBuildDocumentMarkdown(t *testing.T) {
	md := buildDocumentMarkdown(types.TencentMeetingTranscriptItem{
		Summary:    "Points clés",
		Transcript: "Bonjour à tous",
		RecordedAt: "2026-10-30T10:00:00Z",
	})
	assert.Contains(t, md, "## Résumé")
	assert.Contains(t, md, "Bonjour à tous")
}

func TestEnabledFromEnv(t *testing.T) {
	t.Setenv(envEnabled, "true")
	assert.True(t, LoadConfigFromEnv().Enabled)
	t.Setenv(envEnabled, "")
	assert.False(t, LoadConfigFromEnv().Enabled)
}
