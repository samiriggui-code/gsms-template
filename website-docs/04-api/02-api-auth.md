# Référence API : authentification et utilisateur

Fournit l’inscription, la connexion, le renouvellement de jetons, le profil et le traitement des invitations. Les exigences d’authentification varient selon l’interface ; les points publics sont indiqués dans chaque entrée.

Sauf mention contraire, ce groupe exige uniquement « connecté » après le middleware d’authentification (sans seuil de rôle). Les interfaces sans authentification sont décrites dans chaque entrée.

## Authentification (`/api/v1/auth`)

### POST /api/v1/auth/register

Rôle : Inscrire un nouvel utilisateur (mode auto-inscription). Sans authentification. Handler : `internal/handler/auth.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `username` | string | oui | Nom d’utilisateur, 2–50 caractères |
| `email` | string | oui | Adresse e-mail |
| `password` | string | oui | Mot de passe (8–32 caractères, lettres + chiffres ; en mode complexe, majuscules/minuscules et caractères spéciaux requis) |

La création automatique d’un espace personnel dépend de `auth.default_tenant_mode` côté serveur ; le corps de requête ne peut pas la forcer. En modes `invite_register` (inscription sur invitation uniquement) et `invite_only` (inscription interdite), renvoie 403.

Réponse : 201 `{"success":true,"message":"...","user":{User}}`

```bash
curl -X POST $BASE/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"alice","email":"a@ex.com","password":"secret123"}'
```

### POST /api/v1/auth/register-by-invite

Seuls les modes `self_serve` et `invite_register` autorisent l’inscription via un lien d’invitation valide ; le mode `invite_only` renvoie 403.

Rôle : S’inscrire via un token de lien d’invitation/partage et rejoindre l’espace. Sans authentification, limitation IP 30 requêtes/minute. Handler : `internal/handler/auth_register_by_invite.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `token` | string | oui (`binding:"required"`) | Token d’invitation |
| `email` | string | oui (`binding:"required,email"`) | Adresse e-mail |
| `username` | string | oui (`binding:"required"`) | Nom d’utilisateur |
| `password` | string | oui (`binding:"required,min=6"`) | Mot de passe (8–32 caractères, lettres + chiffres ; en mode complexe, majuscules/minuscules et caractères spéciaux requis) |

Réponse : 201, identique à Login (`user/active_tenant/memberships/token/refresh_token`).

```bash
curl -X POST $BASE/api/v1/auth/register-by-invite -H 'Content-Type: application/json' \
  -d '{"token":"<invite_token>","email":"a@ex.com","username":"alice","password":"secret123"}'
```

### POST /api/v1/auth/invitations/lookup

Rôle : Consulter anonymement l’espace associé à un token d’invitation (aperçu avant inscription). Sans authentification, limitation IP. Handler : `internal/handler/auth_register_by_invite.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `token` | string | oui (`binding:"required"`) | Token d’invitation |

Réponse : 200 `{"success":true,"data":{"tenant_id","tenant_name","role","expires_at"}}`

```bash
curl -X POST $BASE/api/v1/auth/invitations/lookup -H 'Content-Type: application/json' -d '{"token":"<invite_token>"}'
```

### POST /api/v1/auth/login

Rôle : Connexion par e-mail et mot de passe. Sans authentification. Handler : `internal/handler/auth.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `email` | string | oui (`binding:"required"`) | Adresse e-mail |
| `password` | string | oui (`binding:"required"`) | Mot de passe |

Réponse : 200 `{"success":true,"user":{...},"active_tenant":{...},"memberships":[...],"token":"...","refresh_token":"..."}`

```bash
curl -X POST $BASE/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"a@ex.com","password":"secret123"}'
```

### POST /api/v1/auth/auto-setup

Rôle : Création automatique de compte, d’espace et connexion pour le client bureau Lite natif. Doit inclure le `X-WeKnora-Desktop-Token` aléatoire par processus fourni par le pont bureau natif ; les requêtes HTTP anonymes sont refusées. Les navigateurs classiques utilisent inscription/connexion. Handler : `internal/handler/auth.go`

Réponse : 200, identique à Login ; identifiants bureau manquants ou invalides → 401.

### GET /api/v1/auth/config

Rôle : Lire la configuration d’authentification (mode d’inscription, etc.). Sans authentification. Handler : `internal/handler/auth.go`

Réponse : 200 `{"success":true,"registration_mode":"self_serve|invite_register|invite_only","complex_password_enabled":false}`

