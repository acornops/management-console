# Target Catalog Audit Hardening

## Goal

Resolve the Kubernetes cluster catalog audit findings and apply the same shared
interaction, accessibility, responsive, and performance behavior to the virtual
machine catalog.

## Constraints

- Preserve route-backed search, filters, target selection, setup, settings, and
  deletion behavior.
- Keep Kubernetes health and telemetry semantics separate from VM health and
  telemetry semantics.
- Do not change control-plane API contracts, authorization, credentials, or
  target runtime behavior.
- Preserve unrelated local work in the existing dirty worktree.

## Target Boundary Decisions

| Concept | Shared target model? | Kubernetes-specific? | VM-specific? | Notes |
| --- | --- | --- | --- | --- |
| Card shell and focus | UI primitive | no | no | One visible, tokenized focus treatment. |
| Overflow action menu | UI primitive | no | no | One keyboard and focus-management contract. |
| Status-chip structure | UI primitive | health mapping and reason | health mapping and reason | Status meaning remains target-owned. |
| Relative-time cadence | UI utility | cluster timestamps | VM timestamps | Refresh labels at an operationally useful cadence without repainting every second. |
| Telemetry alternative | UI structure | CPU cores and GiB | load average and memory percent | Keep units and series names target-specific. |
| Issue summaries | existing shared API | cluster target IDs | VM target IDs | No batching contract exists in this change. |

## UX Acceptance Criteria

- Cluster and VM cards use the same high-contrast focus boundary and 44px
  compact-viewport overflow target.
- Both overflow menus support Arrow Up, Arrow Down, Home, End, Escape, and focus
  restoration.
- Catalogs expose a valid H1, H2, H3 heading outline.
- Connected targets expose a visible Open or Investigate affordance.
- Telemetry charts expose series endpoints and timeframe without relying on the
  SVG image alone.
- Relative-time updates no longer repaint the complete catalog every second.
- Cluster and VM target semantics, routes, permissions, and setup behavior remain
  unchanged.

## Validation Log

- Baseline `npm run design:check`: passed across 307 source files.
- Baseline focused Vitest suite: 25 tests passed.
- Baseline discovery-toolbar browser geometry: 2 tests passed at 390px through
  1440px viewports.
- Post-change `npm run lint`: passed.
- Post-change focused Vitest suite: 38 tests passed across 6 files.
- `npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/target-catalog-accessibility.spec.ts`:
  2 tests passed, covering the Kubernetes and VM catalogs at 390px.
- `npm run validate`: invoked. Design policy passed across 312 source files,
  TypeScript passed, and 930 of 931 unit tests passed. The command stopped on an
  unrelated, already-modified chat-polish assertion that expects a removed CSS
  declaration.
- `npm run design:snapshots`: 17 passed, 1 skipped, and 2 unrelated discovery
  example tests failed on hidden-target geometry and reset navigation.
- `npm run smoke:fixtures`: 40 tests passed before the run was interrupted after
  a concurrent edit temporarily made `OverviewView.tsx` syntactically invalid.
  The later targeted three-repeat attempt ran during concurrent fixture and
  translation edits, producing 3 passes and 3 fixture-loading/HMR failures.
- `npm run smoke:mcp-parity`: 15 tests passed.
- `npm run membership:check`: passed.
- `npm run contracts:check`: passed.
- `npm run harness:check`: failed on the unrelated, already-modified
  `useTargetChat.ts` at 662 lines against a 650-line budget.
- `npm run build`: passed, transforming 2,699 modules.
- `npm run smoke:routes`: passed.
- Final `npm run design:check`: passed across 313 source files after concurrent
  workspace edits settled.
- Final focused Vitest rerun: 38 tests passed across 6 files.
- Fresh fixture-backed desktop captures were reviewed for both target catalogs.

## Re-audit

The final Impeccable score is 19/20:

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Accessibility | 4/4 | Tokenized focus boundary, complete menu keyboard model, valid H1/H2/H3 outline, explicit action names, and semantic trend tables. |
| Performance | 3/4 | One-minute visible-page cadence, bounded issue-summary concurrency, and memoized chart inputs remove the one-second repaint loop. A batch issue-summary API remains outside this UI-only change. |
| Responsiveness | 4/4 | Shared 44px compact-viewport menu target and live checks at 390px. |
| Theming | 4/4 | Shared UI tokens cover focus, surfaces, status, and chart colors in both themes. |
| Anti-patterns | 4/4 | No prohibited gradients, excessive pills, title repetition, or decorative UI noise was introduced. |

No P0 or P1 target-catalog findings remain. The only residual is the P3 batch
API opportunity for very large target inventories.

## Completion Criteria

- Targeted unit and browser behavior tests pass for both catalogs.
- `npm run validate` is run; scoped gates pass and unrelated dirty-worktree
  failures are recorded rather than overwritten.
- A fresh Impeccable audit covers the full management-console workspace and
  records any residual risks.
