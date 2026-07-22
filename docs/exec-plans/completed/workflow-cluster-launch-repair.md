# Workflow Cluster Launch Repair

## Goal

Allow Kubernetes-targeted workflows to launch with the target selected by an
`@cluster[...]` prompt reference, and keep temporary client-side run records
away from control-plane run-history endpoints.

## Target Boundary

| Concept | Shared target model? | Kubernetes-specific? | VM-specific? | Notes |
| --- | --- | --- | --- | --- |
| Workflow input payload | Yes | `cluster` input type | Not changed | Preserve the existing `inputs.<name>` contract. |
| Prompt reference | No | `@cluster[...]` | Not changed | Resolves one online Kubernetes target. |
| Run history identity | Yes | No | No | Only server-issued run IDs may reach run-history endpoints. |

## Constraints

- Do not change the control-plane API or workflow schema.
- Preserve the existing Kubernetes workflow and prompt-reference behavior.
- Keep failed local launch attempts visible without treating them as persisted runs.
- Preserve unrelated uncommitted work.

## Work

- [x] Include the resolved cluster ID in the workflow's named `inputs` field.
- [x] Detect cluster targeting from the workflow input definition, not its category label.
- [x] Prevent optimistic local run IDs from reaching approvals, events, or cancellation APIs.
- [x] Add regression coverage and run management-console validation.

## Validation Log

- `npx vitest run src/pages/WorkspaceWorkflowsPage.launchFields.test.ts src/pages/WorkspaceWorkflowsPage.test.ts`: passed, 46 tests.
- `VITE_APP_DATA_MODE=control-plane npm run validate`: passed, including design enforcement, TypeScript, 750 Vitest tests, 14 Playwright checks, membership, contracts, harness, production build, and route smoke checks.
- The production build retained the existing Rollup advisory for chunks larger than 500 kB.

## Completion Criteria

- A cluster workflow produces both `inputs.targetId` and the existing top-level
  target identity from one exact prompt reference.
- Temporary `local-workflow-run-*` records remain UI-only.
- Targeted tests and the repository validation entrypoint pass.

Completed July 14, 2026. No public HTTP API, schema, authorization, persistence,
or route contract changed.
