# FAQ, dépannage et montées de version

Commencez par « Paramètres → Informations système » : version de l’application, état des migrations base de données et connexions aux dépendances, puis consultez les logs du service concerné. Les commandes Compose ci-dessous s’exécutent à la racine du dépôt ; en développement local, les services de dépendances utilisent `docker compose -f docker-compose.dev.yml`, les logs app sont sur le terminal hôte ou un fichier — le Compose de dev n’a pas de service `app`.

```bash
docker compose ps
docker compose logs --tail=200 app
docker compose logs --tail=200 docreader
docker compose logs --tail=200 postgres redis
```

Après modification de `.env`, recréez le conteneur avec `docker compose up -d <service>` ; `docker compose restart` ne recharge pas les variables d’environnement du conteneur.

## Par symptôme

| Symptôme | Ordre de vérification |
| --- | --- |
| Échec d’upload, parsing bloqué en cours | Raison d’échec et trace de parsing sur la fiche document → connectivité moteur de parsing → file de tâches ; voir [Parsing documentaire](../03-features/03-document-parsing.md) et [Tâches asynchrones](../02-architecture/05-async-tasks.md) |
| Images visibles en local, inaccessibles ailleurs | Vérifier si l’URL renvoyée contient `localhost`, un nom de service conteneur ou un stockage objet inaccessible ; les clients tiers recevant `resource://` doivent suivre [Accès aux fichiers](../03-features/21-file-access.md), pas l’utiliser comme URL d’image directe |
| La config revient à l’ancienne valeur après enregistrement | Cache proxy/navigateur, autre environnement ou changement d’espace ; modèles intégrés : synchro YAML au démarrage ; voir [Gestion des modèles](../03-features/06-models.md) |
| Droits insuffisants après montée de version | Rôle dans l’espace, propriété des ressources, périmètre des capacités de la clé API ; voir [Auth et autorisation](../03-features/01-tenant-auth.md). Admin plateforme ≠ Owner d’espace |
| L’agent indique que le modèle n’est pas prêt | Le modèle référencé existe et est complet ; test de connectivité ; voir [Gestion des modèles](../03-features/06-models.md) |
| Connexion refusée vers source de données, modèle ou vecteur en réseau privé | Politique SSRF et ports ; voir [Configuration](04-configuration.md) pour n’autoriser que les cibles nécessaires |
| Message « sortie autorisée uniquement via liste blanche » | `SSRF_DNS_WHITELIST_ONLY` actif : hôtes hors liste rejetés avant résolution DNS. Ajoutez la cible à `SSRF_WHITELIST` ou `SSRF_WHITELIST_EXTRA`, reconstruisez app / docreader ; voir [Configuration détaillée](04-configuration.md) |
| Login renvoie du HTML 404 | `SEARXNG_PORT` identique à `APP_PORT` (8080 par défaut). Sous Linux, SearXNG sur `127.0.0.1:8080` intercepte `localhost:8080`. Gardez SearXNG sur 8888 ou un port libre |
| Pull MinIO : `pull access denied` ou `401 UNAUTHORIZED` | MinIO a fermé le pull anonyme sur Docker Hub et quay.io. Compose et Helm actuels utilisent `pgsty/minio` ; alignez vos fichiers d’orchestration |
| Après montée : embed ou liens signés invalides (`embed session signing key is not configured`, log `[startup-env] no usable signing key`) | Clé de signature : `SYSTEM_SIGNING_KEY`, sinon repli sur `SYSTEM_AES_KEY` ; clés d’exemple ou &lt; 16 caractères ne signent pas. Générez avec `openssl rand -hex 32` et configurez `SYSTEM_SIGNING_KEY` **sans changer `SYSTEM_AES_KEY`** (sinon déchiffrement des secrets impossible). v0.8.2 a changé l’algorithme : sessions embed antérieures invalides, visiteurs à repasser ; multi-réplicas : même clé partout |
| Après montée : le bot DingTalk ne répond plus | Depuis v0.8.2, DingTalk en mode Stream uniquement ; la migration passe `webhook` → `websocket`. Activez Stream dans la console développeur DingTalk ; voir [Intégration IM](../03-features/12-im-integration.md) |
| File de tâches qui s’accumule | Âge de la plus vieille tâche, workers actifs, quotas aval ; plus de workers ≠ plus de quota fournisseur ; voir [Dimensionnement](../02-architecture/05-async-tasks.md#capacity-planning) |
| Skill dans le catalogue mais non exécutable | Catalogue ≠ installation sandbox ; vérifiez l’installation, le sandbox de l’agent et le périmètre des skills ; voir [Skills et sandbox](../03-features/22-skills-sandbox.md) |
| Sandbox Local introuvable après montée | Backend `local` retiré ; reconfigurez Docker, CubeSandbox ou E2B ; voir [Déploiement sandbox](../06-development/04-sandbox-deployment.md) |
| Navigateur local appairé mais pas de tâche web | Activer le navigateur local dans l’entrée de raisonnement intelligent ; reprendre les tâches en pause ; voir [Navigateur local](../05-clients/09-local-browser.md) |
| Page embed en échec ou 403 | Liste blanche avec l’Origin réel ; CSP, proxy inverse, exchange en mode sécurisé ; voir [Canal embed](../03-features/13-embed-channel.md) |
| Test Feishu OK mais dossiers vides | Le test valide l’app, pas les dossiers — autorisation dossier requise ; voir [Feishu Drive](../03-features/24-feishu-drive.md) |

## Échec des migrations base de données {#database-migrations}

Par défaut, l’app migre au démarrage. Un échec n’empêche pas toujours le démarrage : une page qui s’ouvre ne garantit pas un schéma à jour. Version de migration, drapeau dirty et erreurs dans les infos système, plus les logs au démarrage d’app, sont le point d’entrée.

**Ne supposez pas un rollback complet après échec.** L’état réel dépend des transactions SQL et du point d’échec. Avant restauration : logs, sauvegarde, comparer le fichier de migration en échec au schéma réel ; ne sautez pas l’erreur en supprimant le volume ou en modifiant le numéro de version.

PostgreSQL : `migrations/versioned/` ; SQLite : `migrations/sqlite/`. Les commandes Make ci-dessous ciblent PostgreSQL ; pour Lite SQLite, utilisez le driver et le répertoire correspondants, pas un DSN PostgreSQL.

```bash
make migrate-version
```

Contrôle en lecture seule sur la base cible :

```sql
SELECT version, dirty FROM schema_migrations;
-- Les deux lignes suivantes : PostgreSQL uniquement
SELECT version();
SELECT extname, extversion FROM pg_extension;
```

### Extensions manquantes ou droits insuffisants

`gin_trgm_ops` absent → souvent `pg_trgm` ; type `vector` absent → pgvector ; BM25 dépend de `pg_search` ParadeDB. Confirmez la base réellement utilisée ; l’admin vérifie paquets, extensions et propriété des objets.

```sql
SELECT name, default_version, installed_version
FROM pg_available_extensions
WHERE name IN ('pg_trgm', 'vector', 'pg_search');
```

Paquet OS absent ≠ droits SQL insuffisants ; `CREATE EXTENSION IF NOT EXISTS` n’installe pas le paquet système ni ne met à niveau une extension existante. N’installez que ce que le déploiement exige ; n’imposez pas le moteur PostgreSQL si vous utilisez un moteur externe.

Montée ParadeDB sur base existante : [Mise à niveau ParadeDB](06-paradedb-upgrade.md).

### État dirty

`AUTO_RECOVER_DIRTY` (défaut activé) tente de réinitialiser la version et relancer au démarrage. C’est un mécanisme de retry, pas une correction d’extension manquante, d’espace disque ou de schéma modifié à la main.

En recovery manuel : arrêtez les écritures, vérifiez si la migration partielle a laissé des changements. N’utilisez `force` que si la base correspond à la dernière version réussie et que la migration peut être relancée sans risque. **`force` ne modifie que le marqueur de version, pas de rollback SQL.** Exemple si la dernière version confirmée est 98 :

```bash
make migrate-force version=98
make migrate-up
```

Remplacez 98 par la version réellement confirmée, pas « numéro d’erreur − 1 ». Échec de migration initiale : vérifiez aussi l’état d’initialisation. Redémarrez app, confirmez l’absence d’erreur dans les infos système et testez les fonctions impactées.

### Index concurrent interrompu

La migration `000106` crée un index sur `messages` avec `CREATE INDEX CONCURRENTLY` (écritures non bloquées). Interruption (redémarrage, timeout, disque plein) peut laisser `idx_messages_session_created_id` INVALID ; `IF NOT EXISTS` ne le reconstruit pas. Supprimez l’index invalide, restaurez l’état de migration, relancez :

```sql
SELECT indexrelid::regclass, indisvalid FROM pg_index
WHERE indexrelid = 'idx_messages_session_created_id'::regclass;
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_session_created_id;
```

### Espace disque et écart de schéma

La construction d’index consomme de l’espace temporaire. Sur `No space left on device`, vérifiez volume de données et répertoires temporaires, libérez, puis reprenez selon l’état réel des migrations.

Si colonnes, index ou contraintes ne correspondent pas à la migration, comparez au fichier en échec et à la dernière version réussie ; n’exécutez pas en boucle le SQL en erreur en production. Pour reproduire des écritures, testez d’abord sur une base isolée restaurée depuis sauvegarde.

## Informations à fournir lors d’un signalement

Version/commit de l’app, heure de l’échec, message complet, type et version de base, version/dirty des migrations, configuration non par défaut pertinente. Anonymisez tokens, mots de passe, chaînes de connexion et contenu documentaire dans les logs. Implémentation des migrations et développement : [Base de données et migrations](../06-development/02-database-schema.md).
