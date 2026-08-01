# Design-system remediation result

Date: 2026-07-29

## Result

The table and semantic-typography gaps identified in the original sweep have
been resolved in the working tree.

- Primary Kubernetes Resources, VM Resources, and VM Logs ledgers now use the
  shared standard header anatomy.
- Kubernetes and VM Overview issue tables use an explicit shared compact
  density because they are secondary embedded tables.
- Schedules and Approvals retain the documented dense density.
- MCP Servers, Members, Skills, Tools, and Resources use the shared row-title
  role for leading identities.
- MCP, Skills, Tools, and tool-dialog metrics use `type-data`.
- Visible application column headers use shared table primitives and receive
  `scope="col"` from the component.
- The design-system checker rejects raw visible application column headers and
  reconstructed metric typography.

## Rendered measurements

At 1600 × 1000, Audit Log, MCP Servers, and VM Resources all render column
labels at 12 px / 600 / 16 px with 20 px vertical and 32 px horizontal header
padding. Kubernetes Resources and VM Logs use the parallel shared grid-header
primitive with the same standard visual anatomy.

## Evidence

- `17-cluster-resources.png`
- `18-cluster-mcp-servers.png`
- `25-vm-resources.png`
- `29-vm-logs.png`
- `16-cluster-overview.png`
- `24-vm-overview.png`
- `19-cluster-skills.png`
- `20-cluster-tools.png`

## Validation

- Design-system check passed across 379 source files.
- Focused design/table contracts: 53 tests passed.
- Full unit suite: 131 files and 693 tests passed.
- Shared UI package check passed.
- MCP parity: 21 browser tests passed across three repetitions.
- Production build and route smoke checks passed.
- Changed fixture routes passed serial browser coverage.

The combined validation command and the parallel repeated fixture suite also
encountered machine-level worker and navigation timeouts while swap was
exhausted. Every affected unit or design-snapshot test passed when rerun
serially; ledger-relevant fixture routes passed serially as well.
