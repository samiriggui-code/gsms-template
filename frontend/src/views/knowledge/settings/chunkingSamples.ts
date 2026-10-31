// Curated sample texts for the chunking debug drawer. Each preset is sized
// to ≈2000–4000 characters and shaped to exercise a distinct tier of the
// chunker, so users can quickly see how their config behaves on realistic
// content without preparing their own sample.

export interface ChunkingSample {
  id: string
  // i18n key under knowledgeEditor.chunking.debug.samples.<id>
  labelKey: string
  text: string
}

const MARKDOWN_SAMPLE = `# Le cadre de connaissances WeKnora

WeKnora est un cadre open source de gestion des connaissances d'entreprise basé sur les LLM. Il réunit questions-réponses RAG, agents ReAct et graphe de connaissances wiki. Ce document présente ses motivations, son architecture et ses usages types.

## Motivations

Dans une entreprise, le savoir est dispersé entre Confluence, Feishu, Notion, des dépôts Git et bien d'autres outils. La recherche plein texte classique comprend mal le sens des phrases, et un LLM seul manque de sources fiables. WeKnora vise à apporter :

- **Connexion multi-sources** : extraire, nettoyer et vectoriser les contenus dispersés
- **Recherche multi-stratégies** : rappel dense, creux et par graphe de connaissances, fusionné par RRF
- **Raisonnement explicable** : l'agent ReAct rend la chaîne de raisonnement traçable et pilotable
- **Observabilité** : intégration native de Langfuse, chaque étape et chaque appel d'outil a sa trace

## Fonctionnalités clés

### Plusieurs modèles

Compatible avec plus de 20 LLM du marché : OpenAI, Anthropic, DeepSeek, Qwen, Mistral, Gemini, ainsi qu'Ollama en local. La couche modèle expose une interface \`Provider\` : pour ajouter un fournisseur, il suffit d'implémenter la méthode \`Chat()\` et de l'enregistrer.

### Plusieurs bases vectorielles

Le choix se fait avec la variable d'environnement \`RETRIEVE_DRIVER\` :

| Pilote | Cas d'usage |
|------|---------|
| pgvector | PostgreSQL déjà en place, moins de 10 millions de fragments |
| Elasticsearch | Recherche hybride avec surlignage des mots-clés |
| Milvus | Grand volume, faible latence |
| Weaviate | Combinaison BM25 et requêtes GraphQL |
| Qdrant | Recommandé par défaut, simple à déployer, performances équilibrées |

### Connecteurs de sources de données

- **Feishu** : synchronisation automatique des bases et de l'arborescence, mises à jour incrémentales
- **Notion** : extraction des pages et bases de données par API
- **Yuque** : import par groupe, avec conservation des dossiers

Chaque connecteur implémente l'interface commune \`DataSource\` ; une nouvelle source représente environ 200 lignes de code.

## Démarrage rapide

### Prérequis

- Docker 20.10+ et Docker Compose v2
- Au moins 8 Go de mémoire et 20 Go de disque
- Pour faire tourner un LLM en local, un GPU NVIDIA avec 24 Go de mémoire vidéo ou plus

### Commandes de lancement

\`\`\`bash
git clone https://github.com/Tencent/WeKnora && cd WeKnora
cp .env.example .env       # adaptez la configuration des modèles et de la base
make dev-start             # lance postgres / redis / qdrant
make dev-app               # lance le backend avec rechargement à chaud
make dev-frontend          # lance le frontend avec rafraîchissement automatique
\`\`\`

Ouvrez ensuite http://localhost:5173 dans votre navigateur.

## Vue d'ensemble de l'architecture

Le backend de WeKnora suit une architecture en couches bien séparées :

\`\`\`
┌────────────────────────┐
│   Couche HTTP (Gin)    │  routage / authentification / limitation
├────────────────────────┤
│   Couche métier        │  algorithmes clés / orchestration
├────────────────────────┤
│   Couche données       │  accès base de données / cache
├────────────────────────┤
│   Modèle de domaine    │  KnowledgeBase / Chunk / Agent ...
└────────────────────────┘
\`\`\`

Le conteneur d'injection de dépendances (go/dig) assemble tout dans \`cmd/server/main.go\` : les handlers obtiennent les services par interface, les services obtiennent les repositories par interface, et chaque implémentation remplaçable est liée au démarrage.

### Pipeline de recherche

Envoi du document → analyse par docreader → découpage (avec fragments parents et enfants) → embedding → écriture dans la base vectorielle et la base de graphe → à la requête, rappel multi-voies → fusion RRF → reranking → réponse.

### Orchestration des agents

Le moteur d'agent exécute la boucle ReAct classique :

1. **Reason** : le LLM raisonne à partir du prompt système et de l'observation courante
2. **Act** : l'appel d'outil JSON est analysé puis envoyé à un outil intégré ou MCP
3. **Observe** : le résultat de l'outil est réinjecté dans le contexte
4. Les étapes 1 à 3 se répètent jusqu'à la réponse finale ou au nombre maximal d'itérations

Chaque étape est renvoyée au frontend en continu par SSE et enregistrée dans une trace Langfuse pour le diagnostic.

## Pour aller plus loin

- Documentation de l'API : \`website-docs/04-api/01-api-overview.md\`
- Liste des paramètres : \`config/config.yaml\` et \`.env.example\`
- Dépannage : \`website-docs/01-getting-started/05-troubleshooting.md\`
- Présentation du produit : \`website-docs/01-getting-started/01-introduction.md\``

