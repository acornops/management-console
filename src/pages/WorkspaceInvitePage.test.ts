import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
const appShell = readFileSync(resolve(root, 'src/app/AppShell.tsx'), 'utf8');
const invitationRestore = readFileSync(resolve(root, 'src/app/usePostLogoutInvitationRestore.ts'), 'utf8');
const invitePage = readFileSync(resolve(root, 'src/pages/WorkspaceInvitePage.tsx'), 'utf8');

describe('workspace invitation account switching', () => {
  it('offers an account switch for a pending invitation addressed to another user', () => {
    expect(invitePage).toContain("invitation.status === 'pending' && isCurrentUserExpected");
    expect(invitePage).toContain("invitation.status === 'pending' ? (");
    expect(invitePage).toContain('onClick={onSwitchAccount}');
    expect(invitePage).toContain("t('invite.signOutAndSwitch')");
  });

  it('preserves the invitation route through the logout boundary', () => {
    expect(appShell).toContain('handleLogout(AppPaths.workspaceInvitation(token))');
    expect(app).toContain('usePostLogoutInvitationRestore(');
    expect(invitationRestore).toContain('consumePostLogoutInvitationPath()');
    expect(invitationRestore).toContain('navigate(invitationPath, { replace: true })');
  });
});
