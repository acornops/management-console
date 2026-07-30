import { describe, expect, it, vi } from 'vitest';

import {
  createWorkspaceMemberAccess,
  type CreateWorkspaceMemberAccessDependencies
} from '@/app/createWorkspaceMemberAccess';
import type { ProjectMember, WorkspaceMemberCandidate } from '@/types';

const member: ProjectMember = {
  userId: 'user-1',
  email: 'existing@example.com',
  name: 'Existing User',
  role: 'member',
  source: 'Internal'
};

const candidate = (
  status: WorkspaceMemberCandidate['status'] = 'available'
): WorkspaceMemberCandidate => ({
  userId: 'user-1',
  email: 'Existing@Example.com',
  name: 'Existing User',
  authMethods: ['password'],
  status
});

function dependencies(
  items: WorkspaceMemberCandidate[],
  mode: 'disabled' | 'exact_email' | 'directory' = 'exact_email'
): CreateWorkspaceMemberAccessDependencies {
  return {
    searchWorkspaceMemberCandidates: vi.fn().mockResolvedValue({ mode, items }),
    addWorkspaceMember: vi.fn().mockResolvedValue(member),
    createWorkspaceInvitation: vi.fn().mockResolvedValue({
      id: 'invitation-1',
      email: 'new@example.com',
      role: 'member',
      status: 'pending',
      invitedBy: 'owner@example.com',
      createdAt: '2026-07-28T00:00:00.000Z',
      expiresAt: '2026-08-04T00:00:00.000Z',
      token: 'invite-token'
    })
  };
}

describe('create workspace member access', () => {
  it('adds a discovered exact email match directly instead of creating an invitation', async () => {
    const api = dependencies([candidate()]);

    const result = await createWorkspaceMemberAccess(
      'workspace-1',
      { email: ' existing@example.com ', role: 'member' },
      api
    );

    expect(api.searchWorkspaceMemberCandidates).toHaveBeenCalledWith(
      'workspace-1',
      'existing@example.com'
    );
    expect(api.addWorkspaceMember).toHaveBeenCalledWith('workspace-1', {
      userId: 'user-1',
      email: 'Existing@Example.com',
      role: 'member'
    });
    expect(api.createWorkspaceInvitation).not.toHaveBeenCalled();
    expect(result).toEqual({ kind: 'member', member });
  });

  it('does not create another invitation when an exact candidate is already invited', async () => {
    const api = dependencies([candidate('invited')]);
    vi.mocked(api.addWorkspaceMember).mockRejectedValueOnce(new Error('Invitation already pending'));

    await expect(
      createWorkspaceMemberAccess(
        'workspace-1',
        { email: 'existing@example.com', role: 'member' },
        api
      )
    ).rejects.toThrow('Invitation already pending');

    expect(api.createWorkspaceInvitation).not.toHaveBeenCalled();
  });

  it('creates an invitation when discovery does not find the email', async () => {
    const api = dependencies([]);

    const result = await createWorkspaceMemberAccess(
      'workspace-1',
      { email: 'NEW@example.com', role: 'member' },
      api
    );

    expect(api.addWorkspaceMember).not.toHaveBeenCalled();
    expect(api.createWorkspaceInvitation).toHaveBeenCalledWith('workspace-1', {
      email: 'new@example.com',
      role: 'member'
    });
    expect(result.kind).toBe('invitation');
  });

  it('keeps invitation behavior when member discovery is disabled', async () => {
    const api = dependencies([], 'disabled');

    await createWorkspaceMemberAccess(
      'workspace-1',
      { email: 'new@example.com', role: 'member' },
      api
    );

    expect(api.addWorkspaceMember).not.toHaveBeenCalled();
    expect(api.createWorkspaceInvitation).toHaveBeenCalledOnce();
  });
});
