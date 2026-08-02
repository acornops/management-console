# Full App Consistency Closure

## Goal

Remove every observable design-system inconsistency from the management console,
then repeat source, rendered, responsive, theme, and accessibility audits until
no unexplained divergence remains.

## Baseline Findings

- Workspace member rows mix primary, UI, label, and status anatomy across peer
  value columns.
- Collection result summaries alternate between shared quiet text and custom
  outlined uppercase capsules.
- Status labels alternate between shared status badges and feature-owned dot or
  text compositions without one enforced semantic boundary.
- Account Settings uses a stronger active-navigation treatment than peer
  sidebar destinations.
- Workspace Settings naming, back-link casing, and search-placeholder
  punctuation drift across related routes.

## Constraints

- Work directly on `main`, as requested.
- Preserve the Operator's Ledger design language and existing route behavior.
- Fix shared causes before individual screens.
- Preserve URL-backed navigation, permissions, API contracts, and fixture data.
- Keep light, dark, desktop, mobile, 200% text reflow, keyboard, and assistive
  semantics in the verification scope.

## Work Plan

1. Normalize result summaries through one shared UI primitive.
2. Normalize member source and status cells to the shared row/status vocabulary.
3. Normalize connection and lifecycle statuses to `StatusBadge`, retaining dots
   only for non-label presence indicators.
4. Align Account Settings with the shared sidebar active state.
5. Align Settings naming, back-link casing, and search-placeholder punctuation.
6. Extend design-system enforcement and focused tests so the repaired patterns
   cannot drift.
7. Run targeted tests, source audits, design-system checks, and route captures.
8. Repeat the rendered audit in light/dark and desktop/mobile modes, fix every
   residual issue, then run `npm run validate`.

## Completion Criteria

- Equivalent collection toolbars render the same result-summary anatomy.
- Peer member columns use intentional, documented semantic roles and lifecycle
  state uses the shared status badge.
- Production status labels do not rebuild status anatomy outside the shared
  primitive unless a documented non-status exception applies.
- Desktop navigation active states follow one shared recipe.
- Related route and control copy follows one casing and punctuation convention.
- Design-system and adoption checks pass with no temporary exceptions.
- Focused unit and browser checks pass in all affected routes.
- Fresh desktop/mobile and light/dark screenshots reveal no unexplained visual
  inconsistency.
- `npm run validate` passes, or any unrelated failure is proven with isolated
  passing affected checks and documented evidence.

## Completion Evidence

- Added the shared `CollectionResultSummary` primitive and routed every audited
  standalone result count through it.
- Routed member, MCP, issue, overview posture, and workload states through
  `StatusBadge`; retained dots only for labeled read/write and health metrics.
- Normalized workspace/account navigation, Settings naming, return copy,
  placeholders, typographic ellipses, and VM snapshot recency.
- Added focused regression coverage for collection summaries, semantic status,
  copy conventions, account navigation, issue tones, and VM timestamp format.
- Captured and manually inspected 30 light/dark desktop/mobile screenshots in
  `.audit/app-consistency-2026-08-02/final/`; all captured route titles share the
  same computed type, and no route reported horizontal overflow or a theme
  mismatch.
- `design:check`, `design:adoption`, UI/app typechecks, and all 855 Vitest tests
  pass. `npm run validate` also passed membership, contract, and package checks;
  its only remaining failure is the pre-existing/concurrent harness line budget
  in `WorkspaceSchedulesPage.tsx` (801 > 650) and
  `WorkspaceWorkflowsPage.tsx` (666 > 650), outside this consistency change.
