# Empty Collection Table Anatomy

## Goal

Make collection surfaces behave as one product when they have no rows: terminal empty, filtered-empty, error, and permission states replace the table structure instead of appearing beneath orphaned column headers.

## Scope

- Inventory semantic tables and table-shaped responsive grids across the management console.
- Centralize the header-visibility contract in the shared data-table primitives.
- Apply the contract to user-facing collection pages while preserving feature-owned diagnostic and chart tables.
- Preserve discovery controls when a filtered-empty state needs a recovery path.
- Add focused regression coverage and verify representative states in the browser.

## State contract

| State | Rows | Column headers |
| --- | ---: | --- |
| Ready / populated | 1+ | Shown |
| Refreshing / loading more | 1+ | Shown |
| Initial loading with generic progress | 0 | Hidden |
| Empty | 0 | Hidden |
| Filtered empty | 0 | Hidden; recovery controls remain |
| Error / permission | 0 | Hidden |

Table-shaped skeleton loading may opt into visible headers when a surface provides column-aligned placeholders.

## Acceptance criteria

- Terminal zero-row collection states do not expose an orphaned header row.
- Populated and background-refresh states retain their headers.
- Filtering and retry paths remain available.
- Responsive card/table variants follow the same state contract.
- Accessibility semantics remain valid.
- Existing design-system and route behavior tests pass.

## Validation

- Focused component and surface behavior tests.
- Browser inspection of representative empty, filtered-empty, populated, loading, and responsive states.
- `env VITE_APP_DATA_MODE=control-plane npm run validate`
- Final stale-code and worktree review.

## Progress log

- 2026-07-27: Established the product-wide state contract and began the collection-surface inventory.
- 2026-07-27: Added shared semantic-table and responsive-ledger header visibility, migrated all applicable collection surfaces, and covered zero-row refresh behavior.
- 2026-07-27: Browser-verified populated and filtered-empty automation, governance, target administration, wide schedule, and mobile Runs states with no horizontal overflow or console warnings.
- 2026-07-27: Updated focused browser and visual snapshot coverage, removed the stale “retain headers when empty” expectation, and completed the full control-plane validation command successfully.
