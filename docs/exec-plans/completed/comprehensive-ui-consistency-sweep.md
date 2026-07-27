# Comprehensive UI Consistency Sweep

## Goal

Audit the authenticated management console as one product and correct material UI/UX inconsistencies without changing route, permission, or control-plane behavior.

## Scope

- Shared shell, route headers, discovery controls, collection surfaces, detail views, settings, and representative overlays.
- Desktop, tablet, compact mobile, light, and dark presentation.
- Populated, loading, empty, filtered-empty, error, long-content, and permission-sensitive states where fixtures support them.
- Keyboard focus, touch targets, horizontal overflow, semantic headings, and browser console errors.

## Method

1. Inventory routes and shared primitives.
2. Capture a bounded browser audit for each authenticated route family.
3. Classify findings as shared-component drift, one-off implementation, or conceptual flow mismatch.
4. Prefer systemic primitive fixes; keep feature-owned exceptions documented and narrow.
5. Add targeted regression coverage, rerun affected routes, and execute full validation.

## Acceptance criteria

- No material horizontal overflow at supported breakpoints.
- Comparable actions, headers, filters, collection states, and overlays use the shared design-system vocabulary.
- Compact layouts preserve information and 44px interaction targets.
- Light and dark themes retain readable hierarchy and focus visibility.
- Empty/loading/error states have clear recovery and do not expose stale anatomy.
- Browser console is free of application warnings and errors on audited fixtures.
- `env VITE_APP_DATA_MODE=control-plane npm run validate` passes.

## Progress log

- 2026-07-28: Started route, primitive, worktree, and browser-state inventory.
- 2026-07-28: Audited all authenticated route families at desktop and compact widths, plus representative tablet layouts, dark theme, dense drawers, and dialogs. No route-level document overflow, duplicate IDs, missing image alternatives, unlabeled buttons, or undersized shared action controls were found.
- 2026-07-28: Confirmed Event Trigger and Outbound Webhook ledger cards retained five desktop columns below `xl`. At mobile, action menus rendered outside the card; at tablet, metadata columns overlapped. Replaced the compact layout with an identity/action row and full-width labeled facts while preserving the shared desktop grid.
- 2026-07-28: Confirmed URL-selected VM resource tabs could initialize outside the visible horizontal tab strip. Updated the shared resource-tab primitive to reveal the active tab on arrival and after selection.
- 2026-07-28: Added source-contract and browser regression coverage. Focused unit tests, TypeScript, and the two affected fixture tests pass.
- 2026-07-28: Re-swept 21 desktop routes and 16 mobile routes after implementation. No material document or main-region overflow, clipped non-scroll controls, duplicate IDs, missing image alternatives, unlabeled buttons, or overlay regressions remained. The only off-viewport compact elements were inactive ends of the intentional VM resource tab scroller; its selected tab remained fully visible.
- 2026-07-28: `env VITE_APP_DATA_MODE=control-plane npm run validate` passed: design enforcement, TypeScript, 692 unit tests, 19 visual checks with 1 intentional skip, 165 repeated fixtures, 21 repeated MCP parity checks, membership/contracts/harness, production build, and route smoke checks.
