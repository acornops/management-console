# GitLab-Style Responsive Navigation

## Goal

Adopt persistent navigation from `1200px`, overlay navigation below it, and an
independent per-profile desktop collapse preference without changing routes,
navigation order, page density, content width, padding, colors, or control-plane
contracts.

## Implementation Contract

- Expanded desktop uses the existing `256px` sidebar; collapsed desktop uses a
  `64px` icon rail.
- Compact layouts use the shared left `DrawerFrame` at `min(80vw, 320px)`.
- Collapse state is stored as profile-scoped `sidebar_mode`; missing or invalid
  values resolve to expanded.
- Rail destinations retain accessible names, base-path-aware links, active
  state, tooltips, badges/status, workspace access, and account access.
- Drawer resize into desktop closes the modal and releases isolation and scroll
  locking.
- Docked assistants preserve a `560px` main-content allowance using the active
  desktop navigation width.
- Platform admin and other aligned AcornOps console shells inherit this
  contract unless they explicitly document a divergence.

## Validation Plan

- Preference parsing, profile isolation, unavailable storage, width
  calculations, and docked-panel limits in Vitest.
- Playwright at `390px`, `768px`, `1199px`, `1200px`, and `1600px`, including
  collapse persistence, focus continuity, tooltips, drawer sizing, Escape,
  focus return, resize cleanup, and horizontal overflow.
- Existing fixture coverage for dark and reduced-motion compact layouts.
- `npm run lint`, `npm run test`, targeted fixture Playwright, and
  `VITE_APP_DATA_MODE=control-plane npm run validate`.

## Validation Log

- `npx vitest run src/app/preferences.test.ts src/app/dockedPanelLayout.test.ts src/app/workspaceNavigation.test.tsx`: passed, 31 tests.
- `npm run lint`: passed after the final rail-alignment change.
- `npm run test`: passed, 163 files and 791 tests.
- `npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/responsive-navigation.spec.ts --workers=1`:
  passed, 4 tests. Browser evidence covers the persisted `256px`/`64px`
  desktop modes at `1600px`, the exact `1199px`/`1200px` switch, the
  `390px`/`768px` drawers, Escape focus return, resize cleanup, genuine links,
  tooltips, and one exact centerline across the logo, collapse control,
  workspace identity, target identity, navigation icons, and account avatar.
- The first target-identity geometry probe exposed a real `0.5px` offset from
  the sidebar border. The identity tile was corrected and the focused rerun
  passed before the complete 4-test responsive suite passed.
- Follow-up screenshot review exposed the expanded count pill obscuring a rail
  icon. Collapsed counts now use a `16px` circular upper-right indicator,
  abbreviate values above nine as `9+`, and retain the exact count as the
  accessible label and overflow title. The focused Chromium size, containment,
  and corner-placement check passed; the badge unit checks passed.
- A second visual pass normalized target-rail rhythm: Back and target identity
  are matching `32px` visuals centered in `40px` rows, identity divider chrome
  is removed, and adjacent navigation rows advance on a uniform `44px`
  cadence across hidden section boundaries. Chromium geometry and a final
  screenshot inspection passed.
- The collapsed workspace switcher now uses a viewport-fixed, trigger-tracked
  panel anchored `8px` beyond the rail edge, avoiding clipping by the
  vertically scrollable navigation container. Chromium verified settled
  placement, viewport containment, far-edge hit testing, option selection,
  closure, and trigger-focus restoration.
- Workspace-switcher actions now share one left-aligned `16px` icon column and
  label column in expanded and collapsed panels. Workspace icons are vertically
  centered against single- or multi-line names; New Workspace no longer
  inherits centered button justification. Settled Chromium geometry passed in
  both sidebar modes.
- `npx playwright test --config=playwright.fixtures.config.ts
  tests/fixtures/standalone.spec.ts
  tests/fixtures/workspace-overview-audit.spec.ts
  tests/fixtures/workspace-agents-accessibility.spec.ts --grep "..."`
  passed, 3 tests. This covers compact navigation under reduced motion, a dark
  phone viewport, light/dark target detail, 44px touch targets, and horizontal
  overflow.
- The `sidebar-constrained` design-route update refreshed all 37 canonical
  `1024px` snapshots. The aggregate update regenerated the first 35 snapshots
  before a transient `vm-chat` readiness timeout; the isolated
  `vm-chat,vm-settings` update then passed (1 test, 1 expected project skip).
- `npm run membership:check`, `npm run harness:check`, `npm run build`, and
  `npm run smoke:routes`: passed.
- `VITE_APP_DATA_MODE=control-plane npm run validate`: the aggregate process
  was terminated with status 143 after `ui:check`, `design:check`, and
  `design:adoption` passed. The remaining relevant commands were run
  independently as listed above.
- `npm run contracts:check`: failed on the existing vendored public-operation
  inventory mismatch and four missing MCP OAuth prepare/start OpenAPI entries
  for target and agent routes. This navigation work changes no HTTP contract.
- `npm run bundle:check`: failed because `index-CfbZDPUR.js` is `543696` bytes
  against the existing `358400` byte limit. Production `npm run build` itself
  passed. Bundle restructuring is outside this navigation change.
- The pre-existing untracked `.audit/` directory was not read, edited, or
  removed.

## Outcome

The responsive-navigation contract and its in-scope validation are complete.
Repository-wide validation remains red only on the separately owned contract
inventory and bundle-budget gates recorded above.

## Completion Criteria

- [x] All navigation modes, persistence, dismissal, focus, links, and dock
  sizing pass targeted tests.
- [x] Full repository validation was invoked; its process interruption and the
  two independently confirmed, non-navigation gate failures are recorded with
  exact evidence and owning scope.
- [x] Browser evidence and residual risks are recorded and the plan is in
  `completed/`.
