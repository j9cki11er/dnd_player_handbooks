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
