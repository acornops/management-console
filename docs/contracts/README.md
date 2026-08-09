# Management Console Contracts

The management console is the browser client for the control-plane API. Keep this README as a compact integration brief; endpoint lists belong in the manifest and generated API docs.

## Source Of Truth

- Complete endpoint and schema detail lives in the generated public docs at `https://docs.acornops.dev`.
- Control-plane API coverage for this app lives in `docs/contracts/manifest.json`.
- `docs/contracts/control-plane-public-operations.json` is the vendored public-operation inventory used when the docs repository is not checked out, including isolated CI jobs.
- `scripts/check-contracts.mjs` verifies that frontend service calls, mappers, manifest entries, and the invariants below stay aligned.
- This README captures only browser-client behavior that generated reference docs do not make obvious.

## Full Platform Matrix

| Platform Part | What The Console Depends On | Enforcement |
| --- | --- | --- |
| Control plane | Auth, workspace, membership, audit, AI settings, target, tooling, chat, run, and cluster APIs | Frontend services plus manifest checks |
| Docs website | Public API reference for exact endpoint parameters and schemas | Generated OpenAPI artifacts |
| AgentK | Cluster registration, agent-key rotation, snapshots, logs, tools, and chat-backed target actions | Control-plane contracts and UI mappers |
| LLM gateway | MCP registries, Agent/target installations, discovered tools, and workspace/individual connections exposed through control-plane APIs | Registry browsing and permission checks |
| Execution engine | Run event stream, approval, cancel, and chat result state | Run/chat service checks |

## Platform Dependency Summary

- The console should call the control plane through typed service modules, not by scattering raw fetch calls through UI components.
- Cookie-backed requests must use `credentials: include`.
- Auth config may include additive effective `helpLinks`. The Help page accepts
  only a credential-free HTTPS documentation URL and a credential-free HTTPS or
  plain `mailto:` support URL; missing or invalid values retain the current
  built-in AcornOps destinations during rolling upgrades.
- Paginated list responses use `{ items, nextCursor? }`.
- The workspace approval inbox additionally exposes `pendingCount`, the total pending approvals across target-tool and workflow-gate sources before pagination and independently of the list filter. The console treats a missing or invalid count from an older producer as unavailable.
- Cluster registration returns `{ cluster, agentKey, installInstructions }`.
- Agent-key rotation returns `{ clusterId, agentKey, keyVersion, installInstructions }`.
- VM registration and credential replacement return structured
  `installInstructions` with `{ command, releaseVersion, bootstrapUrl,
  enrollmentExpiresAt?, warnings }`. Enrollment commands contain a one-use
  token and only `command` is displayed and copied; repair commands contain no
  credential. The AgentV contract has no legacy raw-key decoder.
  The onboarding dialog copies only the command, labels it sensitive, counts
  down the 15-minute enrollment window, and regenerates an initial command
  after expiry. VM settings keep credential-free repair separate from explicit
  credential replacement. VM registration defaults to `agentAccessMode:
  read_only`; read-write registration requires a non-empty list of unique exact
  non-AgentV `.service` units in `restartServices`. The command does not embed
  that non-secret policy: the control plane binds it to enrollment. VM settings
  distinguish applied and pending host policies, return one root command for a
  whitelist change, and keep writes unavailable until the transaction commits.
  VM payloads also expose
  `permissionMode`, `permissionModeOverride`, and `permissionModeSource`.
  VM settings writes `permissionModeOverride` through the VM patch route; this
  run policy can only narrow or govern tools inside the installed host ceiling.
- Workspace payloads include `currentUserRole` and permissions from the control plane; the console must not fabricate current-user membership locally.
- The UI must not fabricate a member row when the control-plane member list is empty or unavailable.
- Role templates come from `GET /api/v1/workspaces/{workspaceId}/roles`; invite and member-role controls must use that catalog.

## Shared Invariants

- Target-chat documents are created only by the model-invoked platform
  function. The console keeps Copy as a response action and renders successful
  report metadata as a persistent authenticated download card; it does not
  expose a separate response-export API action.
- Workspace membership UI is gated by `permissions.manage_members`.
- Workspace audit-log UI is gated by `permissions.read_audit_log`.
- Audit-log detail preserves `operation`, `objectType`, and `object`.
- Target mutation UI is gated by `permissions.manage_targets`.
- Workspace AI settings UI is gated by `permissions.manage_ai_settings`.
- AI provider credential flows must never expect or display API key values. Provider status identifies whether the effective key is a workspace override, an inherited platform default, or absent; workspace overrides take precedence.
- Git skill import accepts one repository, folder, or `SKILL.md` URL. Target
  and Agent import surfaces call the control-plane resolver, which checks the
  deployment host allowlist and returns a pinned bounded snapshot. The browser
  never selects a provider or supplies a Git API base.
- Deploy the control-plane resolver before this URL-only consumer. Pause legacy
  custom-host imports during a mixed-version rollout because their
  browser-supplied API bases are intentionally rejected by the new producer.
