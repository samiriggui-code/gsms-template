# Feishu Drive integration

`feishu_drive` / `lark_drive` synchronizes documents and files from a given folder into the knowledge base. Wiki spaces use the `feishu` / `lark` connector; general sync flow: [Data source synchronization](10-datasource.md).

## App identity and folder permissions

Use the App ID and App Secret of the enterprise app for the correct region; Feishu and Lark credentials are not interchangeable. Declare permissions in the developer portal under **Permission management**, read-only; after adding them, create and publish a new app version for them to take effect.

Required permissions:

| Permission | Blocks mode (default) | Export mode | If missing |
| --- | --- | --- | --- |
| `drive:drive:readonly` | Required: list folders, download files, docx images/attachments | Required: list folders, download files | 403 on list or sync, message “share folder to app group” |
| `docx:document:readonly` | Required: blocks API for docx | Not required | Cloud doc parse failure |
| `drive:export:readonly` | Optional: export xlsx sheets; export fallback if blocks fail or body empty | Required: async export docx/doc/sheet/bitable | Sheet sync failure; blocks fallback unavailable |

The Drive connector **does not need** `wiki:wiki:readonly` (Wiki connector only).

Optional permissions (actual names `@member` refs `contact:user.base:readonly`, cloud ref titles `drive:drive.metadata:readonly`, whiteboard export `board:whiteboard:node:read`, embedded Markdown sheets `sheets:spreadsheet:readonly` / `bitable:app:readonly`): blocks rendering path only; absence does not fail sync, content is degraded. Full Wiki matrix: Feishu/Lark section of [Data source synchronization](10-datasource.md).

After configuring permissions, publish the app version and authorize the target folder in the app’s accessible scope. If sharing via the app group, verify app, folder manager, and group. API rights and file rights are two layers: obtaining a tenant access token does not guarantee read access to every folder.

WeKnora’s connection test validates app credentials; the folder tree checks folder access only afterward. Connection OK but 403 on tree: sharing and published permissions.

## Configuration in the knowledge base

1. Knowledge base settings → Data sources → New, choose **Feishu Drive** or **Lark Drive**.
2. Enter App ID and App Secret, test connection.
3. Enter the folder `folder_token` or full link `/drive/folder/<token>`, load the tree, and choose scope. Cloud drive root cannot be left empty.
4. Choose full/incremental, schedule, conflict policy, and sync deletion; save then manually sync a few files, check logs and parsing.

Incremental sync compares cursor and tree: if the selected resource list succeeds entirely, vanished files are marked deleted; subfolder failure defers detection. **Sync deletion** then removes **knowledge base entries for that source**; otherwise they are kept. Full sync (including re-sync after upgrade) keeps the old cursor for deletion reconciliation; first sync without historical baseline does not detect prior deletions. On deletion failure, check logs and remaining entries.

Document updates in blocks mode also remove vanished attachment sub-items (part of content update), independent of the source sync-deletion switch.

## Files and parsing modes

Ordinary files go through the parsing pipeline by type; exported sheets as xlsx, folders walked recursively, shortcuts resolved to targets. Unsupported cloud types are skipped—see logs for reason.

Recent docx has two paths, chosen in **Knowledge base settings → edit source → parsing mode** (`settings.parse_mode` on the source), default `blocks`, for Wiki and Drive:

| Mode | Path | Usage and limits |
| --- | --- | --- |
| `blocks` (default) | blocks API → Markdown; export fallback if API fails, empty body, or > 30 image/table blocks | Images/tables indexed with parent; pdf/office etc. as separate linked entries; embedded sheets as Markdown tables in doc |
| `export` | Async export docx then document parsing | Images with parent; longer export and parse; export file blocks from export not kept; sheets as tables in docx, no dedicated table parsing |

Deprecated `FEISHU_DOCX_PARSE_MODE` is read as fallback only when the source has no mode (deprecation warning); explicit `.env` `export` keeps behavior after upgrade.

Changing effective mode triggers docx re-fetch on next sync (including incremental); saving other settings without mode change does not. Export fallback when image budget exceeded: file blocks already listed by blocks API stay indexed and linked to parent; native export format limits align with `export` mode. Image recall also depends on object storage, OCR/multimodal, and index: [Document parsing](03-document-parsing.md).

## Common issues

| Symptom | Action |
| --- | --- |
| Invalid token or credential test failure | Feishu/Lark region, App ID/Secret, private proxy |
| Folder load failure | Concrete folder link; API permissions and sharing |
| Cloud doc fails, files OK | Export permissions; blocks mode also needs docx read |
| Fewer synced files than in folder | Unsupported types, subfolder rights, fail/ignore stats |
| Images not recalled with body | Object storage, OCR/multimodal, index; both modes link images to parent |
| Doc temporarily not searchable after change | Update may delete old knowledge and reindex; wait for parsing to finish |

Implementation reference: `internal/datasource/connector/feishu/drive/`, `core/shared.go`, and `internal/application/service/datasource_service.go`.
