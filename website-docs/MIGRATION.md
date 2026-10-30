# Historique de migration depuis l’ancien `docs/`

La documentation produit, déploiement, API et développement est désormais maintenue dans `website-docs/`. Ce document sert les mainteneurs à revoir le périmètre de migration ; il n’est **pas** publié sur le site. Cette passe supprime 87 anciens documents manuscrits déjà migrés, dupliqués ou obsolètes, sans conserver une seconde copie du corps de texte. L’ancien contenu reste traçable via l’historique Git ; `docs/` ne conserve que les ressources d’ingénierie listées ci-dessous.

## Contenu complété sur le nouveau site

| Ancien document (sous `docs/`) | Nouvelle entrée | Traitement |
| --- | --- | --- |
| `QA.md`, `migration-troubleshooting.md` | [FAQ et dépannage de mise à niveau](01-getting-started/05-troubleshooting.md) | Conserver le positionnement des symptômes et les procédures de récupération ; lier le détail fonctionnel aux chapitres existants ; corriger l’affirmation « échec ⇒ rollback complet systématique » et l’usage mécanique de `force` |
| `paradedb-upgrade.md` | [Mise à niveau ParadeDB](01-getting-started/06-paradedb-upgrade.md) | Conserver sauvegardes, images, montée SQL des extensions, rollback et points de validation ; ne pas traiter d’anciens résultats de test comme validation de cette passe |
| `sandbox-cluster.md`, `sandbox-docker-backend.md`, `sandbox-desktop.md`, `sandbox-protocol.md` | [Déploiement sandbox et dépannage](06-development/04-sandbox-deployment.md) | Conserver modèles, daemon, passerelle, Redis, bureau et limites de snapshots ; expliquer la suppression de l’ancien backend local, la différence hôte bureau vs nommage côté serveur ; retirer comparaisons avec l’ancienne implémentation Docker et spécifications tierces non vérifiées |
| `browser-skill-integration.md`, `browser-skill-production.md` | [Navigateur local](05-clients/09-local-browser.md) | Compléter appairage, intervention humaine, reprise de tâches, build auxiliaire, proxy et exigences multi-réplicas ; distinguer des plugins assistant de gestion des connaissances |
| `agent-prompt-assembly.md` | [Assemblage des prompts de conversation](06-development/05-agent-prompts.md) | Conserver points d’assemblage actuels, sauvegarde de modèles et limites de messages ; omettre les comptes rendus tour par tour |
| `mcp-tool-directory.md` | [Intégration MCP](03-features/08-mcp.md#mcp-tool-directory), [API MCP](04-api/02-api-agent-mcp.md) | Remplacer l’ancienne doc d’enregistrement exhaustif ; compléter répertoire persistant, isolation par sujet, chargement à la demande et interfaces de sync ; corriger les contradictions sur le comportement de refresh |
| `worker-pool-governance.md` | [Capacité des tâches asynchrones](02-architecture/05-async-tasks.md#capacity-planning) | S’appuyer sur la topologie de files du nouveau site ; documenter la fin de vie de la config agrégée, estimations de capacité et quotas aval |
| `embed-subdomain.md`, `embed-secure-mode.md` | [Canal d’intégration embarqué](03-features/13-embed-channel.md#embed-subdomain) | Les modes de sécurité principaux sont déjà couverts ; compléter sous-domaines dédiés, adresses runtime et politiques proxy ; ne pas migrer d’exemples de pseudo-login basés uniquement sur Cookie/Header |
| `wiki/integration/feishu-drive-legacy.md` | [Accès Feishu Drive](03-features/24-feishu-drive.md) | Compléter autorisation de dossiers et modes de parsing ; aligner export par défaut, repli blocks et conditions images sur l’implémentation actuelle ; retirer détection de suppression et reprise d’échec basées sur d’anciens curseurs |
| `dev/opensearch-integration-test.md` | [Moteurs de recherche : intégration locale](03-features/05-retrieval-engines.md#opensearch-local-testing) | Fusionner dans la page existante ; compléter cluster de dev, SSRF et validation ; préciser que réplicas `0` revient en pratique à `1` ; commandes de nettoyage ciblées pour ne pas supprimer d’autres volumes de dev |
| `cloud-image/README.md`, `cloud-image/tencent-lighthouse.md` | [Guide de développement : scripts d’images cloud](06-development/01-dev-guide.md#cloud-image-scripts) | Ne garder que les limites des scripts et la restauration au premier démarrage ; pas de tutoriel de déploiement séparé ; ne pas reprendre quotas cloud, tarifs, délais de revue et chemins console figés de l’ancienne doc |

## Déjà couvert par le nouveau site — plus de copie intégrale

Comparaison par thème ; « couvert » signifie que les fonctions effectives et les entrées développeur ont une page, pas que tous les anciens exemples, captures ou explications fonction par fonction sont repris.

| Ancien document | Emplacement de maintenance |
| --- | --- |
| `dev-guide-legacy.md`, `quick-dev-mode-legacy.md` | [Guide de développement](06-development/01-dev-guide.md) |
| `LITE.md` | [Installation](01-getting-started/02-installation.md), [Client bureau](05-clients/05-desktop.md) ; le README du paquet release reste autonome, voir ci-dessous |
| `CHUNKING.md` | [Découpage](03-features/04-chunking.md) |
| `KnowledgeGraph.md`, `enable-knowledge-graph-legacy.md` | [Graphe de connaissances](03-features/09-knowledge-graph.md) |
| `alternate-vector-db-legacy.md` | [Moteurs de recherche](03-features/05-retrieval-engines.md), [Points d’extension](06-development/03-extension-points.md) |
| `add-web-search-engine-legacy.md` | [Recherche web](03-features/11-web-search.md), [Points d’extension](06-development/03-extension-points.md) |
| `datasource-import-dev-legacy.md` | [Sync des sources](03-features/10-datasource.md), [Points d’extension](06-development/03-extension-points.md) ; pages cloud complétées séparément |
| `im-integration-dev-legacy.md` | [Intégration IM](03-features/12-im-integration.md), [Points d’extension](06-development/03-extension-points.md) ; ne pas réutiliser directement anciennes captures admin / listes de permissions en masse |
| `oidc-flow-legacy.md`, `rbac-legacy.md`, `shared-space-legacy.md` | [Auth et autorisation](03-features/01-tenant-auth.md), [API auth](04-api/02-api-auth.md), [API organisation](04-api/02-api-org.md) |
| `BUILTIN_MODELS.md` | [Modèles](03-features/06-models.md), [Admin plateforme](03-features/20-platform-admin.md) |
| `BUILTIN_MCP_SERVICES.md`, `mcp-usage-legacy.md`, `zh/mcp-approval.md` | [Intégration MCP](03-features/08-mcp.md) |
| `langfuse-legacy.md`, `logging-config-legacy.md` | [Observabilité](03-features/16-observability.md), [Référence de configuration](01-getting-started/04-configuration.md) |
| `agent-skills.md`, `agent-tools-design.md` | [Skills et sandbox](03-features/22-skills-sandbox.md), [Moteur agent](03-features/07-agent.md), page déploiement sandbox ; ne pas migrer anciens noms d’outils, config local et contrats miroir utilisateur/lecture seule obsolètes |
| `chat-steering.md` | [Expérience de chat](03-features/18-chat-experience.md), [API conversation](04-api/02-api-chat.md) |
| `client-integration-upgrade-notes.md` | [CLI](05-clients/02-cli.md), [Go SDK](05-clients/03-go-sdk.md), [Mini-programme](05-clients/04-miniprogram.md), [Accès fichiers](03-features/21-file-access.md) |
| `api/*.md` | [Vue d’ensemble API](04-api/01-api-overview.md) et chapitres du même répertoire ; compléter métadonnées MCP et API bureau sandbox manquantes ; ne plus maintenir une seconde API manuscrite |
| Autres pages sous `wiki/` | Résumés thématiques ci-dessus, pas migration intégrale ; ancienne navigation, backlinks et graphes exclus du nouveau site |

## Non migré comme documentation produit actuelle

- `ROADMAP.md` : l’ancien plan mélangeait des capacités déjà livrées — ne pas en faire des engagements actuels ; l’entrée pointe vers la présentation produit ; le plan doit être revalidé avant réécriture.
- `code-slimming-audit.md` : audit ponctuel de simplification du code — corps supprimé, historique Git uniquement.
- `plans/2026-09-10-faq-enabled-filter-design.md` : processus de design historique — corps supprimé ; interfaces finales dans les chapitres FAQ/API ; design consultable dans Git.
- `poc/docker-sandbox/` : module Go indépendant et ancienne faisabilité Docker — pas de doc utilisateur ; à déplacer vers un répertoire d’expérimentation dev si besoin.

## Ressources d’ingénierie conservées sous `docs/`

1. **Paquet Swagger généré** : `internal/router/router.go` importe `github.com/Tencent/WeKnora/docs` ; la cible `docs` du `Makefile` écrit dans ce répertoire. `docs.go` participe à la compilation backend ; `swagger_contract_test.go` lit JSON/YAML. Les builds normaux et la CI ne régénèrent pas automatiquement — conserver temporairement les trois artefacts et les tests. Migration future possible vers un paquet générateur dédié (imports, chemins, tests, exclusions lint) ; si les artefacts ne sont plus versionnés, brancher d’abord une version figée du générateur sur build, test et release.
2. **README Lite pour release** : `scripts/package-lite.sh` et `.github/workflows/release-lite.yml` copient `docs/LITE.md` dans le paquet offline ; en cas de déplacement, garder un README lisible offline, pas une longue page avec liens relatifs internes au site.
3. **Images** : README multilingues, Helm, etc. référencent encore `docs/images/` et `docs/assets/` — conservés. Les images du nouveau site sont dans `public/`.
4. **Expérimentations historiques** : `poc/docker-sandbox/` (module Go et mode d’emploi) — hors doc produit maintenue. Anciens corps manuscrits (API, copies Wiki, roadmap, audit, design) supprimés.

Exemples de variables d’environnement, aide frontend, exemples de chunking, notes Helm, projets d’exemple, commentaires de code et liens cliquables dans le CHANGELOG pointent vers le nouveau site. Le CHANGELOG conserve le texte historique sur les fichiers ajoutés dans d’anciennes versions — ce n’est pas une entrée doc actuelle. `scripts/cloud-image/README.md` renvoie vers le nouveau site pour éviter des tutoriels dupliqués.

## Périmètre de cette revue

La migration s’appuie sur routes, handlers, sandbox/navigateur, services de sources, SQL de migration et scripts de déploiement **dans le dépôt actuel**. Le site exécute vérification de liens, Mermaid et build doc ; pas de montée de base de production, nettoyage d’images cloud, cluster sandbox réel ou branchement IM dans cette passe documentaire.

## Revue d’exactitude et de nécessité

Six types de pages autonomes conservées : dépannage transversal, montée ParadeDB sur stock existant, Feishu Drive, navigateur local, déploiement sandbox, maintenance des prompts. Elles complètent respectivement le dépannage inter-chapitres, upgrades avec état, choix d’auth/parsing, déploiement client autonome, exploitation sandbox et contrats dev ; les pages existantes ne gardent que résumé et liens.

- OpenSearch fusionné dans moteurs de recherche ; maintenance d’images cloud dans le guide dev — pas de tutoriels séparés peu fournis ou non testés.
- Page prompts vérifiée contre `prompts.go`, `observe.go`, `finalize.go`, `config/agent_prompts.go` ; corriger format de date dans l’ancien chapitre Agent, portée MCP et rôle de message de clôture ; retirer duplication du protocole navigateur interne.
- Feishu Drive vérifié contre `core/engine.go`, `core/shared.go` et le service sources ; ne plus promettre qu’une sync complète comble les suppressions ; permissions tierces via doc officielle, pas de liste figée non validée sur la plateforme.
- OpenSearch aligné sur config driver et index ; retirer exemple zéro réplica invalide ; corriger l’ancienne description d’index unique multi-dimensions.
- Étapes DB : distinguer production vs Compose dev ; doc sandbox : hôte bureau vs trois schémas de nommage serveur ; images cloud : moment réel d’écriture du chemin systemd figé et marqueur de premier démarrage.

Il s’agit de vérifications code et configuration — pas d’équivalence avec acceptation sur plateforme réelle ou montée production.
