# Landing Global-IT-SS

Site vitrine public du template gsms, en français (langue par défaut) et en anglais.

Il reprend la landing du projet [Global-IT-SS](https://github.com/samiriggui-code/global-it-ss) (dossier `frontend/`, partie `(site)` uniquement, sans le back-office) et ajoute une section « Moteur IA » qui présente le moteur gsms.

## Pourquoi cette base

- WeKnora a une vraie landing (`website-docs/homepage/`, Next.js), mais elle présente le produit WeKnora et elle est écrite en chinois.
- TencentDB Agent Memory n'a pas de landing : seulement un README et la console d'administration `MemoryPanel`.
- La landing Global-IT-SS utilise la même pile que celle de WeKnora (Next.js 16, React 19, Tailwind 4), est déjà bilingue FR/EN et porte la marque Global-IT-SS. C'est donc elle qui sert de base.

## Lancer en local

```bash
cd landing
npm ci
npm run dev   # http://localhost:3000 → redirige vers /fr ou /en
```

## Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Core FastAPI Global-IT-SS (pôles, réalisations, coordonnées, prise de rendez-vous) | `http://localhost:8000` |
| `NEXT_PUBLIC_SITE_URL` | URL publique du site (balises canoniques, sitemap) | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Application gsms, cible du lien « Espace pro » | `http://localhost` |

Sans Core joignable, la page reste complète : les 9 pôles viennent du repli statique de `src/lib/i18n.ts`, et seul le formulaire de rendez-vous renvoie une erreur.

## Contenu

- Textes : `src/lib/i18n.ts` (dictionnaires `fr` et `en`, même structure, vérifiée par `tests/i18n.test.ts`).
- Sections : `src/components/site/` (en-tête, accroche, pôles, moteur IA, confiance, rendez-vous, contact, pied de page).
- Marque : `public/brand/`.

## Vérifications

```bash
npm run lint && npm run typecheck && npm test && npm run build
```
