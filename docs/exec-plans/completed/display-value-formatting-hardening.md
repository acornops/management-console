# Display Value Formatting Hardening

## Goal

Preserve API-provided display names exactly while making machine identifiers
readable and acronym-safe everywhere the Management Console presents them as
human-facing fallback text.

## Scope

- Workflow capability previews, including MCP server and skill names
- Shared identifier-to-label formatting for statuses, capability keys, event
  names, fallback resource names, and trace metadata
- Focused unit and rendering coverage for brand names, acronyms, camel case,
  snake case, kebab case, whitespace, and empty input

## Constraints

- Preserve unrelated in-progress work in the dirty worktree.
- Do not alter control-plane contracts or stored values.
- Do not humanize user-authored or API-provided display names.
- Keep technical tool identifiers in their existing monospace presentation.

## Acceptance Criteria

- `AcornOps Targets` and other MCP or skill display names render verbatim.
- Identifier fallback formatting has no leading whitespace, preserves common
  technical acronyms, and handles camel, snake, and kebab case consistently.
- Ad hoc user-facing underscore replacement is replaced by the shared helper
  in the audited production call sites.
- Focused tests pass; the repository validation entrypoint is run and any
  unrelated failure is resolved or documented with exact evidence.

## Plan

1. Inventory formatting helpers and classify display names versus identifiers.
2. Add one acronym-safe identifier formatter and migrate production call sites.
3. Add regression coverage for the shared formatter and workflow dialog.
4. Run focused and repository validation, then record the results.

## Validation Log

- `npm test -- --run src/utils/textFormatting.test.ts src/pages/WorkspaceWorkflowsPage.panels.test.tsx src/features/webhooks/webhookModel.test.ts src/features/targets/chat/hooks/chatRunTrace.test.ts src/features/targets/chat/lib/trace-utils.test.ts src/features/targets/chat/components/ApprovalCheckpoint.patch-resource.test.ts src/pages/workspace-members/RoleTemplatePreview.test.ts src/pages/workflows/workflowAgentCapabilities.test.ts`
  - Passed: 8 files, 52 tests.
- `npm run app:typecheck`
  - Passed.
- `FIXTURE_REUSE_SERVER=1 npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/workflow-ux.spec.ts --grep "workflow launch uses the saved prompt"`
  - Passed: 1 focused workflow-launch browser test.
- `npm run design:adoption`
  - Passed with zero violations after replacing the branch's remaining raw
    `text-xs` workflow-policy label with the semantic caption role.
- `npm run validate`
  - Reached the full unit suite, where 894 of 895 tests passed.
  - The gate stopped on the pre-existing
    `TraceFooter.polish.test.ts` source-string assertion. The test expects
    `onScroll={handleTimelineScroll}`, while the checked-in component uses the
    intentional conditional handler
    `onScroll={timelineLayout === 'contained' ? handleTimelineScroll : undefined}`.
    Neither file is changed by this work.
- `npm run membership:check`, `npm run contracts:check`, and
  `npm run harness:check`
  - Passed.
- `npm run build`
  - Passed.
- `npm run bundle:check`
  - Passed across 49 JavaScript chunks; largest chunk is 312,686 bytes.
- `npm run smoke:routes`
  - Passed.
- `git diff --check`
  - Passed.

## Documentation Impact

- Added this execution record. No product, operator, or contract documentation
  changed because the behavior is an internal presentation correction.

## Residual Risk

- No known formatting risk remains in the audited display-name and identifier
  paths.
- The complete repository validation command remains red until the unrelated
  TraceFooter source-inspection expectation is reconciled with its component.
- Full visual snapshot and repeated fixture suites were skipped because this is
  a localized text-rendering change; the affected workflow dialog received a
  focused browser check.

Status: complete.
