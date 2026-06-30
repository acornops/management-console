import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const appDialogs = readFileSync(resolve(root, 'src/app/AppDialogs.tsx'), 'utf8');
const appShell = readFileSync(resolve(root, 'src/app/AppShell.tsx'), 'utf8');
const createWorkspaceInviteSetup = readFileSync(resolve(root, 'src/app/useCreateWorkspaceInviteSetup.ts'), 'utf8');
const workspaceClusterActions = readFileSync(resolve(root, 'src/app/useWorkspaceClusterActions.ts'), 'utf8');
const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');

describe('workspace create flow wiring', () => {
  it('renders the dedicated two-step workspace create modal from AppDialogs', () => {
    expect(appDialogs).toContain("import { CreateWorkspaceModal } from '@/components/workspaces/CreateWorkspaceModal'");
    expect(appDialogs).toContain('<CreateWorkspaceModal');
    expect(appDialogs).toContain('currentUserEmail={currentUserEmail}');
    expect(appDialogs).toContain('onLoadWorkspaceRoles={onLoadWorkspaceRoles}');
    expect(appDialogs).toContain('onCreateWorkspaceInvitation={onCreateWorkspaceInvitation}');
    expect(appDialogs).not.toContain('newWorkspaceName');
    expect(appDialogs).not.toContain('onWorkspaceNameChange');
  });

  it('returns the created workspace from the app action instead of closing immediately', () => {
    expect(workspaceClusterActions).toContain('const handleCreateWorkspace = async (name: string): Promise<Workspace> => {');
    expect(workspaceClusterActions).toContain('const createdWorkspace = await controlPlaneApi.createWorkspace(name, user);');
    expect(workspaceClusterActions).toContain('navigate(AppPaths.workspaceOverview(createdWorkspace.id), { replace: true });');
    expect(workspaceClusterActions).toContain('return createdWorkspace;');
    expect(app).not.toContain('newWorkspaceName');
    expect(app).not.toContain('setNewWorkspaceName');
  });

  it('loads roles and preserves one-time invitation links in workspace state', () => {
    expect(appShell).toContain('useCreateWorkspaceInviteSetup({');
    expect(createWorkspaceInviteSetup).toContain('controlPlaneApi.getWorkspaceRoles(workspaceId)');
    expect(appShell).toContain('currentUserEmail={currentUserEmail}');
    expect(createWorkspaceInviteSetup).toContain('controlPlaneApi.createWorkspaceInvitation(workspaceId, input)');
    expect(createWorkspaceInviteSetup).toContain('if (!invitation.token)');
    expect(createWorkspaceInviteSetup).toContain('throw new Error(invitationTokenMissingMessage);');
    expect(createWorkspaceInviteSetup).toContain('mergeCreatedInvitation(workspace.invitations || [], mappedInvitation)');
    expect(appShell).toContain('onLoadWorkspaceRoles={loadWorkspaceRoles}');
    expect(appShell).toContain('onCreateWorkspaceInvitation={createWorkspaceInvitation}');
    expect(app).toContain('currentUserEmail={user.email}');
    expect(app).toContain("invitationTokenMissingMessage={t('app.invitationTokenMissing')}");
  });
});
