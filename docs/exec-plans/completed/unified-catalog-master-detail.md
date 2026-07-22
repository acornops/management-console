# Unified catalog master-detail layout

## Goal

Give Workflows and MCP Catalog one responsive master-detail composition while preserving their existing detail content, controls, route state, and control-plane boundaries.

## Constraints

- Keep this change inside `management-console`; no API or cross-repository contract changes.
- Preserve unrelated dirty-worktree changes.
- Keep workflow tabs, launch and schedule actions, MCP installation, and personal credential behavior unchanged.
- Use `workflow` for workflow selection, `tab` for workflow detail tabs, and `q` for workflow search.

## UX acceptance criteria

- Both routes use one bordered, divided surface with a `32rem` minimum height and `lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]`.
- Compact viewports show either library or detail, with Back preserving discovery state and restoring row focus.
- Desktop may preview the first visible item without writing selection state to the URL.
- Selecting a workflow resets to Overview; selecting a previewed tab first makes the workflow route-explicit.
- Legacy exact-name workflow `q` links canonicalize once, invalid selections are replaced, and browser history restores prior route state.
- Workflow loading, error, empty, no-match, and all five tab panels remain available.

## Implementation

- Added `MasterDetailLayout` and migrated Workflows and MCP Catalog to it.
- Added shared list headers, rows, loading and empty states, detail headers, detail bodies, and discovery spacing so inner-pane chrome remains consistent across both routes.
- Reworked the workflow library into compact divided rows while retaining identity, description, status, Agent count, capability count, selection, and focus states.
- Reworked MCP server rows into the same title, description, status, and metadata anatomy while preserving source, version, compatibility, selection, and keyboard navigation.
- Separated desktop workflow preview state from explicit URL selection and added compact Back/focus behavior.
- Updated generated Agent-to-Workflow links to use the canonical `workflow` parameter.
- Documented the shared catalog split in `DESIGN.md` and the authenticated design-system standard.

## Validation log

- `npx vitest run src/components/common/MasterDetailLayout.test.tsx src/pages/WorkspaceWorkflowsPage*.test.ts src/pages/CatalogMasterDetailLayout.test.ts src/pages/DiscoveryFilterSurfaces.test.ts src/features/catalog/McpPatDialog.test.ts src/services/control-plane/catalogApi.test.ts`: passed, 12 files and 42 tests.
- `npm run design:check`: passed across 264 source files.
- `npm run lint`: passed.
- `npm run test`: passed, 129 files and 751 tests.
- `VITE_APP_DATA_MODE=control-plane npm run validate`: passed. This included design checks, TypeScript, 751 unit tests, 19 browser snapshot tests with one intentional skip, membership checks, contract checks, harness checks, production build, and route smoke checks.
- `node /tmp/master-detail-browser-check.mjs`: passed 12 route/theme/viewport combinations for Workflows and MCP Catalog in light and dark at `390x844`, `768x1024`, and `1440x1000`. Checks covered desktop column width, pane adjacency, compact drill-in and Back, focus restoration, preserved filters, workflow history and URL canonicalization, five accessible tabs with End-key navigation, theme resolution, and horizontal overflow.

## Completion criteria

Complete. Both catalogs share the documented split rule, route behavior is covered, existing workflow and MCP functionality remains intact, and focused, full-suite, control-plane-mode, and responsive browser validation pass.

## Inner-pane consistency follow-up

- Focused master-detail, workflow navigation, workflow runtime, and discovery suites: passed, 6 files and 32 tests.
- `npm run design:check`: passed across 264 source files.
- `npm run test`: passed, 129 files and 753 tests.
- The responsive browser audit passed all 12 route, theme, and viewport combinations. At desktop widths it also compared computed discovery gaps, row min-height and padding, list-header padding and border, detail-header background and padding, and detail-body background, padding, and gap; Workflows and MCP Catalog matched.
- Final `VITE_APP_DATA_MODE=control-plane npm run validate`: passed. This included TypeScript, 753 unit tests, 19 browser snapshot tests with one intentional skip, membership, contract, harness, production build, and route smoke checks.
