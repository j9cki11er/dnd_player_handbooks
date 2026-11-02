# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Deployment helper

Use `npm run deploy` whenever you need a quick production build hosted on a non-default port (helpful when another Node process already occupies the default preview port). The script runs `vite build` and immediately serves the `dist/` directory with `vite preview --host 0.0.0.0` on port `4280`.

Override the port by exporting `DEPLOY_PORT`, e.g. `DEPLOY_PORT=5200 npm run deploy`, or pass it as an argument, e.g. `npm run deploy -- 5200`. Point your reverse proxy/OpenLiteSpeed context to that port if you need to expose it publicly.

### Running with PM2

1. Install PM2 globally once: `npm install -g pm2`.
2. Update the `DEPLOY_PORT` in `pm2.config.cjs` if you need a different port than `4280`.
3. Start (or restart) the service with `pm2 start pm2.config.cjs` (use `pm2 reload pm2.config.cjs` after code changes). PM2 simply runs `scripts/deploy.sh`, so each restart rebuilds the `dist/` output before launching `vite preview --host 0.0.0.0`.
4. Persist across reboots with `pm2 save` and `pm2 startup` if desired.

## Source encoding and book names

All HTML/HTM files under `data-source/` use UTF-8. Keep charset declarations and
`coding` comments set to UTF-8 when editing them. The Volo expansion directory is
`瓦罗怪物指南 (VGM)`; legacy MPMM bookmark IDs remain supported.

Run `node scripts/normalize-source-encoding.js` for a read-only encoding/recovery
check, or add `--write` to apply verified repairs. The script uses the sibling
`../DND5e_chm` repository and existing reading pages as recovery references;
`DND_REFERENCE_ROOT` can override the reference repository path.

`source-encoding-report.json` records the initial normalization and remaining
replacement-character damage. These remnants are content damage, not mixed file
encodings. `parse-data.js` stops before writing output when such damage remains,
so regeneration cannot replace healthy reading pages with damaged source text.

## EFA player expansion

`艾伯伦：奇械锻炉 (EFA)` contains the artificer, its five subclasses,
player species and backgrounds, dragonmarks and feats, and the magic-item appendix.
Adventure chapters and NPC stat blocks are excluded; player-controlled companion
statistics within class/spell rules are retained. Original source paths are preserved; credits are kept in the reference repository. All imported pages use UTF-8.

Run `node scripts/import-efa.js` to refresh this selection from the sibling
`DND5e_chm` repository (`DND_REFERENCE_ROOT` overrides its location). The importer
updates only EFA pages/index records, splits its 28 feats into individual entries,
adds its new spell to the spell list, and tags the 80 spells
listed in its artificer spell list. Empty placeholder pages are skipped.

## Additional player expansions

Run `node scripts/import-player-expansions.js` to import the curated player sections
of `被遗忘的国度：费伦英雄` (FRHF), `鸦阁魔域：魔障深藏` (RHW), and
`启封奥秘` (AU) from `DND5e_chm`. `DND_REFERENCE_ROOT` overrides the reference location.
The importer keeps source HTML in UTF-8, preserves source paths, splits feats and
spells into individual records, and does not import adventure or NPC chapters.
Spell reference pages are hidden from chapter navigation in favor of the unified
spell browser. No credits page is added. The report is `player-expansions-report.json`.

## XGE player expansion

The shared player-expansion importer also includes `珊娜萨的万事指南 (XGE)`:
31 subclasses plus additional class options, 15 individual racial feats, 95
individually indexed spells, character backstories and name references, tool
proficiencies, downtime activities, and selected supplemental player rules.
Encounters, traps, random encounter tables and shared-campaign administration
are excluded. XGE spells retain their own IDs and visible source labels so
older versions do not overwrite existing spells.

## DMG 2024 magic items

Run `node scripts/import-dmg-items.js` to refresh the magic item catalog from
`城主指南2024/7.宝藏`. It splits 350 named items into standalone pages grouped
by type and rarity, and includes eight player-facing use/crafting rule pages.
Random treasure/award tables and encounter/adventure material are excluded.
Chinese/English names, rarity and attunement metadata support lookup and bookmarks.
The report is `dmg-items-report.json`; all imported source pages use UTF-8.

## Adventuring gear catalog

`node scripts/extract-adventuring-gear.js` extracts the 82 entries from the existing
2024 adventuring-gear page into `src/data-gear.json`, matching table weights/prices
to each description. Variable-price gear retains actual option prices; scroll
variants retain their separate prices. The equipment page renders the searchable
catalog with GP range controls and a native detail dialog, without navigating away.