const FAQ_SAMPLE = `# FAQ déploiement et utilisation de WeKnora

Ce document regroupe les questions les plus fréquentes des utilisateurs, classées par thème : installation, configuration, recherche, modèles et performances.

## Installation et démarrage

### Q1 : Où télécharger les images Docker ?
Les images officielles sont publiées sur Docker Hub :

\`\`\`
docker pull wechatopenai/weknora-app:v0.5.0
docker pull wechatopenai/weknora-docreader:v0.5.0
docker pull wechatopenai/weknora-ui:v0.5.0
\`\`\`

### Q2 : Après le démarrage, le port 5173 affiche l'ancienne interface
Le navigateur a gardé en cache l'ancien frontend. Forcez le rechargement avec Ctrl+Maj+R, et videz les données du site si besoin.

### Q3 : L'inscription renvoie 500 Internal Server Error
Le plus souvent, le conteneur backend n'a pas démarré correctement. Vérifiez d'abord \`make dev-logs | grep app\` : la cause habituelle est un échec de connexion à la base ou une migration non appliquée.

### Q4 : L'envoi d'un document renvoie column "xxx" does not exist
Les migrations de la base ne sont pas terminées. Lancez \`make migrate-up\`, vérifiez qu'elles ont toutes réussi, puis redémarrez le conteneur app.

### Q5 : Après l'envoi, le document reste en processing
Vérifiez que le conteneur docreader tourne (\`docker compose ps\`) et cherchez des erreurs d'analyse dans ses journaux. Causes fréquentes : paquet Python manquant, PDF chiffré, délai OCR dépassé sur un document scanné.

## Configuration

### Q6 : Comment changer de base vectorielle ?
Modifiez \`RETRIEVE_DRIVER\` dans \`.env\`. Valeurs possibles : \`qdrant\` (par défaut) / \`pgvector\` / \`elasticsearch\` / \`milvus\` / \`weaviate\`. Après le changement, il faut recalculer les embeddings existants.

### Q7 : Comment modifier la taille de fragment par défaut ?
La valeur globale se trouve dans la section \`knowledge.chunking\` de \`config/config.yaml\` ; chaque base de connaissances peut la redéfinir dans la page « Découpage » de l'interface. La modification ne s'applique qu'aux nouveaux documents.

### Q8 : Comment activer le multimodal ?
Activez-le dans la « Configuration multimodale » de la base et choisissez un modèle VLM (GPT-4o, Qwen2.5-VL...). Les images des documents sont alors décrites par le VLM et intégrées à la recherche.

### Q9 : Comment personnaliser le format des journaux ?
Définissez \`WEKNORA_LOG_FORMAT="%d %level %msg" LOG_LEVEL=info\`. Le modèle doit contenir \`%msg\` ; laissez vide pour le format par défaut. \`json\` n'est pas un mot-clé de format accepté.

## Recherche et rappel

### Q10 : La recherche ne renvoie rien alors que le document est indexé
Vérifiez dans cet ordre :

1. L'état de la base est bien \`completed\`, et non \`indexing\` ou \`failed\`
2. La connexion à la base vectorielle (qdrant:6334 par défaut) : \`docker compose ps\` indique-t-il qdrant en bonne santé ?
3. Lancez « Reconstruire l'index » dans l'administration pour vérifier que le modèle d'embedding fonctionne
4. Cherchez une erreur dimension mismatch du retriever dans les journaux du backend

### Q11 : La recherche trouve des résultats mais la réponse est à côté
En général, la limite d'un fragment a coupé une phrase clé. Essayez :

- d'activer les fragments parents et enfants : rappel sur les petits fragments, contexte avec les grands
- de porter le chevauchement à 15 à 20 % de la taille des fragments
- de passer à la stratégie « découpage par titres » ou « tenant compte de la structure »

### Q12 : Le classement semble incohérent
Le modèle de reranking n'est peut-être pas activé. Configurez BGE-Reranker ou Cohere Rerank dans « Paramètres des modèles » et activez le reranking dans la configuration de la base.

## Modèles et tokens

### Q13 : Les appels à OpenAI expirent
Vérifiez le proxy réseau et la configuration \`OPENAI_BASE_URL\` ; sans accès internet, passez à Ollama ou à un modèle hébergé localement.

### Q14 : Où voir la consommation de tokens ?
Avec Langfuse activé, chaque conversation, chaque raisonnement et chaque appel d'outil a une trace complète de sa consommation, agrégeable par période, espace ou modèle.

### Q15 : Comment brancher un LLM privé ?
Implémentez l'interface \`internal/models/chat/provider/Provider\`, enregistrez-la dans la fabrique de providers et ajoutez une entrée au fichier de configuration : environ 100 à 200 lignes de code.

## Performances

### Q16 : L'envoi de gros documents est lent
docreader est gourmand en CPU ; augmentez sa capacité horizontalement avec \`deploy.replicas\` dans docker-compose, ou déployez-le sur une machine plus puissante.

### Q17 : Le débit d'embedding est limité
Passez à Ollama en local avec accélération GPU, ou utilisez le point d'accès par lots d'une API commerciale (comme l'API batch d'OpenAI). Définir \`EMBED_BATCH_SIZE=64\` améliore nettement le débit.

### Q18 : Requêtes lentes sur la base de données
Activez \`pg_stat_statements\` pour repérer les requêtes SQL lentes ; le goulot habituel est la requête JSONB sur les métadonnées de la table chunks, à indexer sur les champs les plus sollicités.`

