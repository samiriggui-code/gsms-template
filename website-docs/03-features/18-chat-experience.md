# Sessions et expérience de chat

Dans une session, vous interrogez une base de connaissances ou des pièces jointes, consultez les sources et prévisualisez les fichiers produits par l’agent. Pendant la génération, vous pouvez affiner la demande ; sur l’historique, bifurquer ou rembobiner depuis n’importe quel message. Le sommaire des questions et la recherche historique servent à retrouver un échange ; « Copier en Markdown » exporte la conversation complète.

## Assistant et progression des tâches

[L’assistant WeKnora](26-weknora-assistant.md) s’ouvre depuis la barre latérale, avec historique dédié. Les tâches multi-agents basculent entre dialogue principal et sous-tâches (sorties et actions en attente). Les cartes d’approbation restent utilisables après rechargement ; règles dans [Permissions d’exécution et approbations](28-agent-permissions.md).

Les commandes Shell longues peuvent tourner en arrière-plan : carte avec état, sortie et annulation. Vous pouvez continuer à affiner pendant l’attente. Après annulation ou interruption, vérifier le résultat avant de relancer pour éviter de répéter une action déjà effective.

## Réponses et sources

Après une question, une barre de progression couvre analyse des pièces jointes, recherche, outils et génération. En mode raisonnement intelligent : pensée repliable, sorties de commandes et progression d’écriture de fichiers.

Les citations dans le corps mènent aux chunks source ; le panneau latéral liste les sources de la tour, y compris le Wiki. Si l’agent désactive les citations inline, le panneau reste disponible. Suggestions de relance en fin de réponse : voir [Moteur Agent](07-agent.md).

Clic sur une citation base de connaissances : le panneau ouvre le fichier source, position et surlignage :

| Format source | Localisation |
| --- | --- |
| PDF (texte) | Page + encadrement du passage |
| PDF (scan) | Page ; encadrement si MinerU / PaddleOCR-VL |
| Word | Scroll vers paragraphe ou tableau |
| PPT | Diapositive + surlignage texte |
| Excel / CSV | Ligne surlignée |
| Markdown / TXT / EPUB | Scroll (EPUB : chapitre d’abord) |
| Audio | Lecture depuis l’horodatage cité (segments ASR, ex. whisper-1) |
| Import web | Extrait + lien vers le fragment sur la page |

Le surlignage cible la phrase citée. Documents indexés avant cette fonctionnalité : recherche textuelle ou message ; reparse pour précision. Saisie manuelle et FAQ : pas de fichier original, liste de citations. « Toutes les citations » en haut du panneau ; « Voir l’original » sur les cartes. Canaux embed : pas de lecture fichier, liste seulement.

<Screenshot
  src="/screenshots/chat-source-location.png"
  caption="Chat : clic citation vers la source"
  hint="Réponse avec citations et PDF/Office ouvert à droite, passage surligné, retour vers toutes les citations." />

Après recherche en Q&R rapide, en attente du modèle : « Connexion au modèle et génération… » ; sans recherche : « Préparation de la réponse… ». Au-delà de 60 s : « Réponse lente, toujours en attente… ». Indication d’attente uniquement ; contenu réel = retour effectif.

Troncature limite de sortie : icône dans la barre d’outils de la réponse. Réduire la question ou augmenter la longueur max dans la config agent.

## Mentions et réponses non lues

`@` ouvre la recherche des bases, documents, tags, skills et MCP autorisés par l’agent. La barre latérale marque les sessions avec réponses non lues. La confirmation de rembobinage décrit les messages supprimés et l’impact workspace.

## Intensité de raisonnement

Si le modèle le supporte, « Intensité de raisonnement » à côté du sélecteur de modèle : off, auto, très bas… maximum (selon modèle). Défaut = config agent ; changement valable pour la session courante. Modèle incompatible → choix invalidé.

## Affiner pendant la génération

En raisonnement intelligent, saisie continue dans le champ :

| Action | Effet |
| --- | --- |
| Entrée ou envoyer | File d’attente ; envoyé comme tour suivant à la fin |
| ⌘ Entrée (Mac) ou Alt + Entrée | Injection immédiate dans la tâche en cours |

Messages en file au-dessus du champ : « Ajouter à la tâche en cours » ou « Retirer » ; déjà consommés = non retirables. Champ vide : bouton envoyer = arrêt ; la file est vidée. Pas de pièces jointes/images en relance ; `@` autorisé. Max 10 messages en file. Q&R rapide : pas de relance, attendre la fin.

