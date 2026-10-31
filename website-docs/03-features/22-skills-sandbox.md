# Catalogue de skills et sandbox

Un skill comprend `SKILL.md`, scripts, modèles et ressources ; la sandbox fournit l’environnement d’exécution. Après ajout au catalogue de l’espace et installation dans une sandbox, sélectionnez sandbox et skills sur l’agent pour les utiliser en conversation de raisonnement intelligent.

## Configurer et utiliser les skills {#configuration-premiere-execution}

1. Admin/Owner : « Paramètres → Configuration sandbox », créer une config Docker, CubeSandbox ou E2B avec les informations de connexion.
2. Suivre l’assistant : connecter le cluster, choisir le template ; « Validation complète » pour tester la chaîne (crée une sandbox, sonde, nettoie).
3. Barre latérale « Boîte à outils → Gestion des skills » : ZIP ou lien source, puis sandbox cible (l’ancien lien « Paramètres → Gestion des skills » redirige ici). Enregistrement au catalogue = paquet sauvé ; exécution seulement quand l’installation est prête.
4. Éditeur agent, section « Skills » : sandbox, périmètre tous / skills choisis / désactivé. Exécution skills = mode raisonnement intelligent.
5. Conversation : question ou `@skill` pour prioriser un skill. Pièces jointes si besoin ; livrables dans l’onglet « Livrables » du panneau « Visualisation sandbox » à droite.

