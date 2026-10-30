# Intégration Feishu Drive

`feishu_drive` / `lark_drive` synchronise documents et fichiers d’un dossier donné vers la base de connaissances. Les espaces Wiki utilisent le connecteur `feishu` / `lark` ; flux de synchronisation général : [Synchronisation des sources de données](10-datasource.md).

## Identité d’application et droits sur les dossiers

Utilisez l’App ID et App Secret de l’application entreprise de la région concernée ; les identifiants Feishu et Lark ne sont pas interchangeables. Les permissions se déclarent dans « Gestion des permissions » du portail développeur, en lecture seule ; après ajout, créez et publiez une nouvelle version pour qu’elles prennent effet.

Permissions requises :

| Permission | Mode blocks (défaut) | Mode export | Si manquante |
| --- | --- | --- | --- |
| `drive:drive:readonly` | Obligatoire : lister dossiers, télécharger fichiers, images/pièces docx | Obligatoire : lister dossiers, télécharger fichiers | 403 à la liste ou à la sync, message « partager le dossier au groupe de l’app » |
| `docx:document:readonly` | Obligatoire : blocks API pour docx | Non requis | Échec parsing doc cloud |
| `drive:export:readonly` | Optionnel : export xlsx tableaux ; repli export si blocks échoue ou corps vide | Obligatoire : docx/doc/sheet/bitable en export async | Échec sync tableaux ; repli blocks indisponible |

Le connecteur Drive **n’a pas besoin** de `wiki:wiki:readonly` (réservé au connecteur Wiki).

Permissions optionnelles (noms réels @membres `contact:user.base:readonly`, titres de refs cloud `drive:drive.metadata:readonly`, export tableau blanc `board:whiteboard:node:read`, tableaux Markdown embarqués `sheets:spreadsheet:readonly` / `bitable:app:readonly`) : uniquement sur le chemin de rendu blocks ; absence = pas d’échec de sync, contenu dégradé. Matrice complète Wiki : section Feishu/Lark de [Synchronisation des sources de données](10-datasource.md).

Après configuration des permissions, publiez la version de l’app et autorisez le dossier cible dans le périmètre accessible à l’app. Si partage via le groupe de l’app, vérifiez app, gestionnaire du dossier et groupe. Droits API et droits fichier sont deux niveaux : obtenir un tenant access token ne garantit pas la lecture de n’importe quel dossier.

Le test de connexion WeKnora valide les identifiants app ; l’arborescence ne vérifie l’accès dossier qu’ensuite. Connexion OK mais 403 sur l’arborescence : partage et publication des permissions.

## Configuration dans la base de connaissances

1. Paramètres KB → Sources de données → Nouveau, choisir « Feishu Drive » ou « Lark Drive ».
2. Renseigner App ID et App Secret, tester la connexion.
3. Saisir le `folder_token` du dossier ou le lien complet `/drive/folder/<token>`, charger l’arborescence et choisir le périmètre. La racine du drive cloud ne peut pas être laissée vide.
4. Choisir full/incrémental, planification, politique de conflit et suppression sync ; sauvegarder puis sync manuelle sur quelques fichiers, vérifier logs et parsing.

La sync incrémentale compare curseur et arborescence : si la liste des ressources sélectionnées réussit entièrement, les fichiers disparus sont marqués supprimés ; échec de sous-dossier = détection reportée. « Sync suppression » supprime alors **les entrées KB de cette source** ; sinon conservation. Full sync (y compris re-sync après upgrade) conserve l’ancien curseur pour le rapprochement des suppressions ; première sync sans baseline historique ne détecte pas les suppressions antérieures. En cas d’échec de suppression, consulter logs et entrées restantes.

Les mises à jour document suppriment aussi les sous-éléments pièce disparus en mode blocks (partie de la mise à jour contenu), indépendamment de l’interrupteur sync suppression source.

## Fichiers et modes de parsing

Les fichiers ordinaires passent au pipeline de parsing selon le type ; tableaux exportés en xlsx, dossiers parcourus récursivement, raccourcis résolus vers la cible. Types cloud non supportés ignorés : voir logs pour la raison.

Les docx récents ont deux chemins, choisis dans **Paramètres KB → édition source → mode parsing** (`settings.parse_mode` sur la source), défaut `blocks`, pour Wiki et Drive :

| Mode | Chemin | Usage et limites |
| --- | --- | --- |
| `blocks` (défaut) | blocks API → Markdown ; repli export si API échoue, corps vide ou > 30 blocs image/tableau | Images/tableaux indexés avec le parent ; pièces pdf/office etc. en entrées séparées liées ; feuilles embarquées en tableaux Markdown dans le doc |
| `export` | Export async docx puis parsing document | Images avec le parent ; export et parsing plus longs ; pièces file block d’export non conservées ; feuilles en tableaux dans docx, pas de parsing table dédié |

La variable obsolète `FEISHU_DOCX_PARSE_MODE` n’est lue en repli que si la source n’a pas de mode (avertissement de dépréciation) ; `.env` explicitement `export` conserve le comportement après upgrade.

Changer le mode effectif déclenche un re-fetch docx à la prochaine sync (y compris incrémental) ; sauvegarder d’autres réglages sans changer le mode ne le déclenche pas. Repli export pour budget images dépassé : les pièces file block déjà listées par blocks API restent indexées et liées au parent ; limites de format export natif alignées sur le mode `export`. Rappel image dépend aussi du stockage objet, OCR/multimodal et index : [Parsing documentaire](03-document-parsing.md).

## Problèmes courants

| Symptôme | Action |
| --- | --- |
| Token invalide ou échec test identifiants | Région Feishu/Lark, App ID/Secret, proxy privé |
| Échec chargement dossier | Lien dossier concret ; permissions API et partage |
| Doc cloud en échec, fichiers OK | Permissions export ; mode blocks exige aussi lecture docx |
| Moins de fichiers sync que dans le dossier | Types non supportés, droits sous-dossiers, stats échec/ignoré |
| Images non rappelées avec le corps | Stockage objet, OCR/multimodal, index ; les deux modes lient images au parent |
| Doc temporairement non searchable après changement | Mise à jour peut supprimer ancienne connaissance et réindexer ; attendre fin parsing |

Référence implémentation : `internal/datasource/connector/feishu/drive/`, `core/shared.go` et `internal/application/service/datasource_service.go`.
