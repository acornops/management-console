# Target Inventory Filter Consistency

## Goal

Give workspace Kubernetes cluster and virtual machine inventories one consistent
empty-state, search, and status-filter experience.

## Scope

- Hide discovery controls when a workspace has no targets to search or filter.
- Keep discovery controls visible when an active query or status filter returns
  no matches, so the user can recover without changing routes.
- Replace navigation-style status tabs with a compact status selector.
- Share search, result-summary, and clear-filter behavior across both inventory
  pages.
- Align empty-state typography and spacing with the management-console design
  system, using 16px panel titles and 14px descriptions for page-level states.

## Boundaries

- Preserve existing URL-backed query and status state.
- Preserve target loading, pagination, permissions, and action behavior.
- Do not change control-plane contracts or target status definitions.

## Validation

- `npm test -- src/components/common/InventoryFilterBar.test.ts src/components/dashboard/Dashboard.test.ts src/pages/virtual-machines/VirtualMachineDialogs.test.ts`: passed, 23 tests.
- `npm run lint`: passed.
- `npm run design:check`: passed across 254 source files.
- `npm run test`: passed, 118 files and 710 tests.
- `npm run membership:check`: passed.
- `npm run contracts:check`: passed.
- `npm run harness:check`: passed.
- `npm run build`: passed.
- `npm run smoke:routes`: passed.
- `npm run validate`: stopped at `npm run design:snapshots`. Four catalog snapshots fail because the existing dirty design-system catalog is taller than its already-modified baselines in both themes and breakpoints. The catalog fixture does not import or render `InventoryFilterBar`; the remaining validation commands were run separately and passed.