<Screenshot
  src="/screenshots/chat-steer-queue.png"
  caption="Messages en file pendant la génération"
  hint="Raisonnement en cours, une ou deux lignes en file avec boutons ajouter/retirer, saisie en cours, envoi « après fin · Entrée »." />

## Bifurcation et rembobinage

Sous les messages utilisateur et dans la barre de réponse (indisponibles pendant génération) :

- **Bifurquer** : nouvelle session à partir de l’état actuel ; l’originale reste. Depuis un message utilisateur : copie jusqu’avant la question, question dans le champ ; depuis une réponse : copie jusqu’à cette réponse. Titre « … (branche) », icône branche dans la barre latérale.
- **Rembobiner** : supprime la suite dans la session (irréversible). Depuis message utilisateur : question supprimée et remise dans le champ. Fichiers, suggestions et index de recherche de la portion supprimée sont nettoyés.

Avec sandbox agent : checkpoint workspace fin de tour. Bifurque les fichiers au point de branche ; sandbox recyclée → branche OK, sandbox neuve. Rembobinage restaure workspace ; checkpoint introuvable → rembobinage refusé (cohérence). Sans sandbox ou workspace bureau local : dialogue seulement, fichiers inchangés.

## Pièces jointes de session {#pieces-jointes-session-temporaires}

Uploader un fichier pour interroger son contenu. Pièces jointes **session only** — pas dans la base ni l’index vectoriel. Contenu durable → base de connaissances.

Upload = fichier + file d’analyse ; succès upload ≠ analyse terminée.

- **Q&R rapide** : après envoi, si analyse en cours → étape d’attente ; défaut 60 s max, puis pièces prêtes, reste ignoré.
- **Raisonnement intelligent** : liste (noms, états, chemins) à l’agent ; petits fichiers prêts injectés ; sinon `read_file` à la demande avec attente parse si besoin. Pagination et images par numéro sans sandbox préalable. Images seules : attente si upload image activé.

Modèle vision : lecture directe ; sinon modèle vision configuré pour description. Descriptions réutilisables (même image/modèle/demande). Scans : OCR via vision.

Pièces non envoyées ou plus référencées : TTL depuis upload (défaut 24 h). Envoyées : conservées tant que session ou branche les référence. Admin : TTL, timeout parse, OCR — « Config et API ».

<Screenshot src="/screenshots/chat-attachment-read.png" caption="Lecture à la demande du corps et des images du document joint" hint="PDF avec graphiques, carte read_file et observations image ; carte pièce jointe sur le message utilisateur." />

Types autorisés, vision image, moteur parse : [Moteur Agent](07-agent.md).

## Prévisualiser et télécharger les fichiers produits

Agent avec sandbox : pièces jointes et fichiers générés. « Fichiers générés ce tour » ou bouton sandbox → panneau « Visualisation sandbox », onglet « Artefacts » (tour ou tout, recherche par nom). Preview ou téléchargement.

Barre latérale « Artefacts » : agrégat par utilisateur ; filtres type, recherche ; preview, téléchargement, lien session. Même chemin plusieurs fois → dernière version + compteur. Sans sandbox déployée : page masquée.

<Screenshot
  src="/screenshots/artifacts-library.png"
  caption="Page « Artefacts » : fichiers générés par session"
  hint="Barre latérale Artefacts, onglets type, recherche, groupes aujourd’hui/hier/7 jours, ligne « N versions », preview/télécharger/supprimer." />

Artefacts téléchargeables → `/workspace/output`, collectés en fin de réponse. Entrées `/workspace/input` ; scripts ailleurs sous `/workspace`. Supprimer une entrée ne supprime pas les sorties collectées.

Suppression dans l’onglet ou la page Artefacts : confirmation, irréversible ; propriétaire session seulement ; accès lecture partagé = téléchargement. Onglet = une version ; page = toutes les versions du chemin en session. Copie en base ou re-citation ultérieure : inchangée.

Lecture, scripts, conventions : [Skills et sandbox](22-skills-sandbox.md) ; API : [API chat](../04-api/02-api-chat.md).

## Enregistrer une réponse en base

« Ajouter à la base de connaissances » : tiroir Markdown (question + réponse, « Sources » en fin). Base documentaire cible ; brouillon ou publication → indexation. Vues édition / split / preview, plein écran ; Cmd/Ctrl+S brouillon, Cmd/Ctrl+Entrée publier.

