# Claw Skill

Claw Skill expose WeKnora aux agents de l’écosystème OpenClaw via l’API REST : envoi de documents, import de pages web et recherche multi-bases.

La skill est hébergée sur ClawHub sous [`@lyingbug/weknora`](https://clawhub.ai/lyingbug/weknora), licence MIT-0. Les capacités effectives dépendent de l’API WeKnora connectée.

## Fonctionnalités principales {#fonctionnalites-principales}

| Capacité | Interface correspondante |
| --- | --- |
| Envoi de fichiers | PDF, Word, Excel, etc. vers une base avec analyse et vectorisation |
| Import web | Capture par URL, écriture en base, suivi du statut d’analyse |
| Écriture Markdown | Création ou édition d’entrées Markdown (comptes rendus, notes structurées) |
| Recherche hybride | `hybrid-search` mono-base et `knowledge-search` multi-bases (vecteur + mots-clés) |
| Parcourir les bases | Lister bases et entrées, consulter le détail |

## Installation et connexion {#installation-et-connexion}

Dans « Paramètres → Intégrations de publication → Claw Skill », copiez l’URL API, l’exemple de variables d’environnement et la commande d’installation.

1. **Identifiants API** : « Paramètres → Intégrations de publication → Intégration API » (bouton « Ouvrir les infos API ») ;
2. **Variables d’environnement** : terminal ou `~/.zshrc` / `~/.bashrc`

   ```bash
   export WEKNORA_BASE_URL=https://your-weknora.example.com/api/v1
   export WEKNORA_API_KEY=sk-xxxxx
   ```

   `WEKNORA_BASE_URL` doit inclure `/api/v1` ; l’exemple du guide utilise l’adresse de l’instance courante.

3. **Installer la skill** : avec OpenClaw CLI, ou via ClawHub ;

   ```bash
   openclaw skills install @lyingbug/weknora
   ```

4. **Vérification** : demander à l’agent de lister les bases ou lancer une recherche.

## Rapport avec MCP

Claw Skill et le serveur MCP permettent tous deux aux agents externes d’appeler WeKnora ; le choix dépend du client et des fonctions voulues :

| | Claw Skill | Serveur MCP (intégré) |
| --- | --- | --- |
| Cible | Agents OpenClaw / ClawHub | Clients MCP (Claude Desktop, Cursor, Claude Code, VS Code Copilot, etc.) |
| Installation | Skill ClawHub | Pas de déploiement extra : créer un point de terminaison dans « Paramètres → Intégrations de publication → Serveur MCP », connexion `/mcp/<endpoint_id>` |
| Auth | Clé API d’espace (`WEKNORA_API_KEY`) | Jeton par point de terminaison, rotation et révocation |
| Transport | REST direct | Streamable HTTP ; secours STDIO `mcp-remote@0.15.1` si pas de HTTP/Bearer natif |
| Périmètre | Import, recherche, navigation (5 types) | Outils cochés par point de terminaison : recherche/lecture, Q&R (agent par défaut), Wiki, écriture ; bases limitables |
| Doc | Ce document | [Intégration MCP](../03-features/08-mcp.md) |

Pour Q&R, outils Wiki ou limitation fine outils/bases, préférez le serveur MCP ; pour import/recherche/navigation dans OpenClaw, Claw Skill suffit. Le service MCP Python sous `mcp-server/` est obsolète ; les nouvelles intégrations utilisent le serveur MCP intégré.

## Documentation associée {#documentation-associee}

- Identifiants et restriction des capacités : [Espace, utilisateurs et authentification](../03-features/01-tenant-auth.md)
- Interfaces sous-jacentes : [Vue d’ensemble API](../04-api/01-api-overview.md)
- Autres intégrations : [Extension Chrome](06-chrome-extension.md), [Intégration MCP](../03-features/08-mcp.md)
