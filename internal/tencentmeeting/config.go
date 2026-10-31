// Package tencentmeeting imports Tencent Meeting transcripts into knowledge bases.
package tencentmeeting

import (
	"os"
	"strings"
)

const envEnabled = "WEKNORA_TENCENT_MEETING_ENABLED"

// IngestionChannel is stored on knowledge rows created by this connector.
const IngestionChannel = "tencent_meeting"

// Config holds deployment-level settings for the Tencent Meeting connector.
type Config struct {
	Enabled bool
}

// LoadConfigFromEnv reads connector flags from the process environment.
func LoadConfigFromEnv() Config {
	v := strings.TrimSpace(os.Getenv(envEnabled))
	return Config{Enabled: v == "1" || strings.EqualFold(v, "true") || strings.EqualFold(v, "yes")}
}