const CHAPTER_SAMPLE = `1. Introduction

1.1 Objet du document

Ce document décrit l'architecture d'ensemble d'une plateforme distribuée de recherche de connaissances, le découpage de ses composants et son plan de déploiement. Il s'adresse aux ingénieurs d'exploitation, aux SRE et aux architectes. Le lecteur doit connaître Docker, Kubernetes et PostgreSQL.

1.2 Terminologie

- Couche passerelle (Gateway) : répartit le trafic entrant et convertit les protocoles
- Couche métier (Service) : porte la logique du domaine et l'orchestration
- Couche stockage (Storage) : encapsule la persistance et le cache
- Couche inférence (Inference) : couche isolée qui dialogue avec les LLM et modèles d'embedding externes

1.3 Version du document

Version 1.4, correspondant à la série v0.5.x du code de la plateforme. Le document évolue avec le code ; les principaux changements figurent en annexe A.

2. Architecture du système

2.1 Conception générale

La plateforme suit une architecture en microservices classique, mais découpe avec retenue : un service n'est séparé que s'il a réellement besoin de passer à l'échelle seul. Elle compte aujourd'hui 4 services permanents : passerelle, backend métier, analyse de documents et indexation vectorielle.

2.2 Découpage en modules

2.2.1 Utilisateurs et droits

Utilisateurs, organisations, espaces partagés, rôles et règles d'accès sont regroupés dans user-service. Le modèle RBAC gère l'héritage et la surcharge ; la connexion OIDC externe passe par une couche d'adaptation.

2.2.2 Contenus et index

Le côté contenu gère le cycle de vie des documents : envoi, analyse, découpage, embedding, stockage, recherche et suivi des citations. Le fragment est la plus petite unité de recherche ; chacun porte les métadonnées et la position de son document source.

2.2.3 Inférence et orchestration

L'orchestrateur d'agents pilote la boucle ReAct ; les appels d'outils passent par le protocole MCP ou par le registre intégré. Tous les appels aux LLM transitent par une couche de proxy des modèles, ce qui facilite le changement de modèle, la limitation de débit et la facturation.

2.3 Flux de données

Après l'envoi, un document passe par : analyse → nettoyage → découpage → embedding → stockage. Chemin d'une requête : reformulation → rappel multi-voies → fusion → reranking → assemblage du contexte → génération par le LLM.

3. Guide de déploiement

3.1 Prérequis

Ressources minimales : 8 vCPU / 16 Go de mémoire / 100 Go de SSD ; en production, 16 vCPU / 32 Go / 500 Go sont conseillés. Un GPU n'est nécessaire que pour l'inférence locale.

3.2 Orchestration des conteneurs

3.2.1 Docker Compose sur une seule machine

Adapté aux preuves de concept et aux petites équipes (moins de 100 personnes, moins d'un million de fragments). Une seule commande lance tous les services :

docker compose up -d

3.2.2 Kubernetes avec Helm

Adapté aux déploiements à grande échelle. Le chart Helm se trouve dans le dossier helm/ et contient statefulset, secrets de configuration et modèles d'ingress. Il peut se brancher sur des clusters PG et Redis existants.

3.3 Bonnes pratiques de configuration

- Placer les dépendances externes (base de données, stockage objet, base vectorielle) dans un centre de configuration plutôt qu'en dur
- Gérer les clés API des modèles comme des secrets, séparés par environnement
- Envoyer les journaux sur stdout/stderr pour que la plateforme d'orchestration les collecte, sans écriture locale

4. Scénarios d'exploitation courants

4.1 Procédure de mise à jour

Déploiement bleu-vert ou progressif, au choix. Avant toute mise à jour, vérifiez dans le CHANGELOG s'il y a des changements de schéma : les migrations passent avant le remplacement des images.

4.2 Sauvegarde et restauration

Sauvegarde complète quotidienne de PG plus WAL incrémental ; MinIO et le stockage objet s'appuient sur le versionnement du cloud. Qdrant écrit régulièrement des instantanés dans le stockage objet via son API snapshot.

4.3 Diagnostic des pannes

Procédez couche par couche : passerelle → métier → stockage → modèle. Chaque couche a une route de santé et une entrée de trace Langfuse ; ensemble, elles permettent de localiser 80 % des problèmes en 5 minutes.`

