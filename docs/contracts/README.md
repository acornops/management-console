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
| LLM gateway | MCP registries, Agent/target installations, discovered tools, and personal connections exposed through control-plane APIs | Registry browsing and permission checks |
| Execution engine | Run event stream, approval, cancel, and chat result state | Run/chat service checks |

## Platform Dependency Summary

- The console should call the control plane through typed service modules, not by scattering raw fetch calls through UI components.
- Cookie-backed requests must use `credentials: include`.
- Paginated list responses use `{ items, nextCursor? }`.
- The workspace approval inbox additionally exposes `pendingCount`, the total pending approvals across target-tool and workflow-gate sources before pagination and independently of the list filter. The console treats a missing or invalid count from an older producer as unavailable.
- Cluster registration returns `{ cluster, agentKey, installInstructions }`.
- Agent-key rotation returns `{ clusterId, agentKey, keyVersion, installInstructions }`.
- Workspace payloads include `currentUserRole` and permissions from the control plane; the console must not fabricate current-user membership locally.
- The UI must not fabricate a member row when the control-plane member list is empty or unavailable.
- Role templates come from `GET /api/v1/workspaces/{workspaceId}/roles`; invite and member-role controls must use that catalog.

## Shared Invariants

- Target-chat PDF reports are created only by the model-invoked platform
  function. The console keeps Copy as a response action and renders successful
  report metadata as a persistent authenticated download card; it does not
  expose a separate response-export API action.
- Workspace membership UI is gated by `permissions.manage_members`.
- Workspace audit-log UI is gated by `permissions.read_audit_log`.
- Audit-log detail preserves `operation`, `objectType`, and `object`.
- Target mutation UI is gated by `permissions.manage_targets`.
- Workspace AI settings UI is gated by `permissions.manage_ai_settings`.
- AI provider credential flows must never expect or display API key values.
- MCP registry role, policy, and editability data comes from the control plane; the console must not hard-code editable role keys or workspace-management availability.
- Workspace MCP credentials are write-only; responses expose only whether a credential is configured. Workflows inherit MCP servers and tools from selected agents unless a narrower restriction is saved.
- Workflow create always sends `restrictionMode`: `inherit` by default after
  Agent selection, or `restrict` for an explicit subset that may intentionally
  be empty. Review surfaces distinguish the policy from effective capabilities.
- Capability review renders semantic capabilities, direct MCP servers,
  installed skills, and direct tools as distinct sources. Launch uses the
  workflow capability-preview endpoint to resolve exact target tools, remains
  blocked while that preview is loading, stale, failed, or blocked, and keeps
  unsupported targets visible with a keyboard-readable reason. The run
  response `compiledAccessScope`, rather than the session ceiling or preview,
  becomes the displayed authority after dispatch.
- Agent **Capabilities → Tools** lists AcornOps native tools separately from
  MCP-discovered tools. Native grant and revoke require `manage_agents` only,
  and Workflow traces expose authenticated PDF downloads.
- Completed target-chat assistant turns expose a contextual **Generate PDF**
  action. The browser submits the run ID (and optional title), never replacement
  report content; the control plane exports the persisted assistant response
  and returns an authenticated same-origin artifact URL.
- Cluster Tools labels every built-in tool as provided by AcornOps. Tool origin
  controls configurability: platform-native target-chat tools do not offer
  configuration actions. The built-in MCP server uses the same provenance
  label; external MCP servers continue to show their endpoint and catalog
  provenance. System-provided Agents use the same label in their catalog and
  definition header, while custom Agents retain their actual owner attribution.
  Installed Workflows do not use provider badges; the template catalog attributes
  its templates to AcornOps instead. MCP tools and Skills remain in their dedicated inventories.
