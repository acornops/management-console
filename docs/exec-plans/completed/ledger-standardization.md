# Ledger standardization

## Goal

Resolve the remaining cross-screen table and semantic-typography drift identified
in the authenticated Management Console design-system sweep.

## Scope

- Add an explicit shared compact table-header density for secondary embedded tables.
- Keep standard density for primary Resources and Logs ledgers.
- Preserve dense headers for seven-or-more-column decision tables.
- Move visible application column headers onto shared table primitives.
- Normalize leading ledger identities and metric readouts to semantic typography roles.
- Extend the design-system checker so raw visible column headers and reconstructed
  metric typography cannot return unnoticed.

This work does not change routes, permissions, API contracts, filtering behavior,
table columns, or control-plane data.

## Implementation

1. Extend `DataTableHeaderCell` and `DataTableGridHeader` with documented density
   variants and breakpoint support.
2. Migrate Kubernetes Resources, VM Resources, VM Logs, and embedded issue tables.
3. Normalize MCP Servers, Members, Skills, Tools, and summary metrics.
4. Add design-check rules and narrow exceptions for screen-reader-only and
   user-authored content tables.
5. Run component tests, design checks, repository validation, and a rendered
   route comparison.

## Completion evidence

- Shared component tests cover standard, dense, compact, and medium-breakpoint
  grid headers.
- `npm run design:check` rejects raw visible application column headers.
- Repository-required validation passes.
- Rendered Resources, Logs, MCP Servers, and Audit Log screens show the intended
  density contract without changing their information architecture.

## Validation log

- `npm run design:check`: passed across 379 source files.
- `npm run lint`: passed.
- `npx vitest run packages/ui/src/DataTable.test.tsx src/styles.test.ts
  src/surfaceBehaviorContracts.test.ts --reporter=verbose`: 53 tests passed.
- `npm run test`: 131 files and 693 tests passed.
- `npm run ui:check`: passed, including changeset, typecheck, build, export-map,
  and package dry-run checks.
- `npm run membership:check`: passed.
- `npm run contracts:check`: passed.
- `npm run harness:check`: passed.
- `npm run design:snapshots`: the parallel run completed 16 tests, skipped one,
  and timed out three browser interactions while the machine was under memory
  pressure. All three timed-out tests passed when rerun with one worker.
- `npm run smoke:fixtures`: the repeated parallel run was stopped after broad
  unrelated navigation and trace-teardown timeouts while swap was exhausted.
  Serial coverage for Kubernetes Overview, Kubernetes Resources, VM Resources,
  and target MCP/Skills/Tools passed; the target capability revisit test passed
  on a fresh-server retry.
- `npm run smoke:mcp-parity`: 21 tests passed across three repetitions.
- `npm run build`: passed.
- `npm run smoke:routes`: passed.
- `npm run validate`: did not complete in one invocation because Vitest failed
  to start six workers after 125 files and 680 tests. Those six files passed
  serially, and the full `npm run test` invocation passed immediately before
  the combined run.
- Rendered desktop recapture: Audit Log, Kubernetes Overview, Kubernetes
  Resources, target MCP Servers, Skills, Tools, VM Overview, VM Resources, and
  VM Logs were recaptured and inspected at 1600 × 1000.
