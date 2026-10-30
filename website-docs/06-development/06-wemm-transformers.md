# Déploiement WeMM avec Transformers

Ce guide s’appuie sur le [code d’inférence Transformers officiel WeMM](https://github.com/Tencent/WeMM-Embedding#transformers). Le dépôt fournit `scripts/wemm-transformers/serve.py` comme service HTTP d’embeddings. Il peut tourner sur la même machine que WeKnora ou sur un serveur GPU dédié, branché via Base URL.

CUDA, Apple MPS et CPU sont pris en charge avec le même script et protocole. Cette couche HTTP est maintenue par WeKnora (texte et image) ; les capacités vidéo du modèle ne sont pas encore exposées ici. Pour vLLM, voir [Configuration des modèles](../03-features/06-models.md#wemm-embedding).

## Installation des dépendances

À exécuter à la racine du dépôt WeKnora, Python 3.12. Environnement virtuel et poids hors dépôt :

```bash
python3.12 -m venv "$HOME/.venvs/weknora-wemm"
source "$HOME/.venvs/weknora-wemm/bin/activate"
python -m pip install --upgrade pip
```

Choisir une installation PyTorch (exemple validé 2.10.0 / torchvision 0.25.0 ; wheel CUDA compatible avec le driver — autres versions : [PyTorch](https://pytorch.org/get-started/previous-versions/#v2100)) :

```bash
# GPU NVIDIA : exemple wheel CUDA 12.8
python -m pip install torch==2.10.0 torchvision==0.25.0 \
  --index-url https://download.pytorch.org/whl/cu128

# ou Apple Silicon / MPS
python -m pip install torch==2.10.0 torchvision==0.25.0

# ou CPU Linux / Windows
python -m pip install torch==2.10.0 torchvision==0.25.0 \
  --index-url https://download.pytorch.org/whl/cpu
```

Puis :

```bash
python -m pip install -r scripts/wemm-transformers/requirements.txt
```

Transformers figé à `5.2.0`, `qwen-vl-utils` à `0.0.14`. Ne pas changer de version Transformers sans raison — risque sur le prétraitement. `trust_remote_code=True` charge l’implémentation `embedding()` WeMM ; utiliser des poids officiels ou un répertoire revu.

## Démarrage du service

Exemple CUDA, modèle 2B :

```bash
python scripts/wemm-transformers/serve.py \
  --model tencent/WeMM-Embedding-2B \
  --revision bbd6cd4bf52cfc6716f752a2df80b2706720bd95 \
  --device cuda \
  --host 127.0.0.1 \
  --port 18080
```

Premier lancement : téléchargement Hugging Face vers le cache standard. `--revision` fige code et poids ; le SHA d’exemple est pour 2B — pour 4B/9B, prendre la révision du dépôt correspondant. Sans révision : version par défaut du dépôt.

Répertoire local offline :

```bash
python scripts/wemm-transformers/serve.py \
  --model /srv/models/WeMM-Embedding-2B \
  --served-model-name tencent/WeMM-Embedding-2B \
  --local-files-only \
  --device cuda
```

Pré-téléchargement :

```bash
hf download tencent/WeMM-Embedding-2B \
  --revision bbd6cd4bf52cfc6716f752a2df80b2706720bd95 \
  --local-dir /srv/models/WeMM-Embedding-2B
```

Autres appareils :

```bash
# Apple Silicon, repli CPU pour opérateurs MPS non supportés
python scripts/wemm-transformers/serve.py \
  --model tencent/WeMM-Embedding-2B --device mps --mps-fallback

# CPU, float32 par défaut
python scripts/wemm-transformers/serve.py \
  --model tencent/WeMM-Embedding-2B --device cpu
```

4B / 9B : remplacer `--model`. Le service lit les dimensions natives et Matryoshka depuis la config modèle — pas de forçage 2048 pour d’autres tailles :

| ID modèle | Dimension native |
| --- | --- |
| `tencent/WeMM-Embedding-2B` | 2048 |
| `tencent/WeMM-Embedding-4B` | 2560 |
| `tencent/WeMM-Embedding-9B` | 4096 |

Service au premier plan ; Ctrl+C pour arrêter. Production : systemd, conteneur ou autre superviseur avec la même commande. Un processus = un modèle complet sur un device, pas de sharding multi-GPU ; dimensionner VRAM/RAM avant le choix de taille.

### Serveur dédié et authentification

Sur une autre machine : `--host 0.0.0.0` et `WEMM_API_KEY` dans l’environnement du service. `/v1/models` et `/v1/embeddings` vérifient `Authorization: Bearer <key>` ; la même valeur dans WeKnora. Pas de TLS dans le service — reverse proxy HTTPS sur réseau non fiable. `/health` : état et métadonnées non sensibles, sans clé.

Par défaut : loopback, pas de clé. WeKnora en Docker : `127.0.0.1` = conteneur WeKnora — utiliser l’adresse joignable (nom de service réseau compose ou hôte configuré). Adresses privées : politique SSRF WeKnora — voir [Sécurité](../01-getting-started/04-configuration.md).

## Branchement WeKnora

« Paramètres → Gestion des modèles » :

| Champ | Valeur |
| --- | --- |
| Type | Embedding |
| Source / fournisseur | API / personnalisé (compatible OpenAI) |
| Nom du modèle | ID retourné par `/v1/models`, ex. `tencent/WeMM-Embedding-2B` |
| Base URL | `http://adresse-service:18080/v1` (HTTPS si proxy) |
| API Key | Identique à `WEMM_API_KEY` si défini |
| Entrée image | Reconnu pour noms officiels ; alias custom → activer manuellement |
| Dimension de sortie custom | Désactivé au premier branchement ; activer pour réduire après détection |
| Concurrence backend | Commencer à 1 |

Le preset WeMM existant supporte le format `messages` pour ce service. Recommandé dans « Avancé → surcharge protocole » : petits lots, timeout long :

```json
{
  "api": "openai-embeddings",
  "image_format": "messages",
  "text_as_messages": true,
  "batch_messages": true,
  "accepts_truncate_prompt_tokens": false,
  "max_batch_size": 4,
  "max_image_batch_size": 2,
  "request_timeout_seconds": 180
}
```

Même JSON pour anciennes versions sans preset WeMM ou alias custom — activer l’entrée image manuellement. « Tester la connexion », confirmer la dimension, enregistrer. La base doit aussi activer l’index vecteur image — voir [Modèles](../03-features/06-models.md). Changer modèle ou dimension ⇒ reconstruire les index existants.

## Format des requêtes et inférence

`POST /v1/embeddings`. Texte seul avec `input` :

```json
{
  "model": "tencent/WeMM-Embedding-2B",
  "input": ["Premier paragraphe", "Deuxième paragraphe"],
  "encoding_format": "float"
}
```

Texte et image avec `messages` — tableau 2D, deux entrées indépendantes (vecteur texte + vecteur image) :

```json
{
  "model": "tencent/WeMM-Embedding-2B",
  "dimensions": 1024,
  "messages": [
    [{"role": "user", "content": [{"type": "text", "text": "Carré rouge sur fond blanc"}]}],
    [{"role": "user", "content": [{"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}}]
  ]
}
```

`input` et `messages` sont exclusifs. Une conversation 1D fusionne texte et images en un vecteur joint. Réponse style OpenAI : `data[].embedding`, `data[].index`, `usage` ; encodage `float` ou `base64` float32 little-endian.

Le service enveloppe le texte en messages, décode les images inline en PIL, applique le chat template du processor officiel, convertit en tenseurs. Le tokenizer ajoute `<embedding>` automatiquement. Inférence : `model.embedding(..., use_cache=False)`, troncature à la dimension demandée, normalisation L2. Processor/tokenizer Transformers natifs — pas de `embedding_chat_template.jinja` vLLM dans ce script.

HTTP accepte le batch, mais le modèle traite séquentiellement pour isoler l’état positionnel interne. `batch_messages: true` = fusion des requêtes HTTP, pas batch GPU ni scheduling vLLM.

## Paramètres et limites

| Paramètre | Défaut | Description |
| --- | --- | --- |
| `--device` | `auto` | CUDA → MPS → CPU ; ou `cuda:N`, `mps`, `cpu` — device indisponible = erreur |
| `--dtype` | `auto` | CUDA BF16 si possible sinon FP16 ; MPS BF16 ; CPU FP32 ; forcer `bfloat16`, `float16`, `float32` |
| `--max-tokens` | 8192 | Plafond tokens par entrée après template + images ; dépassement rejeté |
| `--max-pixels` | 1048576 | Pixels max par image redimensionnée (min 65536) |
| `--max-batch-size` | 32 | Entrées max par requête HTTP ; ne pas dépasser côté WeKnora |
| `--cpu-threads` | 8 | Threads PyTorch CPU |
| `--mps-fallback` | off | Opérateurs MPS non supportés sur CPU |
| `--local-files-only` | off | Fichiers locaux / cache uniquement |
| `--host` / `--port` | `127.0.0.1` / `18080` | Écoute |

Corps de requête max 32 MiB ; data URI image max 16 MiB ; image brute max 40 Mpx avant décodage ; max 5 images par conversation. Base64 inline uniquement — pas d’URL distantes ni chemins fichiers. `image_url.detail` : compatibilité format ; résolution réelle via `--max-pixels`. Limites = garde-fous de ce script de déploiement, pas les limites intrinsèques du modèle WeMM.

## Validation et dépannage

Tests sans téléchargement de poids :

```bash
python -m unittest discover -s scripts/wemm-transformers -v
```

Inférence texte-image sur service actif :

```bash
python scripts/wemm-transformers/smoke_test.py \
  --base-url http://127.0.0.1:18080
```

Avec auth, le test lit aussi `WEMM_API_KEY`. Couvre batch, dimensions, normalisation, alignement texte-image, isolation d’état après image, réduction de dimension — sortie timing/résultats sur stdout, sans modifier la base.

Tests complets réalisés sur Apple M4 Pro : **WeMM 2B / MPS / BF16** et **WeMM 2B / CPU / FP32**. Dimensions 2B/4B/9B et choix de précision CUDA ont une couverture automatisée ; inférence complète 4B/9B et déploiement CUDA restent à valider sur la cible avec `smoke_test.py`. Ne pas confondre tests d’interface et benchmark performance.

Problèmes fréquents :

- **CUDA/MPS indisponible** : wheel PyTorch, drivers, ou `--device cpu` explicite — pas de downgrade silencieux si device explicite.
- **Opérateur MPS** : `--mps-fallback` ; `--dtype float32` si BF16 impossible, vérifier la RAM.
- **OOM / timeout** : modèle plus petit, pixels, longueur, batch WeKnora ; worker unique — plus de concurrence HTTP ≠ plus de débit inférence.
- **Chargement lent** : premier téléchargement ; pré-télécharger + `--local-files-only` avec poids, tokenizer, processor et code Python officiel présents.
- **Nom de modèle** : vérifier `/v1/models` ; répertoire custom → `--served-model-name` recommandé.
