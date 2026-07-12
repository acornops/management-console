<p align="center">
  <img width="220" src="https://raw.githubusercontent.com/acornops/docs-website/main/logo/light.svg" alt="AcornOps" />
</p>

<h1 align="center">AcornOps Management Console</h1>

<p align="center">
  <a href="https://github.com/acornops/management-console/actions/workflows/ci.yml"><img src="https://github.com/acornops/management-console/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://codecov.io/gh/acornops/management-console"><img src="https://codecov.io/gh/acornops/management-console/branch/main/graph/badge.svg" alt="Coverage" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-22-green.svg" alt="Node 22" /></a>
  <a href="docs/contracts/README.md"><img src="https://img.shields.io/badge/contracts-checked-blue.svg" alt="Contracts checked" /></a>
</p>

<p align="center">
  Operator-facing management console for AcornOps.
</p>

## Status

This repository owns the AcornOps management console, its production image, route smoke checks, contract checks, and UI-facing docs. Full-system deployment wiring belongs in `acornops-deployment`.

## Agent-Assisted Development

This repository supports human and agent-assisted development. Start coding agents from this repository root for management-console-only work, and from the `acornops-workspace` root for changes that touch multiple AcornOps repositories.

## Contracts

Cross-repo contract documentation lives in [`docs/contracts/README.md`](docs/contracts/README.md). The management console should only integrate with the control-plane APIs documented there.
Machine-readable contract data lives in [`docs/contracts/manifest.json`](docs/contracts/manifest.json).
Run `npm run contracts:check` to mechanically verify the documented management-console/control-plane contract against the implementation.

Coverage is generated in CI with Vitest V8 coverage, uploaded as a workflow artifact, and published to Codecov when `CODECOV_TOKEN` is configured for the repository.

## Documentation

Primary docs:

- [`AGENTS.md`](AGENTS.md)
- [`ARCHITECTURE.md`](ARCHITECTURE.md)
- [`docs/index.md`](docs/index.md)
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- Whole-system architecture: [`../docs/system-architecture.md`](../docs/system-architecture.md)

## Repository Layout

This repository follows a standard Vite + React structure where all
application code lives under `src/`.

```text
management-console/
├── public/                  # Static assets copied as-is
├── src/
│   ├── main.tsx             # Vite entrypoint
│   ├── App.tsx              # App shell / top-level orchestration
│   ├── pages/               # Route-level pages (workspace/Kubernetes/disabled VM surfaces)
│   ├── components/          # Reusable presentational components
│   ├── features/            # Feature modules (UI + hooks + local logic)
│   ├── hooks/               # App-wide hooks (router/state helpers)
│   ├── services/            # API/data access modules
│   ├── utils/               # Shared utilities (paths/formatting helpers)
│   ├── styles.css           # Tailwind entrypoint and design tokens
│   ├── constants.tsx        # Shared UI constants/icons/themes
│   ├── types.ts             # Domain/shared TypeScript types
│   └── vite-env.d.ts        # Vite ambient typings
├── index.html               # HTML shell (loads /src/main.tsx)
├── vite.config.ts           # Vite config + alias resolution
└── tsconfig.json            # TypeScript config
```

Notes:
- Internal path alias `@/*` resolves to `src/*`.
- `index.html` uses the standard Vite module entrypoint (`/src/main.tsx`).
- Tailwind is built through the local PostCSS pipeline; do not reintroduce the browser CDN config in `index.html`.
- URL navigation is route-driven and shareable (workspace + Kubernetes cluster deep links).
- Routing is implemented in `src/hooks/useAppRouter.ts` and `src/utils/routes.ts`.

## Management Console Routes

Primary management console routes:

- `/workspaces`
- `/workspaces/:workspaceId/overview`
- `/workspaces/:workspaceId/kubernetes-clusters`
- `/workspaces/:workspaceId/virtual-machines`
- `/workspaces/:workspaceId/members`
- `/workspaces/:workspaceId/kubernetes-clusters/:clusterId`
- `/workspaces/:workspaceId/kubernetes-clusters/:clusterId/:tab`
- `/invites/:token`

