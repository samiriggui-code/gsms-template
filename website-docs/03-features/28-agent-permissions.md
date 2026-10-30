# Permissions d’exécution et approbations

Les permissions d’exécution définissent ce que l’agent peut faire directement dans une tâche et quelles opérations demandent confirmation. Elles s’ajoutent au rôle dans l’espace et aux droits ressources : autoriser une écriture n’accorde pas l’édition d’une KB ou de fichiers auparavant interdits.

<Screenshot src="/screenshots/assistant-permissions.png" caption="Avant écriture : vérifier le document cible et les champs à modifier, puis approuver ou refuser" />

## Trois niveaux d’exécution {#levels}

| Permission | Exécution directe | Écritures et opérations à fort impact |
| --- | --- | --- |
| Lecture seule `read_only` | Lecture et sonde (statut, recherche) | Pas d’écriture ; une approbation ne contourne pas la lecture seule |
| Confirmation avant modification `confirm` | Lecture et sonde | Écritures sur demande de confirmation ; suppressions et opérations destructives aussi |
| Exécution auto `auto_write` | Lecture, sonde et écritures courantes | Opérations destructives encore confirmées ; outils marqués approbation systématique confirmés à chaque fois |

En session assistant, le choix est plafonné par les paramètres espace ; les agents personnalisés utilisent `config.access_level`. Plafond assistant par défaut `confirm` ; agent personnalisé sans plafond explicite : défaut `auto_write` après upgrade — vérifier selon l’usage.

## Consulter et traiter les approbations {#prompts}

La carte d’approbation décrit l’opération prévue. Avant confirmation : ressources, paramètres, impact ; refus = l’agent doit ajuster ou abandonner l’opération.

Éléments en attente et exécutions reprenables persistent ; rafraîchir la page permet de continuer. Reprendre l’attente ne rejoue pas automatiquement toutes les actions ; après interruption, une exécution d’issue incertaine exige vérification de l’état actuel.

Les cartes persistées affichent l’attente et l’échéance le cas échéant ; fin d’attente courte en arrière-plan ≠ approbation expirée. Approbations instantanées non suspendables peuvent afficher un compte à rebours : traiter avant expiration.

Pour les outils MCP, la config risque/approbation côté service participe aussi. Même en auto, une approbation forcée à chaque fois n’est pas contournée par une autorisation générale. Voir [MCP](08-mcp.md).

## Autorisations de session et d’automatisation {#grants}

En session, une autorisation peut couvrir les écritures courantes ultérieures, limitée à la session racine et au périmètre indiqué. Les suppressions et opérations destructives ne sont pas globalement autorisées par une grant de session ordinaire.

Les automatisations permettent aussi des autorisations durables plus explicites dans les paramètres de tâche, dérivées des approbations passées, opération et ressources, y compris destructives éligibles. Opérations à approbation systématique exclues. Les grants durables ne contournent pas les contrôles de rôle ; changement de config, expiration, révocation ou inactivité affectent la validité.

« Exécution auto » n’est pas une permission illimitée : systèmes externes, installation de skills ou fichiers locaux restent limités par outils, sandbox locale et autorisations ressources.

Voir aussi : [Assistant WeKnora](26-weknora-assistant.md) · [Automatisations](27-automations.md) · [Skills et sandbox](22-skills-sandbox.md)
