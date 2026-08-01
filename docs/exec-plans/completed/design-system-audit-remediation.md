# Design-System Audit Remediation

## Goal

Resolve the three Management Console design-system inconsistencies identified
in the 2026-08-01 audit: resource-card contract drift, compact DateTimePicker
targets, and locale-independent calendar week structure.

## Constraints

- Keep the current capacity-based resource-card grid behavior.
- Preserve the DateTimePicker value format and route-owned filter state.
- Preserve shared light, dark, focus, and keyboard treatments.
- Do not change control-plane or cross-repository contracts.
- Leave unrelated `.audit/` artifacts untouched.

## UX Acceptance Criteria

- Design documentation, enforcement, CSS, and focused tests describe one
  capacity-based resource-card grid with a `30rem` preferred minimum, full
  track fill, and no fixed card maximum.
- DateTimePicker navigation and time controls retain the shared `44px` compact
  viewport height and may reduce to `36px` only from `sm` upward.
- Calendar columns, weekday labels, and Home/End movement use the locale's
  first day of the week, with a safe Sunday fallback when week data is
  unavailable.
- Sunday-first and Monday-first locale behavior has focused regression tests.

## Validation Log

- Passed focused regression coverage: `npx vitest run
  packages/ui/src/DateTimePicker.test.ts src/resourceCardGrid.test.ts` (10
  tests).
- Passed `npm run design:check`, `npm run design:adoption`, `npm run ui:check`,
  `npm run lint`, `npm run test` (812 tests), `npm run membership:check`,
  `npm run contracts:check`, `npm run build`, and `npm run smoke:routes`.
- The affected workspace-audit-log route snapshots passed all five visual
  profiles. A focused rerun of the one initial screenshot timeout also passed.
- Full-repository validation remains red on concurrent, out-of-scope work:
  `npm run harness:check` reports the concurrently edited `src/styles.test.ts`
  above its line budget; `npm run bundle:check` reports the existing main
  bundle above budget; route snapshots fail around concurrently edited agent,
  skills, chat, cluster, VM, and account-settings screens; MCP parity and
  fixture smoke runs were interrupted after concurrent removal of
  `packages/ui/dist` caused missing-module failures.

## Completion Criteria

- Focused resource-card and DateTimePicker tests pass.
- `npm run design:check`, `npm run design:adoption`, and `npm run ui:check`
  pass.
- Repository validation is run and any unrelated failure is recorded with its
  exact command and root cause.

Implementation is complete. The remaining repository-wide failures do not
touch this plan's files or acceptance criteria and are recorded above for the
owner of the concurrent changes.
