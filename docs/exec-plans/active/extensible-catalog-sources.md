# MCP catalog and capability ownership UI

## Goal

Expose a shareable workspace MCP Catalog while preserving capability ownership
boundaries for workspace specialist Agents and target default Agents.

## UX boundaries

- Add `/workspaces/:workspaceId/catalog` to desktop and mobile navigation. Keep
  search, source, compatibility, selected artifact, and destination in URL state.
- Use an inline artifact list and detail/install panel. Show source, version,
  digest, transport compatibility, endpoint, authentication, endpoint
  configuration, and target constraints before import.
- Keep credentials write-only and never echo them after save.
- Group destinations into workspace specialist Agents and Cluster/VM default
  Agents. Exclude the AcornOps Manager and warn, without blocking configuration,
  when a destination is draft, disabled, or offline.
- Compare installation provenance and revision so the primary action is Install,
  Installed, or Update. Update is an explicit re-import.
- Keep MCP, skill, and tool administration on Kubernetes clusters and VMs;
  these capabilities belong to each target's default Agent.
- Preserve manual MCP and Git/manual skill creation beside catalog import.
- Workspace agents retain their own MCP, skill, and tool ceiling. Workflow
  builders expose only subtractive choices from the selected agent.
- MCP tools remain discovery-owned and cannot be installed independently.
- Personal OAuth connections bind the callback to the same workspace,
  destination, and server and restore only same-origin catalog locations.
- The Manager capability tab is read-only; workspace chat, operational Manager
  capabilities, and handoff remain v2.
- Workflow schedules always run as their authenticated creator. Service
  identities are not selectable in schedule forms.

## Validation

- Route-state, navigation, API mapping, permission, empty/error/incompatible,
  install/update, personal OAuth, keyboard/responsive, and user-principal tests.
- `VITE_APP_DATA_MODE=control-plane npm run validate`.

## Standalone frontend fixtures

- Enforce `VITE_APP_DATA_MODE` as `mock | control-plane`; development defaults
  to mock, production defaults to control-plane and rejects mock.
- Start an MSW worker before React and keep all UI reads/mutations on the real
  control-plane API client boundary. Unmatched API calls fail closed.
- Seed representative Kubernetes, VM, issue, membership, audit, AI, Agent,
  Workflow, Catalog, and existing chat/run state. Keep it mutable in memory and
  reset it on reload.
- Return explicit fixture-mode failures for external OAuth, credentials, and
  remote Git operations.
- Browser-smoke overview, Kubernetes, VM, Agents, Workflows, Catalog, and
  Settings with the configured control-plane port deliberately unreachable.
