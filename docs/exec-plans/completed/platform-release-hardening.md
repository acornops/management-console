# Platform release hardening

## Integration — 2026-09-07

Implementation is complete. The user authorized fresh verification followed by
committing and pushing these changes directly to `main`. Earlier no-commit
statements below describe the initial implementation task, not this integration.
No deployment or production data mutation is authorized. Fresh `npm run validate`
passed (214 files, 1,086 tests), as did all 143 fixture browser tests and all eight
MCP parity browser tests. Control-plane's subsequently discovered suspension
timestamp defect is fixed and verified; the coordinated integration gate is clear.
The final full console validation also passed after granting loopback permission
for its route smoke server. No frontend runtime files changed during that fix.

## Implementation record — 2026-09-06

Status: implemented and validated; awaiting integration. Branch: `fix/platform-release-hardening`.

## Scope and decisions

Preserve the shared UI, routes, MCP catalog terminology, and all existing
credential flows. Fix the accepted release audit findings without a redesign.

- Scheduling uses the existing control-plane preview as authoritative cadence
  validation, renders upcoming runs in the selected timezone, and preserves
  actionable field errors. Keep credential connection controls intact.
- Kubernetes and VM issue panels retain cursors and expose explicit Load more
  issues, progress counts, loading state, and retry. Do not add nested scrolling.
- Run-history activity changes must not discard already loaded history pages;
  use stable pagination and explicit refresh when appropriate.

## Execution and verification

- [x] Add failing regression tests for schedule preview/error/draft behavior.
- [x] Wire server preview and error presentation, preserving readiness flows.
- [x] Add failing 51+ issue pagination and retry regressions; implement controls.
- [x] Add multi-page history/activity-refresh regressions; preserve history.
- [x] Update fixtures, translations, and durable documentation for changed UX.
- [x] Run targeted rendered UI tests and `VITE_APP_DATA_MODE=control-plane npm
  run validate`; check affected browser flows and cross-repository contracts.
- [x] Record results and skipped release-environment checks before handoff.

No commits, pushes, deployments, or production mutations are authorized here.

## Evidence — 2026-09-06

- `VITE_APP_DATA_MODE=control-plane npm run validate`: passed; 1,086 tests
  across 214 files, UI package checks, design/adoption, typecheck, membership,
  contracts, harness, production build, bundle budget and route smoke.
- The complete gate caught a VM collection-composition violation and an obsolete
  source-text test. The panel now uses `CollectionState`; regression coverage
  checks retained rows during loading and unchanged target-filter request
  continuity instead of requiring the fetch to remain inline in the page.
- `FIXTURE_APP_PORT=4286 npx playwright test --config=playwright.fixtures.config.ts
  tests/fixtures/paginated-history.spec.ts tests/fixtures/virtual-machine-overview-audit.spec.ts
  tests/fixtures/cluster-overview-audit.spec.ts --retries=0`: 12 passed.
- `FIXTURE_APP_PORT=4194 npx playwright test --config=playwright.fixtures.config.ts
  tests/fixtures/schedule-preview.spec.ts tests/fixtures/workflow-ux.spec.ts
  --grep 'schedule' --workers=1`: 11 passed. Covers current-user cadence-only
  preview for another owner, delayed obsolete responses, transport retry,
  zero-occurrence rejection, timezone display and guided/custom save errors.
- Schedule-preview and grammar regressions were observed red before fixes.
  Server and client reject non-safe numeric steps and inputs over 256 characters;
  calendar iteration stays server-owned, without a frontend cron dependency.
- Rendered desktop/mobile schedule checks verified scrollable body and visible,
  enabled Save; a 50-row VM capture verified the page-level pagination footer.
  Temporary screenshot-only test was removed. Existing shared UI conventions
  and field/error associations were preserved; no design exceptions were added.
- Independent read-only reviews found no remaining important issue in the
  pagination/history or scheduling UI changes. Backend scheduling review found
  and fixed two edge cases in the producer before handoff.
- Docs: collection inventory and Workflow activity design describe manual
  history refresh, bounded issue pagination and authoritative timing preview.
  Public user guidance and producer OpenAPI are updated in sibling repositories.
- Final full browser sweep: `FIXTURE_APP_PORT=4294 npm run smoke:fixtures`
  passed all 143 tests (5.2 minutes). `MCP_PARITY_APP_PORT=4297
  MCP_PARITY_API_PORT=4290 npm run smoke:mcp-parity` passed all eight tests,
  including credential, OAuth, auto-pause recovery, readiness and provenance
  parity. Both suites used zero retries and their test servers exited.
- Final parent `node scripts/harness/check-platform-contracts.mjs`, consumer
  `npm run harness:check`, `npm run contracts:check`, and `git diff --check`
  passed. No commits, pushes or deployments were performed.
- Not covered by fixture tests: published artifact provenance, real-provider
  credential integration, or upgrade/restore of a representative production
  backup. Node runtime was 24.2.0. Whole-app visual-baseline matrix was not rerun;
  no shared UI styling or design snapshots were changed.
