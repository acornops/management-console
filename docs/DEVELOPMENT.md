# Management Console Development

Release validation requires Node.js 22. Use `npm ci` from a clean checkout so
the tested dependency tree exactly matches `package-lock.json`.

## Scope

This repository owns the AcornOps operator UI, production nginx image, route smoke checks, and UI-facing control-plane contracts. Full-stack orchestration belongs in `acornops-deployment`.

## Prerequisites

- Node.js compatible with `package.json`
- npm
- Optional: Docker, when validating the production image or full stack

## Local Development

Install dependencies:

```bash
npm install
```

Run the Vite dev server:

```bash
npm run dev
```

This standalone path defaults to `VITE_APP_DATA_MODE=mock`. The browser fixture
worker starts before React, intercepts the existing control-plane HTTP boundary,
and resets its mutable data on reload. No control-plane process is required.

For full-stack local development, use the deployment repository instead:

```bash
cd ../acornops-deployment
task local-up
```

## Configuration

- `VITE_APP_BASE_PATH`: application base path. Production defaults to `/`.
- `VITE_APP_DATA_MODE`: `mock` or `control-plane`. Standalone development defaults to `mock`; production builds default to and require `control-plane`.
- `VITE_CONTROL_PLANE_API_BASE_URL`: control-plane base URL. Use an empty value for same-origin `/api` routing through `console.acornops.dev`. Production nginx CSP defaults to same-origin `connect-src`; standalone cross-origin API builds need a matching custom CSP.

## Validation

Canonical validation:

```bash
npm run validate
```

Focused checks:

```bash
npm run lint
npm run test
npm run test:coverage
npm run contracts:check
npm run harness:check
npm run build
npm run build:analyze
npm run smoke:routes
npm run smoke:fixtures
npm run smoke:nginx
```

Run contract-sensitive validation as `VITE_APP_DATA_MODE=control-plane npm run validate`.

`npm run smoke:nginx` requires Docker. Use it for production image or nginx config changes; it is intentionally outside `npm run validate`.

## Documentation Drift Control

Treat documentation as part of feature acceptance. Update the nearest durable doc in the same change when work changes user-facing behavior, routes, control-plane contracts, configuration, deployment behavior, operations, security, or reliability.

If docs are intentionally unchanged, record `Docs impact: none` and the reason in handoff evidence.

## Documentation Harness

Keep `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `docs/index.md`, this file, and `docs/OPERATIONS.md` in sync when changing repo behavior. `npm run harness:check` enforces the required structure.
