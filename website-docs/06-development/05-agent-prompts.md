# Assemblage des prompts de dialogue et champs éditables

Ce document s’adresse aux développeurs qui maintiennent les prompts, l’éditeur d’agents et la chaîne de messages vers le modèle. Pour la configuration des agents et le flux d’exécution, voir [Moteur Agent](../03-features/07-agent.md).

## Segments système du raisonnement intelligent

Le point d’assemblage unique est `BuildSystemPromptSections` dans `internal/agent/prompts.go` ; le moteur et l’interface chaîne compatible `BuildSystemPromptWithOptions` l’utilisent tous deux. Ordre réel d’assemblage ; les segments vides sont omis à la sortie.

| Segment | Source et rôle |
| --- | --- |
| `base` | Texte explicite en priorité ; sinon modèle par défaut `pure` sans base liée, ou `rag` avec base |
| `steering` | Traitement des messages utilisateur ajoutés pendant la réponse (compléter, modifier, annuler) et conservation des tâches inachevées ; le texte personnalisé est conservé |
| `runtime_contract` | Frontière données/instructions, périmètre documentaire courant, conditions de fin ; langue utilisateur connue → langue de réponse par défaut |
| `sources` | Règles de sources selon l’ensemble d’outils enregistré ; mode installation de compétence → consignes de validation dédiées |
| `tools` | Conventions d’exécution, fichiers et sandbox ; les paramètres restent dans les définitions d’outils |
| `output` | Format de sortie public, conditions d’illustration et contrôles de complétion |
| `skills` | Métadonnées des compétences disponibles ; uniquement hors mode installation, avec `read_file` et métadonnées présentes |
| `memory` | Souvenirs rappelés pour ce tour |
| `protocol` | Handles de sources et protocole de citation en sortie |

Un texte personnalisé ne remplace que `base` : il ne supprime pas les autres segments runtime ni n’élargit les permissions d’outils. Les segments ne sont pas des niveaux de permission API modèle ; les outils invocables restent contrôlés par l’enregistrement et l’exécution backend. Le contrat navigateur reste dans la description de l’outil `local_browser` ; voir [Navigateur local](../05-clients/09-local-browser.md).

Les placeholders de `base` sont développés par `renderPromptPlaceholdersWithStatus` :

| Placeholder | Comportement actuel |
| --- | --- |
| `{{knowledge_bases}}` | Répertoire des bases dans `runtime_context` du message utilisateur, sans déplier le texte intégral |
| `{{web_search_status}}` | `Enabled` / `Disabled` selon l’enregistrement effectif de l’outil `web_search` |
| `{{current_time}}` | Date `YYYY-MM-DD` |
| `{{language}}` | Nom de la langue utilisateur |
| `{{skills}}` | Vidé ; les métadonnées compétences passent par un segment dédié |

## Contexte du tour courant et rôles des messages

`internal/agent/observe.go` ajoute `runtime_context` au message utilisateur courant : date, ID de session, résumé des bases liées, documents et sources de questions fixes pour ce tour ; non persisté comme instruction historique. Noms et descriptions de bases tronqués et échappés ; réponses FAQ et texte intégral des documents via outils de recherche.

Les mentions `@MCP` / `@Skill` produisent des indications `must_use` pour le tour. MCP ne fait qu’indiquer la priorité pour les services déjà autorisés ; les services non exposés passent par `discover_mcp_tools`. Les mentions compétence lisent d’abord le `SKILL.md` correspondant. Ces choix n’autorisent pas d’actions hors périmètre ; limites utilisateur et permissions backend inchangées.

Les messages utilisateur ajoutés pendant la réponse et traités en complément immédiat sont ajoutés en fin de liste avant l’itération suivante : contenu modèle dans `<steer_message>` avec `<continue_task>` (`types.SteerMessageContent`) ; l’historique et l’UI gardent le texte utilisateur original ; le segment `steering` définit le traitement attendu.

Les résultats d’outils normaux restent en rôle `tool` avec ID d’appel ; en réparation de messages, les résultats non appariés restent en bloc `untrusted_tool_result` échappé, sans promotion en instruction système. Agent, Q&R classique et repli modèle partagent les règles de frontière des sources, mais n’utilisent pas exactement le même assemblage de prompts.

En clôture (limite d’itérations ou erreur), `internal/agent/finalize.go` conserve la liste de messages actuelle (historique, images, appels/outils appariés) puis ajoute la demande de clôture. Dernier appel sans outils : `tool_choice=none` et thinking désactivé.

## Édition et enregistrement

L’éditeur frontend affiche le texte effectif ; `frontend/src/utils/agentPromptTemplates.ts` distingue à l’enregistrement référence de modèle et contenu personnalisé :

- Texte identique à un modèle connu : enregistrer `system_prompt_id` / `context_template_id`, corps vide.
- Texte modifié : enregistrer le corps, effacer les anciens ID de modèle.
- Réécriture / repli identiques au modèle par défaut : enregistrer une valeur vide pour hériter ; les prompts d’intention ne sauvegardent que les écarts au défaut.

Exemple de modèle Wiki non modifié :

```json
{"agent_mode":"smart-reasoning","system_prompt_id":"wiki_researcher","system_prompt":""}
```

`ResolveCustomAgentPrompts` dans `internal/config/agent_prompts.go` résout les références à la requête ; le corps explicite prime ; la recherche de référence se limite au jeu de modèles du champ et du mode. Le résultat n’est pas réécrit dans l’objet sauvegardé ; référence inconnue → corps vide, le caller utilise le chemin par défaut.

Une mise à jour des modèles par défaut ne remplace pas les corps personnalisés existants ni ne migre en masse d’anciennes copies par défaut. Pour realigner une ancienne config, restaurer le défaut dans l’éditeur puis enregistrer.

## Points à vérifier en maintenance

Pour une nouvelle règle, choisir l’appartenance : rôle et méthode dans `base`, choix de sources dans `sources`, conventions d’appel dans les définitions d’outils ou `tools`, forme de sortie dans `output`, encodage des citations dans `protocol`. Éviter la duplication entre segments.

Les logs `[Agent][Prompt] section=... bytes=...` aident au volume par segment ; valider le comportement exige aussi les messages finaux au modèle, le registre d’outils réel et les permissions d’exécution, plus des tâches couvrant sources, reprise après échec et format de sortie.
