import { describe, expect, it } from 'vitest';

import { membersPage } from './stylesTestSupport';

describe('workspace member style contracts', () => {
  it('keeps workspace member access changes deliberate and stable', () => {
    expect(membersPage).toContain('confirmRemoveMember');
    expect(membersPage).toContain('setIsConfirmingRemove(true)');
    expect(membersPage).toContain('members.confirmRemoveAccess');
    expect(membersPage).toContain('members.confirmRoleChange');
    expect(membersPage).not.toContain('changeMemberRoleFromRow');
    expect(membersPage).not.toContain('variants={tableVariants} initial="hidden" animate="show"');
    expect(membersPage).not.toContain('variants={rowVariants}');
  });

  it('preserves one-time invitation links while invitation pages refresh', () => {
    expect(membersPage).toContain('inviteLink: existingById.get(invitation.id)?.inviteLink');
    expect(membersPage).toContain('onCreateInvitation ? createInvitation : undefined');
    expect(membersPage).not.toContain('[loadInvitations, workspace.id, workspace.invitations]');
  });
});
