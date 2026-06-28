# Management Console Contracts

This repo has one direct runtime dependency: the control plane. The management console must not call execution-engine, llm-gateway, or k8s-agent directly.
Machine-readable contract data for this repo lives in `docs/contracts/manifest.json` and is checked alongside this document.

## Full Platform Matrix

- Management console -> control plane
- Control plane <-> execution-engine
- Control plane <-> llm-gateway
- Control plane <-> k8s-agent
- Execution-engine -> llm-gateway

## Platform Dependency Summary

| This repo depends on | Why |
| --- | --- |
| Control plane | Browser auth/session flow, workspace and target data, Kubernetes cluster data, VM data, target tool settings, MCP server management, workspace agents, workflows, chat sessions, runs, and run event streaming |

## Shared Invariants

- Treat `workspaceId`, `targetId`, `clusterId`, `vmId`, `sessionId`, `runId`, and `messageId` as opaque identifiers from the control plane. Do not mint replacements. Kubernetes cluster IDs and VM IDs are backing target IDs for their domain APIs.
- Runtime auth is cookie-based. All control-plane fetches must use `credentials: include`.
- The management console is a control-plane client only. Any direct dependency on execution-engine or llm-gateway is a contract violation.
- If the UI changes what it needs from the control-plane API, update this document and the mirrored control-plane contract doc together.

## Control-Plane Contract

### Auth and session flow

The management console depends on:

- `GET /api/v1/auth/oidc/login?return_to=<management-console-url>`
- `GET /api/v1/auth/oidc/callback`
- `GET /api/v1/auth/config`
- `GET /api/v1/auth/csrf`
- `POST /api/v1/auth/password/login`
- `POST /api/v1/auth/password/signup`
- `POST /api/v1/auth/password/verify-email`
- `POST /api/v1/auth/password/resend-verification`
- `POST /api/v1/auth/password/forgot`
- `POST /api/v1/auth/password/reset`
- `POST /api/v1/auth/password/change`
- `POST /api/v1/auth/oidc/link/start`
- `POST /api/v1/auth/external-integrations/link/preview`
- `POST /api/v1/auth/external-integrations/link/complete`
- `GET /api/v1/auth/methods`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`

Development-only shortcut outside production:

- `POST /api/v1/auth/dev-login`

The browser session cookie is the auth token for subsequent API traffic. Mutating requests with a session cookie also send the CSRF token from `GET /api/v1/auth/csrf` in the `x-csrf-token` header.
External integration account-link URLs land on the console route `/integrations/external/link?token=<external-integration-link-token>`. Without a browser session, the console shows the normal login page and preserves the token for password or OIDC sign-in. After either login method establishes a session, the console previews safe pending-link metadata through `POST /api/v1/auth/external-integrations/link/preview`, shows the integration client, provider, external account, and signed-in AcornOps user, then completes the durable link through `POST /api/v1/auth/external-integrations/link/complete` only after the user clicks approve.
`GET /api/v1/me` includes `quota.workspaceMemberships.{used,limit}`, which the console renders in User Settings only.
`GET /api/v1/auth/config` includes `passwordEmailVerificationRequired` and `passwordResetEnabled`. When password signup returns `verification_required`, the console shows a pending verification state and does not bootstrap a user session. If signup returns `EMAIL_DELIVERY_FAILED`, the console treats the account as pending verification, explains that the email was not sent, and offers resend. `EMAIL_VERIFICATION_REQUIRED` from password login or invite acceptance shows the same pending flow. Verification links call `POST /api/v1/auth/password/verify-email`; expired or invalid tokens offer `POST /api/v1/auth/password/resend-verification` with enumeration-safe copy. Forgot password is shown only when password auth and reset are enabled, calls `POST /api/v1/auth/password/forgot`, and always renders generic check-email copy. Reset links call `POST /api/v1/auth/password/reset`; success shows a sign-in action without auto-login, while invalid or expired tokens offer a new reset email request.

### Workspace, target, and cluster data

The management console consumes:

- `GET /api/v1/workspaces`
- `POST /api/v1/workspaces`
- `GET /api/v1/workspaces/{workspaceId}`
- `DELETE /api/v1/workspaces/{workspaceId}`
- `GET /api/v1/workspaces/{workspaceId}/members`
- `GET /api/v1/workspaces/{workspaceId}/audit-log`
- `GET /api/v1/workspaces/{workspaceId}/invitations`
- `POST /api/v1/workspaces/{workspaceId}/invitations`
- `DELETE /api/v1/workspaces/{workspaceId}/invitations/{invitationId}`
- `GET /api/v1/workspace-invitations/{token}`
- `POST /api/v1/workspace-invitations/{token}/accept`
- `POST /api/v1/workspaces/{workspaceId}/members`
- `PATCH /api/v1/workspaces/{workspaceId}/members/{userId}`
- `DELETE /api/v1/workspaces/{workspaceId}/members/{userId}`
- `GET /api/v1/workspaces/{workspaceId}/targets`
- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}`
- `GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters`
- `GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}`
- `GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/metrics/history`
- `GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/metrics/history`
- `POST /api/v1/workspaces/{workspaceId}/kubernetes-clusters`
- `PATCH /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}`
- `DELETE /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}`
- `POST /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/rotate-agent-key`
- `GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/pods/{namespace}/{podName}/logs`
- `GET /api/v1/workspaces/{workspaceId}/virtual-machines`
- `POST /api/v1/workspaces/{workspaceId}/virtual-machines`
- `GET /api/v1/workspaces/{workspaceId}/virtual-machines/{vmId}`
- `PATCH /api/v1/workspaces/{workspaceId}/virtual-machines/{vmId}`
- `DELETE /api/v1/workspaces/{workspaceId}/virtual-machines/{vmId}`
- `POST /api/v1/workspaces/{workspaceId}/virtual-machines/{vmId}/rotate-agent-key`
- `GET /api/v1/workspaces/{workspaceId}/virtual-machines/{vmId}/resources`
- `GET /api/v1/workspaces/{workspaceId}/virtual-machines/{vmId}/metrics/history`
- `GET /api/v1/workspaces/{workspaceId}/virtual-machines/{vmId}/logs`

