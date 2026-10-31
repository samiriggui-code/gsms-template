# Intégration Seafile

`seafile` synchronise vers la base de connaissances les répertoires et fichiers cochés d’une bibliothèque Seafile, avec planification, incrémental, reprise et rapprochement des suppressions source. Baseline compatible : Seafile Community Server 10.0.1 (API api2). Flux général : [Synchronisation des sources de données](10-datasource.md).


<Screenshot src="/screenshots/datasource-seafile.png" caption="Source Seafile : adresse du service et jeton API" hint="Configuration Seafile et arborescence ; masquer le token et l’adresse réelle." />

## Compte et jeton API

Utilisez un compte pouvant se connecter à Seafile avec au moins lecture sur la bibliothèque cible ; le périmètre sync suit les droits du compte. Les identifiants sont le jeton API utilisateur ; le connecteur ne gère ni mot de passe, ni SSO, ni jeton dédié bibliothèque.

Sur Seafile 10.0.1, « Web API Auth Token » dans les paramètres personnels est masqué par défaut : l’admin doit définir `ENABLE_GET_AUTH_TOKEN_BY_SESSION = True` dans `seahub_settings.py` et redémarrer Seahub. Sinon `POST /api2/auth-token/` avec identifiants ; avec 2FA, fournir le code selon `X-Seafile-OTP` dans la réponse.

Le test WeKnora appelle `/api2/auth/ping/` ; visibilité bibliothèque et dossiers à la charge de l’arborescence.

## Configuration dans la base de connaissances

1. Paramètres KB → Sources de données → Nouveau, « Seafile ».
2. Adresse Seafile et jeton API, test de connexion. L’adresse peut inclure un préfixe de déploiement, ex. `https://example.com/seafile`.
3. Cocher racine bibliothèque, dossier ou fichier. Le premier niveau liste les bibliothèques non chiffrées accessibles ; expansion progressive ; une source = une bibliothèque, une seconde est refusée.
4. Full/incrémental, planification, conflits, sync suppression ; sauvegarder puis sync manuelle test, logs et parsing.

Cocher un dossier = sync récursive (nouveaux fichiers/sous-dossiers inclus) ; un fichier = ce fichier seul ; enfant couvert par parent = garder le parent. Le sélecteur n’affiche que les extensions importables WeKnora ; `.zip` etc. absents et non synchronisés.

## Réseau et SSRF

| Requête | Cible | Jeton |
| --- | --- | --- |
| API (`/api2/…`) | Adresse Seafile configurée | Oui, `Authorization: Token` |
| Téléchargement fichier | Lien fileserver renvoyé par Seafile, souvent `/seafhttp/…` sur le même domaine, parfois domaine séparé | Non |

Les deux passent la validation SSRF. Seafile en réseau privé ou fileserver sur domaine dédié : ajouter l’hôte à `SSRF_WHITELIST` dans `.env`, sinon « base_url SSRF validation failed » à la sauvegarde, ou `seafile_ssrf_blocked` dans les logs.

## Arborescence, formats et taille

Les fichiers arrivent sous `<nom bibliothèque>/<chemin dans la bibliothèque>` avec étiquette source « Seafile ». Le nom bibliothèque est figé au premier sync dans le curseur ; renommer dans Seafile ne change pas le dossier KB ni ne re-télécharge. Nettoyage caractères illégaux segment par segment.

Formats alignés sur l’upload KB (PDF, Office, Markdown, HTML, images, audio courants), voir `internal/utils/import_filetypes.go`. Images : VLM configurée sur la KB ; audio : ASR ; sinon échec d’ingestion dans les logs sync, autres fichiers inchangés.

Plafond fichier = `MAX_FILE_SIZE_MB` (défaut 50 MiB) : trop gros = `seafile_file_too_large` sans téléchargement ; dépassement en cours de download = rejet sans troncature. Augmenter la valeur exige aussi `DOCREADER_GRPC_MAX_FILE_SIZE_MB` et redémarrage app, docreader, frontend, sinon download OK mais rejet gRPC au parsing.

## Comportement de synchronisation

Empreinte par fichier « ID objet + mtime + taille » dans le curseur ; identiques = pas de re-téléchargement ; changement = re-download et remplacement (suppression puis création, doc brièvement indisponible pendant parsing). Tour sans changement = scan répertoires uniquement.

