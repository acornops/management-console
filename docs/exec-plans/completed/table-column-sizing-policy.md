# Table Column Sizing Policy

## Goal

Make collection-column sizing predictable and reviewable without replacing
semantic tables or responsive grid ledgers with a generic data-grid framework.

## Constraints

- Preserve existing routes, data, permissions, and control-plane contracts.
- Keep semantic tables content-driven unless stable comparison requires fixed
  tracks.
- Keep compact ledger layouts available below their desktop column breakpoint.
- Preserve the unrelated changes already present in the worktree.

## Decisions

- `DataTable` remains content-sized by default.
- A `table-fixed` consumer must declare its complete track model in one
  `colgroup`; cells do not independently own widths.
- A responsive grid ledger must reuse one named grid-template constant in its
  header and every desktop row.
- Breakpoint-specific track sets must account for the columns visible at that
  breakpoint, while identity columns receive the flexible space and utility
  columns remain bounded.

## Acceptance Criteria

- The durable design-system documentation defines the auto, fixed-table, and
  responsive-grid sizing modes and their selection rules.
- Every production fixed table has an explicit `colgroup`.
- Every production grid header is registered with the same template source as
  its rows.
- Automated tests reject fixed tables without track declarations and grid
  ledgers whose header and row sizing can drift.

## Validation Log

- PASS: `npx vitest run src/tableColumnSizingContracts.test.ts src/tableAlignmentContracts.test.ts --reporter=dot` (2 files, 17 tests).
- PASS: `npx vitest run src/styles.test.ts src/loadingContinuity.test.ts --reporter=dot` (2 files, 31 tests).
- PASS: `npm run design:check` (455 source files).
- PASS: the UI package typecheck and build stages completed through `npm run validate`.
- REVIEWED: the desktop-light design-route run covered Audit Log, Kubernetes
  Resources, and VM Resources. Kubernetes and VM matched their baselines. Audit
  Log produced a 2% route snapshot difference; the captured column layout was
  visually reviewed and retained. The snapshot was not updated because the
  same diff contains unrelated in-progress sidebar and route changes.
- BLOCKED: `npm run validate` reached `design:adoption`, then stopped on the
  unrelated existing `semantic-callout-bypass` in
  `src/pages/WorkflowSettingsPanel.tsx:64`.
