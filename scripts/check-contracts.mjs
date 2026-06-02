import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

const failures = [];

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function expectIncludes(content, needle, message) {
  expect(content.includes(needle), `${message}: missing ${needle}`);
}

const readme = read('README.md');
const doc = read('docs/contracts/README.md');
const manifest = JSON.parse(read('docs/contracts/manifest.json'));
const controlPlaneApi = read('src/services/controlPlaneApi.ts');
const controlPlaneAuthApi = read('src/services/control-plane/authApi.ts');
const kubernetesClusterApi = read('src/services/control-plane/kubernetesClusterApi.ts');
const targetApi = read('src/services/control-plane/targetApi.ts');
const controlPlaneToolRequests = read('src/services/control-plane/toolRequests.ts');
const controlPlaneApiSurface = `${controlPlaneApi}\n${controlPlaneAuthApi}\n${kubernetesClusterApi}\n${targetApi}\n${controlPlaneToolRequests}`;
const controlPlaneMapping = [
  read('src/types.ts'),
  controlPlaneApi,
  controlPlaneAuthApi,
  kubernetesClusterApi,
  targetApi,
  controlPlaneToolRequests,
  read('src/services/control-plane/clusterMappers.ts'),
  read('src/services/control-plane/toolMappers.ts'),
  read('src/services/control-plane/workspaceMappers.ts'),
  read('src/services/control-plane/types.ts')
].join('\n');
const clusterChat = [
  read('src/features/kubernetes-cluster-detail/hooks/useTargetChat.ts'),
  read('src/features/kubernetes-cluster-detail/hooks/chatRunTrace.ts'),
  read('src/features/kubernetes-cluster-detail/hooks/chatSessionSync.ts'),
  read('src/features/kubernetes-cluster-detail/hooks/chatSubmit.ts')
].join('\n');
const mcpServersSurface = [
  read('src/features/kubernetes-cluster-detail/components/detail/views/McpServersView.tsx'),
  read('src/features/kubernetes-cluster-detail/components/detail/views/mcpServersCatalog.ts')
].join('\n');
const controlPlaneContract = manifest.counterparts?.['control-plane'];

expectIncludes(readme, '[`docs/contracts/README.md`](docs/contracts/README.md)', 'README contract link');
expectIncludes(readme, '[`docs/contracts/manifest.json`](docs/contracts/manifest.json)', 'README manifest link');
expect(manifest.repo === 'management-console', 'Manifest repo');

for (const heading of [
  '# Management Console Contracts',
  '## Full Platform Matrix',
  '## Platform Dependency Summary',
  '## Shared Invariants',
  '## Control-Plane Contract'
]) {
  expectIncludes(doc, heading, 'Contract doc heading');
}