Global Kubernetes cluster links are parsed and redirected into their workspace-scoped routes when the cluster can be resolved.

These routes are relative to the configured base path (`VITE_APP_BASE_PATH`), for example:

- local root mode: `http://localhost:3000/workspaces`
- proxied management console mode: `http://console.acornops.localhost:8088/workspaces`

## Compose Layout

- `docker-compose.yml`: base/default runtime (`MANAGEMENT_CONSOLE_IMAGE`, default `ghcr.io/acornops/management-console:0.0.1-experimental.1`).
- `docker-compose.override.yml`: local development overlay (builds local image from `Dockerfile`).

## Run Modes

1. Component-only local development (recommended in this repo):

```bash
docker compose up -d --build
```

Open:

`http://localhost:3000`

This mode uses Vite dev server with HMR. Changes under this repository are reflected immediately.

2. Component-only production-style container:

```bash
docker compose -f docker-compose.yml up -d
```

3. Full AcornOps stack (all components together):

```bash
cd ../acornops-deployment
task local-up
```

This full-stack flow uses the deployment repo `Taskfile.yml` and requires the `task` CLI to be installed.

In full-stack local mode, the management console is exposed via the edge proxy at `http://console.acornops.localhost:8088/`.
Do not run this repository's local compose stack and `acornops-deployment` local stack at the same time on the same host ports.

When dependencies change (`package.json` or lockfile), rebuild once:

```bash
docker compose up -d --build
```

The management console port is configurable with `MANAGEMENT_CONSOLE_PORT` (default `3000`).
The production container listens on port `8080` internally and runs nginx as a non-root user.
The build-time path base is configurable with `VITE_APP_BASE_PATH`:

- Local/root: `VITE_APP_BASE_PATH=/`
- Production on `console.acornops.dev`: `VITE_APP_BASE_PATH=/`

## Data/Auth

The management console is control-plane backed. Configure:

- `VITE_APP_DATA_MODE=control-plane` when building or running a deployable console image.
- `VITE_CONTROL_PLANE_API_BASE_URL` for password auth, SSO, workspace, target, Kubernetes cluster, resource, MCP server, and chat APIs. For the full local stack and production edge, leave it empty to use same-origin `/api` routing from the management-console host. The production nginx CSP permits same-origin API calls by default; standalone cross-origin API builds require a matching custom CSP.

When running the full platform through `acornops-deployment`, configure these values in the deployment env file instead of creating a component-local `.env`.

The management console expects:

- login, signup, forgot-password, and reset-password forms call the control-plane password auth endpoints,
- SSO login redirects to the control-plane OIDC login endpoint,
- session is managed by control-plane cookie,
- browser API requests include credentials; cross-origin deployments must allow the console origin and credentialed requests in control-plane CORS,
- workspaces and clusters are fetched from control-plane APIs.

## Runtime Languages

English and Mandarin Chinese are bundled by default. Deployments can override the
enabled language list without rebuilding the image by serving same-origin files
under `/locales/`:

- `/locales/manifest.json` declares `defaultLanguage` and up to 10 languages.
- File-backed languages reference JSON files in the same directory, for example
  `fr.json`.
- Runtime locale files are served with `Cache-Control: no-cache`; hashed app
  assets remain immutable.

When no runtime manifest is present, the console falls back to the bundled
English and Mandarin Chinese languages.

## Run Without Docker

```bash
npm install
npm run dev
```

## Validation

Run the checks that match the change:

- `npm run lint`
- `npm run test`
- `npm run contracts:check`
- `npm run harness:check`
- `npm run smoke:routes`
- `npm run validate`
- Run in `VITE_APP_DATA_MODE=control-plane` when validating contract-sensitive UI changes