- MCP registry role, policy, and editability data comes from the control plane; the console must not hard-code editable role keys or workspace-management availability.
- Workspace MCP credentials are write-only; responses expose only whether a credential is configured. Workflows inherit their complete effective capabilities from selected Agents.
- Workflow creation sends only Workflow metadata and selected Agent IDs. Review
  surfaces show the assigned Agents' effective capabilities without offering
  Workflow-local tool, skill, MCP, context, permission, or approval controls.
- Capability review renders semantic capabilities, direct MCP servers,
  installed skills, and direct tools as distinct sources. Launch uses the
  workflow capability-preview endpoint to show tools inherited from assigned
  Agents. Browsing or selecting workflows does not request a preview; opening
  launch review starts the check and remains blocked while it is loading,
  stale, failed, or blocked. Workflow setup never presents target selection.
  Compiled scopes remain internal; the console uses only the bounded capability
  preview and public run status after dispatch.
- Agent **Capabilities → Tools** lists AcornOps native tools separately from
  MCP-discovered tools. Native grant and revoke require `manage_agents` only,
  the native assignment itself satisfies coordinated Workflow routing without a
  second mapping review, and Workflow traces expose authenticated PDF downloads.
- Every Agent exposes the managed **AcornOps Targets** MCP server in its MCP
  table. Users may toggle the server and its `list_targets`, `get_target`, and
  `list_target_issues` tools, but cannot edit its connection or delete it.
- Fetch is configured in that Tools tab with a fixed GET method and one to 20
  complete public HTTPS URL patterns. The drawer validates wildcard placement
  and unsafe URL forms and warns that paths and query values leave AcornOps.
- Completed target-chat assistant turns expose a contextual document download
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
- The route-backed **Browse MCP servers** page stores search, source, compatibility, selected artifact, and Agent/target destination in URL state. A destination-bound visit keeps that destination fixed and links back to it; visits without a destination require an explicit destination before installation.
- Only specialist Agents are installation destinations; AcornOps Manager is never an installation destination.
- Registry installs and re-imports target either a workspace specialist Agent or a Cluster/VM default Agent. The browser never supplies an authoritative target type.
- **MCP registries** settings provide add, probe, edit, enable/disable, synchronize, and delete controls when allowed by `manage_catalog_sources` and deployment policy. Deployment-managed registries are configuration-read-only but remain synchronizable. The console sends no connector route and treats omitted authentication during edits as credential preservation.
- Catalog provenance and installation revision determine Install, Installed, and explicit Update states. MCP tools are reviewed after discovery and are not installed independently.
- MCP installations select workspace-managed or individual credential ownership.
  Each target or Agent installation has independent write-only connections, and
  workflows reuse the selected Agent installation. The console never persists
  credentials in browser storage.
- Individual OAuth installations contain no provider, issuer, endpoint, client
  ID, or client secret configuration. The console prepares OAuth through the
  control plane, shows the safe authorization-server origin, CIMD or DCR method,
  requested scopes, and any `offline_access` request, then requires explicit
  consent before browser navigation. Multiple advertised issuers require an
  explicit selection. Fixture mode rejects external OAuth before any request.
- The console does not expose a built-in repository-review Agent, workflow, provider profile, or template setup branch. Workspace managers create a specialist Agent, attach and review any compatible MCP server from the Agent's generic MCP page, and then create a workflow selecting that Agent. Credential values remain write-only and never enter preview state or browser storage.
- Manual workflow creation sends only operator-controlled metadata and Agent IDs. Mode, tools, MCP servers, skills, permissions, approvals, execution duration, and report retention are not Workflow fields. Creation fails closed until the authoritative Agent options catalog has loaded.
- AI behavior drafts remain empty until workspace AI settings arrive, so the console does not invent a provider or model. An omitted production control-plane API base uses same-origin requests; local development retains the localhost fallback.
- A blocked workflow capability preview opens the matching individual
  credential or OAuth authorization dialog from `serverId`, `authType`, owner,
  and `action`. Static credentials remain write-only; OAuth uses prepare and
  start operations and never infers configuration from a provider name.
- Run-readiness recovery parses only the bounded `readinessFailures` contract at
  the API client boundary. Recovery
  links carry only `mcpServer` and `mcpAction`, focus the exact installation and
  Connect, Authorize, Reauthorize, or Verify control, and never invoke a
  mutation automatically. Target
  failures describe the bounded, Markdown-escaped Kubernetes or VM tool name
  instead of implying that another MCP installation is required.
- Successful Connect and Verify operations remain successful if the subsequent
  installation/tool refresh fails. The console reports that catalog load
  failure separately and offers a retry. Authenticated manual installations
  enter credential connection before pending-tool review; unauthenticated installations
  retain direct discovery and review.
- Kubernetes clusters and VMs retain target-scoped MCP servers, skills, and tools for their generic target agents. These target capabilities are administered on the target and are not reassigned to workspace agents.
- Platform MCP and skill defaults copied when the workspace was created appear
  as disabled rows in the existing Agent, Kubernetes, and VM inventories with a
  `Platform default` label. Their source cannot be edited or removed while they
  remain untouched initialization entries. Explicit enablement creates a normal
  workspace-owned installation used by the existing credential or skill flow.
  Later Platform Admin changes do not modify that workspace snapshot or any
  enabled workspace-managed copy. Local additions remain fully
  manageable, and built-in Tools are unchanged.
