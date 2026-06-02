import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

const api = read('src/services/controlPlaneApi.ts');
const workspaceMappers = read('src/services/control-plane/workspaceMappers.ts');
const app = read('src/App.tsx');
const appWorkspacePermissions = read('src/app/appWorkspacePermissions.ts');
const appPageContent = read('src/app/AppPageContent.tsx');
const appSupport = read('src/app/useAppSupport.ts');
const membersPage = read('src/pages/WorkspaceMembersPage.tsx');
const types = read('src/types.ts');
const contractsDoc = read('docs/contracts/README.md');
const appIntegration = `${app}\n${appPageContent}\n${appSupport}`;

for (const apiNeedle of [
  'ControlPlaneWorkspaceMember',
  'getWorkspaceMembers',
  'getWorkspaceRoles',
  'listWorkspaceMembers',
  'addWorkspaceMember',
  'listWorkspaceInvitations',
  'listWorkspaceInvitationsPage',
  'revokeWorkspaceInvitation',
  'updateWorkspaceMemberRole',
  'deleteWorkspaceMember'
]) {
  assert(api.includes(apiNeedle), `control-plane membership client missing ${apiNeedle}`);
}

for (const mapperNeedle of [
  'ControlPlaneWorkspaceMember',
  'mapWorkspaceMember',
  'mapWorkspace(workspace: ControlPlaneWorkspace, members'
]) {
  assert(workspaceMappers.includes(mapperNeedle), `control-plane membership mapper missing ${mapperNeedle}`);
}

assert(!workspaceMappers.includes('const currentMember'), 'control-plane workspace mapping must not fabricate current-user membership');
assert(types.includes('userId?: string'), 'project member type must preserve control-plane user id');
assert(types.includes('role: string'), 'project member role type must accept deployment role keys');
assert(types.includes('WorkspaceRoleTemplate'), 'project member type must preserve role template metadata');
assert(types.includes('read_audit_log: boolean'), 'workspace permissions must include audit-log read capability');

for (const appNeedle of [
  'refreshWorkspaceMembers',
  'refreshWorkspaceInvitations',
  "getWorkspacePermission(workspaceContext.id, 'manage_members')",
  'controlPlaneApi.createWorkspaceInvitation',
  'controlPlaneApi.revokeWorkspaceInvitation',
  'controlPlaneApi.updateWorkspaceMemberRole',
  'controlPlaneApi.deleteWorkspaceMember'
]) {
  assert(appIntegration.includes(appNeedle), `workspace members integration missing ${appNeedle}`);
}

assert(appPageContent.includes('WorkspaceAuditLogPage'), 'workspace audit log page must be routable');
assert(
  appWorkspacePermissions.includes('return false;'),
  'workspace permission lookup must fail closed when server metadata is missing'
);

for (const pageNeedle of [
  'canManageMembers',
  'roleTemplates',
  'controlPlaneApi.getWorkspaceRoles(workspace.id)',
  'controlPlaneApi.listWorkspaceMembers(workspace.id',
  'q: searchTerm',
  'role: roleFilter',
  'source: sourceFilter',
  "loadMembers('append', nextCursor)",
  'listWorkspaceInvitationsPage(workspace.id',
  "loadInvitations('append', nextInvitationCursor)",
  'onCreateInvitation',
  'onRevokeInvitation',
  'onUpdateMemberRole',
  'onRemoveMember',
  'formatMemberMutationError',
  'selectedMemberIsOnlyOwner'
]) {
  assert(membersPage.includes(pageNeedle), `workspace members UI missing ${pageNeedle}`);
}

assert(contractsDoc.includes('The UI must not fabricate a member row'), 'contract doc must ban fabricated membership');
assert(contractsDoc.includes('GET /api/v1/workspaces/{workspaceId}/roles'), 'contract doc must describe role templates endpoint');

console.log('Workspace membership UI checks passed.');
