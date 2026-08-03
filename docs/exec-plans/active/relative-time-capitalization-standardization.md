# Relative-Time Capitalization Standardization

## Goal

Make relative-time capitalization predictable across the management console and
prevent feature-owned formatters or optimistic UI strings from drifting from the
shared convention.

## Capitalization Rules

- Standalone relative-time values use sentence case: `Just now`, `Now`,
  `1 minute ago`, and `5m ago`.
- Relative-time fragments embedded inside a larger sentence remain lowercase:
  `Updated just now` and `You started this chat just now`.
- Compact labels and metadata headings are authored in sentence case and become
  uppercase only through the `type-label` or `type-micro-label` typography role.
- Product headings, controls, statuses, and fallback values use sentence case.
  Proper nouns, initialisms, identifiers, and user-provided content retain their
  canonical casing.

## Constraints

- Preserve Chinese translations and all locale-specific word order.
- Do not apply a global text transform to dynamic values.
- Keep inline sentence fragments grammatically lowercase.
- Preserve unrelated local changes in the repository.
- Prefer shared formatting helpers over feature-owned capitalization fixes.

## Work Plan

1. Inventory production sources, translations, formatters, and tests containing
   relative-time copy or capitalization transforms.
2. Classify each result by semantic role: standalone value, sentence fragment,
   label, control, status, proper noun, or user content.
3. Normalize shared readable, compact, and resource-age formatters.
4. Align isolated production strings and their focused tests.
5. Add regression coverage that documents allowed lowercase sentence fragments
   and rejects lowercase standalone relative-time values.
6. Run focused tests, source audits, and the repository validation entrypoint.

## Completion Criteria

- Every standalone English `just now` or `now` value is sentence-cased.
- Lowercase `just now` remains only in verified sentence-fragment contexts.
- Relative-time formatter tests cover readable, compact, resource-age, overview,
  chat-sentence, and optimistic-workflow paths.
- A repository-level check prevents future casing drift in production sources.
- Targeted tests and `npm run validate` pass, or unrelated failures are isolated
  and documented.

## Validation Log

- `npm test -- --run src/utils/dateTime.test.ts src/utils/telemetry.test.ts src/services/control-plane/formatters.test.ts src/pages/virtual-machines/virtualMachineUi.test.ts src/styles.test.ts src/pages/workspace-overview/workspaceOverviewTime.test.ts`
  - Passed: 6 files, 53 tests.
- `npm run design:check`
  - Passed across 444 source files with the new relative-time capitalization rule.
- `npm run app:typecheck`
  - Passed before unrelated concurrent chat-history edits entered the worktree.
- `npm run ui:typecheck`
  - Passed.
- `npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/workspace-overview-audit.spec.ts tests/fixtures/cluster-overview-audit.spec.ts`
  - Passed: 15 browser tests.
- `git diff --check`
  - Passed.
- `npm run harness:check`
  - Passed after keeping the capitalization enforcement inside the existing
    design-system checker instead of expanding the line-budgeted style test.
- `npm run validate`
  - UI package checks, design-system checks, design-system adoption, and app
    typechecking passed on the final rerun.
  - The full Vitest run passed 934 of 937 tests. Three tests failed against
    concurrent chat-history work: the new `chat.chatCount` key was not yet in
    both locales, the new responsive grid header was not yet registered, and
    `ConversationHistory.test.tsx` still expected the replaced search marker.
    None of those files or failures belong to this capitalization change.