for (const [docPath, implNeedle, label] of [
  ['`GET /api/v1/auth/oidc/login?return_to=<management-console-url>`', '/api/v1/auth/oidc/login', 'Login path'],
  ['`GET /api/v1/auth/csrf`', '/api/v1/auth/csrf', 'CSRF token path'],
  ['`POST /api/v1/auth/password/login`', '/api/v1/auth/password/login', 'Password login path'],
  ['`POST /api/v1/auth/password/signup`', '/api/v1/auth/password/signup', 'Password signup path'],
  ['`POST /api/v1/auth/logout`', "/api/v1/auth/logout", 'Logout path'],
  ['`GET /api/v1/me`', "/api/v1/me", 'Current-user path'],
  ['`GET /api/v1/workspaces`', "/api/v1/workspaces", 'List workspaces path'],
  ['`POST /api/v1/workspaces`', "method: 'POST',\n      body: JSON.stringify({ name })", 'Create workspace request'],
  ['`GET /api/v1/workspaces/{workspaceId}`', 'getWorkspace(', 'Get workspace implementation'],
  ['`DELETE /api/v1/workspaces/{workspaceId}`', 'deleteWorkspace(', 'Delete workspace implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/members`', 'getWorkspaceMembers(', 'List workspace members implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/audit-log`', 'listWorkspaceAuditEvents(', 'List workspace audit log implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/invitations`', 'listWorkspaceInvitations(', 'List workspace invitations implementation'],
  ['`POST /api/v1/workspaces/{workspaceId}/invitations`', 'createWorkspaceInvitation(', 'Create workspace invitation implementation'],
  ['`DELETE /api/v1/workspaces/{workspaceId}/invitations/{invitationId}`', 'revokeWorkspaceInvitation(', 'Revoke workspace invitation implementation'],
  ['`GET /api/v1/workspace-invitations/{token}`', 'getWorkspaceInvitation(', 'Get workspace invitation implementation'],
  ['`POST /api/v1/workspace-invitations/{token}/accept`', 'acceptWorkspaceInvitation(', 'Accept workspace invitation implementation'],
  ['`POST /api/v1/workspaces/{workspaceId}/members`', 'addWorkspaceMember(', 'Add workspace member implementation'],
  ['`PATCH /api/v1/workspaces/{workspaceId}/members/{userId}`', 'updateWorkspaceMemberRole(', 'Update workspace member implementation'],
  ['`DELETE /api/v1/workspaces/{workspaceId}/members/{userId}`', 'deleteWorkspaceMember(', 'Delete workspace member implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters`', 'getClustersForWorkspace(', 'List clusters implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/investigations`', 'listWorkspaceInvestigations(', 'List investigations implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}`', 'getCluster(workspaceId', 'Cluster detail path'],
  ['`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/metrics/history`', 'getWorkspaceClusterMetricsHistory(', 'Batch cluster metrics history implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/metrics/history`', 'getClusterMetricsHistory(', 'Single cluster metrics history implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/resources`', 'listClusterResources(', 'List cluster resources implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/findings`', 'listClusterFindings(', 'List cluster findings implementation'],
  ['`POST /api/v1/workspaces/{workspaceId}/kubernetes-clusters`', 'registerCluster(', 'Cluster registration implementation'],
  ['`DELETE /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}`', 'deleteCluster(', 'Delete cluster implementation'],
  ['`POST /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/rotate-agent-key`', '/rotate-agent-key', 'Rotate agent-key path'],
  ['`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/pods/{namespace}/{podName}/logs`', 'getPodLogs(', 'Pod logs implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/tools/catalog`', '/tools/catalog', 'Tools catalog path'],
  ['`PATCH /api/v1/workspaces/{workspaceId}/targets/{targetId}/tools/{toolName}`', '/targets/${encodeURIComponent(targetId)}/tools/${encodeURIComponent(toolName)}`', 'Target tool patch path'],
  ['`GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers`', '/targets/${encodeURIComponent(targetId)}/mcp/servers', 'List target MCP servers path'],
  ['`GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}/tools`', 'listMcpServerTools(', 'List target MCP server tools implementation'],
  ['`POST /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers`', "createTargetMcpServer(", 'Create target MCP server implementation'],
  ['`PATCH /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}`', "updateTargetMcpServer(", 'Update target MCP server implementation'],
  ['`DELETE /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}`', "deleteTargetMcpServer(", 'Delete target MCP server implementation'],
  ['`POST /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}/test-connection`', '/test-connection', 'Test target MCP server path'],
  ['`POST /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/sessions`', 'createSession(', 'Create session implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/sessions`', 'listSessions(', 'List sessions implementation'],
  ['`DELETE /api/v1/sessions/{sessionId}`', 'deleteSession(', 'Delete session implementation'],
  ['`GET /api/v1/sessions/{sessionId}/messages`', 'getSessionMessages(', 'Get session messages implementation'],
  ['`POST /api/v1/sessions/{sessionId}/messages`', 'postSessionMessage(', 'Post session message implementation'],
  ['`GET /api/v1/runs/{runId}`', 'getRun(', 'Get run implementation'],
  ['`GET /api/v1/runs/{runId}/events`', 'getRunEvents(', 'Get run events implementation'],
  ['`GET /api/v1/runs/{runId}/stream`', '/stream', 'Run stream path'],
  ['`POST /api/v1/runs/{runId}/cancel`', 'method: \'POST\'', 'Run cancel method']
]) {
  expectIncludes(doc, docPath, `${label} doc`);
  expectIncludes(controlPlaneApiSurface, implNeedle, `${label} implementation`);
}

