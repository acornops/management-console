# Management Console Contracts

The management console is the browser client for the control-plane API. Keep this README as a compact integration brief; endpoint lists belong in the manifest and generated API docs.

## Source Of Truth

- Complete endpoint and schema detail lives in the generated public docs at `https://docs.acornops.dev`.
- Control-plane API coverage for this app lives in `docs/contracts/manifest.json`.
- `scripts/check-contracts.mjs` verifies that frontend service calls, mappers, manifest entries, and the invariants below stay aligned.
- This README captures only browser-client behavior that generated reference docs do not make obvious.

## Full Platform Matrix

| Platform Part | What The Console Depends On | Enforcement |
| --- | --- | --- |
| Control plane | Auth, workspace, membership, audit, AI settings, target, tooling, chat, run, and cluster APIs | Frontend services plus manifest checks |
| Docs website | Public API reference for exact endpoint parameters and schemas | Generated OpenAPI artifacts |
| AgentK | Cluster registration, agent-key rotation, snapshots, logs, tools, and chat-backed target actions | Control-plane contracts and UI mappers |
| LLM gateway | MCP server/tool settings exposed through control-plane target APIs | UI catalog and permission checks |
| Execution engine | Run event stream, approval, cancel, and chat result state | Run/chat service checks |

## Platform Dependency Summary

- The console should call the control plane through typed service modules, not by scattering raw fetch calls through UI components.
- Cookie-backed requests must use `credentials: include`.
- Paginated list responses use `{ items, nextCursor? }`.
- Cluster registration returns `{ cluster, agentKey, installInstructions }`.
- Agent-key rotation returns `{ clusterId, agentKey, keyVersion, installInstructions }`.
- Workspace payloads include `currentUserRole` and permissions from the control plane; the console must not fabricate current-user membership locally.
- The UI must not fabricate a member row when the control-plane member list is empty or unavailable.
- Role templates come from `GET /api/v1/workspaces/{workspaceId}/roles`; invite and member-role controls must use that catalog.

## Shared Invariants

- Workspace membership UI is gated by `permissions.manage_members`.
- Workspace audit-log UI is gated by `permissions.read_audit_log`.
- Audit-log detail preserves `operation`, `objectType`, and `object`.
- Target mutation UI is gated by `permissions.manage_targets`.
- Workspace AI settings UI is gated by `permissions.manage_ai_settings`.
- AI provider credential flows must never expect or display API key values.
- MCP catalog role/editability data comes from the control plane; the console must not hard-code editable role keys.
- Write-capable chat runs must request read-write tool access only when the current user and target both allow it.

## Control-Plane Boundary Notes

- The console depends on the control plane for auth state, current workspace role, permissions, and all server-side authorization decisions.
- Password signup does not imply workspace membership.
- Webhook, MCP, Target Insights, workspace audit, AI settings, and target mutation screens should treat denied mutations as normal permission outcomes.
- Run streams and run-event frames are control-plane contracts; UI code should map them in one place before rendering.

## Change Checklist

When changing a console API call, mapper, or screen contract:

1. Update the service module and mapper together.
2. Update `docs/contracts/manifest.json` if the consumed control-plane surface changed.
3. Keep this README focused on durable browser-client invariants only; do not paste endpoint lists here.
4. Run `npm run contracts:check`.