| Action source | Comportement |
| --- | --- |
| Nouveau fichier ou sous-dossier | Pris au prochain sync |
| Contenu modifié | Re-téléchargement et mise à jour |
| Fichier supprimé | Entrée KB supprimée si « sync suppression » activée, sinon retrait du curseur seulement |
| Renommage, déplacement ou hors périmètre | Nouveau chemin importé comme nouveau ; ancien chemin traité comme suppression ; pas de conservation d’ID entrée KB |
| Dossier/fichier coché supprimé ou renommé | Erreur, arrêt du tour, aucune suppression ; re-sélectionner le périmètre |
| Bibliothèque renommée | Inchangé, nom dossier = premier sync |

Gestion des échecs :

| Cas | Comportement |
| --- | --- |
| Fichier 403/404/5xx, réseau, taille, vide, changement pendant download | Entrée en échec, autres fichiers continuent ; chemin reste au curseur, retry au prochain sync |
| Liste dossier 403/404/5xx ou réponse malformée | Sauvegarde progrès puis arrêt, aucune suppression ce tour |
| 429/502/503/504 ou réseau temporaire | Jusqu’à 3 tentatives, backoff 1s, 2s ; `Retry-After` ≤ 60s respecté, sinon arrêt du tour |
| Token invalide (401/403) | Erreur identifiants, source en état erreur |

Checkpoint tous les 50 changements de curseur, avant suppressions et en fin ; après timeout/interruption, reprise au dernier checkpoint sans re-télécharger ce qui est déjà sauvé. Première sync massive peut s’étaler sur plusieurs tâches. Full sync forcé re-télécharge tout en gardant l’ancien curseur pour rapprochement suppressions.

« Retry connecteur » (re-download échec) ≠ « reprise ingestion/parsing » (fichier soumis mais parsing/index échoué, retry côté KB, échec d’ingestion dans les logs sync).

Codes d’erreur des logs sync :

| Code | Signification |
| --- | --- |
| `seafile_permission_denied` | Compte du token sans droit sur fichier/dossier |
| `seafile_not_found` | Fichier disparu après scan ; retry au prochain sync, puis rapprochement si « sync suppression » |
| `seafile_file_too_large` | Dépasse `MAX_FILE_SIZE_MB` |
| `seafile_empty_file` | Fichier vide, ignoré |
| `seafile_source_changed` | Fichier modifié pendant download, retry au prochain sync |
| `seafile_invalid_response` | Réponse Seafile illisible, souvent version ou reverse proxy |
| `seafile_ssrf_blocked` | URL download bloquée par SSRF |
| `seafile_fetch_failed` | Autre échec fetch, retry au prochain sync |

## Précautions

- Source déjà synchronisée : ne pas rebinder une autre bibliothèque — le prochain sync échoue avec « this data source already synced Seafile library … » et curseur inchangé ; créer une nouvelle source. Désélectionner avant sauvegarde pour changer de bibliothèque.
- Rapprochement suppressions incomplet : tour avec échec scan ne supprime rien ; suppressions pendant « sync suppression » off ne sont pas rattrapées à la réactivation.
- Supprimer/recréer la source ne nettoie pas les entrées KB importées.
- Bibliothèques chiffrées absentes du sélecteur ; SeaDoc, attributs custom et sync bidirectionnelle hors périmètre.

## Problèmes courants

| Symptôme | Action |
| --- | --- |
| SSRF à la sauvegarde identifiants | Adresse privée ou port bloqué → `SSRF_WHITELIST` |
| « Seafile library … not found » | Compte ne voit pas la bibliothèque ou bibliothèque supprimée |
| « encrypted Seafile libraries are not supported » | Bibliothèque chiffrée sélectionnée |
| Nombreux `seafile_ssrf_blocked` | Domaine fileserver ≠ API, non whitelisté |
| `seafile_file_too_large` | Augmenter `MAX_FILE_SIZE_MB` et `DOCREADER_GRPC_MAX_FILE_SIZE_MB`, redémarrer |
| Fichier téléchargé, parsing entrée échoué | Problème ingestion ; VLM/ASR et logs DocReader |
| « this data source already synced Seafile library … » | Rebind bibliothèque ; restaurer ou nouvelle source |

Référence implémentation : `internal/datasource/connector/seafile/` et `internal/application/service/datasource_service.go`.