<Screenshot
  src="/screenshots/chat-save-answer-editor.png"
  caption="Éditeur Markdown pour enregistrer une réponse"
  hint="Tiroir split : titre, sélecteur de base, Markdown + preview, statut brouillon, compteur, boutons brouillon/publier." />

## Reprendre et exporter

Sommaire des questions à droite (longues conversations) : survol = résumé tour/question/réponse. Séparateurs temporels (date ou >5 min) ; heure sous message utilisateur. Icône rotation = génération en cours ; badge API = appelant.

« Copier en Markdown » : titre, ID, heure export, tours Q&R (pièces jointes et citations). Côté navigateur, pour archivage.

Barre latérale « Recherche » : messages inter-sessions. Admin espace : « Paramètres système → Espace → Gestion des messages » + modèle embedding → recherche sémantique ; sinon mots-clés.

## Sessions par canal

IM, embed web et API : sessions isolées par identité visiteur ou clé API. Liste par défaut = sessions de l’appelant.

Admin/Owner espace : groupes IM, embed, API (si sessions existent) ; lecture seule pour audit canal. Écriture API Key reste liée au propriétaire de session.

## Mémoire inter-sessions

Admin espace : « Paramètres système → Espace → Mémoire à long terme » ; membres : « Paramètres → Compte → Ma mémoire ». Isolation par espace et identité appelant.

Désactiver = pause ; supprimer/vider = retrait des données. Extraction auto, thèmes, consolidation : [Mémoire à long terme](23-memory.md).

## Config et référence API

Paramètres pour admins et intégrateurs ; usage quotidien via l’UI ci-dessus.

### Config pièces jointes

| Paramètre | Défaut | Rôle |
| --- | --- | --- |
| `WEKNORA_CHAT_ATTACHMENT_WAIT_TIMEOUT_SEC` | 60 s | Attente fin parse (Q&R rapide / read_file agent) |
| `WEKNORA_CHAT_ATTACHMENT_TTL_HOURS` | 24 h | TTL pièces non référencées par un message valide |
| `WEKNORA_CHAT_ATTACHMENT_OCR_CONCURRENCY` | 8 | Concurrence OCR |
| `WEKNORA_CHAT_ATTACHMENT_OCR_MAX_PAGES` | 8 | Pages OCR max |

Agent : `supported_file_types`, `attachment_image_understanding`, `chat_parser_engine_rules`.

Préfixe `/api/v1/sessions` :

| Opération | Méthode et chemin |
| --- | --- |
| Upload | `POST /:session_id/attachments` |
| Liste | `GET /:id/attachments` |
| Détail | `GET /:id/attachments/:attachment_id` |
| Preview | `GET /:id/attachments/:attachment_id/preview` |
| Supprimer | `DELETE /:id/attachments/:attachment_id` |

Détails : [API chat](../04-api/02-api-chat.md).

### Opérations session

| Opération | Méthode et chemin |
| --- | --- |
| Bifurquer | `POST /api/v1/sessions/:session_id/fork` |
| Rembobiner | `POST /api/v1/sessions/:session_id/rewind` |
| Relance en cours | `POST /api/v1/sessions/:session_id/steer` (+ lister, retirer, injecter) |
| Intensité raisonnement | champ `reasoning_effort` de la requête chat |

Corps, codes, limites : [API chat](../04-api/02-api-chat.md).

### Citations et historique

`citation_enabled` agent : citations inline (défaut si omis) ; panneau sources indépendant.

Recherche : `POST /api/v1/messages/search` ; stats index : `GET /api/v1/messages/chat-history-stats` (Viewer+, clé `message_history` ou full-access). Historique : `GET /api/v1/messages/:session_id/load` (Viewer+, clé `chat`, contrôle propriété).

Liste sessions : `source` vide ou `web` = propres sessions ; `api` / `im` / `embed` vue espace → Admin+ sinon 403.

## Référence d’implémentation

- `frontend/src/views/chat/components/` : réponse, progression, outils.
- `frontend/src/utils/sessionMarkdown.ts` : export Markdown.
- `internal/application/service/session.go` : listes et accès canal.
- `internal/application/service/session_fork.go`, `session_rewind.go`, `workspace_checkpointer.go` : bifurcation, rembobinage, checkpoints.
- `internal/handler/session/steer.go` : relance.
- `internal/application/service/temporary_document.go` : parse, expiration, nettoyage pièces jointes.
- Table `temporary_documents` : [Schéma base](../06-development/02-database-schema.md).
