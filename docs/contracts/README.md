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
| Control plane | Browser auth/session flow, workspace and target data, Kubernetes cluster data, VM data, target tool settings, MCP server management, chat sessions, runs, and run event streaming |

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
- `GET /api/v1/auth/methods`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`

Development-only shortcut outside production:

- `POST /api/v1/auth/dev-login`

The browser session cookie is the auth token for subsequent API traffic. Mutating requests with a session cookie also send the CSRF token from `GET /api/v1/auth/csrf` in the `x-csrf-token` header.
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
- `GET /api/v1/workspaces/{workspaceId}/virtual-machines/{vmId}/findings`
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

The management console keeps Kubernetes-specific lifecycle, install, inventory, namespace, and pod-log flows on the cluster APIs. The Virtual Machines page uses the VM APIs for Linux/systemd registration, inventory, findings, metrics, logs, MCP Servers, read-only chat, and VM Settings.

The AI Settings page consumes `GET /api/v1/workspaces/{workspaceId}/ai-settings` to render AI assistant defaults, deployment allow-lists, and per-provider configured status for users with workspace data access. Users with `permissions.manage_ai_settings` may call `PATCH /api/v1/workspaces/{workspaceId}/ai-settings` to update the default provider/model, `PUT /api/v1/workspaces/{workspaceId}/ai-provider-credentials/{provider}` with write-only `{apiKey}` to add or rotate a provider credential, and `DELETE /api/v1/workspaces/{workspaceId}/ai-provider-credentials/{provider}` to remove one. The console must never expect or display API key values, ciphertexts, or internal secret names; it only displays configured/not-configured status.

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

Pod logs are fetched lazily from `GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/pods/{namespace}/{podName}/logs`. The workload drawer must treat follow mode as opt-in polling and stop polling when the drawer is closed or the logs tab is left.

`installInstructions.command` is owned by the control plane. The management console displays it as returned and does not hardcode chart paths, release names, or Helm value names in control-plane mode. Agent write-mode guidance is advisory unless a control-plane-owned install or upgrade command is present in the target metadata.

`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}` returns cluster metadata, `writeConfirmationPolicy`, `latestSnapshot.{clusterId,workspaceId,timestamp}`, and `summary.{resourceCount,findingCount,criticalFindingCount,namespaceCount,nodeCount,resourceFamilyCounts,resourceKindCounts}`. It must not return full `latestSnapshot.data` to the browser.

`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters` returns cluster summaries only. Historical CPU and memory telemetry must be loaded lazily from `GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/metrics/history` for a selected cluster, or from the bounded batch endpoint `GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/metrics/history?clusterIds=...` for visible dashboard charts. The batch endpoint is capped by the control plane and must not be used as an unbounded all-clusters history fetch.

Snapshot-derived console data is fetched through bounded list endpoints:

- `GET /api/v1/workspaces/{workspaceId}/investigations`
- `GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/resources`
- `GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/findings`
- `GET /api/v1/workspaces/{workspaceId}/virtual-machines/{vmId}/resources`
- `GET /api/v1/workspaces/{workspaceId}/virtual-machines/{vmId}/findings`
- `GET /api/v1/workspaces/{workspaceId}/virtual-machines/{vmId}/metrics/history`
- `GET /api/v1/workspaces/{workspaceId}/virtual-machines/{vmId}/logs`

Paged list endpoints return `{ items, nextCursor? }`, accept `limit`, `cursor`, and `q` where search is supported, and apply exact filters before pagination. Cursor reuse with different query/filter state must return `400`. The control plane still stores agent snapshots append-only, but the management console consumes derived pages and summary counts instead of full snapshot payloads.

### Tool catalog and MCP server management

The management console depends on:

- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/tools/catalog`
- `PATCH /api/v1/workspaces/{workspaceId}/targets/{targetId}/tools/{toolName}`
- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers`
- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}/tools`
- `POST /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers`
- `PATCH /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}`
- `DELETE /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}`
- `POST /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}/test-connection`
- `GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/tools/catalog`

Remote MCP server management is target-scoped. Kubernetes clusters and virtual machines both use the target MCP surface. VM built-in tools are read-only and surfaced through the VM MCP Servers sidebar without enabling Kubernetes write controls.

The UI depends on these catalog fields staying stable:

- `permissions.canEdit`
- `permissions.editableRoles`
- `servers[].{id,name,url,type,enabled,isSystem,canDelete,canEditConnection,authType,publicHeaders,connectionStatus,lastDiscoveryAt,lastDiscoveryError}`
- `servers[].toolCounts.{total,enabledConfigured,enabledEffective,writeConfigured,writeEffective}`
- `GET /mcp/servers/{serverId}/tools` returns paged tool rows with `{name,description,capability,version,source,enabledConfigured,enabledEffective,effectiveDisabledReason}`. `enabledEffective` includes target runtime availability; write tools on read-only agents return `effectiveDisabledReason=agent_write_disabled`.

Current mutation policy exposed through the catalog:

- Roles with MCP and tool-management capability may add/delete MCP servers and edit per-tool enablement.
- Creating a remote MCP server is discovery-first: the management console sends connection details plus optional non-secret public headers, and the control plane/gateway discovers tools from the server's `tools/list` endpoint.
- Newly discovered external tools remain disabled until a role with tool-management capability reviews and enables them.
- The management console keeps server URL changes as delete and re-add, while allowing roles with MCP-management capability to update name, enabled state, secret-backed auth, and non-secret public headers in place.
- Roles without those management capabilities are read-only.

### Chat and run lifecycle

The management console depends on:

- `POST /api/v1/workspaces/{workspaceId}/targets/{targetId}/sessions`
- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/sessions`
- `GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/chat-activity`
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

Cancellation is terminal from the browser perspective. After a user cancels a
run, the management console must keep that run stopped locally, ignore later
token/progress/replay updates for the cancelled run, and allow the user to send
a new message without waiting for stale stream writers.

### Write-tool intent rule

The management console sends `toolAccessMode=read_write` when the current workspace permissions allow write-capable runs. It must not depend on the browser having already loaded the full MCP tool catalog. The control plane remains authoritative and may still reject the request or filter write tools out of the run snapshot if agent, role, or policy conditions are not met.

When a write approval is requested, the management console renders the approval payload from run events or approval replay and submits explicit approve/reject decisions to the control plane. If present, `summary` is displayed as explanatory copy only. The console does not execute writes locally and must treat the backend approval state as authoritative when a decision has already been recorded or expired.
