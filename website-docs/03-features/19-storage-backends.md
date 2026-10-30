# Backends de stockage (Storage Backends)

Les backends de stockage conservent les fichiers bruts, les images issues de l’analyse et les artefacts exportés. Un espace peut enregistrer plusieurs instances, en désigner une par défaut et choisir un emplacement par base de connaissances.

Le multi-instance convient notamment lorsque :

- des équipes ou projets distincts utilisent des buckets séparés pour l’usage et les droits ;
- la région du bucket doit respecter des contraintes de localisation des données ;
- une migration vers un stockage objet cloud se fait progressivement : nouvelles bases sur le nouveau backend, anciennes fichiers inchangés.

<Screenshot
  src="/screenshots/settings-storage-backends.png"
  caption="Paramètres stockage : liste multi-instance, instance par défaut et test de connectivité"
  hint="Cartes des backends enregistrés (provider, état, marque par défaut) et formulaire création/édition avec résultat « Tester la connexion »." />

## Enregistrer et choisir un backend {#enregistrer-backend}

Un Admin d’espace gère les instances dans « Paramètres → Stockage » :

1. Créer un backend, choisir le provider (`local` / `minio` / `cos` / `tos` / `s3` / `oss` / `ks3` / `obs`, aligné sur les providers du [pipeline documentaire](../02-architecture/03-document-pipeline.md)), renseigner les paramètres de connexion (table ci-dessous). La liste peut être restreinte par `STORAGE_ALLOW_LIST` ; vide = tous disponibles ;
2. **Tester la connexion** : lecture/écriture réelle pour valider point de terminaison, bucket et identifiants ;
3. Définir l’instance par défaut de l’espace. Les nouvelles bases sans instance explicite l’utilisent ;
4. Si besoin, onglet « Stockage » de l’édition de base pour une instance dédiée.

Le backend n’est modifiable que si la base est vide ; avec des fichiers, le sélecteur est désactivé et un message indique la migration. Les chemins dépendent du backend à l’ingestion : un changement direct casse l’accès. Pour changer, créer une nouvelle base et migrer le contenu.

## Paramètres de connexion {#parametres-connexion}

Champs communs à tous les providers ; `access_key_id` / `secret_access_key` chiffrés en base, masqués dans les réponses API.

| Nom | Type | Défaut | Description |
| --- | --- | --- | --- |
| `endpoint` | string | vide | Adresse du service. Obligatoire pour `minio` (`mode=remote`), `tos`, `s3`, `oss`, `ks3`, `obs` ; inutile pour `cos`. Contrôle SSRF à l’enregistrement ; adresses internes via `SSRF_WHITELIST` |
| `region` | string | vide | Région. Obligatoire pour `cos`, `tos`, `s3`, `oss`, `ks3`, `obs` |
| `access_key_id` / `secret_access_key` | string | vide | Clés d’accès ; pour COS = SecretId / SecretKey. Inutiles pour `local` et MinIO `mode=docker` |
| `bucket_name` | string | vide | Bucket, obligatoire sauf `local` |
| `path_prefix` | string | vide | Préfixe de clé objet : chemin relatif, sans `/` initial ni `..` |
| `mode` | string | `remote` | MinIO seulement : `docker` = MinIO du déploiement (`MINIO_ENDPOINT`, etc.), `remote` = MinIO externe |
| `use_ssl` | bool | false | HTTPS pour MinIO, S3, OBS |
| `force_path_style` | bool | false | S3 seulement : style path ; souvent requis pour les services compatibles S3 |
| `app_id` | string | vide | COS seulement : AppID Tencent |
| `temp_bucket_name` / `temp_region` | string | vide | COS, TOS, OSS : bucket/région pour fichiers temporaires ; OSS requiert aussi `use_temp_bucket=true` |

- **OBS** : endpoint en nom de domaine → style virtual-hosted (`<bucket>.<endpoint>`) ; Huawei Cloud refuse le path-style sur domaine depuis 2023-12-30 ; IP → path-style. Sans domaine proxy, URL fichier `<scheme>://<bucket>.<endpoint-host>/<key>`.
- **Timeouts de transfert** : upload/download S3, COS, KS3, OBS, OSS — plus de plafond global 30 s ; durée max 30 min par transfert ; connexion, TLS et en-têtes de réponse restent limités pour échouer vite si le pair disparaît.
- **Redirections KS3** : chaque saut est revu SSRF ; la signature n’est plus relayée vers l’hôte de redirection.

## Différence avec le stockage vectoriel

Fichiers bruts et index de recherche sont gérés séparément :

| | Backend de stockage (Storage Backend) | Stockage vectoriel (Vector Store) |
| --- | --- | --- |
| Contenu | Fichiers bruts, images, exports | Vecteurs et index de recherche |
| Configuration | « Paramètres → Stockage » | « Paramètres → Vector store » |
| Champ base | `storage_backend_id` | `vector_store_id` |
| Chapitre | celui-ci | [Moteurs de recherche et stockage vectoriel](05-retrieval-engines.md) |

## Référence API {#reference-api}

| Méthode | Chemin | Permission |
| --- | --- | --- |
| GET | `/storage-backends/types` | Viewer+, liste des providers autorisés par `STORAGE_ALLOW_LIST` |
| GET | `/storage-backends`、`/storage-backends/:id` | Viewer+ |
| POST | `/storage-backends` | Admin+ |
| PUT / DELETE | `/storage-backends/:id` | Admin+ |
| POST | `/storage-backends/test` | Admin+, test avec paramètres non enregistrés |
| POST | `/storage-backends/:id/test` | Admin+, test instance enregistrée |
| PUT | `/storage-backends/:id/default` | Admin+, défaut de l’espace |

Clé API : capacité `manage_storage_backends` ou full-access.

## Modèle de données et règles de compatibilité {#modele-donnees-contraintes}

Table `storage_backends` (isolation `tenant_id`, suppression logique) :

| Champ | Description |
| --- | --- |
| `name` | Unique dans l’espace (index partiel sous suppression logique) |
| `provider` | Type de stockage |
| `config` | JSONB, clés chiffrées |
| `source` | `user` (UI ou API) / `env` (généré depuis variables d’environnement) |
| `status` | `active` / `disabled` |
| `legacy_alias` | voir ci-dessous |

`legacy_alias` assure la compatibilité avec l’historique configuré par variables d’environnement. À la montée de version, un enregistrement alias permet de résoudre les chemins existants sans déplacer les données. Un seul alias par espace et par provider ; les instances créées manuellement restent distinctes.