`GET /api/v1/workspaces/{workspaceId}/targets` accepts optional `q`, `limit`, `cursor`, and `targetType` query parameters. `targetType` must be `kubernetes` or `virtual_machine`; invalid values return `400 VALIDATION_ERROR` instead of widening the query.

Workspace responses expose server-owned authorization fields:

- `currentUserRole`
- `permissions.read_workspace_data`
- `permissions.read_members`
- `permissions.read_audit_log`
- `permissions.delete_workspace`
- `permissions.manage_members`
- `permissions.manage_targets`
- `permissions.manage_mcp`
- `permissions.manage_tools`
- `permissions.manage_workflows`
- `permissions.manage_agents`
- `permissions.manage_ai_settings`
- `permissions.manage_agent_keys`
- `permissions.manage_webhooks`
- `permissions.create_sessions`
- `permissions.create_read_only_runs`
- `permissions.create_read_write_runs`
- `permissions.read_target_logs`
- `plan.{key,name}` where the only active key is currently `default`
- `quota.members.{used,limit}`
- `quota.kubernetesClusters.{used,limit}`
- `quota.virtualMachines.{used,limit}`

The console treats `permissions.read_workspace_data` as the gate for operational workspace surfaces. Auditor summaries may include member context but must not drive cluster telemetry or operational navigation; `clusterCount` and operational quota usage are redacted to `0`. Member counts and `quota.members.used` require `permissions.read_members`. Workspace quota rows are rendered in Workspace Settings only.

The management console keeps Kubernetes-specific lifecycle, install, inventory, namespace, and pod-log flows on the cluster APIs. The Virtual Machines page uses the VM APIs for Linux/systemd registration, inventory, durable issues, metrics, logs, MCP Servers, read-only chat, and VM Settings.

### Workspace agents and workflows

The management console depends on:

