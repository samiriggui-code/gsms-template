# Déploiement sandbox et dépannage

Pour le flux des compétences, voir [Catalogue de compétences et sandbox](../03-features/22-skills-sandbox.md) ; pour les champs API, [API sandbox et compétences](../04-api/02-api-sandbox-skills.md). Ce document complète les exigences d’exploitation : déploiement, modèles, bureau et branchement backend.

## Backend et modèles

Les configurations nommées par espace supportent Docker, CubeSandbox et E2B — déploiement décrit ici. Le client bureau Lite a un backend `host` isolé par l’OS, hors configurations serveur ; voir [Sandbox Lite locale](#lite-host). L’ancien backend processus `local` sur l’hôte est supprimé. Docker utilise l’API Engine ; E2B le plan de contrôle REST et envd ; Cube un adaptateur dédié (modèles et politique réseau).

L’image standard est définie par `docker/Dockerfile.sandbox` : Python 3.12, Node.js 20, Bash, jq, `/workspace`. Commandes et fichiers en root par défaut ; utilisateur UID 1000 `user` pour exécution explicite. Isolation inter-sessions par conteneur ou sandbox distante ; avec réutilisation par utilisateur, pas d’isolation OS entre sessions sur la même machine. Le répertoire de travail n’implique pas de restriction de permissions root.

| Cible de build | Suffixe d’image | Usage |
| --- | --- | --- |
| `sandbox` | aucun | Image de session Docker ; base template E2B CLI |
| `cube` | `-cube` | Template Cube CLI avec envd |
| `desktop` | `-desktop` | Base bureau graphique E2B |
| `desktop-cube` | `-desktop-cube` | Template bureau Cube avec envd |

Image : `wechatopenai/weknora-sandbox:<version><suffixe>`. Les ID de template sont propres au cluster/compte — ne pas copier d’un autre déploiement. Les templates prod doivent correspondre à une version d’application validée ; cibles et architectures : Dockerfile et workflows de release du dépôt.

## Déploiement Docker

Backend Docker désactivé par défaut. Activation par l’admin système dans « Paramètres système → Sécurité réseau » ; repli `WEKNORA_SANDBOX_DOCKER_ENABLED=true` si pas encore persisté. Désactivé : consultation/suppression des configs existantes, pas de nouveaux conteneurs de session.

Une config → un daemon ; une session → un conteneur longue durée. Pas de planification multi-hôtes ; réplicas app sur daemons locaux distincts ne partagent pas conteneurs ni snapshots de compétences.

| Paramètre | Défaut / exigence |
| --- | --- |
| Adresse daemon | Vide : `DOCKER_HOST` ou contexte Docker courant ; distant `tcp://host:2376` |
| Répertoire certificats TLS | Obligatoire en TCP distant : `ca.pem`, `cert.pem`, `key.pem` lisibles par l’app |
| CPU / mémoire / PID | 2 cœurs / 2 GiB / 512 processus |
| TTL inactivité | 1800 s |
| Mode réseau | `bridge` ou `none` uniquement ; pas `host`, `container:` ni réseau custom |
| Runtime OCI | Runtime installé sur le daemon, ex. `runsc` |

App en conteneur : monter le socket Docker réel ou daemon distant. Le socket = contrôle Docker de l’hôte — réservé aux apps de confiance. Le script d’entrée configure le groupe de `appuser` selon le GID du socket avant déprivilégiation ; ne pas compter sur `group_add` compose ni `chmod 666`. Docker Desktop peut mapper le socket en `root:root 0660` ; le script vérifie les bits groupe puis ajoute `appuser` au groupe supplémentaire. Socket `root:root 0600` : pas de changement de permissions par le script — utiliser un socket lisible par groupe ou daemon distant TLS.

Privilégier l’image standard. Image custom : root, Bash, GNU `find -printf`, `timeout` coreutils, espace de travail inscriptible ; checkpoints/restauration de fichiers de session via Git. Annulation HTTP ne tue pas le processus ; l’adaptateur applique `timeout` dans le conteneur.

Le balayage d’inactivité est déclenché par Create/Connect en arrière-plan selon le TTL enregistré à la création — pas un cron du daemon. Pas de durée de vie max stricte ; scripts actifs peuvent rafraîchir l’activité — surveiller les conteneurs longue durée séparément.

### Snapshots de compétences et disque

Installation : `docker commit` → image locale `weknora-skill/` ; sessions suivantes depuis le snapshot. Fichiers uniquement, pas la RAM ; pas de volume partagé inter-tenant ni bureau Docker graphique.

Snapshots incrémentaux héritent des couches ; supprimer un tag ne libère pas toujours l’espace ; désinstallation ajoute une couche de suppression, fichiers possibles dans les parents. Pas d’aplatissement auto ni distribution inter-daemons. Surveiller couches/disque ; confirmer références avant nettoyage ; nouveau modèle de base → nouvelle config et réinstallation.

## CubeSandbox / E2B

1. Préparer plan de contrôle, passerelle data plane et domaine sandbox. Renseigner API, Proxy, domaine, identifiants dans les paramètres d’espace ; endpoints privés/loopback : autoriser explicitement les adresses privées, jamais les métadonnées cloud.
2. « Connecter et continuer » : valide le plan de contrôle et charge le catalogue de templates. Succès = plan de contrôle seulement.
3. Créer les templates standard manquants ; bureau séparé si besoin. Attendre `READY`. Cube : variante `-cube` avec envd ; image Docker seule sans `:49983/health`.
4. « Validation complète » : création sandbox, sonde, destruction — data plane et environnement script OK.
5. Après enregistrement : agent sur cette config ; vérifier lecture pièces jointes, persistance shell, téléchargement des artefacts.

`proxy_url` pour passerelle data plane self-hosted : conserve le routage Host sandbox — utile sans DNS wildcard. Échec d’exécution avec plan de contrôle OK : Proxy, domaine sandbox, credentials entrants, reachability app → passerelle.

DNS invité Cube = config template. Changement DNS/image → rebuild template. Config avec compétences installées : ne pas changer/rebuild la base ni basculer CLI/bureau — nouvelle config + réinstallation.

Multi-réplica : Redis partagé pour session→sandbox et état bureau. Dev mono-instance : stockage mémoire. Config backend modifiée n’est pas appliquée aux sandboxes existantes ; stratégies `next_turn` / `new_session` des mises à jour de compétences : voir [Compétences et sandbox](../03-features/22-skills-sandbox.md).

| Symptôme | Piste |
| --- | --- |
| Échec validation connexion | URL Dashboard par erreur ; identifiants, TLS, switch privé |
| Connexion OK, exécution KO | Proxy, domaine, routage passerelle, token entrant |
| Build template KO | Logs cluster ; pull image, architecture, envd sur Cube |
| Pas de sortie réseau sandbox | Politique template, DNS invité, proxy sortant ; privé ≠ sortie script |
| Échec install dépendances | Sources autorisées si sortie bloquée ; même politique que la session |
| État perdu après reconnexion | Redis partagé, TTL, rebuild compétence |

## Terminal interactif et bureau graphique {#terminal-interactif-et-bureau-graphique}

Terminal et bureau latéraux : WebSocket vers la sandbox de session. Terminal : Cube, E2B, Docker ; bureau : Cube/E2B uniquement. Le navigateur n’envoie pas d’en-têtes auth au handshake WebSocket — POST authentifié pour un ticket court (2 min) en query :

| Capacité | Obtenir le ticket | WebSocket |
| --- | --- | --- |
| Terminal | `POST /api/v1/sessions/:session_id/sandbox/terminal-ticket` | `GET /api/v1/sessions/:id/sandbox/terminal?ticket=...` |
| Bureau | `POST /api/v1/sessions/:session_id/sandbox/desktop-ticket` | `GET /api/v1/sessions/:id/sandbox/desktop?ticket=...` |

Le proxy doit transférer Upgrade WebSocket, assouplir les timeouts de lecture, éviter de journaliser le query `ticket`. Nginx frontend standard : format de log sans query pour `^/api/v1/sessions/[^/]+/sandbox/(terminal|desktop)$` ; Ingress custom à adapter. Terminal connecté : contrôle login / membership / session ~chaque minute ; déconnexion si session ou espace invalidés. API : [Terminal](../04-api/02-api-sandbox-skills.md#terminal-interactif-de-session), [Bureau](../04-api/02-api-chat.md#sandbox-desktop).

Terminal et bureau se déconnectent après inactivité selon `terminal_idle_disconnect_sec` (défaut 900 s, min 60, max 24 h) ; la sandbox suit ensuite le TTL fournisseur. Activité terminal = clavier + sortie PTY ; bureau = clavier/souris.

Terminal Docker : exec `TTY=true` ; pas de re-attache Engine API — comportement différent de Cube/E2B :

- Tant que le terminal est ouvert, marqueur d’activité rafraîchi — pas de recycle `DockerIdleTTL` ; après fermeture, TTL normal.
- Déconnexion terminal (panneau, idle, réseau) : SIGHUP au shell et enfants comme fermeture de fenêtre ; tâches `nohup` conservées.
- Pas de reconnexion auto frontend Docker ; « Reconnecter » = nouveau shell.
- Sandbox arrêtée : message « peut avoir été recyclée » ; redémarrage recrée la sandbox si conteneur supprimé — fichiers précédents perdus.

### Bureau graphique

Bureau latéral : templates bureau Cube/E2B uniquement. Premier ouverture : démarrage processus bureau côté backend ; template bureau + `desktop_enabled`. Compétences installées : pas de changement de base sur place.

```text
Navigateur noVNC → relais ticket WeKnora → passerelle fournisseur → websockify :6080 → x11vnc local :5900
```

Le navigateur ne détient pas clé API sandbox, token entrant ni mot de passe websockify. Ticket bureau à usage unique — voir [API session](../04-api/02-api-chat.md#sandbox-desktop). Template bureau Cube : `exposedPorts` n’expose que envd 49983 — **ne pas NAT 6080 sur l’hôte** ; le bureau passe par passerelle et relais WeKnora.

Une seule relais bureau par session ; slots multi-réplica via Redis. Rebuild sandbox → `SANDBOX_REBUILT`, ne pas supposer fichiers temporaires conservés. Idle = activité RFB clavier/souris ; captures d’écran ≠ activité utilisateur.

## Sandbox Lite locale {#lite-host}

Backend `host` compilé uniquement dans le bureau Lite (`build:tags` de `cmd/desktop/wails.json`), pas dans le serveur ni le binaire Lite simple. Commandes dans les sessions sans config sandbox nommée — voir [Compétences](../03-features/22-skills-sandbox.md#lite-host).

| Plateforme | État |
| --- | --- |
| macOS | `sandbox-exec` (Seatbelt) par commande ; indisponible → désactivé |
| Windows | Non implémenté, signalé indisponible, pas d’exécution sans isolation |
| Linux | Non supporté |

Chaque commande = nouveau processus local, pas d’instance de session — pas d’écriture du binding sandbox ni checkpoint workspace. Répertoire projet approuvé via sélecteur système dans `desktop-prefs.json` `project_dirs` ; session liée au répertoire listé, pas sous-répertoire saisi à la main. `approval_mode` : seul `auto` accepté. Par défaut : réseau, écriture hors workspace et `.git` du projet limités ; v0.9.0 : approbations locales pour suppressions ou accès supplémentaires, pas un mode sans limites global. Emplacement prefs : [Client bureau](../05-clients/05-desktop.md#preferences-desktop-prefs).

## Validation en développement

Tests unitaires sans daemon réel :

```bash
go test ./internal/sandbox -run 'TestDocker' -count=1
```

Docker réel : construire l’image standard, conteneurs de test créés :

```bash
docker build -f docker/Dockerfile.sandbox --target sandbox -t wechatopenai/weknora-sandbox:dev .
DOCKER_INTEGRATION_IMAGE=wechatopenai/weknora-sandbox:dev \
go test -tags=docker_integration ./internal/sandbox \
  -run '^TestDocker.*Integration' -count=1 -v -timeout=15m
```

Tests d’intégration distants : `internal/sandbox/cube_integration_test.go`, `e2b_compatible_integration_test.go` — configurer les identifiants en tête de fichier. Couvrir persistance session, réutilisation shell, staging pièces jointes, collecte artefacts, timeouts — pas seulement Health. Nettoyer les instances de test après exécution.