- Desktop and mobile workspace navigation do not expose a standalone Catalog item. Agent and target MCP surfaces provide one **Add MCP server** action with **Browse registries** and **Connect by URL** choices.
- The route-backed **Browse MCP servers** page stores search, source, compatibility, selected artifact, and Agent/target destination in URL state. A destination-bound visit keeps that destination fixed and links back to it; legacy destination-less `/catalog` links require an explicit destination before installation.
- Only specialist Agents are installation destinations; AcornOps Manager is never an installation destination.
- Registry installs and re-imports target either a workspace specialist Agent or a Cluster/VM default Agent. The browser never supplies an authoritative target type.
- **MCP registries** settings provide add, probe, edit, enable/disable, synchronize, and delete controls when allowed by `manage_catalog_sources` and deployment policy. Deployment-managed registries are configuration-read-only but remain synchronizable. The console sends no connector route and treats omitted authentication during edits as credential preservation.
- Catalog provenance and installation revision determine Install, Installed, and explicit Update states. MCP tools are reviewed after discovery and are not installed independently.
- Personal MCP authentication is PAT-only in V1. Each target or Agent installation has an independent user connection, credentials remain write-only, and workflows reuse the selected Agent's connection. The console never persists PATs in browser storage.
- The console does not expose a built-in repository-review Agent, workflow, provider profile, or template setup branch. Workspace managers create a specialist Agent, attach and review any compatible MCP server from the Agent's generic MCP page, and then create a workflow selecting that Agent. Credential values remain write-only and never enter preview state or browser storage.
- Manual workflow creation sends only operator-controlled fields. Mode, context grants, permissions, approvals, execution duration, and report retention are omitted so the control plane applies deployment-owned defaults. Creation fails closed until the authoritative workflow-options catalog has loaded; fallback catalogs contain no output, approval, runtime, or retention choices.
- AI behavior drafts remain empty until workspace AI settings arrive, so the console does not invent a provider or model. An omitted production control-plane API base uses same-origin requests; local development retains the localhost fallback.
- A blocked workflow capability preview opens the generic personal-credential dialog from `serverId`, `authType`, `owningAgent`, and `action`; it writes the credential to that owning Agent and retries the preview. The workflow UI never infers authentication from a provider name or profile identity.
- Run-readiness recovery parses the bounded `readinessFailures` contract at the
  API client boundary and accepts legacy `readinessErrors` defensively. Recovery
  links carry only `mcpServer` and `mcpAction`, focus the exact installation and
  Connect or Verify control, and never invoke a mutation automatically. Target
  failures describe the bounded, Markdown-escaped Kubernetes or VM tool name
  instead of implying that another MCP installation is required.
- Successful Connect and Verify operations remain successful if the subsequent
  installation/tool refresh fails. The console reports that catalog load
  failure separately and offers a retry. Authenticated manual installations
  enter PAT connection before pending-tool review; unauthenticated installations
  retain direct discovery and review.
- Kubernetes clusters and VMs retain target-scoped MCP servers, skills, and tools for their generic target agents. These target capabilities are administered on the target and are not reassigned to workspace agents.
- Workflow schedule create and update requests contain only the current user principal. Service identities remain available for non-schedule platform uses but are not presented in schedule UI.
- The console consumes versioned automation-template metadata and exposes explicit idempotent install and activation actions. The Workflow Library lists only definitions installed in the workspace. Automatic templates are provisioned active; opt-in Target remediation and Incident investigation remain in the template catalog until installation, then stay paused until setup is complete and the user activates them.
- Workflow authoring sends only a unique, non-empty `agentIds` set. One selected
  Agent is labeled `Direct`; multiple selected Agents are labeled
  `AcornOps-coordinated`. The console treats every selected Agent as a peer and
  never sends or renders entry-Agent, delegation-policy, Manager, coordinator
  identity, selection-order, or client-derived routing fields.
- Coordinated run detail renders the sanitized `AcornOps coordination` parent
  and bounded child capability, target, Agent, status, and failure fields. It
  does not infer coordinator records or display hidden execution scope.
- Visible template-origin Agents and workflows are system provided. The console permits availability changes, supported external-binding configuration, duplication, and deletion; definition edits and version restore require duplication into a manual draft. Agent deletion explains dependent workflows before it can proceed.
- Authorized users may duplicate an effective definition into a manual draft without copying capability installations or operational history.
- Write-capable chat runs must request read-write tool access only when the current user and target both allow it.
- The target-chat `/` picker sends structured tool runtime aliases and target
  skill IDs separately from prompt text. It never repurposes `@` prompt
  references, and stale references remain visible when the control plane
  rejects them.
- Established chats restore provider, model, and reasoning effort from the
  control plane's latest accepted run snapshot; workspace AI settings seed
  chats that do not yet have a run.

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
