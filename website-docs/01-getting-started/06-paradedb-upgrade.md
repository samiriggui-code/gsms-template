# Mise à niveau ParadeDB (bases existantes)

Les Compose de production et de développement du dépôt utilisent `paradedb/paradedb:v0.25.11-pg17`. Ce document couvre la montée de version **0.22.x → 0.25.11, PostgreSQL restant en 17** ; ce n’est pas une montée de version majeure PostgreSQL, et les autres anciennes versions Helm ne sont pas couvertes telles quelles.

Par rapport à `v0.22.6-pg17`, cette branche apporte PostgreSQL 17.9 → 17.11, pgvector 0.8.1 → 0.8.4 (correctifs de dépassement de tampon lors de la construction HNSW parallèle et de corruption d’index pendant le vacuum HNSW) ainsi que la reprise après crash basée sur le WAL pour pg_search (à partir de 0.24.0, voir paradedb#4901).

> [!WARNING]
> Après remplacement de l’image, il **faut** mettre à jour le catalogue d’extensions pour qu’il corresponde à l’image. Si le catalogue reste sur une ancienne version, certaines fonctions SQL d’extension (par ex. `paradedb.version_info()`) peuvent provoquer un segfault par incompatibilité de signature avec le binaire, entraînant l’arrêt de l’instance PostgreSQL et une reprise. **Ne pas** exécuter `ALTER EXTENSION pg_search UPDATE TO '0.22.6'` sur la nouvelle image : même problème.

## Étapes de mise à niveau

Toutes les commandes s’exécutent à la racine du dépôt. Pour l’environnement de développement, les commandes base de données utilisent `docker compose -f docker-compose.dev.yml` ; le backend de dev sur l’hôte doit être arrêté manuellement — le Compose de dev n’a pas de service `app`. Conservez le volume de données : **n’exécutez pas `down -v`**, ne supprimez pas le volume et ne passez pas à une image PG18.

1. Arrêtez app et tout autre producteur d’écritures sur la base ; si Langfuse est activé, arrêtez aussi web/worker ; arrêtez le backend de dev local s’il tourne.

   ```bash
   # Déploiement standard ; en dev, arrêtez le backend sur l’hôte
   docker compose stop app
   # Uniquement si Langfuse est activé
   docker compose stop langfuse-web langfuse-worker
   ```

2. Sauvegardez toutes les bases et rôles, y compris Langfuse, et vérifiez la restauration. Stockez la sauvegarde en dehors du volume de données.

   ```bash
   umask 077
   docker compose exec -T postgres sh -c 'pg_dumpall -U "$POSTGRES_USER"' > paradedb-before-upgrade.sql
   ```

   Si l’ancienne image ne démarre pas sur le CPU actuel, snapshottez d’abord le volume à l’arrêt, produisez une sauvegarde logique sur une machine compatible ou validez la restauration du snapshot, puis modifiez la seule copie des données.

3. Avec le Compose mis à jour, remplacez uniquement le conteneur base de données :

   ```bash
   docker compose pull postgres
   docker compose up -d --no-deps --wait postgres
   ```

4. Terminez la mise à niveau SQL des extensions. Remplacer l’image seule ne met pas à jour `pg_extension` dans les bases existantes. La nouvelle image inclut la chaîne complète de scripts depuis 0.22.x ; toute 0.22.x peut monter d’un coup vers la version par défaut de l’image :

   ```bash
   docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' <<'SQL'
   ALTER EXTENSION pg_search UPDATE;
   ALTER EXTENSION vector UPDATE;
   SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_search', 'vector');
   SELECT * FROM paradedb.version_info();
   SQL
   ```

   Exécutez la même chose dans **toute autre base** où `pg_search` ou `vector` est installé (y compris `postgres`, modèles ou base Langfuse). N’installez pas d’extension sur des bases qui n’en ont pas besoin. Le catalogue `pg_search` et `paradedb.version_info()` doivent indiquer 0.25.11, `vector` 0.8.4.

5. Redémarrez les services d’écriture, vérifiez l’état des migrations WeKnora, testez recherche par mots-clés et vectorielle. Les index BM25 et HNSW existants restent utilisables sans réimport complet ; en cas d’anomalie, `REINDEX`. Gardez la sauvegarde jusqu’à validation.

## Périmètre des migrations automatiques

Au démarrage, WeKnora ne met à niveau les extensions que dans sa base, respecte `app.skip_embedding`, n’installe pas d’extensions manquantes, ne rétrograde pas et ne gère pas d’autres lignes de version :

- `000115` : `pg_search` installé en 0.22.0–0.25.10 et serveur en 0.25.11 → montée en 0.25.11 ; `vector` installé en 0.8.0–0.8.3 et serveur en 0.8.4 → montée en 0.8.4.
- `000099` : migration historique ; ne s’applique que si le serveur fournit le paquet 0.22.6 (image `v0.22.6-pg17`) pour monter 0.22.2–0.22.5 → 0.22.6 ; ignorée sur la nouvelle image, déléguée à `000115`.

Si ces migrations ont déjà tourné **avant** le remplacement de l’image base, elles ne se relancent pas automatiquement après la nouvelle image : exécutez le SQL ci-dessus. Les anciennes versions sans migration correspondante aussi. Les extensions dans d’autres bases ne sont pas gérées par WeKnora.

## Rollback et validation

Le rollback repose sur restauration de la sauvegarde/snapshot d’avant montée vers un volume isolé avec l’ancienne image. Revenir seulement à l’ancien tag d’image n’annule pas les changements SQL d’extension ; depuis pg_search 0.24, des enregistrements WAL de gestionnaire de ressources personnalisés empêchent la relecture par l’ancienne image. Les fichiers down de migration ne rétrogradent pas les extensions.

Le dépôt fournit un script de validation isolé (par défaut 0.22.2 → 0.25.11, ou `--to 0.22.6` pour un patch historique) :

```bash
docker pull paradedb/paradedb:v0.22.2-pg17
docker pull paradedb/paradedb:v0.25.11-pg17
python3 scripts/test_paradedb_upgrade.py
```

Le script utilise conteneurs et volumes temporaires sans port mappé ; il valide montée sur le même volume, contenu des tables, recherche mots-clés/vecteur, idempotence des migrations et stabilité après redémarrage, avec logs et sauvegarde. Jeu de test fixe : en production, validez aussi vos données et charge de recherche.
