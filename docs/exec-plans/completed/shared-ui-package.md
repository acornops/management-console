# Management Console Shared UI Package

## Goal

Extract the proven, domain-neutral Management Console component system into a
publishable private npm workspace package named `@acornops/ui`, then migrate the
application and design catalog to that package without changing appearance or
behavior.

## Constraints

- Keep Management Console as the canonical design source and first consumer.
- Do not change Platform Admin or any other AcornOps repository.
- Preserve current component names and props unless an app-only dependency must
  be replaced with a package-neutral input.
- Keep routing, data fetching, authentication, translation, target models, and
  domain-specific status components in the application.
- Publish only through GitHub Packages using the repository `GITHUB_TOKEN`; do
  not add long-lived package credentials.
- Keep container-image release tags and UI-package Changesets releases
  independent.

## Acceptance Criteria

- `packages/ui` is an npm workspace with ESM output, declarations, an export
  map, peer dependencies, namespaced tokens, font registration, and a Tailwind
  preset.
- Production screens and the Vite design catalog import the extracted set only
  from `@acornops/ui`.
- There is no public catch-all `ComponentVocabulary` export and no duplicate
  canonical implementation under `src/components/common`.
- Package code has no imports from application `src`.
- Design-system enforcement scans both package and consumer sources, rejects
  local canonical reimplementations, and enforces semantic colors.
- Changesets can create a release PR and publish the private package to GitHub
  Packages with least-privilege workflow permissions.
- Package checks, unit/interaction tests, visual catalog snapshots, and
  `VITE_APP_DATA_MODE=control-plane npm run validate` pass without updating
  approved snapshots.

## Validation Log

- `npm run ui:check` passed package typechecking, build, export-map
  verification, Changesets enforcement, and `npm pack --dry-run`.
- `VITE_APP_DATA_MODE=control-plane npm run validate` passed:
  689 unit tests, 19 catalog/browser tests with one intentional skip, 171
  repeated fixture smoke tests, 21 repeated MCP parity tests, membership,
  contract and harness checks, the production build, and route smoke tests.
- Approved desktop/mobile and light/dark catalog snapshots passed without
  baseline changes.
- The Node 22 development image built successfully. The Compose development
  service resolved `@acornops/ui/fonts` from the mounted workspace and returned
  HTTP 200 for Vite's transformed `/src/main.tsx`.
- `git diff --check` passed and no other AcornOps child repository was changed.
- GitHub Packages publication remains the credentialed post-merge action:
  Changesets will open the `0.1.0` release PR and publish after that PR merges.

## Completion Criteria

- All acceptance criteria that can be verified locally pass.
- Publishing is either confirmed from GitHub Packages or explicitly handed off
  as the one credentialed action that cannot be completed from the local
  workspace.
