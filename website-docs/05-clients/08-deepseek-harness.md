# Plugin DeepSeek Harness

Le plugin DeepSeek Harness (dsh) se connecte à un déploiement WeKnora existant via REST : recherche de passages, lecture intégrale de documents et réponses avec citations. Code source : `packages/dsh-weknora`.

## Installation et connexion

```sh
dsh plugin --profile web add @wxg-prc-cpg/dsh-weknora

export WEKNORA_BASE_URL=https://weknora.example.com
export WEKNORA_API_KEY='<api-key>'
export WEKNORA_KNOWLEDGE_BASE_IDS=kb-123,kb-456
export WEKNORA_RESOURCE_URLS=public
dsh web
```

Vous pouvez aussi exécuter `dsh plugin --profile web add ./packages/dsh-weknora` à la racine du dépôt. Le plugin exige Node ≥20.11 ; l’environnement dsh validé requiert Node avec zstd (≥22.15 ou ≥24) et pnpm ≥10. Versions testées : dsh 0.1.0-rc.8 / WeKnora 0.8.0 ; pour d’autres versions, vérifier la compatibilité de l’interface plugin.

L’URL de service peut inclure `/api/v1` ; sinon elle est complétée automatiquement. La clé API est envoyée via `X-API-Key`, capacité `retrieve` requise ; `ask` exige aussi `chat`. Avec une clé plateforme, configurez `tenantId` (envoyé en `X-Tenant-ID`).

## Quatre outils

| Outil | Usage |
| --- | --- |
| `weknora_list_knowledge_bases` | Bases visibles et leurs ID |
| `weknora_search` | Recherche hybride de fragments, titres de documents inclus ; retourne ID connaissance, index de chunk et score |
| `weknora_read_document` | Corps ordonné par document ; première page avec titre/résumé, pagination pour les longs textes |
| `weknora_ask` | Crée ou reprend une session WeKnora ; réponse, citations et trace d’outils côté serveur |

`search` fournit des preuves pour que dsh rédige la réponse ; `ask` invoque le modèle côté WeKnora et crée session/messages, adapté à la synthèse multi-documents. Aucun des deux ne modifie le contenu des bases.

Sans périmètre de bases explicite, le plugin résout toutes les bases visibles pour le credential, cache en mémoire et partage entre search/ask. Avec `agentId`, `ask` suit le flux Agent ; le périmètre est résolu côté serveur.

## Configuration du profil

Dans `$DSH_HOME/profiles/<name>/cordis.patch.yml` :

```yaml
- id: weknora
  config:
    baseUrl: https://weknora.example.com
    apiKey: !!js process.env.WEKNORA_API_KEY
    knowledgeBaseIds: [kb-product-docs]
    agentId: ''
    maxResults: 8
    maxChunkChars: 1200
    requestTimeoutMs: 30000
    chatTimeoutMs: 300000
    resourceUrls: public
    toolPrefix: weknora
    tools:
      listKnowledgeBases: true
      search: true
      readDocument: true
      ask: true
```

La mise à jour remplace entièrement `config` sur cette ligne ; incluez les champs à conserver. `tools.*` est activé par défaut. Pour plusieurs déploiements, des `toolPrefix` distincts ; le nom commence par une minuscule et ne contient que minuscules, chiffres et `_`.

## Images citées et dépannage

`resourceUrls` vaut `public` par défaut : le serveur convertit les handles en liens chargeables. Sur 403 avec clé limitée à certaines bases, le plugin bascule en `handle` et le conserve. Les handles `resource://` ne se chargent pas directement dans le navigateur ; voir [Accès aux fichiers](../03-features/21-file-access.md) pour les liens publics.

| Symptôme | Vérification |
| --- | --- |
| Erreur de config au chargement | Corriger baseUrl, plages, toolPrefix selon les messages |
| Recherche 401/403 | Clé valide, capacité retrieve, espace/bases autorisés |
| ask refusé | Clé avec `chat`, `tenantId` pour clé plateforme |
| Pas de lien image direct | Clé limitée à des bases ou déploiement sans URL publique |
| Timeout sur longues questions | Ajuster `chatTimeoutMs`, vérifier les appels modèle WeKnora |

## Référence d’implémentation

`packages/dsh-weknora/src/`, `test/fixtures/api-contract.json`, `contract/contract_test.go`.