`@skill` ne retire pas l’accès aux autres skills autorisés. Sans sandbox choisie (Lite bureau macOS → [sandbox locale](#lite-host)), scripts désactivés pour l’espace ou backend indisponible : les outils d’exécution ne s’enregistrent pas ; le prompt ne contourne pas ces conditions.

<Screenshot
  src="/screenshots/skill-catalog.png"
  caption="Catalogue skills de l’espace : statut d’installation par sandbox" />

## Gérer installation et mises à jour {#catalogue-installation-mises-a-jour}

Recherche par nom et description (insensible à la casse, mots séparés par espaces, tous requis). Vide : effacer la recherche ou ajouter des skills.

Le catalogue espace garde un paquet ; chaque config sandbox a son enregistrement d’installation et snapshot d’image. Un même skill sur plusieurs sandboxes : progression et échecs séparés.

| Action | Résultat |
| --- | --- |
| Ajouter au catalogue | Sauve paquet, nom, version, description ; pas d’installation |
| Installer | Sur la sandbox choisie : environnement, dépendances, vérif chargement ; snapshot publié si succès |
| Réessayer | Réutilise le paquet sauvé sur cette sandbox, notes d’installation optionnelles ; skip si même paquet déjà prêt |
| Mettre à niveau | Nouvelle version au catalogue → anciennes installs marquées upgradables ; installe la nouvelle version sur la sandbox choisie |
| Arrêter installation | Aborte en cours → failed, puis retry ou désinstallation |
| Désactiver | Conserve l’install, l’agent ne sélectionne plus le skill |
| Désinstaller d’une sandbox | Met à jour l’image skills, paquet reste au catalogue pour d’autres sandboxes |
| Supprimer entrée catalogue | Exige aucune install sandbox ; ne désinstalle pas implicitement toutes les sandboxes |

La page d’installation affiche pourcentage, phase et logs ; détail dans l’historique. Fermer le tiroir ou couper le flux de progression n’arrête pas l’install. Sans flux temps réel, rafraîchir le statut ; expiration des logs détaillés ≠ perte du paquet.

Installation par agent intégré : lit `SKILL.md`, installe dépendances, vérifie prérequis CLI etc. Commande ou prérequis manquants (ex. service à déployer ailleurs) → échec avec raison, pas « prêt » sans liste de deps. Pendant l’install, l’admin peut ajouter des notes (CLI, doc, contraintes) ; idem au reinstall avec notes.

Échec upgrade/retry : la sandbox sert la dernière version prête ; remplacement seulement après succès de la nouvelle.

Sandbox par session : `skill_rollout` contrôle les mises à jour d’image — défaut `next_turn` reconstruit au tour suivant ; `new_session` n’affecte que les sessions créant une sandbox après coup. Mode sandbox partagée : option masquée ; install/suppression skill ne reconstruit pas la machine partagée existante. Reconstruction = perte état temporaire ; livrables dans `/workspace/output` pour collecte système.

<Screenshot
  src="/screenshots/sandbox-session-skill-rollout.png"
  alt="Stratégie de rollout d’image skill quand une sandbox par session"
/>

### Sources supportées {#sources-supportees}

| Entrée | Description |
| --- | --- |
| Fichier ZIP | Exporter le répertoire skill puis upload |
| `@owner/slug`, `@owner/slug@1.2.0` | ClawHub auteur/version |
| `slug`, `slug@1.2.0` | Slug ClawHub |
| Pages ClawHub, SkillHub, SkillHub auto-hébergé | Résolution via la source |
| URL dépôt ou dossier GitHub/GitLab | Récupère le paquet skill |
| `https://skills.sh/owner/repo/slug`, page skills.sh ClawHub | Résolveur vers version et dossier |
| URL ZIP directe ou SKILL.md | Télécharge paquet ou entrée |

La source doit être lisible anonymement ; pas de credentials dépôt privé utilisateur. Skills privés : exporter en ZIP. `owner/slug` ambigu → `@owner/slug` ou URL complète.

Plafond paquet skill indépendant des docs : `MAX_SKILL_BUNDLE_SIZE_MB` défaut 256 MiB, sinon au moins `MAX_FILE_SIZE_MB`, max 512 MiB. GitHub compte l’archive entière du dépôt. Après changement, redémarrer app et frontend pour aligner limites app et Nginx.

## Choisir le backend sandbox {#choisir-le-backend-sandbox}

| Backend | À renseigner | Exécution |
| --- | --- | --- |
| Docker | Image ; optionnel daemon, TLS, limites CPU/RAM/PID, réseau, runtime, TTL idle | Un conteneur longue durée par session |
| CubeSandbox | Plan de contrôle, proxy data plane, domaine sandbox, template ; API Key selon cluster | Sandbox distante par session |
| E2B | API Key, template ; auto-hébergé : URL API, domaine sandbox, proxy data plane | E2B Cloud ou plan de contrôle compatible |
| host | Rien. Lite bureau uniquement, macOS pour l’instant | Si l’agent n’a pas de config sandbox : exécution dans le projet local, dépassements bloqués par l’OS |

Backend processus hôte `local` retiré (exécution nue sans isolation). `host` Lite n’est pas une config espace nommée ni un remplacement de `local`. Champs complets : [API sandbox et skills](../04-api/02-api-sandbox-skills.md).

Docker désactivé par défaut. Admin système « Paramètres système → Sécurité réseau » ou `WEKNORA_SANDBOX_DOCKER_ENABLED=true` en repli non persisté. Socket Docker local : monter le socket réel → app contrôle Docker hôte. Daemon TCP distant : répertoire certificats TLS `ca.pem`, `cert.pem`, `key.pem`. Réseau Docker : `bridge` ou `none` ; runtime OCI optionnel (`runsc`, etc.).

E2B/Cube auto-hébergé : `proxy_url` = passerelle data plane ; WeKnora se connecte à la passerelle en conservant le Host sandbox (clusters sans DNS wildcard). `allow_private_endpoints` autorise adresses privées/loopback, pas link-local/métadonnées cloud ; distinct de l’egress des scripts sandbox.

Scripts par défaut en `root` dans la sandbox ; compte `user` du template = choix explicite. Isolation par conteneur/sandbox distante ; `/workspace` = convention de répertoire, pas restriction root sur le filesystem.

### Politique réseau

`config.network` Cube/E2B pour sandbox conversation, install skill et validation complète :

- Egress autorisé par défaut ; `deny_egress_by_default=true` puis `allow_out` IP/CIDR/domaines.
- `deny_out` IPv4/CIDR ; règles domaine avec deny par défaut.
- Cube `cube_rules` : Host/SNI, méthode, chemin, ordre, audit, injection en-têtes HTTPS ; E2B `e2b_host_rules` pour domaines autorisés.
- Credentials injectés chiffrés, réponses masquées. Entrant toujours authentifié ; ancien `allow_public_inbound` n’ouvre pas l’entrant anonyme.
- Docker : `docker.network_mode` pour l’egress, pas les règles fines Cube/E2B. Deny egress par défaut : whitelister les sources d’install deps.

Instances existantes ne reçoivent pas automatiquement une nouvelle politique ; valider après création/reconstruction. Changement d’identité backend ou suppression : vérif instances running/paused et agents liés ; refus si occupation, info dans les paramètres.

### Sandbox locale Lite (host) {#lite-host}

Depuis v0.8.2, [Lite bureau](../05-clients/05-desktop.md) sur macOS isole commandes et outils fichiers agent via Seatbelt. Config Docker/E2B/Cube choisie → sandbox distante ; sans config → sandbox locale. Windows/Linux : pas encore ; agent sans config ne peut pas exécuter de commandes.

- **Répertoire de travail** : nouvelle conversation « Choisir projet », sélecteur système ; nom projet dans la barre de titre. Sinon « Espace temporaire » sous `~/.weknora/sessions/session-*`. Interdit : home, parent du home, sous `~/Library`.
- **Chemins** : vrais chemins locaux, pas `/workspace`, `/workspace/input`, `/workspace/output`. L’agent modifie le projet ; fichiers hors liste livrables ; supprimer la conversation ne supprime pas le dossier local.
- **Limites** : pas de réseau par défaut, écriture dans le projet seulement, `.git` du projet en lecture seule. Hors home sauf chaînes dev courantes (`.nvm`, `.pyenv`, `.cargo`) ; `.ssh`, `.aws`, trousseaux illisibles.
- **Approbation** : suppressions locales et commandes élargissant la sandbox → confirmation. Une approbation ≠ accès local illimité.
- **Rewind** : ne restaure pas les fichiers projet ; utiliser Git si besoin.

### Installer des skills locaux sur Lite bureau

macOS : « Boîte à outils → Gestion des skills », installer sur « Local » ; l’agent ne choisit que skills locaux installés et activés. Catalogue = paquets réutilisables ; install locale sous `~/.weknora/skills` avec versions ; bascule après install/validation réussie. Pas de snapshot Docker/E2B/Cube.

Exécution skill reste en sandbox locale ; fichiers projet pas dans les livrables sandbox distante. Cible différente du déploiement standard ; ne pas copier le chemin install distant en local.

## Variables d’environnement et secrets

Variables personnelles : « Paramètres → Secrets sandbox » ; variables skill espace sur la fiche skill dans « Boîte à outils → Gestion des skills ». Liste : déclarations, présence, source ; pas de valeur secrète affichée.

| Niveau | Rôle |
| --- | --- |
| `config.env_vars` sandbox espace | Injectées dans les sandboxes de cette config, pour leurs scripts |
| Variables skill espace | Valeurs par défaut admin pour variables déclarées du skill |
| Variables sandbox personnelles | Pour vos exécutions sur cette config |
| Variables skill personnelles | Pour vos exécutions de ce skill |

Résolution skill : **personnel skill > personnel sandbox > skill espace** ; noms non définis = repli. Env sandbox espace = environnement d’exécution, pas de secrets que le script ne doit pas lire. Supprimer override personnel = repli inférieur ; désactiver skill ne supprime pas credentials personnels.

Variables skill personnelles : noms déclarés par le skill, y compris `WEKNORA_*` requis. Variables sandbox personnelles : pas de `WEKNORA_*`, `PATH`, etc. réservés. Variables reconnues dans la commande complètent seulement les valeurs personnelles absentes. Champs et exemples : [API variables personnelles](../04-api/02-api-sandbox-skills.md#variables-denvironnement-personnelles).

## Générer et télécharger des fichiers {#fichiers-et-livrables}

`read_file(path="skill://<name>/SKILL.md")` lit la doc ; scripts via `shell_exec(skill_name=..., command=...)`. `$WEKNORA_SKILL_DIR` = répertoire install réel ; `skill://` pour lecture, pas chemin shell direct.

Une sandbox par session : pièces jointes dans `/workspace/input`, scripts dans `/workspace`, livrables téléchargeables dans `/workspace/output`. Réutilisation par utilisateur : répertoire session avec `input` et `output`. `write_sandbox_file` créer/append, `edit_sandbox_file` remplacement partiel, `read_file` paginé. Limites outils fichiers, budget sortie, reconstruction : [Moteur Agent](07-agent.md) ; livrables : [Expérience de conversation](18-chat-experience.md).

<Screenshot
  src="/screenshots/skill-sandbox-chat.png"
  caption="Après génération Word en sandbox : aperçu et téléchargement dans la conversation" />

Pendant l’exécution, la carte outil affiche les dernières lignes de sortie pour suivre une commande longue ; sortie intermédiaire non injectée dans le contexte modèle.

### Commandes longues et tâches arrière-plan

`shell_exec` pour commandes courtes : timeout défaut 120 s, max 600 s. Builds/installs/traitements longs : `shell_exec_async` — courte attente puis `work_id` si toujours en cours. `work_wait` statut/sortie incrémentale ; `work_cancel` annule.

Pas de terminal interactif en arrière-plan : commandes sans saisie ; ne pas simuler avec `&` ou `nohup`. UI peut afficher progression. Pas de plafond 600 s des outils sync, mais limites environnement, annulation et durée max de l’automatisation.

### Panneau visualisation sandbox

Conversation avec sandbox distante : panneau « Visualisation sandbox » à droite, trois onglets :

| Onglet | Contenu | Condition |
| --- | --- | --- |
| Livrables | Fichiers téléchargeables tour courant ou tous, recherche par nom | Toutes sandboxes distantes |
| Terminal | Shell interactif (xterm). Cube/E2B : reconnexion après refresh si terminal encore actif ; Docker : déconnexion = fin shell (tâches nohup conservées), reconnexion = nouveau shell | Cube, E2B, Docker |
| Bureau | Bureau XFCE dans le navigateur, une connexion à la fois | Templates bureau Cube/E2B et `desktop_enabled` |

Ouvrir le panneau ne crée/réveille pas la sandbox : si active, terminal/bureau se connectent ; si pause/absente, « Démarrer terminal », « Connecter bureau » ou « Créer et démarrer » (facturation selon config espace). Inactivité longue → déconnexion puis pause selon TTL fournisseur ; délai « Terminal / bureau idle disconnect (s) », défaut 900 s, 60 s–24 h. Reconstruction sandbox (update skill, une par session) : contenu terminal/bureau non sauvé perdu ; sandbox partagée non reconstruite auto pour update skill.

<Screenshot
  src="/screenshots/sandbox-panel-terminal.png"
  caption="Panneau sandbox : livrables, terminal et bureau à côté de la conversation"
  hint="Conversation Cube ou E2B, panneau droit onglet Terminal avec prompt coloré et sortie ; onglets Livrables / Terminal / Bureau visibles." />

## Sandbox partagée par utilisateur {#user-sandbox}

Sandboxes distantes (Docker, CubeSandbox, E2B) : deux modes d’allocation. Sandbox locale Lite non concernée.

| Mode | Quand | Ce que voit la session |
| --- | --- | --- |
| Une par session (défaut) | Config en mode session, ou conditions ci-dessous non remplies | Sandbox dédiée, `/workspace` |
| Une partagée par utilisateur | Variable activée, config en mode partagé, session avec identité partageable | Sessions même propriétaire + même config partagent une machine. Répertoire session `/workspace/sessions/<12 caractères>` (12 premiers hex SHA-256 de l’ID session, ex. `c812e1edb644`), dépôt checkpoint `/var/lib/weknora/sessions/<même>.git`. |

Changement n’affecte que sessions sans sandbox déjà utilisée. Sessions ayant déjà épinglé config, checkpoints, ou fork non préparé : conservent leur machine.

Machine partagée non remplacée auto sur update image skill, même si ancienne config `skill_rollout=next_turn` ou marquée rebuild. Nouvelles sessions réutilisent la machine ; pour nouvelle image : libérer/recréer manuellement (supprime fichiers et état). TTL fournisseur, recyclage idle et recréation si machine absente inchangés.

<Screenshot
  src="/screenshots/sandbox-user-skill-rollout.png"
  alt="Mode partagé masque stratégie rollout skill, conserve réglage jours rétention sandbox idle"
/>

Accès machine partagée : compte Web connecté, ou appels API avec identifiant utilisateur externe. Même clé API sans identifiant externe = sandboxes séparées par session.

Partage pour tâches où un utilisateur accepte un environnement commun ; limites :

- Commandes en root, pas d’isolation OS entre sessions sur la même machine ; outils ne limitent pas lecture/écriture au répertoire session : un agent peut accéder aux autres répertoires, y compris autres sessions.
- Disque et processus partagés.
- Pas de plafond de nombre de sessions sur une machine.

Jours de rétention idle sur la config sandbox. `0` = défaut 7 jours, ou 1–90. Compte à partir de « plus aucune session active sur cette machine » ; tâche de recyclage peut supprimer la machine. Pas durée de vie minimale ni garantie de rétention session : pas de suppression tant qu’il reste des sessions ; pas de suppression anticipée avant le délai idle.

Supprimer une session partagée réveille d’abord la sandbox en pause, puis supprime répertoire session et dépôt checkpoint. Autres sessions sur la même machine conservent leurs répertoires.

Terminal sur machine partagée ne reconnecte pas un shell par PID client (processus peut être d’une autre session). Rewind session vers ancien checkpoint pendant terminal ouvert = busy ; autres sessions inchangées.

Upgrade rolling :

1. Déployer nouvelle version partout sans `WEKNORA_SANDBOX_USER_ALLOCATION`. Nouvelles instances écrivent `machine_digest` vide ; anciennes instances ignorent la table, comportement inchangé.
2. Toutes instances à jour → `WEKNORA_SANDBOX_USER_ALLOCATION=enabled` partout et rolling restart. Redis requis.
3. Admin passe une config sandbox en mode partagé.
4. Avant rollback version : plus de machines partagées actives. Table allocation sans colonne `mode` ; partage = `machine_digest` non vide :

```sql
SELECT count(*) FROM session_sandbox_assignments WHERE machine_digest <> '' AND released_at IS NULL;
```

Résultat 0 = condition nécessaire mais pas suffisante pour rollback migrations DB sans perte. Si allocations partagées restantes : repasser une par session, sauvegarder fichiers, traiter machines utilisateurs, puis évaluer rollback app/DB.

## Déploiement et dépannage

Socket/TLS Docker, versions template, passerelles distantes, Redis multi-réplicas, espace disque snapshots skills, relais terminal/bureau et build sandbox locale Lite : [Déploiement et dépannage sandbox](../06-development/04-sandbox-deployment.md).

## Référence d’implémentation

- `internal/handler/sandbox_config.go`, `sandbox_skill.go`, `skill_catalog.go`, `me_env_var.go`
- `internal/application/service/tenant_skill_install.go`, `tenant_skill_runtime_verify.go`, `tenant_skill_steer.go`, `user_env_resolver.go`
- `internal/types/tenant.go`, `sandbox_network_policy.go`
- `internal/sandbox/remote_client.go`, `docker_remote_client.go`, `gateway_transport.go`, `terminal.go`
- `internal/localsandbox/` (sandbox locale Lite : `core/policy_builder.go`, `seatbelt/`, `adapter/`)
