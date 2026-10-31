# Instructions pour Claude (gsms-template)

Avant toute tâche, lire **[HANDOFF.md](./HANDOFF.md)** : état du projet Global-IT-SS AI Engine, travail déjà fait, PR ouvertes, dossier `research/` et règles à respecter (déploiement VPS, secrets, licences).

Règles clés :

- Tout passe par branche + PR. Changements additifs uniquement.
- Déploiement sur global-it-ss.com : ne lancer **aucune** nouvelle instance LLM. Réutiliser les LLM, la clé OpenRouter, le SMTP et le compte admin déjà en place pour Qualiopi, renseignés seulement dans le `.env` du VPS. Ne jamais écraser le `.env` existant.
- Ne jamais écrire de secret dans le repo.
- Langues : français principal, anglais secondaire.
- Dossier `research/` : lancer `./scripts/clone-research.sh` s'il est vide (script arrivé avec la PR #24, branche `feat/site-homepage-i18n`, pas encore dans main).
