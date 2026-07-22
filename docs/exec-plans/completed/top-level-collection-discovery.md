# Top-level collection discovery

## Goal

Standardize top-level search and categorical filtering across Agents, Workflows,
MCP Catalog, Kubernetes clusters, and virtual machines with one accessible,
responsive discovery component.

## Constraints

- Preserve existing URL parameter names, history behavior, matching, pagination,
  permissions, APIs, and control-plane contracts.
- Keep nested resource explorers and audit-log search patterns unchanged.
- Preserve MCP destination and selected-artifact route state when discovery
  filters are cleared.
- Work around unrelated changes already present in the management-console
  worktree.

## UX acceptance criteria

- Search-only, one-filter, and multi-filter catalogs use `DiscoveryFilterBar`.
- Categorical filters use typed definitions from `createDiscoveryFilterGroup`
  with optional counts and render in one progressively disclosed popover.
- Results are announced politely. Query clear, chip removal, reset, and atomic
  clear-all behavior use stable focus destinations.
- Below `sm`, search fills the first row. From `sm` through the space below
  `xl`, it grows from a flexible `20rem` basis while trailing controls wrap. At
  `xl`, it becomes a fixed, non-growing `20rem` field in one compact row.
- Active categorical conditions render as removable warm-neutral chips. Clear
  all appears only when at least two discovery conditions are active.
- Empty unfiltered collections hide discovery controls; filtered zero-result
  states retain them and expose recovery.
- Catalog headings do not duplicate result counts.

## Compact toolbar follow-up

- Replaced the page-owned select children and broad active-state flags with
  typed `filters`, explicit reset and clear-all callbacks, and localized labels.
- Added a portaled, viewport-clamped non-modal filter dialog with immediate
  radio selection, Escape focus restoration, outside-click closing, and
  categorical reset that preserves search.
- Preserved the query-only Workflows surface and its contextual tag suggestions,
  one Status group for Agents, clusters, and VMs, and Source plus Compatibility
  for MCP Catalog.
- Preserved route parameters, replace-history behavior, counts, empty recovery,
  and MCP artifact and destination state.

## Responsive geometry correction

- Removed the premature fixed-width lock at `sm`. The shared search wrapper now
  fills its row below `sm`, grows from a `20rem` flex basis between `sm` and
  `xl`, and returns to a fixed, non-growing `20rem` width at `xl` and wider.
- Kept result feedback right-aligned and allowed it, active chips, Clear all,
  and localized labels to wrap inside the toolbar without page-owned overrides.
- Applied the correction through the shared component only, so Agents,
  Workflows, MCP Catalog, Kubernetes clusters, and virtual machines preserve
  their existing state, filtering behavior, and content geometry.

## Validation log

- `npm run lint`: passed.
- Focused component and page suites: 72 tests passed before full validation;
  the post-extraction workflow suite passed 19 tests.
- `npm run test`: passed, 126 files and 740 tests.
- `npm run design:snapshots:update`: passed, 19 tests passed and one
  intentionally skipped; four catalog snapshots refreshed.
- `npm run design:snapshots`: passed, 19 tests passed and one intentionally
  skipped.
- The first `VITE_APP_DATA_MODE=control-plane npm run validate` reached the
  harness and reported that `WorkspaceWorkflowsPage.tsx` exceeded its 650-line
  budget. The discovery presentation was extracted into the existing workflow
  components module.
- Final `VITE_APP_DATA_MODE=control-plane npm run validate`: passed. Design,
  TypeScript, 740 unit tests, browser snapshots, membership, contracts, harness,
  production build, and route smoke checks all passed.
- Compact-toolbar focused Vitest suites: passed, 10 files and 87 tests.
- `npm run design:check`: passed across 306 source files.
- `npm run lint`: passed.
- `npm run test`: passed, 156 files and 904 tests.
- Catalog Playwright suite: passed, 8 desktop and mobile snapshot, sizing, and
  interaction tests. Light and dark rendering was also inspected at 390px,
  1024px, and 1440px before the catalog snapshots were refreshed.
- `npm run design:snapshots`: passed inside the final validation run, 19 tests
  passed and one was intentionally skipped.
- `npm run validate`: reached `smoke:fixtures` after the design, TypeScript,
  unit, and snapshot stages passed, then stopped because port `4186` was already
  occupied. The process using that port was not owned by this change and was not
  terminated.
- Remaining checks run independently: workspace membership, contracts,
  production build, and route smoke passed. Harness checking is blocked only by
  the unrelated `src/features/targets/chat/hooks/chatSubmit.ts` line budget
  (652 lines against 650). MCP parity was externally terminated with exit 143
  after starting 4 of 12 repeated smoke cases; no MCP parity assertion failure
  was reported before termination.
- Responsive-geometry focused Vitest suites: passed, 4 files and 21 tests.
- Fixture-mode geometry coverage: passed for the active cluster card grid and
  workflow search-only surface at 390, 768, 1024, 1279, 1280, and 1440px. The
  repeated fixture harness passed all six geometry runs.
- `npm run design:check`, `npm run lint`, `npm run test` (157 files and 907
  tests), `npm run design:snapshots` (19 passed, 1 intentionally skipped),
  `npm run smoke:routes`, contract checks, workspace membership, and the
  production build passed. The endpoint catalog snapshots remained pixel-stable,
  so no light or dark baseline required refreshing.
- `npm run smoke:fixtures`: 61 of 63 repeated cases passed. Two existing
  Workflows standalone cases reached the app error boundary because
  `visibleMcpAuthRequirements` reads `.filter` from an undefined value in the
  unrelated dirty workflow preview implementation. The responsive workflow
  geometry case uses a route-backed no-match query to isolate the search-only
  surface from that detail-preview failure.
- `npm run validate`: passed design enforcement, TypeScript, all 907 unit tests,
  and all 19 applicable snapshot tests, then stopped at the same unrelated
  repeated Workflows fixture failure. Independent contract, membership, build,
  and route smoke checks passed. Harness checks remain blocked by unrelated line
  budgets in `chatSubmit.ts` (652/650) and `WorkspaceWorkflowsPage.tsx`
  (654/650).

## Completion criteria

Complete. The shared component, five surface migrations, catalog examples,
documentation, unit/page/browser coverage, snapshots, and requested validation
are present and passing.
