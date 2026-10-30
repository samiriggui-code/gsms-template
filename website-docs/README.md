# Site officiel et documentation WeKnora

Le répertoire `website-docs/` regroupe le site produit, la documentation, les styles partagés et l’ensemble des scripts de build et de déploiement. Il peut être copié et construit de façon autonome, sans dépendre des fichiers à la racine du dépôt. Site et documentation partagent un domaine, un build et un artefact de déploiement.

La documentation produit, déploiement, API et développement est maintenue ici. Le contenu utile de l’ancien `docs/` a été fusionné par thème ; textes obsolètes et doublons supprimés. Voir [Historique de migration](MIGRATION.md) pour les choix de migration et les ressources d’ingénierie conservées — document réservé aux mainteneurs, non publié sur le site.

- `/` : page d’accueil produit.
- `/docs/` : entrée directe vers « Démarrage rapide ».
- `/docs/…` : documentation complète avec navigation par catégories, recherche et barre latérale.

Le site n’expose que ces deux chemins : à la racine, seuls `index.html`, `404.html` et `docs/`. Scripts, styles et images du site officiel sont sous `/docs/_home/` ; la passerelle amont doit donc transférer `/` (correspondance exacte) et le préfixe `/docs/`. Le `build` rejette les pages qui référencent des ressources hors de ces chemins.

Barre supérieure de 64 px, pleine largeur. Marque d’origine du README des deux côtés, couleurs, polices et préférences clair/sombre partagées ; le logo ramène au site officiel dans l’onglet courant. Site et documentation ont chacun une navigation adaptée à la page.

La zone vidéo de la page d’accueil utilise un lecteur et un sélecteur horizontal ; par défaut la vidéo de release v0.9.0, avec conservation de la vue d’ensemble produit antérieure. Nouvelle vidéo et couverture déployées avec le site statique ; l’ancienne vidéo garde son URL GitHub. Chargement au clic ; changer de vidéo arrête la précédente.

## Publication : fichiers statiques + Nginx

### 1. Préparer le paquet de déploiement

Avec Node.js 24, exécuter dans `website-docs/` du dépôt. Après un premier build ou un changement de lockfile, installer les dépendances :

```bash
cd website-docs
npm run setup
npm run build
npm run package:site
```

`build` compile le site officiel, vérifie les liens et Mermaid de la doc, compile la documentation et valide les chemins de ressources fusionnés. En cas de succès, mise à jour de `static-site/` ; `package:site` produit l’archive dans `releases/`.

### 2. Téléverser et extraire

Il suffit de téléverser l’archive sur le serveur. Pas besoin de Node.js, du backend WeKnora ni d’un service de documentation séparé sur le serveur.

Chaque publication utilise un répertoire vide neuf pour éviter de mélanger d’anciens fichiers. `20261027-v090` ci-dessous est un numéro d’exemple ; en changer à chaque release :

```bash
sudo mkdir -p /srv/www/weknora/releases/20261027-v090
sudo tar -xzf weknora-site-v0.9.0.tar.gz -C /srv/www/weknora/releases/20261027-v090
```

Après extraction, le répertoire doit contenir directement `index.html`, `404.html` et `docs/`, sans couche `static-site/` supplémentaire.

### 3. Configurer la racine du domaine

S’appuyer sur [deploy/nginx.conf](deploy/nginx.conf) comme modèle et modifier :

```nginx
server_name votre-domaine.example;
root /srv/www/weknora/releases/20261027-v090;
```

Si HTTPS existe déjà, conserver certificats et écoute, et fusionner `root`, `index` et règles `location` du modèle dans la config du site. Le domaine doit pointer vers ce serveur.

Conserver les règles de résolution des routes `.html` de la documentation ; ne pas renvoyer toutes les URLs inconnues vers `index.html` du site officiel. Le build actuel est prévu pour la racine du domaine, pas pour un sous-chemin comme `/weknora/`.

