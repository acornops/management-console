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
const manifestText = JSON.stringify(manifest);
const controlPlaneApi = read('src/services/controlPlaneApi.ts');
const controlPlaneAuthApi = read('src/services/control-plane/authApi.ts');
const kubernetesClusterApi = read('src/services/control-plane/kubernetesClusterApi.ts');
const targetApi = read('src/services/control-plane/targetApi.ts');
const controlPlaneApiSurface = `${controlPlaneApi}\n${controlPlaneAuthApi}\n${kubernetesClusterApi}\n${targetApi}`;
const controlPlaneMapping = [
  read('src/types.ts'),
  controlPlaneApi,
  controlPlaneAuthApi,
  kubernetesClusterApi,
  targetApi,
  read('src/services/control-plane/clusterMappers.ts'),
  read('src/services/control-plane/toolMappers.ts'),
  read('src/services/control-plane/targetToolTypes.ts'),
  read('src/services/control-plane/workspaceMappers.ts'),
  read('src/services/control-plane/types.ts')
].join('\n');
const clusterChat = [
  read('src/features/targets/chat/hooks/useTargetChat.ts'),
  read('src/features/targets/chat/hooks/chatRunTrace.ts'),
  read('src/features/targets/chat/hooks/chatSessionSync.ts'),
  read('src/features/targets/chat/hooks/chatSubmit.ts')
].join('\n');
const mcpServersSurface = [
  read('src/features/targets/admin/McpServersView.tsx'),
  read('src/features/targets/admin/mcpServersCatalog.ts')
].join('\n');
const controlPlaneContract = manifest.counterparts?.['control-plane'];

expectIncludes(readme, '[`docs/contracts/README.md`](docs/contracts/README.md)', 'README contract link');
expectIncludes(readme, '[`docs/contracts/manifest.json`](docs/contracts/manifest.json)', 'README manifest link');
expect(manifest.repo === 'management-console', 'Manifest repo');

for (const heading of [
  '# Management Console Contracts',
  '## Source Of Truth',
  '## Full Platform Matrix',
  '## Platform Dependency Summary',
  '## Shared Invariants',
  '## Control-Plane Boundary Notes',
  '## Change Checklist'
]) {
  expectIncludes(doc, heading, 'Contract doc heading');
}

