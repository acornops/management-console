# Unified Empty-State Presentation

## Goal

Make the compact neutral icon tile the sole visual treatment for shared empty,
filtered-empty, and collection failure states.

## Constraints

- Preserve the existing `EmptyState` API while callers migrate away from the
  legacy `embedded` prop.
- Preserve feature-owned copy, actions, live-region semantics, and surrounding
  surface boundaries.
- Keep the current quiet neutral icon-tile styling.
- Avoid route-level styling forks.

## UX acceptance criteria

- Default and legacy `embedded` usage render identically.
- Every state uses one compact neutral `40px` icon tile.
- No shared empty state renders the layered-card illustration, dashed frame, or
  orange icon treatment.
- Optional eyebrow, details, actions, and footer content retain their existing
  hierarchy and spacing.

## Validation plan

- Run focused shared-component and affected route tests.
- Run the UI package type, build, Changeset, and design checks.
- Run the repository validation entrypoint and record any failures caused by
  unrelated worktree changes.

## Validation log

- `npm test -- packages/ui/src/EmptyState.test.tsx src/features/targets/admin/McpServersInventory.test.tsx src/pages/WorkspaceApprovalsPage.test.ts --run`
  passed: 3 files and 5 tests.
- `npm run ui:typecheck`, `npm run ui:build`, `npm run changeset:check`,
  `npm run contracts:check`, `npm run test`, `npm run smoke:routes`, and
  `git diff --check` passed. The complete unit suite covered 168 files and 798
  tests.
- `npm run design:check` is blocked by unrelated edits to
  `src/styles.css` that removed three expected `shared-resource-card-grid`
  declarations.
- `npm run lint` is blocked by widespread unrelated shared-component typing
  errors in the current worktree. The independently run UI package typecheck
  passed.
- `npm run harness:check` is blocked because unrelated edits leave
  `src/App.tsx` at 602 lines against a 600-line budget.
- `npm run validate` completed `ui:check` and then stopped at the same unrelated
  `design:check` failure.
- `npm run design:snapshots` could not start its local Vite server inside the
  sandbox (`listen EPERM`). Two permission-review attempts timed out. The
  existing design catalog baseline was inspected and contains the target
  neutral-tile presentation, while the focused static-markup regression proves
  that default and legacy `embedded` calls render identically.

## Completion criteria

- The shared component, tests, design contract, package documentation, and
  Changeset all describe and enforce the unified presentation.
- Validation results and any residual visual-verification limitations are
  recorded before handoff.