- `GET /api/v1/workspaces/{workspaceId}/agents`
- `POST /api/v1/workspaces/{workspaceId}/agents`
- `GET /api/v1/agents/{agentId}?workspaceId={workspaceId}`
- `PATCH /api/v1/agents/{agentId}`
- `POST /api/v1/agents/{agentId}/versions`
- `POST /api/v1/agents/{agentId}/test`
- `GET /api/v1/agents/{agentId}/activity`
- `POST /api/v1/agents/{agentId}/triggers`
- `PATCH /api/v1/agents/{agentId}/triggers/{triggerId}`
- `DELETE /api/v1/agents/{agentId}/triggers/{triggerId}`

Agent definitions include `id`, `workspaceId`, `name`, `description?`,
`instructions`, `status`, `source`, `version`, `ownerUserId`, `mcpServers[]`,
`tools[]`, `skills[]`, `contextGrants[]`, `targetScope`, `approvalPolicy`,
`trustPolicy`, `triggers[]`, and `activity`. Agent create/update/test/version
and trigger mutations require `permissions.manage_agents`; list and detail views
require workspace data read access. Workflow steps may include
`assignedAgentIds[]`; the UI treats workflow capability edits as narrowing gates
over assigned agents, not independent permission grants.

The AI Settings page consumes `GET /api/v1/workspaces/{workspaceId}/ai-settings` to render AI assistant defaults, deployment allow-lists, and per-provider configured status for users with workspace data access. New and unset workspace AI settings default `reasoningSummaryMode` to `auto` when deployment policy allows reasoning summaries; admins can still set `off`. Users with `permissions.manage_ai_settings` may call `PATCH /api/v1/workspaces/{workspaceId}/ai-settings` to update the default provider/model, `PUT /api/v1/workspaces/{workspaceId}/ai-provider-credentials/{provider}` with write-only `{apiKey}` to add or rotate a provider credential, and `DELETE /api/v1/workspaces/{workspaceId}/ai-provider-credentials/{provider}` to remove one. The console must never expect or display API key values, ciphertexts, or internal secret names; it only displays configured/not-configured status.

The Members page consumes authoritative membership from `GET /api/v1/workspaces/{workspaceId}/members`. Member rows include:

- `userId`
- `email`
- `displayName`
- `role`
- `roleTemplate?`
- `source`

The UI must not fabricate a member row for the current user when the member list is empty or unavailable.

The Members page also consumes `GET /api/v1/workspaces/{workspaceId}/roles`. That endpoint returns the deployment-supported, read-only role template catalog with `key`, `displayName`, `description`, `kind`, `capabilities`, `protected`, and `sortOrder`. Member role filters, member role edits, and invite role selection must use this catalog. The UI shows a read-only supported roles table and must not expose role toggles or role mutation controls.

Owners can manage all member roles. Other roles with `permissions.manage_members` can directly assign, update, or remove non-protected members. Protected roles require an owner and return `PROTECTED_ROLE_REQUIRES_OWNER` when a non-owner assigns or modifies them. Unsupported role keys return `ROLE_NOT_SUPPORTED`.

Invite links are created through `POST /api/v1/workspaces/{workspaceId}/invitations`. The management console displays the raw token as a copyable `/invites/{token}` link once, lists invitation metadata through `GET /api/v1/workspaces/{workspaceId}/invitations`, and revokes pending invitations through `DELETE /api/v1/workspaces/{workspaceId}/invitations/{invitationId}`. Accepting the link calls `POST /api/v1/workspace-invitations/{token}/accept` after the recipient is signed in with the invited email.

`GET /api/v1/workspaces/{workspaceId}/audit-log` is cursor-paged and requires `permissions.read_audit_log`. It accepts optional `category`, `eventType`, `actorUserId`, `objectType`, `from`, and `to` filters and returns audit events with `id`, `workspaceId`, `category`, `eventType`, `operation`, `actor`, `object`, `summary`, `metadata`, and `occurredAt`. `operation` is `read` or `write` and is displayed in audit event details. Invalid `category`, blank string filters, invalid date filters, or inverted date ranges return `VALIDATION_ERROR` instead of widening the result set, and audit metadata is sanitized before persistence. Tool call audit events record tool identity, source, deployment target, duration, run id when available, and success/failure only. The `auditor` role can read audit logs and members only, not operational workspace data.