Vérifier puis recharger :

```bash
sudo nginx -t
sudo nginx -s reload
```

### 4. Vérifier en production

Tester :

- `/` : site officiel.
- `/docs/` : démarrage rapide.
- `/docs/03-features/23-memory` : mémoire à long terme, ouverture et rafraîchissement directs.
- `/docs/not-found` : réponse 404.

Confirmer aussi recherche, bascule clair/sombre et retour logo vers le site officiel.

Pour les mises à jour : rebuild, pack, upload dans un nouveau répertoire, modifier `root` Nginx et recharger. Rollback : remettre `root` sur le répertoire précédent. Nettoyer l’ancien release une fois la nouvelle version stable.

## Option : déploiement Docker

Build depuis des sources propres sans Node.js ni génération statique sur l’hôte. Dockerfile en deux étapes : Node.js 24 installe et build site + doc selon les deux lockfiles ; l’image finale Nginx ne contient que les statiques et la config.

À la racine du dépôt :

```bash
docker build -t weknora-site:0.9.0 website-docs
docker run -d --name weknora-site --restart unless-stopped -p 8080:80 weknora-site:0.9.0
```

Visiter `http://adresse-du-serveur:8080/`. Avec domaine et HTTPS, faire transiter le reverse proxy existant vers ce port. L’image inclut site, documentation et routage Nginx.

Nginx dans le conteneur écoute par défaut sur le port 80 ; `WEBSITE_NGINX_PORT` permet de le changer sans rebuild. Avec `--network host` ou si la plateforme exige un port précis :

```bash
docker run -d --name weknora-site --restart unless-stopped -e WEBSITE_NGINX_PORT=8080 -p 8080:8080 weknora-site:0.9.0
```

Pour changer seulement le port exposé, modifier le port hôte à gauche de `-p`, par ex. `-p 9000:80`.

On peut aussi copier uniquement `website-docs/` et exécuter `docker build -t weknora-site:0.9.0 .` dans ce répertoire. Le contexte de build doit être `website-docs/` ; dépendances hôte, anciens builds et paquets sont exclus via `.dockerignore`.

En migration depuis une ancienne image doc, mapper le port conteneur ou la cible proxy de `8081` vers `80` (port hôte au choix, ex. `-p 8081:80`). `/` sert le site officiel, `/docs/` la documentation ; le reverse proxy doit couvrir tout le site en préservant le chemin demandé. L’image Nginx officielle suffit, sans `docker-entrypoint.sh` additionnel.

Après build, sur une machine avec Node.js 24 et Docker (sans `npm install`) :

```bash
cd website-docs
npm run test:docker -- weknora-site:0.9.0
```

Le test démarre un conteneur temporaire, le nettoie, et vérifie routage des deux sites, statiques, 404, compression et en-têtes.

## Développement local

Node.js 24 LTS (`.nvmrc` fourni ; avec nvm : `nvm use`). Après clone, installer les dépendances (lockfiles doc et site séparés) :

```bash
cd website-docs
npm run setup
npm run build
npm run preview
```

Aperçu : `http://127.0.0.1:3000/`. Rebuild après modification ; `npm run preview -- --port 8080` pour un autre port.

```bash
npm run check
npm run test:integration
```

Les tests d’intégration nécessitent Google Chrome (thème, navigation des deux sites, recherche, mobile, routes doc directes). `SITE_TEST_URL` pour cibler un site déjà déployé.