const PLAIN_SAMPLE = `La qualité de recherche d'une base de connaissances dépend de plusieurs facteurs, à commencer par l'adéquation entre la stratégie de découpage et le modèle d'embedding. Des fragments trop gros mélangent plusieurs sujets et diluent la pertinence ; des fragments trop petits perdent le contexte, si bien qu'un fragment isolé ne répond plus aux questions qui chevauchent deux passages. On conseille en général une taille de fragment comprise entre 50 % et 80 % de la fenêtre recommandée du modèle d'embedding, pour garder le sens complet tout en laissant de la marge. Les modèles courants comme BGE ou embed-v3 de Cohere recommandent une fenêtre de 512 tokens, soit à peu près 1 500 à 2 000 caractères en français, où un mot compte en moyenne pour 1,3 à 1,6 token.

Au-delà de la taille, le chevauchement (overlap) influe nettement sur la complétude du rappel. Sans chevauchement, une question à cheval sur deux fragments ne récupère souvent qu'une demi-phrase ; un chevauchement de 10 à 20 % couvre la plupart des cas limites ; au-delà de 30 %, les fragments voisins deviennent trop semblables, ce qui alourdit l'index sans améliorer le rappel. Une méthode simple : prenez comme point de départ un tiers de la longueur moyenne des réponses attendues, puis ajustez par tests A/B.

Les séparateurs doivent suivre la structure réelle des documents. Pour du texte brut, gardez le double saut de ligne par défaut comme séparateur fort ; pour du Markdown, conservez la hiérarchie des titres en découpant d'abord par titre, puis par paragraphe à l'intérieur des grandes sections ; pour un mélange de code et de tableaux, il faut une stratégie plus fine, par exemple extraire la structure du code avec Tree-sitter, détecter les limites des tableaux, ou séparer ces deux types de contenu par un script avant le découpage du texte. Si vos documents mélangent plusieurs langues, incluez la ponctuation de chacune dans les séparateurs, sinon le découpage ne fonctionnera bien que pour l'une d'elles.

Le choix du modèle d'embedding est souvent sous-estimé. Côté open source, la famille BGE-large reste solide, et BGE-M3 gère à la fois les vecteurs denses, creux et multi-vecteurs ColBERT ; côté commercial, text-embedding-3-large d'OpenAI est polyvalent et d'un coût raisonnable, et Voyage-3-large se distingue un peu en anglais. Pour les longs documents, surveillez la longueur d'entrée maximale du modèle : 8191 tokens chez OpenAI, 512 par défaut pour BGE. Une entrée trop longue est tronquée, ou découpée puis moyennée, et le résultat s'en ressent dans les deux cas.

Enfin, ne négligez pas le post-traitement. Le reranking améliore le résultat de bout en bout de 5 à 15 % dans presque tous les cas, au prix de 100 à 300 ms de latence supplémentaire par requête. Les rerankers courants sont BGE-Reranker, open source, et Cohere Rerank, payant mais un peu meilleur. Si votre chaîne de recherche inclut un rappel par mots-clés, un reranker en second filtre est vivement conseillé, sinon les correspondances purement littérales de BM25 pollueront le contexte.`


export const CHUNKING_SAMPLES: ChunkingSample[] = [
  { id: "markdown", labelKey: "samples.markdown", text: MARKDOWN_SAMPLE },
  { id: "faq", labelKey: "samples.faq", text: FAQ_SAMPLE },
  { id: "chapter", labelKey: "samples.chapter", text: CHAPTER_SAMPLE },
  { id: "plain", labelKey: "samples.plain", text: PLAIN_SAMPLE },
];

export const DEFAULT_SAMPLE_ID = "markdown";