Kubernetes cluster registration response must remain:

- `{ cluster, agentKey, installInstructions }`

Kubernetes cluster records include `writeConfirmationPolicy.{effectiveRequired,overrideRequired,source}`. The management console may send `writeConfirmationRequiredOverride: true | false | null` in the cluster patch body when a user with `manage_targets` changes the cluster write-confirmation policy.

Agent-key rotation response must remain:

- `{ clusterId, agentKey, keyVersion, installInstructions }`

Virtual machine registration response must remain:

- `{ virtualMachine, agentKey, installInstructions }`

Virtual machine agent-key rotation response must remain:

- `{ vmId, agentKey, keyVersion, installInstructions }`

Virtual machine records include `hostname`, `osFamily`, `serviceManager`, `allowedLogSources`, `status`, and install instructions owned by the control plane. The management console displays generated systemd install instructions as returned and does not hardcode service file content.
Virtual machine detail responses include `virtualMachine.latestSnapshot.{targetId,workspaceId,timestamp}` and `virtualMachine.summary.{inventoryCount,findingCount,criticalFindingCount,serviceCount,processCount,listenerCount,logCount}`. They must not return full raw VM snapshot payloads to the browser.

Pod logs are fetched lazily from `GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/pods/{namespace}/{podName}/logs`. The workload drawer must treat follow mode as opt-in polling and stop polling when the drawer is closed or the logs tab is left.

`installInstructions.command` is owned by the control plane. The management console displays it as returned and does not hardcode chart paths, release names, or Helm value names in control-plane mode. Agent write-mode guidance is advisory unless a control-plane-owned install or upgrade command is present in the target metadata.

`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}` returns cluster metadata, `writeConfirmationPolicy`, `latestSnapshot.{clusterId,workspaceId,timestamp}`, and `summary.{resourceCount,findingCount,criticalFindingCount,namespaceCount,nodeCount,resourceFamilyCounts,resourceKindCounts}`. It must not return full `latestSnapshot.data` to the browser.

Virtual machine list and detail responses return `virtualMachine.latestSnapshot.{targetId,workspaceId,timestamp}` and `virtualMachine.summary.{inventoryCount,findingCount,criticalFindingCount,serviceCount,processCount,listenerCount,logCount}` derived from normalized snapshot rows. They must not return full raw snapshot data to the browser.

`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters` returns cluster summaries only. Historical CPU and memory telemetry must be loaded lazily from `GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/metrics/history` for a selected cluster, or from the bounded batch endpoint `GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/metrics/history?clusterIds=...` for visible dashboard charts. The batch endpoint is capped by the control plane and must not be used as an unbounded all-clusters history fetch.

Durable issue, resource, metric, and log console data is fetched through bounded list and summary endpoints:

- `GET /api/v1/workspaces/{workspaceId}/issues`
- `GET /api/v1/workspaces/{workspaceId}/issues/{issueId}`
- `GET /api/v1/workspaces/{workspaceId}/issues/{issueId}/observations`
- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/issues`
- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/issues/summary`
- `GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/resources`
- `GET /api/v1/workspaces/{workspaceId}/virtual-machines/{vmId}/resources`
- `GET /api/v1/workspaces/{workspaceId}/virtual-machines/{vmId}/metrics/history`
- `GET /api/v1/workspaces/{workspaceId}/virtual-machines/{vmId}/logs`

Paged list endpoints return `{ items, nextCursor? }`, accept `limit`, `cursor`, and `q` where search is supported, and apply exact filters before pagination. Cursor reuse with different query/filter state must return `400`. Target issue summaries return exact active plus recovering counts by status and severity from durable issues, excluding resolved issues, and are the canonical source for overview navigation badges. The control plane still stores agent snapshots append-only, but the management console consumes durable issue rows, derived resources, metric/log pages, and summary counts instead of full snapshot payloads.

### MCP server management, skills, and tools

The management console depends on:

- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/catalog`
- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/tools`
- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/assistant/capabilities-preview?toolAccessMode=read_only|read_write`
- `PATCH /api/v1/workspaces/{workspaceId}/targets/{targetId}/tools/{toolId}`
- `PATCH /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}/tools/{toolName}`
- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers`
- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}/tools`
- `POST /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers`
- `PATCH /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}`
- `DELETE /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}`
- `POST /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}/test-connection`
- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/skills`
- `POST /api/v1/workspaces/{workspaceId}/targets/{targetId}/skills`
- `POST /api/v1/workspaces/{workspaceId}/targets/{targetId}/skills/import`
- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/skills/{skillId}`
- `PATCH /api/v1/workspaces/{workspaceId}/targets/{targetId}/skills/{skillId}`
- `DELETE /api/v1/workspaces/{workspaceId}/targets/{targetId}/skills/{skillId}`
- `POST /api/v1/workspaces/{workspaceId}/targets/{targetId}/skills/{skillId}/reimport`

Built-in tools and MCP-discovered tools use distinct target-scoped APIs. Kubernetes clusters and virtual machines both use the target MCP, Skills, and Tools surfaces. The Tools tab shows only AcornOps built-in tools such as `web_search`; MCP-discovered tools remain on the MCP Servers page.

The UI depends on these MCP catalog fields staying stable:

- `workspaceId`, plus `targetId`/`targetType` for target-scoped catalogs. Kubernetes target catalog responses may also include `clusterId`.
- `permissions.canEdit` for MCP server configuration
- `permissions.editableRoles`
- `servers[].{id,name,url,type,enabled,isSystem,canDelete,canEditConnection,canToggle,authType,publicHeaders,connectionStatus,lastDiscoveryAt,lastDiscoveryError}`
- `servers[].toolCounts.{total,enabledConfigured,enabledEffective,writeConfigured,writeEffective}`
- `GET /mcp/servers/{serverId}/tools` returns paged tool rows with `{name,description,capability,version,source,enabledConfigured,enabledEffective,effectiveDisabledReason}`. `enabledEffective` includes target runtime availability; write tools on read-only agents return `effectiveDisabledReason=agent_write_disabled`.
- MCP tool toggles are patched through `/mcp/servers/{serverId}/tools/{toolName}` with `{enabled, capability?}`.

The UI depends on these built-in Tools catalog fields staying stable:

- `workspaceId`
- `targetId`
- `targetType`
- `permissions.canEdit`
- `permissions.editableRoles`
- `items[].{id,label,enabled,description,capability,runtimeKind,visibility,config}`
- `web_search.config.domainFilters.{allowedDomains,blockedDomains}`
- Built-in tool settings are patched through `/tools/{toolId}` with `{enabled, config?}`.

The UI depends on these target Skills fields staying stable:

- `items[].{id,name,description,enabled,validationStatus,validationErrors}`
- `items[].bundleStats.{fileCount,totalBytes}`
- `items[].source.{type,repoUrl?,ref?,subpath?,commitSha?,syncStatus}`
- `GET /skills/{skillId}` returns `files[].{path,content,sizeBytes}`.

Current mutation policy exposed through the catalog:

- Roles with MCP capability may add/delete MCP servers.
- Roles with tool-management capability may edit MCP per-tool enablement and built-in tool settings.
- Creating a remote MCP server is discovery-first: the management console sends connection details plus optional non-secret public headers, and the control plane/gateway discovers tools from the server's `tools/list` endpoint.
- Newly discovered external tools remain disabled until a role with tool-management capability reviews and enables them.
- The management console keeps server URL changes as delete and re-add, while allowing roles with MCP-management capability to update name, enabled state, secret-backed auth, and non-secret public headers in place.
- Roles without those management capabilities are read-only.

### Chat and run lifecycle

The management console depends on:

- `POST /api/v1/workspaces/{workspaceId}/targets/{targetId}/sessions`
- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/sessions`
- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/chat-activity`
- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/chat-activity/stream`
- `POST /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/sessions`
- `GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/sessions`
- `DELETE /api/v1/sessions/{sessionId}`
- `GET /api/v1/sessions/{sessionId}/messages`
- `POST /api/v1/sessions/{sessionId}/messages`
- `GET /api/v1/runs/{runId}`
- `GET /api/v1/runs/{runId}/events`
- `GET /api/v1/runs/{runId}/stream`
- `GET /api/v1/runs/{runId}/approvals`
- `POST /api/v1/runs/{runId}/approvals/{approvalId}/decision`
- `POST /api/v1/runs/{runId}/cancel`

