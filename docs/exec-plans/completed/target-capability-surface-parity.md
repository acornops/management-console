# Target Capability Surface Parity

> Archive review — 2026-10-18: Implementation is present, including the three-route PageHeader/table-frame and localized Skills-filter regression guards in McpServersPresentation.test.ts. The original pending-validation note below is historical; no fresh browser acceptance is claimed.
> Original scope, checklists, and validation below are historical; this is not a new runtime or rollout validation report.

## Goal

Make the target Tools, Skills, and MCP Servers routes use one route-header,
terminal empty-state, responsive table, and localized control vocabulary.

## Constraints

- Preserve target catalog data, permissions, filters, and mutations.
- Preserve the current summary metrics and populated table columns.
- Keep terminal empty and filtered-empty states outside table anatomy.
- Compose existing shared UI primitives instead of adding page-local spacing.

## Acceptance Criteria

- Empty Skills, Tools, and MCP inventories render the same canonical height.
- All three routes use `PageHeader` and align actions consistently.
- Populated tables scroll within their surface on narrow viewports.
- Skills filters and MCP add actions respond to the active locale.
- Focused tests and repository validation pass, or unrelated failures are
  recorded with exact evidence.

## Validation Log

- Pending implementation and focused validation.