function docToken(value) {
  return value.replace(/^`|`$/g, '');
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
  ['`GET /api/v1/workspaces/{workspaceId}/ai-settings`', 'getWorkspaceAiSettings(', 'Get workspace AI settings implementation'],
  ['`PATCH /api/v1/workspaces/{workspaceId}/ai-settings`', 'updateWorkspaceAiSettings(', 'Update workspace AI settings implementation'],
  ['`PUT /api/v1/workspaces/{workspaceId}/ai-provider-credentials/{provider}`', 'saveWorkspaceAiProviderCredential(', 'Save workspace AI provider credential implementation'],
  ['`DELETE /api/v1/workspaces/{workspaceId}/ai-provider-credentials/{provider}`', 'deleteWorkspaceAiProviderCredential(', 'Delete workspace AI provider credential implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters`', 'getClustersForWorkspace(', 'List clusters implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/issues`', 'listWorkspaceIssues(', 'List issues implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/issues/{issueId}`', 'getWorkspaceIssue(', 'Get issue implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/issues/{issueId}/observations`', 'listIssueObservations(', 'List issue observations implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/issues`', 'listTargetIssues(', 'List target issues implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}`', 'getCluster(workspaceId', 'Cluster detail path'],
  ['`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/metrics/history`', 'getWorkspaceClusterMetricsHistory(', 'Batch cluster metrics history implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/metrics/history`', 'getClusterMetricsHistory(', 'Single cluster metrics history implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/resources`', 'listClusterResources(', 'List cluster resources implementation'],
  ['`POST /api/v1/workspaces/{workspaceId}/kubernetes-clusters`', 'registerCluster(', 'Cluster registration implementation'],
  ['`DELETE /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}`', 'deleteCluster(', 'Delete cluster implementation'],
  ['`POST /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/rotate-agent-key`', '/rotate-agent-key', 'Rotate agent-key path'],
  ['`GET /api/v1/workspaces/{workspaceId}/kubernetes-clusters/{clusterId}/pods/{namespace}/{podName}/logs`', 'getPodLogs(', 'Pod logs implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/catalog`', '/mcp/catalog', 'Target MCP catalog path'],
  ['`GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/tools`', 'listTargetTools(', 'Target tools implementation'],
  ['`PATCH /api/v1/workspaces/{workspaceId}/targets/{targetId}/tools/{toolId}`', "updateTargetTool(", 'Target tool settings implementation'],
  ['`PATCH /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}/tools/{toolName}`', "updateTargetMcpServerTool(", 'Target MCP tool patch implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers`', '/targets/${encodeURIComponent(targetId)}/mcp/servers', 'List target MCP servers path'],
  ['`GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}/tools`', 'listMcpServerTools(', 'List target MCP server tools implementation'],
  ['`POST /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers`', "createTargetMcpServer(", 'Create target MCP server implementation'],
  ['`PATCH /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}`', "updateTargetMcpServer(", 'Update target MCP server implementation'],
  ['`DELETE /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}`', "deleteTargetMcpServer(", 'Delete target MCP server implementation'],
  ['`POST /api/v1/workspaces/{workspaceId}/targets/{targetId}/mcp/servers/{serverId}/test-connection`', '/test-connection', 'Test target MCP server path'],
  ['`GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/skills`', 'listTargetSkills(', 'List target skills implementation'],
  ['`POST /api/v1/workspaces/{workspaceId}/targets/{targetId}/skills`', 'createTargetSkill(', 'Create target skill implementation'],
  ['`POST /api/v1/workspaces/{workspaceId}/targets/{targetId}/skills/import`', 'importTargetSkill(', 'Import target skill implementation'],
  ['`GET /api/v1/workspaces/{workspaceId}/targets/{targetId}/skills/{skillId}`', 'getTargetSkill(', 'Get target skill implementation'],
  ['`PATCH /api/v1/workspaces/{workspaceId}/targets/{targetId}/skills/{skillId}`', 'updateTargetSkill(', 'Update target skill implementation'],
  ['`DELETE /api/v1/workspaces/{workspaceId}/targets/{targetId}/skills/{skillId}`', 'deleteTargetSkill(', 'Delete target skill implementation'],
  ['`POST /api/v1/workspaces/{workspaceId}/targets/{targetId}/skills/{skillId}/reimport`', 'reimportTargetSkill(', 'Reimport target skill implementation'],
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
  expectIncludes(manifestText, docToken(docPath), `${label} manifest`);
  expectIncludes(controlPlaneApiSurface, implNeedle, `${label} implementation`);
}

expectIncludes(controlPlaneApiSurface, "credentials: 'include'", 'Cookie-backed auth');
expectIncludes(doc, '`credentials: include`', 'Cookie-backed auth doc');

for (const snapshotNeedle of [
  'latestSnapshot',
  'summary',
  'resourceSummary',
  'ControlPlaneResourcePageItem'
]) {
  expectIncludes(controlPlaneMapping, snapshotNeedle, 'Snapshot mapping');
}

for (const field of controlPlaneContract.snapshotFields) {
  expectIncludes(manifestText, field, 'Snapshot field manifest');
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
  'lastDiscoveryError',
  'targetType',
  'domainFilters',
  'allowedDomains',
  'blockedDomains'
]) {
  expectIncludes(manifestText, catalogField, 'Catalog field manifest');
  expectIncludes(controlPlaneMapping, catalogField, 'Catalog field implementation');
}

for (const eventType of controlPlaneContract.eventTypes) {
  expectIncludes(manifestText, eventType, 'Run event manifest');
  expectIncludes(clusterChat, `event.type === '${eventType}'`, 'Run event handling');
}
for (const field of [
  ...controlPlaneContract.toolCallCompletedPayloadFields,
  ...controlPlaneContract.toolCallCompletedContextMetaFields,
  ...controlPlaneContract.toolCallCompletedArtifactFields
]) {
  expectIncludes(clusterChat, field.replace(/\?$/, ''), 'Tool completion event field');
}
expect(controlPlaneContract.toolCallCompletedResultMaxBytes === 12 * 1024, 'Tool completion event byte limit');