Target-scoped session routes can create/list target sessions. Posting a message starts runs for Kubernetes and virtual machine targets. VM troubleshooting chat must send `toolAccessMode=read_only` and must not show Kubernetes approval/write affordances.

Run event handling includes skill catalog and skill context lifecycle events (`skill_catalog_available`, `skill_context_load_started`, `skill_context_loaded`, and `skill_context_load_failed`) so assistant traces can show skill loading state alongside reasoning, tool calls, approvals, and final messages.

Troubleshooting conversations are owner-write and viewer-read. The management console must preserve `createdBy` and optional `createdByUser.{id,displayName}` on session payloads. The creator can send follow-ups when existing run permissions allow it. Non-creators with target read access can open sessions and watch active runs through `GET /api/v1/runs/{runId}/stream`, but the composer and prompt suggestions are view-only. The backend remains authoritative and returns `403 CONVERSATION_OWNER_REQUIRED` when a non-owner posts into a session.

Run mutation policy:

- `owner` and `admin` may create `read_only` and `read_write` runs.
- `operator` may create sessions and `read_only` runs only.
- `viewer` may read existing session and run data but may not create sessions or runs.
- Direct public agent tool-call APIs are not part of this contract; runtime tools execute through run-scoped gateway authorization.

Session listing response must remain cursor-based:

- `{ items, nextCursor? }`
- Each session item includes `targetId`, `targetType`, `createdBy`, and optional `createdByUser.{id,displayName}`. Kubernetes session items also include `clusterId`, which is the same backing target ID.
- Run details and approval replay payloads include `targetId` and `targetType`. Approval payloads may include `summary`, a human-readable sentence for approval UI copy. Kubernetes payloads also include `clusterId`; non-Kubernetes targets must not receive a synthetic cluster alias.

Recent target chat activity uses `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/chat-activity?windowSeconds=300`. It requires target read access, not `create_sessions`. The response includes `targetId`, `targetType`, `targetName`, `windowSeconds`, `generatedAt`, and `recentActivity[]` rows with owner metadata, `lastActivityAt`, latest run metadata, active run metadata, `hasActiveRun`, `hasRecentWriteCapableRun`, and optional `latestToolAccessMode`. The management console uses this payload before starting a local draft conversation so recent target activity can be reviewed without creating a backend session.

Target chat activity streaming uses `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/chat-activity/stream`. The console expects SSE frames with `event: chat_activity`, `id: <activityEventId>`, and payloads shaped as `{id,workspaceId,targetId,targetType,sessionId,runId?,messageId?,approvalId?,type,payload,createdAt}`. The console resumes with `?after=<activityEventId>` after reconnect; fresh streams are live-only and rely on recent activity/session reads for initial state. Activity types consumed by the UI are `message.created`, `run.created`, `run.status_changed`, `assistant_message.committed`, `approval.requested`, `approval.decided`, `approval.expired`, and `session.deleted`. Activity events identify changed resources; message bodies remain loaded through `GET /api/v1/sessions/{sessionId}/messages`.

`POST /api/v1/sessions/{sessionId}/messages` must keep accepting:

- `content`
- `toolAccessMode` in `read_only | read_write`
- `clientMessageId`

and must keep returning:

- `message_id`
- `run_id`

Run event frames are consumed both from SSE and replay. The management console expects:

- `schema_version`
- `run_id`
- `seq`
- `ts`
- `type`
- `payload`

Current event types used by the UI:

- `run_progress`
- `run_started`
- `assistant_message_started`
- `assistant_token_delta`
- `assistant_reasoning_summary_delta`
- `assistant_reasoning_summary_completed`
- `assistant_reasoning_summary_unavailable`
- `tool_call_started`
- `tool_call_completed`
- `tool_approval_requested` with optional `payload.summary`
- `tool_approval_approved` with optional `payload.summary`
- `tool_approval_rejected` with optional `payload.summary`
- `tool_approval_expired` with optional `payload.summary`
- `assistant_message_completed`
- `run_failed`
- `run_cancelled`
- `run_completed`