```bash
curl $BASE/api/v1/auth/config
```

### POST /api/v1/auth/switch-tenant

Rôle : Changer l’espace actif et émettre de nouveaux jetons. Connexion requise (appel possible sans espace). Handler : `internal/handler/auth.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `tenant_id` | uint64 | oui (`binding:"required"`) | ID de l’espace cible |
| `refresh_token` | string | non | Utilisé pour émettre de nouveaux jetons |

Réponse : 200, identique à Login.

En cas de succès, l’espace cible est enregistré dans la préférence compte « dernier espace actif » ; la prochaine connexion (mot de passe/OIDC/nouvel appareil) et le refresh reviennent sur cet espace. Le JWT refresh ne contient pas `tenant_id` : si l’écriture de la préférence échoue, tout le changement échoue et aucun nouveau jeton n’est émis. Les clients API n’ont plus besoin d’appeler `PUT /auth/me/preferences`. L’UI Web ne passe pas par cette interface pour changer d’espace. Un changement modifie le point d’atterrissage au prochain login pour tous les appareils de l’utilisateur.

```bash
curl -X POST $BASE/api/v1/auth/switch-tenant -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"tenant_id":2}'
```

### GET /api/v1/auth/oidc/config

Rôle : Indiquer si OIDC est activé et son libellé. Sans authentification. Handler : `internal/handler/auth.go`

Réponse : 200 `{"success":true,"enabled":bool,"provider_display_name":"..."}`

```bash
curl $BASE/api/v1/auth/oidc/config
```

### GET /api/v1/auth/oidc/start

Sans connexion préalable : renvoie directement 302 et un en-tête Location vers l’IdP, utilisable depuis un portail entreprise. Inutile de demander d’abord une URL JSON ; le callback est construit depuis l’origin de la requête vers `/api/v1/auth/oidc/callback`. Le résultat après callback est identique à la chaîne OIDC d’origine.

```bash
curl -i "$BASE/api/v1/auth/oidc/start"
```

### GET /api/v1/auth/oidc/url

Rôle : Obtenir l’URL de redirection d’autorisation OIDC. Sans authentification. Handler : `internal/handler/auth.go`

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `redirect_uri` | string | oui | URL de callback |

Réponse : 200 `{"success":true,"authorization_url":"...","nonce":"..."}`

```bash
curl "$BASE/api/v1/auth/oidc/url?redirect_uri=https://app.example.com/callback"
```

### GET /api/v1/auth/oidc/callback

Rôle : Callback d’autorisation OIDC (redirection navigateur). Sans authentification. Handler : `internal/handler/auth.go`

Paramètres de requête : `code`, `state`, `error`, `error_description` (renvoyés par le fournisseur OIDC).

Réponse : 302 vers le frontend ; succès avec `#oidc_result=<base64url>`, échec avec `#oidc_error=...`.

```bash
curl -i "$BASE/api/v1/auth/oidc/callback?code=xxx&state=yyy"
```

### POST /api/v1/auth/refresh

Rôle : Échanger un refresh token contre de nouveaux jetons. Sans authentification. Handler : `internal/handler/auth.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `refreshToken` | string | oui (`binding:"required"`) | Refresh token |

Réponse : 200 `{"success":true,"access_token":"...","refresh_token":"..."}`

```bash
curl -X POST $BASE/api/v1/auth/refresh -H 'Content-Type: application/json' -d '{"refreshToken":"<rt>"}'
```

### GET /api/v1/auth/validate

Rôle : Vérifier que le jeton courant est valide. Connexion requise (appel possible sans espace). Handler : `internal/handler/auth.go`

Réponse : 200 `{"success":true,"message":"Token is valid","user":{UserInfo}}`

```bash
curl $BASE/api/v1/auth/validate -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/auth/logout

Rôle : Déconnexion (invalidation du jeton courant). Connexion requise. Sans corps. Handler : `internal/handler/auth.go`

Réponse : 200 `{"success":true,"message":"Logout successful"}`

```bash
curl -X POST $BASE/api/v1/auth/logout -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/auth/me

Rôle : Identité de l’appelant (utilisateur/espace/memberships/capacités). Connexion requise ; clé API acceptée aussi (stratégie `apiKeyAny()`, toute clé valide). Handler : `internal/handler/auth.go`

Réponse : 200 `{"success":true,"data":{"user":{UserInfo},"tenant":{TenantResponse},"memberships":[...],"tenant_required":bool,"capabilities":{"can_create_tenant":bool,"auto_accept_invitation":bool}}}`

```bash
curl $BASE/api/v1/auth/me -H "X-API-Key: $API_KEY"
```

### PUT /api/v1/auth/me/preferences

Rôle : Mettre à jour les préférences personnelles (dernier espace actif). Connexion requise. Handler : `internal/handler/auth.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `last_active_tenant_id` | *uint64 | non | Entier positif pour définir/remplacer ; `0` pour effacer (prochain login sur l’espace home) ; omis = inchangé. Un `POST /auth/switch-tenant` réussi écrit le même champ côté serveur. |

