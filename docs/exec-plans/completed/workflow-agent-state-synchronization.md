# Workflow and agent state synchronization

## Goal

Ensure the Workflows and Agents pages always present current control-plane state,
persist operator edits, and discard workspace-scoped caches when their authority
changes.

## Constraints

- Preserve unsaved operator input while unrelated catalogs refresh.
- Rehydrate edit drafts from the latest selected workflow or agent when editing
  begins.
- Treat a successful empty API response as authoritative empty state; use
  fallbacks only when live data is unavailable.
- Never reuse workflow sessions, compiled access, version history, or edit state
  across workspace boundaries.
- Use existing workflow and agent API contracts without backend changes.
- Preserve unrelated changes in the existing dirty worktree.

## Acceptance criteria

- Workflow agent assignments open from the latest workflow definition.
- Capability or agent changes invalidate the cached workflow session before the
  next launch.
- Workflow tags persist through the workflow update API.
- Workflow option refreshes do not overwrite the next-run control message.
- Empty workflow, agent, and agent-capability responses render as empty.
- Edit Agent deep links hydrate after live agent data arrives without carrying a
  previous agent draft.
- Workspace changes clear every workspace-scoped workflow and agent cache.
- Agent deletion leaves the selected agent and URL in agreement.

## Validation log

- `git diff --check` passed.
- Synchronization-focused Vitest suite passed: 9 files, 87 tests.
- `VITE_APP_DATA_MODE=control-plane npm run lint` passed.
- `VITE_APP_DATA_MODE=control-plane npm run test` passed: 123 files, 770 tests.
- `VITE_APP_DATA_MODE=control-plane npm run design:snapshots` passed: 14 browser snapshots.
- `npm run membership:check` passed.
- `npm run contracts:check` passed.
- `VITE_APP_DATA_MODE=control-plane npm run build` passed with the existing
  main-chunk size advisory.
- `VITE_APP_DATA_MODE=control-plane npm run smoke:routes` passed outside the
  local-network-restricted sandbox.
- `npm run harness:check` confirms `WorkspaceWorkflowsPage.tsx` is within the
  file-size budget. The aggregate remains blocked by concurrent changes in
  `McpServersView.tsx` and `services/control-plane/types.ts`.
- `VITE_APP_DATA_MODE=control-plane npm run validate` remains blocked at its
  first `design:check` step by four concurrent catalog/MCP design-rule findings
  in `CatalogBrowserDialog.tsx`, `McpServersView.tsx`, and
  `WorkspaceMcpSettings.tsx`.
- The repeated source and lifecycle audit found no remaining deterministic
  synchronization gap in the Workflows and Agents page state transitions.

## Completion criteria

- All acceptance criteria have regression coverage.
- All checks scoped to this repair pass; aggregate failures are isolated to
  concurrent catalog-source work.
- The repeated audit finds no remaining deterministic synchronization gap in the
  Workflows and Agents page state transitions.
