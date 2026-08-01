# Infrastructure Catalog Chrome Consistency

## Goal

Make the Kubernetes Clusters and Virtual Machines catalog routes use the same
route-header and tab-strip composition as the Kubernetes Resources explorer,
and keep resource-card catalog pages on stable, width-aware card tracks.

## Constraints

- Preserve route-backed search and status filters.
- Preserve catalog counts, loading, error, empty, and destructive-action behavior.
- Use the existing `PageShell`, `PageHeader`, and `ResourceCategoryTabs`
  vocabulary without introducing page-local spacing values.
- Preserve the shared 27rem resource-card minimum and 1rem catalog gap.
- Apply the same catalog-width contract to Kubernetes Clusters, Virtual
  Machines, and Agents.

## UX Acceptance Criteria

- Neither infrastructure catalog shows an inventory or fleet summary banner.
- Both catalog tab strips start on the route content grid used by Kubernetes
  Resources.
- Both tab strips have the canonical 24px separation from their catalog
  controls and content.
- Desktop and compact layouts remain free of horizontal route overflow.
- Catalogs reserve the number of card tracks supported by usable width and
  divide the complete row width evenly between those tracks.
- Route headers remain full width and reclaim the sidebar's released space;
  filters and catalog sections reclaim the same space.
- Sparse catalogs retain empty track capacity so opening a docked assistant does
  not enlarge the remaining cards.
- When only one minimum-width column fits, it spans the complete catalog width;
  docked Agent catalogs retain every additional column that still fits.

## Validation Log

- Focused catalog regression tests passed.
- 2026-08-02 supplied-window proof:
  - Replaced the misleading browser-zoom test title with an accurate usable-container-width contract.
  - Added a three-real-card regression at a `1685px × 876px` CSS viewport and `1.1` device scale, equivalent to an approximately `1853px × 964px` physical capture.
  - The rendered catalog measured `1329px` across three tracks of approximately `432.33px`; all three cards shared one row, no visible descendant crossed a card boundary, and neither the grid nor document had horizontal overflow.
  - `FIXTURE_REUSE_SERVER=1 npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/resource-card-grid.spec.ts --workers=1 --timeout=60000 --grep "three real cluster cards"` passed.
- 2026-08-01 27rem card-density follow-up:
  - Reduced the shared preferred minimum from `30rem` (`480px`) to `27rem` (`432px`) so the catalog reserves three tracks at the requested desktop width while retaining capacity-based `auto-fill` expansion.
  - `npm run test -- src/resourceCardGrid.test.ts src/app/dockedPanelLayout.test.ts` passed (7 tests).
  - `npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/resource-card-grid.spec.ts --workers=1 --timeout=180000` passed (3 tests), covering two-column compact layout, three-column desktop layout, ultrawide expansion, sidebar reclamation, and docked-assistant card-width preservation across clusters, virtual machines, and agents.
  - `npm run lint`, `npm run test` (818 tests), `npm run contracts:check`, `npm run harness:check`, and `npm run smoke:routes` passed.
  - `npm run validate` passed the UI package checks, then stopped at the unrelated pre-existing `WorkspaceOverviewPage.tsx` heading-typography design-system violation.
- 2026-08-01 collapsed-sidebar follow-up:
  - `npm run test -- src/styles.test.ts src/resourceCardGrid.test.ts src/app/dockedPanelLayout.test.ts packages/ui/src/PageComposition.test.tsx` passed (37 tests).
  - The resource-catalog responsive and sidebar browser regressions passed, confirming each route shell and catalog gain the sidebar's released 192px and ultrawide catalogs render more than three distributed card tracks.
  - The focused docked-assistant browser regression passed, confirming a sparse Kubernetes catalog preserves card width across assistant open and close.
  - The focused Agent Chat browser regression passed, confirming a one-column dock fills the available grid and a wider dock layout retains two columns.
- 2026-07-31 original three-card-rack follow-up (superseded by the 2026-08-01 capacity-based layout):
  - `npm run test -- src/styles.test.ts src/resourceCardGrid.test.ts packages/ui/src/PageComposition.test.tsx` passed (34 tests).
  - `npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/resource-card-grid.spec.ts --workers=1` passed, covering equal page-filling columns at 1800px, the 1472px three-track rack at 1850px, and ultrawide card caps.
  - A fixture-backed 1850px visual capture was reviewed. The route shell and grid measured 1472px, and the incomplete row retained a 480px card track.
  - The Kubernetes Clusters, Virtual Machines, and Agents route-design groups passed in light, dark, mobile, and sidebar-constrained variants.
  - `npm run ui:check`, `npm run membership:check`, `npm run build`, and `npm run smoke:routes` passed.
  - `npm run validate` remains blocked by unrelated repository state: undocumented typography in `NavCountBadge`, missing workflow symbols and a translation, a missing contract-check source file, the `src/App.tsx` line budget, stale Agent-capabilities snapshots, and the pre-existing main-bundle budget overage.
- `npm run validate` completed all code and route checks, but its visual snapshot
  stage could not launch because `/usr/bin/google-chrome` is unavailable in the
  execution environment.
- The remaining validation commands passed individually: design-system check,
  lint, unit tests, membership check, contract check, harness check, production
  build, and route smoke checks.
- Browser verification reached the local console sign-in gate. Authenticated
  route inspection requires the local control-plane stack, which was not
  available during this change.

## Completion Criteria

- Focused catalog tests and all available repository validations pass.
- Authenticated visual inspection remains a follow-up when the local
  control-plane stack and browser binary are available.