Réponse : 200 `{"success":true,"data":{UserPreferences}}`

```bash
curl -X PUT $BASE/api/v1/auth/me/preferences -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"last_active_tenant_id":2}'
```

La politique de mot de passe est exposée via `GET /auth/config`. En mode complexe, les caractères spéciaux autorisés sont `!@#$%^&*()_+-=[]{}|;:,.<>?` ; ne pas déduire toutes les règles uniquement des tags binding de longueur du struct.

### POST /api/v1/auth/change-password

Rôle : Changer le mot de passe. Connexion requise. Handler : `internal/handler/auth.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `old_password` | string | oui (`binding:"required"`) | Ancien mot de passe |
| `new_password` | string | oui (`binding:"required"`) | Nouveau mot de passe (8–32 caractères, lettres + chiffres ; en mode complexe, majuscules/minuscules et caractères spéciaux requis) |

Réponse : 200 `{"success":true,"message":"Password changed successfully"}`

```bash
curl -X POST $BASE/api/v1/auth/change-password -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"old_password":"old","new_password":"NewPass123!"}'
```

L’ancien mot de passe correct est obligatoire ; le nouveau ne peut pas être identique à l’ancien. Succès → révocation de toutes les sessions, reconnexion nécessaire. Par défaut : 8–32 caractères, lettres et chiffres ; mode complexe : majuscules, minuscules, chiffres et caractères spéciaux. Détails d’erreur possibles : `invalid_old_password`, `password_policy`, `same_password`, tous en 400.

### POST /api/v1/me/invitations/accept-by-token

Connexion requise ; agit uniquement sur l’utilisateur courant ; un nouvel utilisateur sans espace peut appeler. Corps `{"token":"<invite-token>"}` ; une invitation de partage valide fait rejoindre l’espace correspondant. Lien invalide, expiré ou révoqué → 410 ; token vide → 400. Succès : `{success:true,data:{membership:{tenant_id,role,status,joined_at},tenant_name}}`, le frontend peut basculer d’espace.

```bash
curl -X POST "$BASE/api/v1/me/invitations/accept-by-token" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"token":"<invite-token>"}'
```

## Mes invitations (`/api/v1/me/invitations`)

La couche service garantit « seul l’invité peut accepter/refuser » ; pas de seuil de rôle (nouvel utilisateur sans espace inclus). Handler : `internal/handler/tenant_invitation.go`

### GET /api/v1/me/invitations

Rôle : Lister les invitations qui me sont adressées.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `include_terminal` | bool | non | Si `true`, inclut les invitations terminées |

Réponse : 200 `{"success":true,"data":{"invitations":[TenantInvitationResponse],"total":N}}`

```bash
curl $BASE/api/v1/me/invitations -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/me/invitations/pending-count

Rôle : Nombre d’invitations en attente (sondage léger).

Réponse : 200 `{"success":true,"data":{"pending_count":N}}`

```bash
curl $BASE/api/v1/me/invitations/pending-count -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/me/invitations/:inv_id/accept

Rôle : Accepter l’invitation et créer la membership. Paramètre de chemin : `inv_id` — ID d’invitation. Sans corps.

Réponse : 200 `{"success":true,"data":{"membership":{"tenant_id","role","status","joined_at"}}}`

```bash
curl -X POST $BASE/api/v1/me/invitations/12/accept -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/me/invitations/:inv_id/decline

Rôle : Refuser l’invitation. Paramètre de chemin : `inv_id`. Sans corps.

Réponse : 200 `{"success":true}`

```bash
curl -X POST $BASE/api/v1/me/invitations/12/decline -H "Authorization: Bearer $TOKEN"
```

## Référence d’implémentation

Enregistrement des routes : `RegisterAuthRoutes` et `RegisterMyInvitationRoutes` dans `internal/router/routes_auth_tenant.go`. Handler : `internal/handler/auth.go`, `internal/handler/auth_register_by_invite.go`, `internal/handler/tenant_invitation.go`.
