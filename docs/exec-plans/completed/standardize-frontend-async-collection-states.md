# Standardize Frontend Async Collection States

## Goal

Eliminate loading-to-empty flicker across asynchronous collection surfaces by
deriving loading, ready, refreshing, loading-more, and error presentation from
one documented lifecycle. Preserve route headers, table frames,
master-detail shells, selected resources, focus, scroll, and existing content
while requests are pending.

## Constraints

- Limit changes to `management-console`; do not change routes, control-plane
  APIs, schemas, permissions, response contracts, or add dependencies.
- Preserve the existing router transition that keeps the current lazy route
  visible while the next route resolves.
- Preserve all user-owned work already present on
  `feat/extensible-catalog-sources`, including current Schedules, Approvals,
  Agents, Workflows, and Catalog changes.
- Keep empty-state copy and domain-specific layouts feature-owned.
- Keep target-chat streaming/backfill synchronization outside the cursor hook
  because it merges live events with historical pages; standardize only its
  visible collection lifecycle.

## Implementation Phases

### 1. Foundation

- Add `ResourcePhase`, `CursorCollectionPhase`, and the transparent
  `useCursorCollection` hook with cancellation, stale-response protection,
  deduplication, repeated-cursor protection, refresh, retry, and manual,
  sentinel, and drain strategies.
- Add `CollectionState`, `DataTableFrame`, `DataTable`,
  `DataTableHeaderCell`, and `DataTableStateRow`.
- Extend `DataSurface` with filtered-empty plus retained-content refresh and
  error feedback.
- Add design-system examples, lifecycle documentation, an endpoint inventory,
  and a design check for hand-rolled loading plus empty branches.

### 2. Known Flicker Paths

- Migrate Schedules and Approvals away from independent initial-load flags.
- Keep Conversation History neutral during its 350 ms debounce.
- Keep Agents, Workflows, and Catalog collection shells mounted while their
  initial requests resolve.

### 3. Remaining Collection Surfaces

- Migrate duplicated collection rendering in target tools, skills, MCP
  servers, catalog sources, members, audit, Kubernetes and VM inventories,
  overview aggregates, and issue panels where the shared lifecycle applies.
- Migrate direct cursor consumers to `useCursorCollection`; use `drain` only
  for documented bounded aggregates or selectors.
- Record contextual exceptions rather than flattening stable domain layouts.

### 4. Enforcement and Documentation

- Complete the collection inventory with migrated or exception status.
- Update the interaction and design-system documentation.
- Record exact validation evidence, skips, and residual risks before moving
  this plan to `completed/`.

## UX Acceptance Criteria

- Empty or filtered-empty content never appears before the initial request
  settles.
- Initial loading resolves directly to content, true empty, filtered-empty, or
  a retryable in-boundary error.
- Refresh and pagination preserve existing rows and collection boundaries.
- Errors with retained content do not replace that content.
- Collection boundaries expose `aria-busy`; decorative skeletons are hidden
  from assistive technology; refresh and pagination outcomes use polite live
  announcements.
- Desktop and compact layouts, light and dark themes, and reduced motion keep
  their existing visual structure.

## Validation Log

- PASS: focused lifecycle, cursor-hook, render-precedence, table-state, and
  Conversation History debounce coverage (`5` files, `25` tests).
- PASS: the complete unit suite in the validation entrypoint (`147` files,
  `855` tests), including cancellation, stale responses, deduplication,
  repeated cursors, refresh retention, pagination, and failure phases.
- PASS: delayed fixture-browser coverage for Schedules, Approvals, Agents,
  Workflows, and Catalog. The checks prove that false-empty copy is absent
  while requests are pending and that the same collection boundary survives
  through resolution. The complete fixture suite passed all three repetitions
  (`54` tests).
- PASS: TypeScript (`npx tsc --noEmit --pretty false`), design-system
  enforcement (`292` source files), and `git diff --check`.
- PASS: desktop and compact light/dark design snapshots with reduced motion
  (`19` passed, `1` project-conditional case skipped as designed).
- PASS: MCP parity (`9` tests), workspace-membership, contract, and harness
  checks; production build; and route smoke checks. The build retained only
  the existing large-chunk advisory.
- PASS: `npm run validate`.
- PASS: `VITE_APP_DATA_MODE=control-plane npm run validate`.
- Residual exception: target-chat historical pagination remains outside
  `useCursorCollection` because it must merge paged history with live stream
  events. Its visible loading, empty, retained-content, and assistive-technology
  states use the shared collection rendering contract and the exception is
  recorded in the inventory.
- No route, API, schema, permission, response-contract, or dependency changes
  were introduced by this plan.

## Completion Criteria

- Shared lifecycle and collection primitives are documented, cataloged, and
  covered by table-driven tests.
- Every inventoried async collection is migrated or has a named contextual
  exception with rationale.
- Known flicker paths keep their collection boundary mounted and never render
  false-empty content.
- Repository validation and control-plane-mode validation pass, or any
  environment-only skips and residual risks are recorded here exactly.
