# Route Shell Standardization

## Goal

Ensure every authenticated route and full-page embedded feature surface inherits
responsive route spacing from the shared `PageShell` and prevent route-entrypoint
or spacing-copy gaps from recurring.

## Constraints

- Preserve the rendered mobile, `sm`, and `lg` route spacing.
- Use the default full-width shell for every authenticated route.
- Preserve full-height workbench scrolling and existing documented exceptions.
- Keep unauthenticated surfaces outside the inventory and document centered
  authenticated task-surface exceptions.
- Avoid page-local copies of canonical route padding and scrolling classes.

## UX Acceptance Criteria

- Authenticated pages retain `16px / 24px`, `24px / 24px`, and `40px / 32px`
  responsive route padding.
- Authenticated routes use the same default full-width shell; narrower task
  content is constrained inside that shell.
- Cluster settings, target tools, target skills, and target MCP server views use
  the shared route shell without changing their content hierarchy.
- Centered invitation and not-found task surfaces retain their focused
  composition inside the shared route shell.
- Every page lazily loaded by `AppPageContent` is covered by the authenticated
  route inventory.
- New manual copies of the route shell fail the design-system check anywhere
  under `src`.

## Validation Log

- `npm run design:check` passed across 379 source files.
- `npm run lint` passed.
- `npx vitest run src/styles.test.ts src/surfaceBehaviorContracts.test.ts
  src/components/common/DesignSystemPrimitives.test.ts` passed 50 tests.
- `npm run test` passed 691 tests across 131 files before the final
  import-only line-budget cleanup. A later concurrent rerun passed 672 tests
  before five Vitest workers timed out during startup; those five unchanged
  files completed successfully with one worker.
- `npm run design:snapshots` passed 19 tests with one intentional skip.
- `npm run smoke:mcp-parity` passed 21 tests.
- `npm run membership:check`, `npm run contracts:check`,
  `npm run harness:check`, `npm run build`, and `npm run smoke:routes` passed.
- `npm run validate` passed its UI package, design, lint, unit, and snapshot
  stages, then stopped because a pre-existing Vite process occupied fixture
  port `4186`.
- The fixture suite was rerun on isolated port `4286`. Four timing-sensitive
  scenarios failed under concurrency and all eight selected cases passed with
  one worker. A later full serial repetition encountered a different
  navigation timeout in an unchanged cluster resource fixture after eight
  passes, so the remaining repetitions were stopped as fixture-suite
  instability rather than a route-shell regression.

## Completion Criteria

- Targeted design-system, type/style, and unit checks pass.
- All non-fixture repository validation stages pass; fixture-suite instability
  is recorded with serial rerun evidence.
- The final diff contains no hand-copied canonical route shell classes.
