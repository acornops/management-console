# Outbound Webhooks Navigation

## Goal

Move the existing workspace webhook management surface from Workspace Settings
to a first-class Outbound webhooks destination under Automation, and align the
page with the console's top-level collection-page conventions.

## Constraints

- Preserve the existing `/workspaces/:workspaceId/webhooks` route and control
  plane API contract.
- Preserve `read_workspace_data` visibility and `manage_webhooks` mutation
  gating.
- Preserve one-time signing-secret handling, delivery history, and asynchronous
  workspace fencing.
- Compose with the existing uncommitted navigation and localization changes.
- Do not add incoming webhook triggers in this change.

## UX Acceptance Criteria

- Automation contains a distinct Outbound webhooks destination on desktop and
  mobile navigation.
- Workspace Settings no longer contains a Webhooks tab or describes webhook
  integrations as part of that settings surface.
- The webhook route has the canonical `PageShell` and `PageHeader`, with refresh
  and create actions in the route header.
- Configured webhooks and delivery history remain the primary page content.
- Create and edit use the established right-side drawer pattern.
- Empty, loading, error, read-only, signing-secret, and destructive-confirmation
  states remain accessible and legible.

## Validation Log

- `npm run lint`: passed.
- Targeted Vitest navigation and webhook contract tests: 16 passed.
- `npm run design:check`: passed across 348 source files.
- `npm run contracts:check`: passed.
- `npm run harness:check`: passed.
- Targeted desktop and 390px fixture browser checks: 2 passed.
- Full Vitest suite: 117 files and 639 tests passed.
- Design-system browser checks: 19 passed and 1 expected skip.
- Repeated fixture suite: 140 of 141 passed. The unrelated Catalog
  loading-boundary check encountered a document-transition race on its first
  repetition, then passed repetitions two and three.
- Isolated rerun of that Catalog check: 3 consecutive passes.
- MCP parity browser checks: 21 passed.
- Workspace membership check, production build, and route smoke checks: passed.
- Browser inspection confirmed the desktop active state, standalone page
  hierarchy, focused create drawer, Settings tab removal, and compact navigation
  active state without horizontal overflow.

## Completion Criteria

- Targeted navigation and webhook tests pass.
- TypeScript, design-system, contract, harness, build, and route checks pass.
- The fixture-backed route is visually inspected at desktop and compact widths.
