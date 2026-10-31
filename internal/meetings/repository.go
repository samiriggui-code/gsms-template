package meetings

import (
	"context"
	"time"

	"github.com/Tencent/WeKnora/internal/types"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// repository persists connections and imported transcripts.
type repository struct {
	db *gorm.DB
}

func newRepository(db *gorm.DB) *repository {
	return &repository{db: db}
}

func (r *repository) first(ctx context.Context, query string, args ...any) (*types.MeetingConnection, error) {
	var rows []types.MeetingConnection
	if err := r.db.WithContext(ctx).Where(query, args...).Limit(1).Find(&rows).Error; err != nil || len(rows) == 0 {
		return nil, err
	}
	return &rows[0], nil
}

// getConnection returns the tenant's connection to provider, or (nil, nil).
func (r *repository) getConnection(ctx context.Context, tenantID uint64, provider string) (*types.MeetingConnection, error) {
	return r.first(ctx, "tenant_id = ? AND provider = ?", tenantID, provider)
}

// getByState returns the connection waiting for the OAuth callback carrying state.
func (r *repository) getByState(ctx context.Context, state string) (*types.MeetingConnection, error) {
	return r.first(ctx, "oauth_state = ?", state)
}

func (r *repository) listConnections(ctx context.Context, tenantID uint64) ([]types.MeetingConnection, error) {
	var rows []types.MeetingConnection
	err := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Find(&rows).Error
	return rows, err
}

// saveConnection inserts or updates the row. The save hooks encrypt tokens in
// place, so a copy is written and conn keeps plaintext tokens for later calls.
func (r *repository) saveConnection(ctx context.Context, conn *types.MeetingConnection) error {
	conn.UpdatedAt = time.Now().UTC()
	if conn.CreatedAt.IsZero() {
		conn.CreatedAt = conn.UpdatedAt
	}
	row := *conn
	if err := r.db.WithContext(ctx).Save(&row).Error; err != nil {
		return err
	}
	conn.ID = row.ID
	return nil
}

func (r *repository) deleteConnection(ctx context.Context, tenantID uint64, provider string) error {
	return r.db.WithContext(ctx).
		Where("tenant_id = ? AND provider = ?", tenantID, provider).
		Delete(&types.MeetingConnection{}).Error
}

type autoSyncTarget struct {
	TenantID uint64
	Provider string
}

// autoSyncTargets lists connected providers with automatic import turned on.
func (r *repository) autoSyncTargets(ctx context.Context) ([]autoSyncTarget, error) {
	var out []autoSyncTarget
	err := r.db.WithContext(ctx).Model(&types.MeetingConnection{}).
		Select("tenant_id, provider").
		Where("auto_sync = ? AND refresh_token <> '' AND knowledge_base_id <> ''", true).
		Scan(&out).Error
	return out, err
}

func (r *repository) isImported(ctx context.Context, tenantID uint64, provider, externalID string) (bool, error) {
	var n int64
	err := r.db.WithContext(ctx).Model(&types.MeetingImport{}).
		Where("tenant_id = ? AND provider = ? AND external_id = ?", tenantID, provider, externalID).
		Count(&n).Error
	return n > 0, err
}

func (r *repository) markImported(ctx context.Context, imp *types.MeetingImport) error {
	imp.CreatedAt = time.Now().UTC()
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{DoNothing: true}).Create(imp).Error
}

func (r *repository) countImported(ctx context.Context, tenantID uint64, provider string) (int64, error) {
	var n int64
	err := r.db.WithContext(ctx).Model(&types.MeetingImport{}).
		Where("tenant_id = ? AND provider = ?", tenantID, provider).Count(&n).Error
	return n, err
}