- Workflow schedule create and update requests contain only the current user principal. Service identities remain available for non-schedule platform uses but are not presented in schedule UI.
- Workspace workflow activity uses the cursor-paginated execution endpoint for
  open and attention counts, URL-backed filtering, and safe immutable
  provenance. Issue payloads carry compact activity summaries. Schedule and
  workflow-webhook responses expose the latest successful execution pointer
  separately from configuration and last-dispatch state; a rejected dispatch
  never implies that an execution is running.
- The console consumes automation-template metadata and exposes explicit idempotent install and activation actions. The Workflow Library lists only definitions installed in the workspace. Automatic templates are provisioned active; opt-in Infrastructure remediation and Incident investigation remain in the template catalog until installation, then stay paused until setup is complete and the user activates them.
- Workflow authoring sends only a unique, non-empty `agentIds` set. One selected
  Agent is summarized as running the workflow directly without a redundant row
  label; multiple selected Agents are labeled `AcornOps-coordinated`. The
  console treats every selected Agent as a peer and never sends or renders
  entry-Agent, delegation-policy, Manager, coordinator identity,
  selection-order, or client-derived routing fields.
- Coordinated run detail renders the sanitized `AcornOps coordination` parent
  and bounded child capability, Agent, status, and failure fields. It
  does not infer coordinator records or display hidden execution scope.
- Agents and workflows are ordinary mutable workspace-owned definitions that can be edited, duplicated, disabled, or deleted directly. AcornOps never overwrites or upgrades them. Agent deletion explains dependent workflows before it can proceed.
- Authorized users may duplicate an effective definition into a manual draft without copying capability installations or operational history.
- Agent detail exposes exactly Chat, MCP Servers, Skills, Tools, and Settings as
  stable routes. The base Agent route resolves to Chat; Workflow usage and
  lifecycle actions remain contextual sections in Settings.
- Agent Chat uses the shared chat presentation but calls the Agent conversation
  API. New conversations follow the intersection of the pinned Agent permission
  mode and creator capabilities. Write-capable Agents start with their configured
  approval policy when the creator has write-run permission; otherwise the
  conversation is read-only. Creators may pause changes, and workspace readers
  who did not create a conversation can inspect it without continuing or
  changing it. Policy copy uses the permission mode pinned in each conversation
  summary, not the Agent's latest revision.
- Agent cards show aggregate MCP server, Skill, and Tool counts only. A
  readiness blocker replaces those counts with an actionable warning; raw
  capability names remain inside the dedicated detail surfaces.
- Write-capable chat runs must request read-write tool access only when the current user and target both allow it.
- Experimental target auto-triage is configured only from Kubernetes and VM
  Settings and uses the same Experimental badge treatment as Automation. The
  browser uses the control plane's revisioned settings, readiness, and
  effective-policy preview; it never starts current issues as a side effect of
  enabling the feature. Automatic chats remain in the normal target history,
  preserve the existing approval and retention paths, and relax creator-only
  reply ownership only when `origin=auto_triage`. Target auto-triage settings,
  issue activity, and chat context do not depend on Automation navigation,
  Workflow permissions, or Workflow UI modules. Kubernetes settings expose
  namespace include and exclude eligibility plus cluster-scoped issue control;
  virtual-machine settings do not expose namespace fields.
- The target-chat `/` picker sends structured tool runtime aliases and target
  skill IDs separately from prompt text. It never repurposes `@` prompt
  references, and stale references remain visible when the control plane
  rejects them.
- Established chats restore provider, model, and reasoning effort from the
  control plane's latest accepted run snapshot; workspace AI settings seed
  chats that do not yet have a run.
- Agent chat uses the Agent capability-preview endpoint for the tools-and-skills
  control. The console does not derive effective run authority from Agent
  configuration; the control plane compiles it for the current actor and access
  mode.

## Control-Plane Boundary Notes

- The console depends on the control plane for auth state, current workspace role, permissions, and all server-side authorization decisions.
- Password signup does not imply workspace membership.
- The outbound webhook selector mirrors the control-plane catalog. Workspace
  creation remains visible in audit history but is not selectable for outbound
  delivery because no workspace-scoped subscription can exist before creation;
  workspace deletion remains selectable as a final snapshotted notification.
- Webhook, MCP, Target Insights, workspace audit, AI settings, and target mutation screens should treat denied mutations as normal permission outcomes.
- Run streams and run-event frames are control-plane contracts; UI code should map them in one place before rendering.
- Approval deep links may include exact `runId` and `approvalId` filters; the console keeps approval decisions on the run-scoped control-plane endpoint.

## Change Checklist

When changing a console API call, mapper, or screen contract:

1. Update the service module and mapper together.
2. Update `docs/contracts/manifest.json` if the consumed control-plane surface changed.
3. Keep this README focused on durable browser-client invariants only; do not paste endpoint lists here.
4. Run `npm run contracts:check`.
