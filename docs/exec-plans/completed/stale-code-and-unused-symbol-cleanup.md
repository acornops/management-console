# Stale Code and Unused Symbol Cleanup

## Goal

Remove production modules that are unreachable from the management-console
entrypoint, retire their tests and styling, repair stale repository metadata,
and make unused TypeScript symbols a validation failure.

## Scope and decisions

- Removed the superseded Agent capability administration implementation after
  confirming that the live Agent detail route uses `AgentCapabilityAdminView`.
- Removed five additional orphaned modules, their dead tests, and the unused
  pending-step animation and design-system exception.
- Preserved documented route redirects and the deprecated `EmptyState.embedded`
  prop because they remain intentional compatibility contracts.
- Removed the unreferenced initial-scaffold `metadata.json` file.
- Removed root dependency declarations already owned by `@acornops/ui` and
  regenerated the lockfile.
- Indexed every active execution plan and enabled `noUnusedLocals` and
  `noUnusedParameters` in the application TypeScript configuration.

## Validation

- `npm run app:typecheck`: passed with unused-symbol enforcement enabled.
- `npm run design:check`: passed across 439 source files.
- `npx vitest run src/destructiveDeleteFlow.test.ts src/applicationMotion.test.ts src/styles.test.ts`: 37 tests passed.
- `npm test`: 190 files and 918 tests passed.
- `npm run membership:check`: passed.
- `npm run contracts:check`: passed.
- `npm run build`: passed.
- `npm run bundle:check`: passed across 51 JavaScript chunks.
- `npm run smoke:routes`: passed.
- `npm run validate`: stopped at an unrelated semantic-callout design-adoption
  violation in `src/pages/WorkflowSettingsPanel.tsx`.
- `npm run harness:check`: the documentation checks passed, but the unrelated
  in-progress `src/pages/WorkspaceWorkflowsPage.components.tsx` remains 11 lines
  above the 650-line source budget.

## Residual risk

The aggregate validation gate remains blocked by the two unrelated in-progress
worktree findings recorded above. The cleanup itself passes typechecking, unit
tests, production build, bundle budget, route smoke, contract, membership, and
targeted design-system validation.
