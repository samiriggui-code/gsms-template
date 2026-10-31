# Assistant WeKnora

L’assistant WeKnora répond aux questions sur les mises à jour, l’usage, la configuration et le dépannage WeKnora, et peut aussi, depuis la page courante et avec votre identité, créer des agents, planifier des tâches, organiser les connaissances et ajuster la configuration. Cliquez l’entrée assistant à côté du logo en haut à gauche : un panneau de conversation s’ouvre à droite ; posez une question ou décrivez directement ce que vous voulez accomplir. Il utilise vos droits et ressources, sans privilèges administrateur supplémentaires.

<Screenshot src="/screenshots/assistant-release-guide.png" caption="Demander les nouveautés WeKnora v0.9.0 et comment les utiliser via la doc produit" />

<Screenshot src="/screenshots/assistant-overview.png" caption="Traiter un problème concret de préparation d’événement avec les documents de la KB courante" />

## Commencer en une phrase {#getting-started}

Après passage à v0.9.0, l’onboarding met en avant le bouton assistant près du logo. Ouvrez l’assistant ou « Compris » pour fermer l’indication ; les nouveaux utilisateurs le trouvent aussi dans le guide de première utilisation.

Exemples de tâches :

- « Qu’est-ce qui change dans cette version WeKnora et comment utiliser ces fonctions ? »
- « Crée un assistant pour organiser un club de lecture, lie les docs événement, fais-moi valider avant création. »
- « Explique la config parsing de cette KB : quels réglages impactent la recherche d’images ? »
- « Trouve des sources pertinentes pour ce problème avec les références originales. »
- « Vérifie l’état de parsing de ce document, la cause d’échec et la suite. »
- « Prépare une automatisation quotidienne de veille publique, fais-moi valider la config d’abord. »

L’assistant peut chercher et lire la doc produit de la version courante et découvrir les opérations de gestion disponibles. Pour modifier des ressources, confirmation préalable selon les [permissions d’exécution](28-agent-permissions.md) ; rôle dans l’espace, accès ressources et limites de chaque opération restent applicables.

## Page courante et périmètre documentaire {#context}

Depuis agent, KB, document ou paramètres, le contexte de page aide à interpréter « ici », « ce document », etc. Il s’agit du contexte de page WeKnora, pas d’une lecture d’autres applications sur l’ordinateur. La page courante ne limite pas automatiquement la recherche à une KB ni n’accorde de nouveaux droits. Pour un périmètre précis, `@` dans la zone de saisie pour KB, document ou tag, et précisez la tâche.

L’assistant a un historique de session distinct. Chat ordinaire et sessions assistant sont séparés ; l’historique assistant n’est visible que pour son auteur ; un admin espace ne peut pas parcourir celui des autres membres.

## Ce que l’assistant peut faire {#capabilities}

| Tâche | Exemples |
| --- | --- |
| Aide WeKnora | Mises à jour, fonctions, config, déploiement, dépannage |
| Config agent | Créer agent, modèles, KB, outils, valider avant enregistrement |
| Q&R connaissances | Recherche KB et Wiki, lecture sources, vérification réponses |
| Maintenance contenu | Créer/modifier documents, FAQ, contenu KB selon autorisation |
| Config et diagnostic | Modèles, agents, MCP, skills ; parsing ou retrieval |
| Collaboration page | Ouvrir pages liées, aider à remplir config, vous validez |
| Tâches récurrentes | Créer/gérer [automatisations](27-automations.md), consulter exécutions |

Certaines tâches exigent des capacités déjà configurées (recherche Web, sandbox pour skills). Trouver une opération ne contourne pas les permissions requises.

## Collaboration multi-agents {#collaboration}

Pour recherche ou organisation décomposable, l’assistant peut assigner plusieurs agents puis agréger. Suivez progression, sorties et éléments en attente ; ajoutez des consignes ou arrêtez.

<Screenshot src="/screenshots/agent-collaboration.png" caption="Plusieurs agents traitent des sous-tâches, résultats regroupés dans la même tâche" />

- Les agents collaboratifs temporaires héritent des capacités autorisées pour la tâche ; un agent de raisonnement existant dans l’espace peut servir de modèle.
- Chaque sous-tâche a sa session, sans copie automatique de tout l’historique ou des pièces du parent. La description doit inclure contexte et périmètre documentaire.
- Maximum 16 instances collaboratives par tâche, 3 en parallèle ; instances en attente d’approbation ne comptent pas dans le quota. Un agent collaboratif ne crée pas récursivement une couche suivante.
- Arrêter la tâche principale annule les tâches encore en cours du groupe ; les écritures déjà terminées ne sont pas annulées automatiquement.

La collaboration n’élargit pas les droits ressources. Avec [sandbox partagée par utilisateur](22-skills-sandbox.md#user-sandbox), répertoires de session restent séparés mais peuvent cohabiter sur la même machine : ce n’est pas une isolation OS entre répertoires.

## Nom et plafond de permissions {#settings}

L’espace peut configurer le nom affiché de l’assistant et le plafond de permissions d’exécution. Plafond assistant par défaut « confirmation avant modification » ; le choix par session ne dépasse pas le plafond espace. Plafonds des agents personnalisés sont gérés séparément.

Découverte d’opérations de gestion, requête doc produit, etc. sont propres à l’assistant WeKnora intégré ; copier le nom ou le prompt système sur un agent custom ne les accorde pas.

Voir aussi : [Agent](07-agent.md) · [Automatisations](27-automations.md) · [Permissions d’exécution et approbations](28-agent-permissions.md)
