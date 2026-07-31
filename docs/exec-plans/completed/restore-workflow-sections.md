# Restore Workflow Page Sections

## Goal

Restore the route-backed workflow information architecture from commit
`7e5662a` without reverting the newer target-free workflow behavior or current
Activity ledger contents.

## Scope

- Restore the Workflows, Schedules, Incoming webhooks, and Activity top-level
  tabs as one route-backed workflow family.
- Restore the selected workflow's Overview, Agents, Capabilities, Runs, and
  Settings tabs.
- Reuse current panels and mutation behavior inside those tabs.
- Preserve existing URLs, responsive master-detail behavior, permissions, and
  the current Activity implementation.
- Update the durable workflow IA documentation and focused UI contracts.

## Validation

- Targeted workflow section, route, navigation, panel, and surface-contract
  tests pass.
- The full Vitest suite passes: 164 files and 779 tests.
- TypeScript, production build, route smoke, contracts, and harness checks pass.
- The repository-wide validator remains blocked by pre-existing design-system
  typography findings in `NavCountBadge.tsx`; the separately run bundle check
  also reports the pre-existing oversized main chunk.
- The final diff changes route composition and documentation only; workflow API
  clients and execution semantics are unchanged.
