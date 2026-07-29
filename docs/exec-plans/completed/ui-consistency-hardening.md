# Management Console UI Consistency Hardening

## Goal

Remove repository-wide typography and action-casing drift from production
Management Console screens, align every affected surface with the documented
semantic type and control roles, and make the design-system check reject future
regressions.

## Scope

- `packages/ui` semantic typography and control primitives
- Production UI under `src/app`, `src/components`, `src/features`, and
  `src/pages`
- Design-system enforcement, focused tests, and durable design documentation
- Existing light, dark, desktop, mobile, and control-plane-backed behavior

## Constraints

- Preserve the in-progress `@acornops/ui` extraction and all unrelated user
  changes in the worktree.
- Preserve application behavior, routes, contracts, translations, accessible
  names, keyboard behavior, and responsive structure.
- Use established semantic roles instead of introducing screen-local type
  stacks.
- Keep action text in sentence case. Reserve uppercase roles for compact labels,
  table headers, badges, and metadata.
- Keep AcornOps wordmark and intentional login illustration typography scoped
  as brand content rather than product-control precedent.

## Acceptance Criteria

- Same-level route and section headings use the same semantic role across
  embedded and standalone screens.
- Shared and raw action controls do not use `type-label`,
  `type-micro-label`, `uppercase`, wide tracking, or ad hoc bold control text.
- Discouraged ad hoc product typography is migrated to documented semantic
  roles, with any necessary non-product exception documented and enforced.
- `npm run design:check` rejects semantic typography misuse and passes the
  migrated production tree.
- Focused unit tests cover the enforcement rules and the Settings/Members
  regression.
- `VITE_APP_DATA_MODE=control-plane npm run validate` passes, including visual
  catalog snapshots, or any environment-only blocker is recorded with exact
  evidence.

## Validation Log

- `npm run design:check`
  - Passed across 379 source files.
  - The check now rejects ad hoc bold/extrabold headings, raw uppercase and
    wide-tracking utilities, micro-size literals, non-semantic headings, and
    label-style typography on action controls.
- `npm test -- --run src/styles.test.ts src/components/common/DesignSystemPrimitives.test.ts packages/ui/src/PublicApi.test.ts packages/ui/src/DangerZone.test.tsx`
  - Passed: 4 files, 40 tests.
- `npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/target-catalog-accessibility.spec.ts --grep "Virtual machine catalog" --repeat-each=10 --workers=2`
  - Passed: 10 repeated keyboard-focus scenarios.
  - This verifies the stable callback/ref fix that prevents live catalog
    refreshes from stealing menu focus.
- `VITE_APP_DATA_MODE=control-plane npm run validate`
  - Passed in full on the final source.
  - UI changeset, typecheck, build, exports, and pack checks passed.
  - Unit tests: 131 files, 690 tests passed.
  - Design-system browser suite: 19 passed; 1 intentional desktop-only
    conditional was skipped on mobile.
  - Fixture smoke: 171 passed across three repetitions.
  - MCP parity: 21 passed across three repetitions.
  - Workspace membership, contracts, and harness checks passed.
  - Production build and route smoke passed. The build retains the existing
    Rollup advisory for the main chunk exceeding 500 kB.
- `git diff --check`
  - Passed.
- `./scripts/workspace/status.mjs`
  - Passed; only `management-console` contains the scoped dirty worktree.

## Documentation Impact

- Updated `DESIGN.md` and `docs/design-docs/typography.md` with the canonical
  inline-emphasis and wordmark roles and explicit control-casing rules.
- Added a Changesets patch note for the shared `@acornops/ui` typography
  contract.
- Refreshed the four Linux design-catalog baselines after visual inspection of
  the intentional semantic typography changes.

## Residual Risk

- No known UI-consistency debt remains in the scoped typography/action-casing
  rules.
- The validation build reports the repository's existing main-chunk size
  advisory; this change did not introduce or attempt to resolve that separate
  performance concern.
- No commands were skipped. The visual suite's one skipped case is an
  intentional mobile skip for a desktop account-navigation logout scenario.

## Completion Criteria

- All locally verifiable acceptance criteria pass.
- No new UI consistency item remains open in the tech-debt tracker.
- The completed plan records exact validation commands, outcomes, docs impact,
  and residual risk.

Status: complete.