Run SSE is a long-lived detail stream and may continue sending heartbeats after terminal run events. The management console must treat `run_completed`, `run_failed`, and `run_cancelled` as terminal signals and reconcile through run/session APIs instead of waiting for the SSE request to close.

Cancellation is terminal from the browser perspective. After a user cancels a
run, the management console must keep that run stopped locally, ignore later
token/progress/replay updates for the cancelled run, and allow the user to send
a new message without waiting for stale stream writers.

### Write-tool intent rule

The management console sends `toolAccessMode=read_write` when the current workspace permissions allow write-capable runs. It must not depend on the browser having already loaded the full MCP tool catalog. The control plane remains authoritative and may still reject the request or filter write tools out of the run snapshot if agent, role, or policy conditions are not met.

When a write approval is requested, the management console renders the approval payload from run events or approval replay and submits explicit approve/reject decisions to the control plane. If present, `summary` is displayed as explanatory copy only. The console does not execute writes locally and must treat the backend approval state as authoritative when a decision has already been recorded or expired.

### Workflow automation APIs

Agents are planned durable workspace resources under Automation. The management console consumer model expects agents to own MCP servers, tools, skills, target scope, workspace context scope, approval defaults, trust policy, capability summaries, health, workflow usage, and audit history. Until the control-plane producer routes ship, the console uses a fallback agent catalog and must label that state honestly.

Planned Agent consumer routes:

- `GET /api/v1/workspaces/{workspaceId}/agents`
- `POST /api/v1/workspaces/{workspaceId}/agents`
- `GET /api/v1/agents/{agentId}?workspaceId={workspaceId}`
- `PATCH /api/v1/agents/{agentId}`

Agent records are workspace-scoped and include:

- `agent.{id,workspaceId,name,description,status,providerType,ownerUserId,version,createdAt,updatedAt}`
- `mcpServers[]`
- `tools[]`
- `skills[]`
- `targetScope[]`
- `contextScope[]`
- `approvalPolicy`
- `trustPolicy`
- `capabilitySummary`
- `capabilities[]` with `{source,providerAgentId?,resourceType,resourceScope,toolId?,operation,requiresApproval}`
- `workflowsUsingAgent[]`
- health, test, and audit-history summaries

External provider agents use restricted trust defaults and cannot self-expand
tools, MCP servers, skills, context grants, target scopes, approval policy, or
external data access beyond server-owned catalogs.

Workflows are shared workspace resources, distinct from target troubleshooting chats. The management console consumes server-owned workflow definitions when the control plane is available and must not treat client-side hiding as authorization. The control plane compiles agent-derived MCP, tool, skill, data, and chat-history grants into server-issued run permissions before workflow execution can call tools or read granted data.

Public routes:

- `GET /api/v1/workspaces/{workspaceId}/workflows`
- `GET /api/v1/workspaces/{workspaceId}/mcp/servers`
- `POST /api/v1/workspaces/{workspaceId}/mcp/servers`
- `PATCH /api/v1/workspaces/{workspaceId}/mcp/servers/{serverId}`
- `DELETE /api/v1/workspaces/{workspaceId}/mcp/servers/{serverId}`
- `POST /api/v1/workspaces/{workspaceId}/mcp/servers/{serverId}/test-connection`
- `GET /api/v1/workspaces/{workspaceId}/mcp/servers/{serverId}/tools`
- `GET /api/v1/workspaces/{workspaceId}/workflow-schedules`
- `POST /api/v1/workspaces/{workspaceId}/workflow-schedules`
- `PATCH /api/v1/workflow-schedules/{scheduleId}`
- `DELETE /api/v1/workflow-schedules/{scheduleId}`
- `GET /api/v1/workspaces/{workspaceId}/approvals`
- `GET /api/v1/workflows/{workflowId}`
- `PATCH /api/v1/workflows/{workflowId}`
- `GET /api/v1/workflows/{workflowId}/sessions`
- `POST /api/v1/workflows/{workflowId}/sessions`
- `POST /api/v1/workflow-sessions/{sessionId}/messages`
- `GET /internal/v1/workflow-sessions/{sessionId}/context`

