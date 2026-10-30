# Homepage unifiée (Global-IT-SS + WeKnora)

Page d’accueil Next.js : vitrine **Global-IT-SS** (pôles, confiance, contact, rendez-vous) puis présentation produit **WeKnora** (sections existantes). Logos et couleurs de marque dans `public/docs/_home/brand-gis/`.

Run `npm run setup`, `npm run build`, and `npm run preview` from the parent directory to include both the homepage and the complete `/docs/` site. Deployment instructions are in the parent README.

- `app/page.tsx`: product content and same-origin documentation links.
- `app/home.module.css`: homepage layout.
- `app/interactive.tsx`: responsive navigation, theme switch, and on-demand README video.
- `app/theme.ts`: VitePress-compatible theme persistence and pre-paint initialization.
- `../shared/brand.css`: shared light/dark design tokens.
- `public/docs/_home/`: homepage images. The site serves only `/` and `/docs/`, so build output and public assets both live under `/docs/_home/` (`homeAssets` in `../shared/header.ts`).

Depuis **`website-docs/`** (pas seulement `homepage/`) :

- **`npm run dev`** — home + doc VitePress sur [http://127.0.0.1:3000](http://127.0.0.1:3000) (`/docs/` inclus).
- **`npm run build`** puis **`npm run preview`** — site statique unifié (`static-site/`).

Lancer uniquement `npm run dev` dans `homepage/` ne sert **pas** la documentation : le lien « Documentation » renverra une 404.