expectIncludes(controlPlaneMapping, 'nextCursor', 'Cursor pagination contract type');
expectIncludes(controlPlaneApiSurface, 'page.nextCursor', 'Cursor pagination implementation');
expectIncludes(doc, '{ items, nextCursor? }', 'Cursor pagination doc');
expectIncludes(doc, '{ cluster, agentKey, installInstructions }', 'Cluster registration response doc');
expectIncludes(doc, '{ clusterId, agentKey, keyVersion, installInstructions }', 'Rotate agent-key response doc');
expectIncludes(doc, '`currentUserRole`', 'Workspace current-user role doc');
expectIncludes(doc, '`permissions.manage_members`', 'Workspace membership permission doc');
expectIncludes(doc, 'The UI must not fabricate a member row', 'Workspace membership fabrication doc');
expectIncludes(doc, 'GET /api/v1/workspaces/{workspaceId}/roles', 'Workspace roles endpoint doc');
expectIncludes(doc, '`permissions.read_audit_log`', 'Workspace audit-log permission doc');
expectIncludes(doc, '`operation`', 'Workspace audit operation field doc');
expectIncludes(doc, '`objectType`', 'Workspace audit object-type filter doc');
expectIncludes(doc, '`object`', 'Workspace audit object field doc');
expectIncludes(controlPlaneMapping, 'operation: WorkspaceAuditOperation', 'Workspace audit operation type');
expectIncludes(controlPlaneMapping, 'object: {', 'Workspace audit object type');
expectIncludes(controlPlaneApi, 'objectType: options?.objectType', 'Workspace audit object-type query filter');
expectIncludes(read('src/pages/WorkspaceAuditLogPage.tsx'), "t('auditLog.operation')", 'Workspace audit operation detail');
expectIncludes(read('src/pages/WorkspaceAuditLogPage.tsx'), "t('auditLog.object')", 'Workspace audit object detail');
expectIncludes(doc, '`permissions.manage_targets`', 'Workspace permissions doc');
expectIncludes(doc, '`permissions.manage_ai_settings`', 'Workspace AI settings permission doc');
expectIncludes(controlPlaneMapping, 'manage_ai_settings: boolean', 'Workspace AI settings permission type');
expectIncludes(controlPlaneMapping, 'WorkspaceAiSettings', 'Workspace AI settings type');
expectIncludes(controlPlaneApiSurface, 'ai-provider-credentials', 'Workspace AI provider credential path');
expectIncludes(doc, 'must never expect or display API key values', 'Workspace AI credential redaction doc');
expectIncludes(controlPlaneMapping, 'currentUserRole', 'Workspace current-user role mapping');
expectIncludes(controlPlaneMapping, 'permissions: workspace.permissions', 'Workspace permissions mapping');
expectIncludes(controlPlaneApiSurface, 'listWorkspaceMembers(', 'Workspace members must be fetched from control plane');
expect(!controlPlaneMapping.includes('const currentMember'), 'Workspace mapping must not fabricate current-user membership');
expectIncludes(mcpServersSurface, 'editableRoles: []', 'Local catalog must not hard-code editable role keys');
expectIncludes(clusterChat, "canRequestWriteRuns ? 'read_write' : 'read_only'", 'Write-tool intent implementation');

for (const field of controlPlaneContract.responseFields.runEventFrame) {
  expectIncludes(manifestText, field, 'Run event frame manifest');
}

for (const field of controlPlaneContract.requestFields.postMessage) {
  expectIncludes(manifestText, field, 'Post message request manifest');
}

for (const field of controlPlaneContract.responseFields.postMessageAccepted) {
  expectIncludes(manifestText, field, 'Post message response manifest');
}

if (failures.length > 0) {
  console.error('Contract checks failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Contract checks passed.');
