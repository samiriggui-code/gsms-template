# Automatisations

Confiez à l’assistant WeKnora des tâches répétitives selon un planning : veille quotidienne, contrôles réguliers de la base de connaissances, synthèse de documents de travail. Ouvrez « Automatisations » dans la barre latérale pour créer des tâches, consulter les exécutions et traiter les approbations en attente.

<Screenshot src="/screenshots/automation-conversation.png" caption="Décrire la tâche et l’horaire en une phrase pour configurer une automatisation" />

## Créer une tâche {#create}

Vous pouvez dire à l’assistant WeKnora : « Chaque jour à 9h, résume les tâches en attente pour le club de lecture, fais-moi valider avant création. » Il structure tâche et planning pour validation. Ou manuellement depuis la page Automatisations :

1. « Nouvelle automatisation », nom et description. Précisez sources, livrables attendus et critères de fin.
2. Exécution unique ou périodique, vérifier le fuseau. Périodique = expression Cron, intervalle minimum 5 minutes.
3. Mode de session, permissions d’exécution, notifications. Même session pour contexte continu ; nouvelle session à chaque fois, éventuellement avec le dernier succès.
4. Après sauvegarde, vérifier la prochaine exécution ; lancer manuellement une fois, valider, puis laisser le planning actif.

<Screenshot src="/screenshots/automation-setup.png" caption="Fréquence, horaire et fuseau ; aperçu des prochaines exécutions" />

Les automatisations sont exécutées par l’assistant WeKnora ; un modèle dédié est possible, sinon config modèle de l’assistant. Autres agents : décrire le partage dans la consigne, l’assistant coordonne.

## Exécutions et résultats {#runs}

Le détail de tâche liste exécutions et résultats. Ouvrir la session pour le déroulé complet, ou demander à l’assistant d’analyser une exécution. Pause, reprise, exécution manuelle ; annuler une exécution ≠ supprimer le planning.

| Réglage | Effet |
| --- | --- |
| Fuseau | Heure planifiée ; API sans valeur = UTC. Recommandé : fuseau IANA explicite (`Asia/Shanghai`, etc.) |
| Exécution manquée | Ignorer, ou une reprise après retour ; pas de rattrapage de toutes les occurrences manquées |
| Chevauchement | Si le tour précédent n’est pas fini : ignorer ou mettre en file |
| Durée d’exécution | Défaut 30 min, max 4 h ; attente d’approbation non comptée |
| Attente approbation | Défaut 24 h, de 5 min à 7 jours |
| Notification succès | Notification in-app optionnelle ; résultats et approbations via le centre de notifications |

Après 3 échecs consécutifs, la tâche se met en pause : analyser la cause avant reprise. Après interruption de service, une exécution dont l’issue est incertaine peut passer en « à traiter » ; le système ne rejoue pas automatiquement des écritures peut-être déjà effectuées.

## Permissions et approbations {#approval}

L’automatisation s’exécute avec l’identité du créateur et les ressources accessibles au créateur à ce moment. Pas de credential utilisateur permanent ; changement de rôle ou de droits impacte la prochaine exécution. Seul le créateur gère la tâche ; les API automatisations ne sont pas ouvertes aux clés API.

Si approbation requise, l’exécution pause et notifie. Ouvrir l’élément en attente, vérifier opération, ressources et impact. Exécution sans présence ne remplace pas une réponse libre de l’utilisateur : la consigne doit contenir les prérequis.

Pour des besoins d’approbation récurrents, gérer une autorisation durable dans la tâche, limitée à l’opération et aux ressources concernées. Toujours soumis aux droits actuels, périmètre, expiration, révocation et règles d’approbation forcée. Après révocation, les opérations suivantes suivent à nouveau la politique. Voir [Permissions d’exécution et approbations](28-agent-permissions.md).

## Déploiement et capacité {#limits}

Par défaut 100 tâches max par espace, 4 exécutions simultanées par processus, 200 dernières exécutions conservées par tâche. Le planificateur fait partie de l’application : maintenir l’app en marche et sauvegarder la base ; veille ou arrêt du poste empêche l’exécution à l’heure.

Voir aussi : [Assistant WeKnora](26-weknora-assistant.md) · [API Automatisations](../04-api/02-api-automations.md)
