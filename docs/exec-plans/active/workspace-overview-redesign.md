# Workspace Overview Redesign

## Goal

Implement the workspace homepage redesign so `Overview` becomes the main operational landing page for a workspace and the standalone `Investigations` route/tab is removed.

## Constraints

- Keep the AcornOps visual language and existing severity treatments.
- Prefer existing control-plane APIs and frontend-only composition.
- Keep Kubernetes and VM targets in one shared board.
- Let partial request failures degrade locally instead of blanking the whole page.

## UX Acceptance Criteria

- `Overview` shows a compact summary band, a recent-investigation quick-action banner, connected target panels, and a mixed-target `What needs attention now` issue queue.
- Workspace `Investigations` no longer appears in desktop or mobile navigation.
- Old `/workspaces/:id/investigations` URLs fall through to not-found behavior.
- Cluster cards open cluster overview pages and VM cards open VM overview pages.

## Validation Log

- `npm install --verbose`
  - Installed the local frontend toolchain required to run repo validation in this checkout.
- `npm run lint`
  - Passed.
- `npm run test`
  - Passed.
- `npm run contracts:check`
  - Passed.
- `npm run harness:check`
  - Passed.
- `VITE_APP_DATA_MODE=control-plane npm run build`
  - Passed.
- `VITE_APP_DATA_MODE=control-plane npm run smoke:routes`
  - Passed.
- `VITE_APP_DATA_MODE=control-plane npm run validate`
  - Passed.

## Completion Criteria

- Required repo validation commands pass, or any remaining failures are documented with exact outcomes and residual risk.
