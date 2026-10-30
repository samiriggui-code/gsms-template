# Administration plateforme et administrateurs système

Les administrateurs système gèrent les paramètres globaux du déploiement WeKnora, les files de tâches, les clés API plateforme et l’audit inter-espaces. Le Owner d’un espace administre un seul workspace ; les deux statuts sont indépendants. Rôles au sein d’un espace : [Espaces, utilisateurs et authentification](01-tenant-auth.md).

Périmètres respectifs :

| | Owner d’espace | Administrateur système |
| --- | --- | --- |
| Portée | Un workspace | Tout le déploiement |
| Attribution | À la création de l’espace ou transfert par l’Owner | Par un admin système existant ; le premier via variable d’environnement de bootstrap |
| Contenu géré | Membres, modèles, bases, intégrations, audit d’espace | Paramètres système, files, clés API plateforme, audit inter-espaces, réinitialisation de mots de passe |
| Cumul automatique | — | **Non** : Owner d’un espace ≠ admin système, et inversement |

L’accès aux données d’autres espaces passe par `CanAccessAllTenants`. Le statut administrateur système n’ouvre pas automatiquement le contenu des bases ailleurs.

<Screenshot
  src="/screenshots/settings-system-admin.png"
  caption="Console plateforme : paramètres système, files, clés API plateforme et journal d’audit système"
  hint="« Paramètres » en tant qu’admin système : barre latérale avec les cinq sections réservées (paramètres système, catalogue modèles, files, clés API plateforme, audit système), corps = page paramètres système." />

## Configurer le premier administrateur système {#_1-premier-administrateur-systeme}

Sur un déploiement neuf :

1. Enregistrer un compte via le flux habituel ;
2. Définir `WEKNORA_BOOTSTRAP_SYSTEM_ADMIN_EMAIL=<email du compte>` pour le service app, redémarrer ;
3. Au démarrage, si aucun admin système n’existe encore, l’utilisateur correspondant est promu.

Le bootstrap ne crée pas de compte : email inconnu → alerte journal, nouvelle tentative au redémarrage ; erreur de config sans bloquer le service. Une fois un admin système présent, la variable n’accorde plus de droits.

Ensuite, promotion/révocation dans l’interface. Impossible de se révoquer soi-même ni le dernier admin système actif. API : `POST /system/admin/promote` et `/revoke` ; révocation d’un non-admin → 200, audit `changed=false`.

## Utiliser la console plateforme {#_2-console-plateforme}

Dans « Paramètres », barre latérale réservée aux admins système :

| Section | Rôle | API |
| --- | --- | --- |
| Paramètres système | Interrupteurs runtime globaux (inscription, politique espaces, concurrence, liste blanche SSRF, etc.), règles d’effet par clé — tableau ci-dessous | `GET/PUT/DELETE /system/admin/settings[/:key]` |
| Catalogue modèles | Modèles du catalogue, source, édition/ajout/JSON batch (effet immédiat), restauration par version ; voir [Gestion du catalogue](06-models.md) | `/system/admin/model-catalog*` |
| Files de tâches | Backlog asynq en direct, retry/archivage/suppression par tâche, purge des archivées ; mode Lite → `available=false` | `/system/admin/runtime/queues*` |
| Clés API plateforme | Clés scope platform pour l’automatisation control plane : `system_tenants_read/manage`, `system_settings_read/manage`, `system_runtime_read/manage`, `system_audit_read` | `/system/admin/api-keys` |
| Journal d’audit système | Événements plateforme `tenant_id = 0` (paramètres, promote/revoke, files, etc.). Les API d’audit d’espace filtrent par tenant et n’affichent pas ces lignes | `GET /system/admin/audit-log` |

Autres actions réservées :

- **Réinitialiser le mot de passe utilisateur** (`POST /system/admin/users/reset-password`) : remplace le mot de passe local cible et révoque toutes ses sessions. **Pas sur soi-même** — changement personnel exige l’ancien mot de passe ;
- **Appliquer le quota stockage par défaut** (`POST /system/admin/tenants/apply-default-storage-quota`) : écrit le quota par défaut courant sur tous les espaces existants.

### Gestion des utilisateurs plateforme

« Paramètres → Paramètres système → Gestion des utilisateurs » : liste du déploiement, création, activation/désactivation, reset mot de passe, grant/revoke admin système. Désactiver un compte révoque immédiatement ses sessions ; impossible de se désactiver ou de désactiver le dernier admin système actif. La liste n’expose ni mot de passe ni hash.

<Screenshot src="/screenshots/system-user-management.png" caption="Paramètres système : gestion des utilisateurs plateforme" hint="Liste utilisateurs, état actif, badge admin, menu actions ; email masqué, création et pagination visibles." />

Trois modes d’inscription : libre, sur invitation uniquement, fermée ; `invite_only` = pas d’inscription mot de passe — comptes existants via invitation. OIDC et création par admin ignorent la restriction mot de passe.

### Créer un utilisateur

Depuis v0.8.2, « Paramètres → Paramètres système → Gestion des utilisateurs » → « Créer un utilisateur » : nom (2–50 car.), email, mot de passe aléatoire (défaut) ou saisi conforme à la politique. Utile si l’inscription publique est fermée. Affectation d’espace selon `auth.default_tenant_mode` : `create_personal` crée un espace personnel, `tenantless` attend une invitation.

