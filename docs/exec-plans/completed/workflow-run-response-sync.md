# Workflow run response synchronization

## Goal

Keep workflow run status and persisted assistant responses synchronized while a
run is active, and render saved Markdown with the console's established response
typography.

## Scope

- Poll workflow session summaries only while the selected workflow has an active
  run, stopping once every run is terminal.
- Hydrate persisted assistant output into the run discussion without discarding
  optimistic operator messages.
- Render run output and discussion messages through the shared Markdown renderer.
- Add focused regression coverage for hydration, message merging, polling wiring,
  and Markdown semantics.

## Validation

- `npm test -- --run src/pages/workflows/workflowRunSync.test.ts src/pages/workflows/WorkflowRunResponse.test.tsx src/pages/WorkspaceWorkflowsPage.test.ts src/pages/WorkspaceWorkflowsPage.runtime.test.ts` passed: 26 tests.
- `npm test -- --run` passed before unrelated concurrent worktree changes: 165 files, 961 tests.
- `npm run lint`, `npm run design:check`, `npm run contracts:check`, `npm run harness:check`, `npm run build`, and `npm run smoke:routes` passed.
- Isolated Playwright run for `tests/fixtures/workflow-run-responses.spec.ts` passed.
- `npm run validate` reached the full test phase, then stopped on seven unrelated discovery-filter and workload-filter assertions in files outside this plan's scope. Its design and lint phases passed.

## Boundaries

- No control-plane contract changes.
- No changes to execution, persistence, authorization, or workflow semantics.
- Preserve unrelated work already present in the management-console worktree.

## Outcome

- Selected workflows refresh server-backed session summaries every 2.5 seconds while any run is active, then stop polling once terminal state is observed.
- Persisted assistant responses hydrate into Run discussion without replacing optimistic operator instructions.
- Run summaries and discussion messages render through the shared GFM-capable Markdown renderer with a bounded reading measure.
