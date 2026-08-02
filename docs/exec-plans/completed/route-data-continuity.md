# Route Data Continuity

## Goal

Keep previously loaded, authorized control-plane data visible when an operator
navigates away from a route and returns, while revalidating that data in the
background.

## Scope

- Session-scoped cached state for route-level control-plane reads
- Cached cursor collections keyed by workspace, resource, filters, and paging
  strategy
- Background-refresh semantics for workspace overview, inventory, workflow,
  governance, settings, and target-detail surfaces
- Cache isolation across authenticated users and explicit invalidation after
  mutations

## Constraints

- Preserve unrelated in-progress changes in the dirty worktree.
- Do not change control-plane contracts or treat cached permissions as an
  authorization decision.
- Do not persist user-scoped operational payloads to browser storage.
- Clear all cached payloads when the authenticated user changes or signs out.
- Preserve route-backed selection and filter behavior.
- First visits may show loading UI; revisits with cached content must not return
  to an empty loading shell.

## UX Acceptance Criteria

- Returning to a previously visited data route renders its last successful
  snapshot immediately.
- A remount or window-focus refresh retains existing rows and cards while the
  request is in flight.
- Cache entries are isolated by user, workspace, route resource, filters, and
  detail identity.
- Mutations update or invalidate affected cached snapshots.
- Loading, empty, error, and background-refresh states remain distinguishable
  and accessible.

## Plan

1. Inventory route-level request owners and define cache scopes.
2. Add a session-scoped cache primitive and cached collection behavior.
3. Migrate route-level pages in coherent groups without overwriting concurrent
   branch work.
4. Add regression tests for remount continuity, key isolation, revalidation,
   and session clearing.
5. Run focused tests, type checking, and `npm run validate`; record exact
   results and residual risk here.

## Validation Log

- `npm run app:typecheck` — passed.
- `npm run harness:check` — passed.
- Focused Vitest continuity suite — 6 files and 41 tests passed.
- Full `npm test -- --run` — 191 files and 901 tests passed; one unrelated
  pre-existing source-contract assertion remains in
  `TraceFooter.polish.test.ts` after its scroll handler became conditional.
- `npm run membership:check` and `npm run contracts:check` — passed.
- `npm run build`, `npm run bundle:check`, and `npm run smoke:routes` — passed.
- Standalone Playwright route matrix — 16 route checks passed against the mock
  application after the development server finished rebuilding the UI package.
- `npm run validate` reaches `design:adoption` and is blocked by the unrelated
  raw semantic callout already present in `WorkflowSettingsPanel.tsx`.

## Documentation Impact

Added the durable session-scoped stale-while-revalidate rule, cache boundaries,
and authorization caveat to `docs/RELIABILITY.md`.

## Residual Risk

The cache is intentionally in-memory, bounded to 250 entries, and cleared on
authenticated-user changes. A hard browser reload still performs a first-load
request. Background revalidation is best effort, so a route may briefly show a
last-known snapshot with a non-blocking refresh error when the control plane is
unavailable.

Status: completed.
