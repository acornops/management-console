# Runs Ledger And Collection Consistency

## Goal

Polish the workspace Runs ledger for dense operational scanning, review the
other table-led workspace routes for the same oversized-empty-surface problem,
and make the first-run action consistent between Kubernetes Clusters and
Virtual Machines.

## Scope

- Remove artificial height from the populated Runs ledger.
- Keep desktop column headings authoritative and reserve repeated field labels
  for compact layouts.
- Keep the exact-run row action clear without giving it a wide, detached
  column.
- Review Schedules, Approvals, Audit Log, Members, and the shared data-table
  frame for the same forced-height pattern.
- Add the permission-gated Connect VM action to the genuine empty VM inventory
  state, matching the Kubernetes inventory setup path.
- Preserve URL-backed filters, loading/error/filtered-empty behavior,
  permissions, and control-plane API boundaries.

## UX Acceptance Criteria

- A populated Runs ledger ends after its final row instead of framing unused
  page height.
- Desktop rows do not repeat Target, Activity, and Duration labels already
  supplied by the column header.
- Compact rows retain those labels and a visible destination action.
- The trailing desktop action remains discoverable and keyboard reachable
  without forcing a wide action column.
- Empty Kubernetes and VM inventory pages both offer their available connect
  action at the point of explanation when the operator has permission.
- Filtered-empty, loading, and failure states never show a connect action.
- Other reviewed table-led workspace routes retain their existing
  shrink-to-content behavior.

## Validation Plan

- Add focused rendering and source-contract tests for the Runs row and VM empty
  state.
- Run focused Vitest coverage for workflow activity, empty states, and
  collection vocabulary.
- Run the repository validation entrypoint.
- Verify Runs, Kubernetes Clusters, and Virtual Machines at desktop and compact
  widths in the in-app browser.

## Validation Log

- Reviewed Schedules, Approvals, Audit Log, Members, and the shared
  `DataTableFrame`; none applies a forced minimum height to populated table
  content. Runs was the only matching table-led route with the oversized empty
  frame.
- Browser verification passed in standalone fixture mode at `1920x1080` and
  `768x1024`. The Runs ledger ends after its final row, desktop field labels are
  not duplicated, tablet rows use the intended two-column rhythm, and the
  genuine empty VM inventory shows the same permission-gated setup action as
  Kubernetes Clusters.
- A cleanup review consolidated the desktop Runs header and row onto one shared
  grid contract, made the VM failure exclusion explicit, and confirmed the
  shared content width has no production consumer beyond Runs.
- Focused regression run passed: 5 files, 36 tests.
- `VITE_APP_DATA_MODE=control-plane npm run validate` passed:
  - design-system check passed across 372 source files;
  - 130 unit-test files and 683 tests passed;
  - 19 design snapshot tests passed and 1 was intentionally skipped;
  - 162 repeated fixture smoke tests passed;
  - 21 repeated MCP parity tests passed;
  - membership, contract, and harness checks passed;
  - the production build passed with the existing large-chunk advisory;
  - route smoke checks passed.
