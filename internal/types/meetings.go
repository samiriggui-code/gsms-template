package types

import (
	"time"

	"github.com/Tencent/WeKnora/internal/utils"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Meeting providers whose transcripts can be imported into a knowledge base.
const (
	MeetingProviderTeams      = "teams"
	MeetingProviderZoom       = "zoom"
	MeetingProviderGoogleMeet = "google_meet"
)

// MeetingConnection is a tenant's OAuth link to one meeting platform account.
// Tokens are encrypted at rest (AES-256-GCM) when SYSTEM_AES_KEY is set and
// are never serialized.
type MeetingConnection struct {
	ID                  string     `json:"id"                gorm:"type:varchar(36);primaryKey"`
	TenantID            uint64     `json:"tenant_id"         gorm:"not null;uniqueIndex:idx_meeting_connections_tenant_provider"`
	Provider            string     `json:"provider"          gorm:"type:varchar(32);not null;uniqueIndex:idx_meeting_connections_tenant_provider"`
	AccountID           string     `json:"-"                 gorm:"type:varchar(256)"`
	AccountLabel        string     `json:"account_label"     gorm:"type:varchar(256)"`
	AccessToken         string     `json:"-"                 gorm:"type:text"`
	RefreshToken        string     `json:"-"                 gorm:"type:text"`
	TokenExpiry         *time.Time `json:"-"`
	OAuthState          string     `json:"-"                 gorm:"column:oauth_state;type:varchar(128);index"`
	OAuthStateExpiresAt *time.Time `json:"-"                 gorm:"column:oauth_state_expires_at"`
	KnowledgeBaseID     string     `json:"knowledge_base_id" gorm:"type:varchar(36)"`
	AutoSync            bool       `json:"auto_sync"         gorm:"not null;default:false"`
	Publish             bool       `json:"publish"           gorm:"not null;default:false"`
	LastSyncedAt        *time.Time `json:"last_synced_at"`
	LastSyncError       string     `json:"last_sync_error"   gorm:"type:text"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

// TableName pins the table name created by the meetings migration.
func (MeetingConnection) TableName() string { return "meeting_connections" }

// Connected reports whether the OAuth flow completed.
func (c *MeetingConnection) Connected() bool {
	return c != nil && c.RefreshToken != ""
}

// BeforeCreate sets the primary key and encrypts the tokens.
func (c *MeetingConnection) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	c.encryptSecrets()
	return nil
}

// BeforeSave re-encrypts the tokens on update paths.
func (c *MeetingConnection) BeforeSave(tx *gorm.DB) error {
	c.encryptSecrets()
	return nil
}

// AfterFind decrypts the tokens after loading.
func (c *MeetingConnection) AfterFind(tx *gorm.DB) error {
	c.AccessToken = decryptOrBlank(c.AccessToken)
	c.RefreshToken = decryptOrBlank(c.RefreshToken)
	return nil
}

func decryptOrBlank(s string) string {
	if plain, ok := utils.DecryptStoredSecretLenient(s); ok {
		return plain
	}
	return ""
}

func (c *MeetingConnection) encryptSecrets() {
	key := utils.GetAESKey()
	if key == nil {
		return
	}
	for _, field := range []*string{&c.AccessToken, &c.RefreshToken} {
		if *field == "" {
			continue
		}
		if enc, err := utils.EncryptAESGCM(*field, key); err == nil {
			*field = enc
		}
	}
}

// MeetingImport records a transcript already written to a knowledge base.
type MeetingImport struct {
	ID              string    `json:"id"                gorm:"type:varchar(36);primaryKey"`
	TenantID        uint64    `json:"tenant_id"         gorm:"not null;uniqueIndex:idx_meeting_imports_tenant_external"`
	Provider        string    `json:"provider"          gorm:"type:varchar(32);not null;uniqueIndex:idx_meeting_imports_tenant_external"`
	ExternalID      string    `json:"external_id"       gorm:"type:varchar(512);not null;uniqueIndex:idx_meeting_imports_tenant_external"`
	MeetingID       string    `json:"meeting_id"        gorm:"type:varchar(512)"`
	KnowledgeBaseID string    `json:"knowledge_base_id" gorm:"type:varchar(36);not null"`
	KnowledgeID     string    `json:"knowledge_id"      gorm:"type:varchar(36)"`
	CreatedAt       time.Time `json:"created_at"`
}

// TableName pins the table name created by the meetings migration.
func (MeetingImport) TableName() string { return "meeting_imports" }

// BeforeCreate sets the primary key.
func (i *MeetingImport) BeforeCreate(tx *gorm.DB) error {
	if i.ID == "" {
		i.ID = uuid.New().String()
	}
	return nil
}

// MeetingProviderStatus describes one platform for the settings screen.
type MeetingProviderStatus struct {
	Provider        string     `json:"provider"`
	Configured      bool       `json:"configured"`
	Connected       bool       `json:"connected"`
	AccountLabel    string     `json:"account_label,omitempty"`
	KnowledgeBaseID string     `json:"knowledge_base_id,omitempty"`
	AutoSync        bool       `json:"auto_sync"`
	Publish         bool       `json:"publish"`
	LastSyncedAt    *time.Time `json:"last_synced_at,omitempty"`
	LastSyncError   string     `json:"last_sync_error,omitempty"`
	ImportedCount   int64      `json:"imported_count"`
}

// MeetingsStatus is returned by GET /integrations/meetings/status.
type MeetingsStatus struct {
	EncryptionActive bool                    `json:"encryption_active"`
	RedirectURL      string                  `json:"redirect_url"`
	Providers        []MeetingProviderStatus `json:"providers"`
}

// MeetingAuthStart carries the provider consent page the admin must open.
type MeetingAuthStart struct {
	AuthURL string `json:"auth_url"`
}

// MeetingSettingsRequest updates where and how a provider's meetings are imported.
type MeetingSettingsRequest struct {
	KnowledgeBaseID string `json:"knowledge_base_id"`
	AutoSync        bool   `json:"auto_sync"`
	Publish         bool   `json:"publish"`
}

// MeetingPullPayload is the asynq task body for meetings:pull.
type MeetingPullPayload struct {
	TenantID  uint64        `json:"tenant_id"`
	Provider  string        `json:"provider"`
	Initiator TaskInitiator `json:"initiator,omitempty"`
}

// MeetingPullResult is returned when an import is queued.
type MeetingPullResult struct {
	TaskID string `json:"task_id"`
}