Reserved create and delete authoring routes return `501 NOT_IMPLEMENTED` until full workflow authoring ships:

- `POST /api/v1/workspaces/{workspaceId}/workflows`
- `DELETE /api/v1/workflows/{workflowId}`

`PATCH /api/v1/workflows/{workflowId}` lets workflow managers edit server-owned workflow category and capability gate. The management console sends workspace id, category, policy mode, approval requirements, and per-step allowed tools, context grants, and approval-required flags. MCP servers, tools, and skills must come from assigned agents; the workflow gate can narrow them but must not add capabilities that the assigned agents do not already provide. The control plane authorizes with `manage_workflows`, audits the change, and applies it only to future compiled workflow sessions.

Workflow-scoped MCP server create and update responses are wrapped as `{ server }`; delete returns `204`. MCP server mutations require `manage_mcp`; workflow definition mutations require `manage_workflows`.

Workflow schedules are real control-plane records. The schedules page lists `items` plus summary metrics from `GET /api/v1/workspaces/{workspaceId}/workflow-schedules`; create/edit/pause/delete actions use the schedule mutation routes and require `manage_workflows`. The console sends cron, timezone, enabled state, approved context grants, and workflow input defaults, but control-plane validation is authoritative. The control plane computes due times in the stored timezone and dispatches with a workflow runtime subject instead of the creator's current workspace role.

The approvals page consumes `GET /api/v1/workspaces/{workspaceId}/approvals?status=pending|decided|all&limit=&cursor=`. Rows normalize target write-tool approvals and workflow approval gates and include `approvalId`, `runId`, `source`, `workflowId?`, `targetId?`, `summary`, `toolName`, `requestedBy`, `expiresAt`, `status`, and decision metadata. Approve/reject actions call `POST /api/v1/runs/{runId}/approvals/{approvalId}/decision` and are enabled only for users with `create_read_write_runs`.

Workflow definitions are workspace-scoped and include:

- `workflow.{id,workspaceId,name,description,status,category,createdBy,updatedAt}`
- `primaryAgent.{agentId,role,required}`
- `supportingAgents[].{agentId,role,required}`
- `inputs[]` typed launch fields
- `targetSelectionPolicy` and `contextGrantPolicy`
- `steps[]` ordered actions with required inputs, narrowed allowed tools, context grants, and approval gates
- `capabilityGate` as a subset of assigned-agent capabilities
- `policy.{mode,maxRuntime,approvalRequirements,retention}`
- `presentation.{icon,launchCopy,defaultStarterPrompt}`

Workflow chat history is separate from Kubernetes cluster and VM chat history. Launching a workflow creates a workflow session first; the assistant collects missing inputs, displays the compiled access scope, then starts a run from a frozen workflow snapshot. Editing a workflow must not change in-flight run snapshots.
Workflow session listing responses include workflow run records. The management console uses those records plus the existing public run detail, event, approval, stream, and cancel routes to review workflow history and output.
Workflow approval gates are surfaced through the existing run approval routes. Workflow approval resources use `toolName = "workflow.approval_gate"` with workflow identifiers and summary copy; decisions use `{ "decision": "approved" | "rejected" }`, require backend authorization, and the control plane dispatches the workflow only after every gate is approved.

Execution bootstrap for workflow runs remains an internal control-plane to execution-engine contract. The management console must consume the public workflow session, message, run history, approval, and output APIs rather than calling internal workflow context routes directly.

Default authorization direction:

- Owners and admins configure shared agents, shared workflows, and workflow capability gates.
- Operators can run permitted workflows according to the workflow's read-only or read-write policy.
- Workflow access to other chat histories requires an explicit configured grant, such as selected and approved chat sessions.
- Audit logs record workflow scope updates, session creation, runs, and approvals, and must extend to workflow create, delete, and cancel events as those routes ship.
