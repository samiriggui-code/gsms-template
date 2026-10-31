# API reference: automations and notifications

Automations run through the built-in WeKnora Assistant on behalf of the creator. The interfaces below require a signed-in user, Viewer+ role in the workspace, and only access the caller’s tasks and notifications; API keys are not allowed on these routes.

## Task management {#task-management}

| Method and path | Usage |
| --- | --- |
| `GET /api/v1/automations` | List the user’s tasks |
| `POST /api/v1/automations` | Create a task |
| `POST /api/v1/automations/validate-trigger` | Validate schedule and preview next run |
| `GET /api/v1/automations/by-session/:session_id` | Task linked to a session |
| `GET /api/v1/automations/:id` | Task detail |
| `PUT /api/v1/automations/:id` | Update task (fields present in `AutomationPatch`) |
| `DELETE /api/v1/automations/:id` | Delete a task |
| `POST /api/v1/automations/:id/pause` | Pause schedule |
| `POST /api/v1/automations/:id/resume` | Resume schedule |
| `POST /api/v1/automations/:id/run` | Run immediately |

Required fields on create: `name`, `instruction`, `trigger`. Example:

```json
{
  "name": "Daily knowledge summary",
  "instruction": "Read knowledge bases I can access, summarize recent additions with sources, without modifying data.",
  "trigger": {"type": "cron", "expr": "0 9 * * *", "timezone": "Asia/Shanghai"},
  "session_mode": "per_run",
  "access_level": "read_only",
  "notify_on_success": true
}
```

| Field | Description |
| --- | --- |
| `trigger.type` | `cron` or `once` |
| `trigger.expr` | Five- or six-field Cron, or descriptors like `@daily`; minimum interval 5 minutes |
| `trigger.at` | One-time time, RFC3339 or local time in the given zone; nonexistent local times are rejected |
| `trigger.timezone` | IANA time zone; UTC if omitted |
| `model_id` | Optional model; empty = assistant default model |
| `session_mode` | `per_run` (default) or `persistent` |
| `carry_last_result` | Inject last success into each new session; default `false` |
| `misfire_policy` | `skip` (default) or `run_once` |
| `overlap_policy` | `skip` (default) or `queue` |
| `access_level` | `read_only` / `confirm` (default) / `auto_write`, capped by assistant access level |
| `approval_timeout_minutes` | Default 1440, range 5–10080 |
| `limits.max_duration_minutes` | Default 30, max 240; does not include approval wait |
| `notify_on_success` | Default `false`; failures always notify |

Task instructions accept template variables `now`, `last_run_at`, `last_success_at`, `run_id`, `automation_name` in double braces. Execution goes through the built-in assistant; collaboration needs are expressed in the instruction.

## Runs and grants {#runs-and-grants}

| Method and path | Usage |
| --- | --- |
| `GET /api/v1/automations/:id/runs` | Run history |
| `GET /api/v1/automation-runs/:id` | Run detail |
| `POST /api/v1/automation-runs/:id/cancel` | Cancel this run |
| `GET /api/v1/automations/:id/grants` | Task durable grants |
| `GET /api/v1/automations/:id/grant-candidates` | Candidates derived from existing approvals |
| `POST /api/v1/automations/:id/grants` | Add a grant with `{"prompt_id":"..."}` |

Run statuses include `queued`, `running`, `awaiting_approval`, `succeeded`, `failed`, `cancelled`, `skipped`, and `needs_attention`. The last means interruption with uncertain outcome—do not automatically replay writes that may already have been applied.

Unified list and revoke: `GET /api/v1/agent/grants` and `DELETE /api/v1/agent/grants/:id`; respond to approvals with `POST /api/v1/agent/prompts/:prompt_id`. Structure and validation: `internal/handler/mcp_service.go`, `agent_grant.go`.

## In-app notifications {#in-app-notifications}

| Method and path | Usage |
| --- | --- |
| `GET /api/v1/notifications` | User notifications |
| `POST /api/v1/notifications/read` | Mark read: `{"ids":["..."]}` |
| `DELETE /api/v1/notifications/read` | Delete read notifications |

Implementation reference: `internal/router/routes_automation.go`, `internal/handler/automation.go`, `internal/types/automation.go`. Product usage: [Automations](../03-features/27-automations.md).
