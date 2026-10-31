package types

// TencentMeetingTranscriptItem is one meeting artifact to ingest into a KB.
type TencentMeetingTranscriptItem struct {
	MeetingID  string `json:"meeting_id" binding:"required"`
	Title      string `json:"title"`
	Transcript string `json:"transcript" binding:"required"`
	RecordedAt string `json:"recorded_at,omitempty"`
	Summary    string `json:"summary,omitempty"`
}

// TencentMeetingSyncRequest triggers async ingestion (P1).
type TencentMeetingSyncRequest struct {
	Items   []TencentMeetingTranscriptItem `json:"items" binding:"required,min=1,max=50"`
	Publish bool                           `json:"publish"`
}

// TencentMeetingSyncPayload is the asynq task body for tencentmeeting:sync.
type TencentMeetingSyncPayload struct {
	TenantID        uint64                         `json:"tenant_id"`
	KnowledgeBaseID string                         `json:"knowledge_base_id"`
	Items           []TencentMeetingTranscriptItem `json:"items"`
	Publish         bool                           `json:"publish"`
	Initiator       TaskInitiator                  `json:"initiator,omitempty"`
}

// TencentMeetingSyncResult is returned when a sync job is queued.
type TencentMeetingSyncResult struct {
	TaskID string `json:"task_id"`
	Queued int    `json:"queued"`
}

// TencentMeetingStatus describes connector availability for the tenant.
type TencentMeetingStatus struct {
	Enabled        bool   `json:"enabled"`
	OAuthConnected bool   `json:"oauth_connected"`
	Message        string `json:"message,omitempty"`
}
