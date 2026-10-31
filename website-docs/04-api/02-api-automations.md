# Référence API : automatisations et notifications

Les automatisations s’exécutent via l’assistant WeKnora intégré, au nom du créateur. Les interfaces ci-dessous exigent un utilisateur connecté, Viewer+ dans l’espace, et n’accèdent qu’aux tâches et notifications de l’appelant ; les clés API ne sont pas autorisées sur ces routes.

## Gestion des tâches {#tasks}

| Méthode et chemin | Usage |
| --- | --- |
| `GET /api/v1/automations` | Lister les tâches de l’utilisateur |
| `POST /api/v1/automations` | Créer une tâche |
| `POST /api/v1/automations/validate-trigger` | Valider le planning et prévisualiser la prochaine exécution |
| `GET /api/v1/automations/by-session/:session_id` | Tâche liée à une session |
| `GET /api/v1/automations/:id` | Détail d’une tâche |
| `PUT /api/v1/automations/:id` | Mettre à jour (champs présents dans `AutomationPatch`) |
| `DELETE /api/v1/automations/:id` | Supprimer une tâche |
| `POST /api/v1/automations/:id/pause` | Mettre le planning en pause |
| `POST /api/v1/automations/:id/resume` | Reprendre le planning |
| `POST /api/v1/automations/:id/run` | Exécuter immédiatement |

Champs obligatoires à la création : `name`, `instruction`, `trigger`. Exemple :

```json
{
  "name": "Synthèse quotidienne des connaissances",
  "instruction": "Lire les bases de connaissances auxquelles j’ai accès, résumer les ajouts récents avec les sources, sans modifier les données.",
  "trigger": {"type": "cron", "expr": "0 9 * * *", "timezone": "Asia/Shanghai"},
  "session_mode": "per_run",
  "access_level": "read_only",
  "notify_on_success": true
}
```

| Champ | Description |
| --- | --- |
| `trigger.type` | `cron` ou `once` |
| `trigger.expr` | Cron à cinq ou six champs, ou descripteurs comme `@daily` ; intervalle minimum 5 minutes |
| `trigger.at` | Heure unique, RFC3339 ou heure locale dans le fuseau indiqué ; heure locale inexistante refusée |
| `trigger.timezone` | Fuseau IANA ; UTC si omis |
| `model_id` | Modèle optionnel ; vide = modèle par défaut de l’assistant |
| `session_mode` | `per_run` (défaut) ou `persistent` |
| `carry_last_result` | Injecter le dernier succès dans chaque nouvelle session ; défaut `false` |
| `misfire_policy` | `skip` (défaut) ou `run_once` |
| `overlap_policy` | `skip` (défaut) ou `queue` |
| `access_level` | `read_only` / `confirm` (défaut) / `auto_write`, plafonné par le niveau d’accès de l’assistant |
| `approval_timeout_minutes` | Défaut 1440, plage 5–10080 |
| `limits.max_duration_minutes` | Défaut 30, max 240 ; n’inclut pas l’attente d’approbation |
| `notify_on_success` | Défaut `false` ; les échecs notifient toujours |

Les consignes acceptent les variables de modèle `now`, `last_run_at`, `last_success_at`, `run_id`, `automation_name` entre doubles accolades. L’exécution passe par l’assistant intégré ; les besoins de collaboration s’expriment dans la consigne.

## Exécutions et autorisations {#runs}

| Méthode et chemin | Usage |
| --- | --- |
| `GET /api/v1/automations/:id/runs` | Historique des exécutions |
| `GET /api/v1/automation-runs/:id` | Détail d’une exécution |
| `POST /api/v1/automation-runs/:id/cancel` | Annuler cette exécution |
| `GET /api/v1/automations/:id/grants` | Autorisations durables de la tâche |
| `GET /api/v1/automations/:id/grant-candidates` | Candidats dérivés d’approbations existantes |
| `POST /api/v1/automations/:id/grants` | Ajouter une autorisation avec `{"prompt_id":"..."}` |

Statuts d’exécution : `queued`, `running`, `awaiting_approval`, `succeeded`, `failed`, `cancelled`, `skipped`, `needs_attention`. Ce dernier signifie interruption avec issue incertaine — ne pas rejouer automatiquement des écritures peut-être déjà appliquées.

Liste unifiée et révocation : `GET /api/v1/agent/grants` et `DELETE /api/v1/agent/grants/:id` ; réponse aux approbations : `POST /api/v1/agent/prompts/:prompt_id`. Structure et validation : `internal/handler/mcp_service.go`, `agent_grant.go`.

## Notifications in-app {#notifications}

| Méthode et chemin | Usage |
| --- | --- |
| `GET /api/v1/notifications` | Notifications de l’utilisateur |
| `POST /api/v1/notifications/read` | Marquer comme lues : `{"ids":["..."]}` |
| `DELETE /api/v1/notifications/read` | Supprimer les notifications lues |

Référence d’implémentation : `internal/router/routes_automation.go`, `internal/handler/automation.go`, `internal/types/automation.go`. Usage produit : [Automatisations](../03-features/27-automations.md).
