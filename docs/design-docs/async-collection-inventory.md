# Async Collection Inventory

This inventory pairs asynchronous read collections with their lifecycle owner
and cursor strategy. `manual` and `sentinel` remain user-pageable. `drain` is
limited to bounded overview aggregates and selectors.

| Surface or endpoint | Consumer | Strategy | Status or exception |
| --- | --- | --- | --- |
| Catalog artifacts | `WorkspaceCatalogPage` | manual | Migrated to `useCursorCollection` and `CollectionState`. |
| Workflow schedules | `WorkspaceSchedulesPage` | not paginated | Migrated to `ResourcePhase` and `CollectionState`. |
| Approval inbox | `WorkspaceApprovalsPage` | bounded dual page | Migrated visible lifecycle to `CollectionState`; the API currently returns the two bounded status pages together. |
| Agent catalog | `WorkspaceAgentsCatalog` | not paginated | Migrated to one mounted `CollectionState` frame. |
| Workflow library | `WorkspaceWorkflowsPage` | not paginated | Existing master-detail frame now remains mounted; empty state is owned by the library pane. |
| Conversation history | `ConversationHistory` | live/backfill exception | Visible lifecycle migrated. Cursor ownership stays in target-chat synchronization because live events merge with historical pages. |
| Catalog registry sources | `WorkspaceCatalogSources` | not paginated | Migrated to `ResourcePhase` and retained-content `CollectionState`; mutation feedback remains feature-owned. |
| Workspace members | `WorkspaceMembersPage` | sentinel | Migrated to `useCursorCollection`; table states stay inside the existing frame. |
| Workspace invitations | `WorkspaceMembersPage`, `WorkspaceInvitationsPanel` | sentinel | Migrated to `useCursorCollection`; replacement invite links remain in local mutation state. |
| Audit events | `WorkspaceAuditLogPage` | sentinel | Migrated to `useCursorCollection` and `DataTableStateRow`. |
| Kubernetes clusters | `KubernetesClustersPage` | sentinel | Migrated to `useCursorCollection`; deleted-item suppression and parent synchronization remain feature-owned. |
| Kubernetes resources | `ResourcesView`, `WorkloadsExplorer` | sentinel, page size 100 | Migrated to `useCursorCollection`; the dense explorer layout and keyboard Load more fallback are preserved. |
| Virtual machines | `useVirtualMachineListRefresh` | drain | Migrated bounded workspace refresh aggregate; focus and interval refresh retain current items. |
| Workspace issues and VM overview | `WorkspaceOverviewPage` | drain | Migrated bounded overview aggregates to independent shared collection controllers. |
| MCP server catalog | `McpServersView` | not paginated | Migrated visible lifecycle to one mounted `CollectionState`, retaining descriptor fallback servers during refresh. |
| MCP server tools | `McpServersView`, `McpServerToolsDialog` | sentinel | Migrated to `useCursorCollection`; active server tools remain visible during refresh and append. |
| Target tools | `TargetToolsView` | descriptor collection | Migrated visible table precedence to `DataTableStateRow`; descriptor refresh remains target-owned. |
| Target skills | `TargetSkillsInventory` | descriptor collection | Contextual non-cursor surface: target descriptor owns loading; filtering is synchronous and its existing dense inventory layout is retained. |
| Dashboard cluster catalog | `ClusterCatalog` | parent-owned collection | Migrated visible loading, filtered-empty, error, and retained-content precedence to `CollectionState`. |
| Target chat messages | target-chat synchronization hooks and transcript states | live/backfill exception | Sole cursor-hook exception: historical pages merge with streaming events. Visible initial loading, error, and empty precedence is standardized; decorative skeletons are hidden from assistive technology. |

The design check permits contextual exceptions only for async-looking branches
that are not collection renderers. Current exceptions cover a create form's
role options, a single insight editor, and a single capability preview. Each is
named with a durable rationale in `scripts/design-system-exceptions.json`.