expectIncludes(doc, '`GET /api/v1/auth/oidc/callback`', 'OIDC callback doc');

expectIncludes(controlPlaneApiSurface, "credentials: 'include'", 'Cookie-backed auth');
expectIncludes(doc, '`credentials: include`', 'Cookie-backed auth doc');

for (const snapshotNeedle of [
  'latestSnapshot',
  'summary',
  'resourceSummary',
  'ControlPlaneResourcePageItem',
  'ControlPlaneFindingPageItem'
]) {
  expectIncludes(controlPlaneMapping, snapshotNeedle, 'Snapshot mapping');
}

for (const field of controlPlaneContract.snapshotFields) {
  expectIncludes(doc, field, 'Snapshot field doc');
}

for (const catalogField of [
  'editableRoles',
  'toolCounts',
  'enabledConfigured',
  'enabledEffective',
  'effectiveDisabledReason',
  'publicHeaders',
  'connectionStatus',
  'lastDiscoveryAt',
  'lastDiscoveryError'
]) {
  expectIncludes(doc, catalogField, 'Catalog field doc');
  expectIncludes(controlPlaneMapping, catalogField, 'Catalog field implementation');
}

for (const eventType of controlPlaneContract.eventTypes) {
  expectIncludes(doc, `\`${eventType}\``, 'Run event doc');
  expectIncludes(clusterChat, `event.type === '${eventType}'`, 'Run event handling');
}

expectIncludes(controlPlaneMapping, 'nextCursor', 'Cursor pagination contract type');
expectIncludes(controlPlaneApiSurface, 'page.nextCursor', 'Cursor pagination implementation');
expectIncludes(doc, '{ items, nextCursor? }', 'Cursor pagination doc');
expectIncludes(doc, '{ cluster, agentKey, installInstructions }', 'Cluster registration response doc');
expectIncludes(doc, '{ clusterId, agentKey, keyVersion, installInstructions }', 'Rotate agent-key response doc');
expectIncludes(doc, '`currentUserRole`', 'Workspace current-user role doc');
expectIncludes(doc, '`permissions.manage_members`', 'Workspace membership permission doc');
expectIncludes(doc, '`permissions.read_audit_log`', 'Workspace audit-log permission doc');
expectIncludes(doc, '`operation`', 'Workspace audit operation field doc');
expectIncludes(controlPlaneMapping, 'operation: WorkspaceAuditOperation', 'Workspace audit operation type');
expectIncludes(read('src/pages/WorkspaceAuditLogPage.tsx'), "t('auditLog.operation')", 'Workspace audit operation detail');
expectIncludes(doc, '`permissions.manage_targets`', 'Workspace permissions doc');
expectIncludes(controlPlaneMapping, 'currentUserRole', 'Workspace current-user role mapping');
expectIncludes(controlPlaneMapping, 'permissions: workspace.permissions', 'Workspace permissions mapping');
expectIncludes(controlPlaneApiSurface, 'listWorkspaceMembers(', 'Workspace members must be fetched from control plane');
expect(!controlPlaneMapping.includes('const currentMember'), 'Workspace mapping must not fabricate current-user membership');
expectIncludes(mcpServersSurface, 'editableRoles: []', 'Local catalog must not hard-code editable role keys');
expectIncludes(clusterChat, "canRequestWriteRuns ? 'read_write' : 'read_only'", 'Write-tool intent implementation');

for (const field of controlPlaneContract.responseFields.runEventFrame) {
  expectIncludes(doc, `\`${field}\``, 'Run event frame doc');
}

for (const field of controlPlaneContract.requestFields.postMessage) {
  expectIncludes(doc, `\`${field}\``, 'Post message request doc');
}

for (const field of controlPlaneContract.responseFields.postMessageAccepted) {
  expectIncludes(doc, `\`${field}\``, 'Post message response doc');
}

if (failures.length > 0) {
  console.error('Contract checks failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Contract checks passed.');
