# Mémoire à long terme inter-sessions

La mémoire à long terme conserve le profil, les préférences d’expression, les faits stables et les centres d’intérêt durables de l’appelant pour les sessions suivantes. Les données sont isolées par espace de travail et identité d’appelant : espaces, utilisateurs IM ou visiteurs embed maintiennent chacun leur mémoire personnelle.

## Activer la mémoire à long terme {#activation-et-usage}

1. Admin/Owner de l’espace : « Paramètres → Mémoire à long terme », activer l’interrupteur (désactivé par défaut).
2. Choisir « Mémorisation explicite uniquement » ou « Extraction automatique » ; en mode auto, modèle d’extraction optionnel (vide = modèle de la conversation).
3. Dans la gestion de la mémoire personnelle, vous pouvez la désactiver pour vous-même ; l’espace activé ne vous y force pas.
4. En conversation, indiquez clairement ce qu’il faut retenir, ou ajoutez manuellement via la gestion mémoire ; vérifiez ensuite dans une autre session.
5. Consultez régulièrement les entrées en attente de confirmation : confirmer, modifier ou refuser les inférences ; supprimez ce qui n’est plus valide.

| Mode | Comportement |
| --- | --- |
| `explicit_only` | Ne enregistre que ce qui est explicitement demandé ; pas de distillation LLM en arrière-plan |
| `auto` | Extraction additionnelle en arrière-plan depuis les conversations, fusionnée selon délai et intervalle minimum |

`memory_enabled=false` sur un agent désactive lecture/écriture mémoire pour cet agent ; omis = hérite des paramètres de l’espace. IM/Embed suivent les préférences mémoire de l’agent lié ; la clé API doit être full-access pour les API de gestion de la mémoire personnelle. La fonction dépend conjointement de l’espace, du profil personnel et du contexte de la requête.

## Gérer la mémoire

| Action | Usage |
| --- | --- |
| Ajouter / modifier | Maintenir profil, préférences, faits, tâches ou intérêts ; une édition manuelle n’est plus écrasée par l’extraction auto |
| Confirmer en attente | Entrée inférée passe de pending à utilisable ; non confirmée = pas injectée dans le prompt. Si l’inférence modifie une entrée existante, l’ancienne reste active jusqu’à confirmation puis remplacement ; inférence expirée → échec de confirmation, rafraîchir la liste |
| Refuser / supprimer | Annuler une mémoire erronée ou obsolète ; refus laisse une trace d’inhibition pour limiter la ré-extraction |
| Élévation de thème | Transformer immédiatement un sujet récurrent en intérêt durable ; arrêter le suivi d’un thème |
| Préférences document | Voir les documents cités souvent ; retirer une préférence de recherche personnalisée devenue inutile |
| Consolidation immédiate | Fusionner les entrées proches, archiver les tâches échues, sans attendre la tâche de fond |
| Exporter / vider | Télécharger votre JSON mémoire, ou effacer vos données mémoire |

Les entrées couvrent profil, préférences, faits, tâches et intérêts. Un nouveau fait sur le même thème peut remplacer l’ancien. Désactiver le profil suspend l’usage ; supprimer ou vider retire les données. Catégories et statuts dans l’[API Mémoire](../04-api/02-api-memory.md).

## Impact sur les réponses et la recherche

Le système injecte profil, préférences et intérêts comme contexte permanent (budget de longueur), et rappelle faits et tâches pertinents pour la question. Avec un modèle vectoriel configuré, le rappel sémantique classe toutes les entrées de l’identité par pertinence à la question, sans tenir compte de l’importance relative ; avec pgvector sur PostgreSQL le tri est en base, sinon calcul côté service. En raisonnement intelligent, recherche active dans la mémoire et l’historique. La mémoire n’influence que la compréhension et le choix de contexte, pas les droits d’accès à la base de connaissances.

Avec personnalisation de recherche activée, les thèmes aident à comprendre la question et les documents souvent cités à reranker. La timeline de conversation affiche les étapes liées à la mémoire. Les tâches de fond suivent curseur d’extraction et état pending par session : rafales courtes, troncature de lot ou redémarrage ne font pas perdre de messages. Si la sortie modèle reste invalide sur un segment, jusqu’à trois tentatives puis passage au segment suivant sans ré-extraction automatique du segment ignoré.

## Dépannage : la mémoire ne s’applique pas {#depannage}

| Symptôme | Vérifier |
| --- | --- |
| Mémoire non utilisée | Interrupteurs espace, personnel, agent ; changement d’espace ou d’identité |
| Extraction auto absente | write_mode, délai/intervalle d’extraction, modèle et tâches de fond |
| Inférence sans effet sur la réponse | Encore pending ; utilisable seulement après confirmation |
| Ne plus citer un document | Retirer dans préférences document ; droits KB restent indépendants |
| Consolidation immédiate sans fusion | Raison skipped dans la réponse (peu d’entrées, pas de candidats) |

## Configuration de l’espace

L’admin espace gère interrupteur, mode d’extraction et modèle dans les paramètres. Config dans `memory_config`, lue/mise à jour via `GET/PUT /tenants/kv/memory-config` ; champs complets dans l’[API Mémoire](../04-api/02-api-memory.md).

| Nom | Type | Défaut | Description |
| --- | --- | --- | --- |
| `enabled` | bool | `false` | Interrupteur espace |
| `write_mode` | string | `explicit_only` | `explicit_only` / `auto` ; autre valeur traitée comme `explicit_only` |
| `extract_model_id` | string | vide | Modèle d’extraction ; vide = modèle de conversation |
| `extract_delay_seconds` | int | `90` | Délai après la réponse avant extraction, fusion des tours proches ; 5–3600 |
| `extract_min_interval_seconds` | int | `300` | Intervalle minimum entre deux extractions pour une même personne ; messages dans l’intervalle reportés ; max 86400 |
| `extract_instructions` | string | vide | Règles d’extraction propres à l’espace, max 1000 caractères |
| `max_items` | int | `200` | Plafond d’entrées actives par identité, max 2000 ; 0 = défaut |
| `interest_threshold` | int | `3` | Nombre de sessions où un thème doit apparaître avant intérêt durable, max 20 |
| `embedding_model_id` | string | vide | Modèle vectoriel pour le rappel mémoire ; vide = correspondance lexicale seule |
| `vector_recall` | bool | omis = activé | Rappel sémantique si modèle vectoriel configuré |
| `retrieval_conditioning` | bool | omis = activé | Autoriser la mémoire à influencer la question et le classement documentaire |

Le modèle d’extraction sert à la synthèse en arrière-plan ; le modèle vectoriel au matching avec la question. La mémoire augmente les appels modèle ; supprimer un modèle référencé par la config mémoire affiche les dépendances.

## Référence d’implémentation

- `internal/application/service/memory/` : périmètre, extraction, rappel, thèmes, préférences document, consolidation
- `internal/handler/memory.go`, `internal/router/routes_memory.go` : API personnelle
- `internal/types/memory.go` : modèles, budgets, états et config
- `frontend/src/views/settings/MemorySettings.vue`, `MemoryWorkspaceSettings.vue`
