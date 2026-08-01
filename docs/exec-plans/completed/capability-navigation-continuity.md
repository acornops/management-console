# Capability Navigation Continuity

## Goal

Keep the last successful MCP Servers, Skills, and Tools catalogs visible when
operators move between capability routes, while still refreshing each catalog
from the control plane on entry.

## Constraints

- Preserve route-backed navigation and shareable URLs.
- Scope cached data to the owning mounted workspace/target or Agent surface so
  data cannot persist across an authenticated app lifetime.
- Keep control-plane data authoritative; cached catalogs are only immediate
  render state before background revalidation completes.
- Preserve existing mutations, permissions, filters, and error handling.

## Acceptance Criteria

- Returning to a previously loaded capability route does not replace its
  inventory with an initial loading indicator.
- Kubernetes cluster, virtual machine, and Agent capability routes use the same
  cache-and-revalidate behavior.
- Catalogs remain isolated by workspace and subject ID.
- Focused tests and the repository validation entrypoint pass, or unrelated
  failures are recorded with exact evidence.

## Validation Log

- `npx vitest run src/features/targets/admin/useCapabilityCatalogCache.test.ts src/features/targets/admin/TargetToolsView.test.tsx src/features/targets/admin/TargetSkillsInventory.test.tsx src/features/targets/admin/McpServersInventory.test.tsx`: passed, 4 files and 7 tests.
- `FIXTURE_REUSE_SERVER=1 npx playwright test tests/fixtures/cluster-capability-catalog-cache.spec.ts --config=playwright.fixtures.config.ts --workers=1`: passed, 3 tests covering Kubernetes clusters, virtual machines, and Agents with delayed revisit refreshes.
- `npm run validate`: passed, including 180 Vitest files and 841 tests, harness checks, production build, bundle budget, and route smoke checks.
- An initial `npm run validate` run found `VirtualMachinesPage.tsx` at 661 lines against its 650-line budget. The cache wiring was compacted to 647 lines before the passing rerun.