<Screenshot
  src="/screenshots/system-admin-create-user.png"
  caption="Utilisateur créé : copier les identifiants et le mot de passe à usage unique"
  hint="Dialogue « Créer un utilisateur » (nom, email, interrupteur mot de passe aléatoire) et écran succès avec mot de passe unique et « Copier les informations du compte »." />

Le mot de passe généré n’apparaît qu’à la création — copier avant fermeture ; fermeture du dialogue avant confirmation impossible, plus de lecture en clair ensuite. Chaque création → audit `system.user_created`. Identité dupliquée → utilisateur existant, mot de passe inchangé ; email et nom pointant vers des comptes différents → refus. API : [API système](../04-api/02-api-system.md).

Création utilisateur ≠ bootstrap premier admin : le bootstrap promeut un compte existant.

## Référence des paramètres runtime {#_3-parametres-runtime}

Paramètres modifiables en console. Valeur en base prioritaire sur l’environnement ; effet immédiat pour la plupart ; voir tableau pour les exceptions (nouvelles ressources, rebuild worker).

| Clé | Type | Défaut | Effet |
| --- | --- | --- | --- |
| `auth.registration_mode` | `self_serve` / `invite_register` / `invite_only` | `self_serve` | Immédiat |
| `auth.default_tenant_mode` | `create_personal` / `tenantless` | `create_personal` | Nouveaux inscrits seulement |
| `tenant.self_service_creation_enabled` | bool | `true` | Immédiat |
| `tenant.max_owned_per_user` | int | `10` (0 = défaut intégré, négatif = illimité) | À chaque création d’espace |
| `tenant.default_storage_quota_gb` | int | `10` | Quota défaut (Go) si MB non actif |
| `tenant.default_storage_quota_mb` | int | `0` | MB > 0 prime sur Go ; 0 ou négatif → Go. Inclut l’espace perso auto à l’inscription |
| `tenant.auto_create_api_key` | bool | `false` | À chaque création d’espace |
| `ssrf.whitelist` | liste string | vide | Immédiat (`SSRF_WHITELIST_EXTRA` reste côté déploiement) |
| `asynq.core/postprocess/enrichment/maintenance/shared/wiki_concurrency` | int | voir [Tâches asynchrones](../02-architecture/05-async-tasks.md) | Reconfiguration des pools worker |
| `model.max_concurrency` | int | `32` | Immédiat |

Autres clés (priorité base > env) :

| Clé | Défaut | Rôle |
| --- | --- | --- |
| `auth.complex_password_enabled` | false | Nouveaux mots de passe : maj/min, chiffre, caractère spécial |
| `tenant.auto_accept_invitation` | false | Invitation email → adhésion directe si compte existant |
| `sandbox.docker_enabled` | false | Autorise config et instances sandbox Docker |

`tenant.auto_create_api_key` est off par défaut ; activer pour compatibilité intégrations qui attendaient une clé full-access à la création d’espace.

::: tip Réinitialiser un paramètre runtime
Après enregistrement en console, changer la variable d’environnement ne remplace pas la valeur en base. Si la config « ne prend pas », vérifier les paramètres runtime ; `DELETE /system/admin/settings/:key` supprime l’override et restaure env ou défaut intégré.
:::

## Documentation associée {#documentation-associee}

- Rôles à quatre niveaux et clés API dans un espace : [Espaces, utilisateurs et authentification](01-tenant-auth.md)
- Topologie des files et pools : [Tâches asynchrones](../02-architecture/05-async-tasks.md)
- Audit et traces : [Observabilité et audit](16-observability.md)
- Liste des endpoints : [API système et administration plateforme](../04-api/02-api-system.md)

## Référence d’implémentation

- `cmd/server/bootstrap.go` : premier administrateur système.
- `frontend/src/config/settingsAccess.ts` : sections paramètres plateforme.
- `internal/application/service/system_setting.go` : registre des paramètres runtime.

### Quota stockage par défaut des espaces

Création manuelle, inscription classique ou OIDC avec espace perso auto : même quota par défaut à la création.
Ex. `WEKNORA_TENANT_DEFAULT_STORAGE_QUOTA_MB=50` → 50 × 1024² octets.
MB positif prime sur Go ; MB 0 ou négatif → Go ; Go non positif → 10 Go.
Ordre par clé : **override base > variable d’environnement > défaut intégré** ; enregistrer MB=0 annule l’env et réactive Go.
MB hors plage int64 → repli Go ; overflow Go → 10 Go, pas de quota illimité.

Le défaut n’affecte que les espaces créés ensuite. `storage_quota` explicite (octets) reste prioritaire ; les espaces existants ne sont pas mis à jour seuls.
Pour les mettre à jour : action « Appliquer à tous les espaces existants », confirmation avec MB/Go effectifs.
Écrase tous les quotas, y compris les ajustements individuels.

Pas besoin de modifier la DEFAULT SQL de la colonne : le service écrit des octets explicites, évitant qu’un `ALTER TABLE ... SET DEFAULT` en upgrade soit écrasé par GORM ;
l’ancienne DEFAULT reste pour les insertions SQL hors service.
