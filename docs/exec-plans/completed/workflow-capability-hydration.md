# Workflow Capability Hydration

## Goal

Populate workflow capability edits from the latest saved workflow and show the
effective MCP servers, skills, and tools after workflow restrictions are
applied to selected-agent grants.

## Constraints

- Preserve the control-plane contract: an empty restriction inherits the
  selected agent's capabilities; a non-empty restriction narrows them.
- Do not change authorization, persistence, API schemas, or runtime access
  compilation.
- Preserve unrelated work on the current branch.

## Work

- [x] Rebuild the capability draft from the current API-backed workflow when editing starts.
- [x] Filter capability review values through each assigned step's restrictions.
- [x] Clarify inherited-versus-restricted picker copy.
- [x] Add regression coverage and run control-plane-mode validation.

## Validation Log

- `npx vitest run src/pages/workflows/workflowAgentCapabilities.test.ts src/pages/workflows/workflowScopeActions.test.ts src/pages/WorkspaceWorkflowsPage.runtime.test.ts src/pages/WorkspaceWorkflowsPage.test.ts`: passed, 49 tests.
- `VITE_APP_DATA_MODE=control-plane npm run validate`: passed, including design enforcement, TypeScript, 754 Vitest tests, 14 Playwright checks, membership, contracts, harness, production build, and route smoke checks.
- The production build retained the existing Rollup advisory for chunks larger than 500 kB.

## Completion Criteria

- Reopening capability editing shows the latest saved MCP server, skill, and
  tool restrictions.
- Capability review does not display grants removed by a workflow restriction.
- Empty restrictions are clearly described as inheritance, not zero access.
- Targeted tests and the repository validation entrypoint pass.

Completed July 15, 2026. No authorization, persistence, API schema, route, or
runtime access-compilation behavior changed.
