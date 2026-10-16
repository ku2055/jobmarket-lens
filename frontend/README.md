# JobMarket Lens V2

JobMarket Lens V2 is a separate React/Vite application. The existing V1 site remains deployed from `web/` through GitHub Pages; V2 is built from this directory and is deployed on Vercel at https://jobmarket.feedos.si. A V2 change should not replace the V1 Pages artifact.

## Local development

Use the pinned Node.js `22.20.0` from `.node-version` (the package supports `>=22.20.0 <23`). `package-lock.json` records the dependency tree; use `npm ci` for a clean install.

From this directory:

```sh
npm ci
npm run dev
```

For the compiled app and browser checks:

```sh
npm run build
npx playwright install chromium
npm run test:e2e
npm run preview -- --port 4173
```

The available package scripts are:

- `npm run dev` — start Vite's development server.
- `npm run check` — run the TypeScript compiler without emitting files.
- `npm test` — run the Vitest suite once.
- `npm run test:e2e` — run the Playwright tests.
- `npm run validate:data` — validate public data inputs.
- `npm run build` — validate public data, type-check, run unit tests, build to `dist/`, then validate the built output.
- `npm run preview` — serve the compiled app locally.

The Vercel project root is `frontend/`; its build command is `npm run build` and its output directory is `dist/`, as configured in `vercel.json`. The [deployment record](../docs/V2_DEPLOYMENT.md) records verified live behavior. Local build/preview commands alone do not verify hosting or preview protection.

## Data and privacy boundary

The app consumes versioned, sanitized public release artifacts under `public/data/`; it must not need or fetch the author's private database at runtime. The separate ingestion/export scripts currently present are `scripts/import_upstream.py` and `scripts/export_v2.py`. Run them in a local or trusted ingestion environment, then publish only their sanitized release output. The exporter can optionally read local evidence, but the deployed app does not use the private database. Do not treat absent local evidence as proof that an upstream posting is closed, filled, or otherwise changed.

The committed release contains **86,190 combined postings**, 86,144 upstream and 92 local, with 46 overlapping IDs. Its source snapshot is dated 2026-10-16; this is not a live vacancy feed. The default open scope contains 82,851 reported/observed postings; use Availability filters to include closed records. See [pipeline documentation](../docs/V2_DATA_PIPELINE.md) for pinned intake, optional audited currency recovery, and upstream-only export without a private database. Only publish artifacts that pass the public schema and privacy checks.

## Release evidence

A successful local build covers the validation, type, unit-test, compile, and output-validation steps wired into `npm run build`. The Playwright script is available, but its test results must be run and reviewed separately. Documentation and build commands alone do not establish that Vercel deployment behavior, deep links on the live host, accessibility, or the required formative user-study sessions have been verified.

V2 work does not authorize paid APIs, subscriptions, vendor contact, or V3 implementation. V3 remains a separate research/design effort unless its scope is explicitly changed.