En dev : **`npm run dev`** lance la passerelle sur [http://127.0.0.1:3000](http://127.0.0.1:3000) (homepage Next + VitePress `/docs/`). Alternatives : `npm run dev:homepage` ou `npm run dev:docs` seuls ; pour le comportement production, `npm run preview` après `npm run build`.

**Locales doc** : français à la racine (`/docs/…`), anglais sous `/docs/en/…`. Scripts de maintenance dans `scripts/` (`sync-en-from-fr.py`, `fix-en-anchors.py`, `verify-en-locale.py`, etc.).

`npm run build:docs` ne compile que la doc, `npm run build:homepage` que le site ; la release officielle utilise `npm run build` (les deux). `VERSION` est la version de release utilisée pour ce build de site.

## Arborescence (relative à `website-docs/`)

- `homepage/` : sources Next.js du site, assets de marque, lockfile propre.
- `01-getting-started/` à `06-development/` : corps de la documentation, chemins inchangés.
- `.vitepress/` : config et thème du site doc.
- `public/`, `sample-data/` : captures et exemples.
- `shared/` : variables de marque, styles de barre supérieure, icônes communes.
- `scripts/` : build, contrôles, preview et packaging unifiés.
- `static-site/` : seul répertoire de déploiement généré.
- `deploy/`, `Dockerfile` : Nginx et Docker.
- `releases/` : archives de déploiement générées.
- `embed.go` : compile le texte de `01-getting-started/` à `07-releases/` dans le service WeKnora pour l’assistant intégré (recherche et citation). Lors d’une nouvelle catégorie, mettre à jour `embed.go` et la liste dans `internal/productdocs/library.go`. Les tests serveur vérifient parsing, liens internes et ancres.

Assets de marque : [homepage/BRAND-ASSETS.md](homepage/BRAND-ASSETS.md). Vidéo, pages, doc et captures v0.9.0 sont dans le paquet ; l’ancienne vue d’ensemble produit utilise la pièce jointe GitHub d’origine (accès GitHub requis).

## Checklist captures v0.8.3

La doc utilise le composant `Screenshot` ; la page d’accueil réutilise les mêmes images. Utiliser des données de démo pour masquer tokens, e-mails réels et adresses internes.

Les 11 captures v0.8.3 sont intégrées ; galerie, réglages multimodaux, graphe Wiki par groupes et localisation des citations sont synchronisés avec l’accueil. Les captures multimodales montrent l’interrupteur vecteur image ; Seafile la configuration des identifiants ; le catalogue modèles une liste ; la création utilisateur un succès. Le tableau ci-dessous indique contenu et emplacements ; le texte décrit le reste.

Toutes les images doc sont dans `website-docs/public/screenshots/` :

| Fichier | Contenu capturé | Emplacements |
| --- | --- | --- |
| `kb-image-gallery-detail.png` | Détail image : original, description, texte reconnu, document source | Fonctions base de connaissances, notes de version, accueil |
| `kb-image-gallery.png` | Galerie en flux, filtre multi-sources (graphiques et photos) | Idem |
| `kb-image-vector-settings.png` | Modèle vecteur avec entrée image, réglages multimodaux, recherche vecteur image (ex. WeMM-Embedding Tencent) | Idem |
| `chat-source-location.png` | Réponse avec citations et surlignage dans PDF/Office source | Expérience de chat, notes de version, accueil |
| `chat-mention-selector.png` | Menu @ ressources : catégories, quantités, recherche | Notes de version |
| `chat-attachment-read.png` | Pièce jointe avec images, lecture à la demande et observation d’image | Expérience de chat, notes de version |
| `system-user-management.png` | Liste utilisateurs, statut, badge admin système, actions | Admin plateforme, notes de version |
| `system-model-catalog.png` | Catalogue modèles, source, édition de surcharge ou historique | Notes de version |
| `wiki-graph-groups.png` | Nouveau graphe, thèmes, focus par groupe, retour vue complète | Wiki, notes de version, accueil |
| `datasource-seafile.png` | Source Seafile et sélection bibliothèque/dossier/fichier | Fonction Seafile |
| `system-admin-create-user.png` | Création utilisateur réussie (compte démo, mot de passe masqué) | Admin plateforme |

L’accueil réutilise `kb-image-gallery.png`, `kb-image-gallery-detail.png`, `kb-image-vector-settings.png`, `wiki-graph-groups.png`, `chat-source-location.png` ; remplacer les fichiers dans `website-docs/public/screenshots/` — `prebuild` / `predev` synchronisent les copies homonymes (y compris anciens noms de captures terminal). Pour une nouvelle capture accueil, créer d’abord une copie dans `website-docs/homepage/public/docs/_home/product/`. Puis `npm run build` et vérification manuelle par le mainteneur.

Checklists de soumission, rapprochement doc et traces de validation v0.8.3 : `docs/release-v0.8.3-audit.md` dans le dépôt principal (non publié sur le site autonome). Date de release v0.8.3 : 2026-10-14 ; page de version, CHANGELOG et README quadri-lingues alignés.

Contenu accueil v0.8.3 sur deux niveaux : zone « version courante » avec navigation gauche et captures à droite pour galerie, embedding multimodal (WeMM), graphe Wiki et citations sources ; les quatre blocs explicatifs restent ouverts ; la galerie alterne « Parcourir les images / Voir le détail ». Navigateur local : à gauche « Exécuter une tâche » et « Connecter une extension », à droite les captures correspondantes ; MCP Server regroupé sous écosystème ; ajouts, bifurcation et rollback dans la section Agent. Compétences/sandbox, Wiki, écosystème modèles et déploiement entreprise restent des sections dédiées. Petites nouveautés (langues, etc.) dans les notes de version — ne pas retirer ces capacités durables lors d’un changement de zone version.

Une phrase par focus accueil ; conditions de configuration dans la doc fonctionnelle ; citations et graphe au même niveau que les autres highlights version ; liens secondaires pour pièces jointes, utilisateurs, Seafile, terminal Docker. Navigateur local : deux grandes cartes « tâche / extension » plus icône BrowserSkill et entrée GitHub. Notes de version orientées utilisateur ; métriques de commits, snapshots code et retraits restent dans le rapport de release.

Fonds de chapitre alternés : 01/03/05/07 et entrées « utilisation » en fond de base ; 02/04/06/08 en fond clair ; variables thème en mode sombre. Fond pleine page, contenu dans un conteneur de largeur unique ; les zones claires séparent les chapitres adjacents et unifient l’espacement.

## Matériel de release v0.9.0

Date de release unifiée : 2026-10-29. État d’exécution tag, images et déploiement site : `docs/release-v0.9.0-audit.md` dans le dépôt principal ; effectuer l’acceptation build et les checks en ligne avant publication.

Focus accueil actuel : assistant WeKnora, collaboration multi-agents, automatisations, permissions d’exécution. Galeries, Wiki, citations sources et navigateur restent dans leurs chapitres ; la zone vidéo privilégie v0.9.0 avec onglets horizontaux vers l’ancienne vue d’ensemble, lecteur partagé.

- Doc et notes : `07-releases/v0.9.0.md` plus trois guides assistant, automatisations, permissions.
- Captures : assistant « Q&R produit / aide aux tâches » → `assistant-release-guide.png`, `assistant-overview.png` ; automatisations « en une phrase / configuration manuelle » → `automation-conversation.png`, `automation-setup.png` ; aussi `agent-collaboration.png`, `assistant-permissions.png`. Captures navigateur réelles 1920×1056, même ratio que l’édition 3840×2112, sans upscaling ni recomposition UI. Base de connaissances en vue cartes.
- Sources : `public/screenshots/` ; copies accueil synchronisées par prebuild.
- Projet vidéo : `misc/release-v0.9.0-video/` (dépôt principal) ; 165 s, 1920×1080, 60 fps, UI anglaise, voix et sous-titres intégrés, effet frappe synchronisé, sans musique de fond. Vidéo, couverture et SRT dans `public/videos/`.
- Annonce groupe et texte GitHub Release : `docs/release-v0.9.0-announcement.md`.

Pages et captures des versions antérieures conservées pour les anciens liens.
