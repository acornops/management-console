import React from 'react';
import { createWorkspaceMemberAccess } from '@/app/createWorkspaceMemberAccess';
import { mergeCreatedInvitation } from '@/pages/workspace-members/invitationList';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { controlPlaneApi as ControlPlaneApi } from '@/services/controlPlaneApi';
import type {
  ProjectMember,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMemberAccessResult,
  WorkspaceRoleTemplate
} from '@/types';

interface UseCreateWorkspaceInviteSetupInput {
  invitationTokenMissingMessage: string;
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>;
  toWorkspaceInvitation: (invitation: Awaited<ReturnType<typeof ControlPlaneApi.createWorkspaceInvitation>>) => WorkspaceInvitation;
}

export function useCreateWorkspaceInviteSetup({
  invitationTokenMissingMessage,
  setWorkspaces,
  toWorkspaceInvitation
}: UseCreateWorkspaceInviteSetupInput): {
  loadWorkspaceRoles: (workspaceId: string) => Promise<WorkspaceRoleTemplate[]>;
  addOrInviteWorkspaceMember: (
    workspaceId: string,
    input: { email: string; role: ProjectMember['role'] }
  ) => Promise<WorkspaceMemberAccessResult>;
} {
  const loadWorkspaceRoles = React.useCallback(
    (workspaceId: string): Promise<WorkspaceRoleTemplate[]> => controlPlaneApi.getWorkspaceRoles(workspaceId),
    []
  );
  const addOrInviteWorkspaceMember = React.useCallback(
    async (
      workspaceId: string,
      input: { email: string; role: ProjectMember['role'] }
    ): Promise<WorkspaceMemberAccessResult> => {
      const result = await createWorkspaceMemberAccess(workspaceId, input);
      if (result.kind === 'member') {
        setWorkspaces((current) =>
          current.map((workspace) => {
            if (workspace.id !== workspaceId) return workspace;
            const alreadyPresent = workspace.members.some((member) =>
              result.member.userId
                ? member.userId === result.member.userId
                : member.email.trim().toLowerCase() === result.member.email.trim().toLowerCase()
            );
            return {
              ...workspace,
              members: alreadyPresent ? workspace.members : [...workspace.members, result.member],
              memberCount:
                !alreadyPresent && workspace.memberCount !== undefined
                  ? workspace.memberCount + 1
                  : workspace.memberCount
            };
          })
        );
        return result;
      }

      if (!result.invitation.token) {
        throw new Error(invitationTokenMissingMessage);
      }
      const mappedInvitation = toWorkspaceInvitation(result.invitation);
      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === workspaceId
            ? {
                ...workspace,
                invitations: mergeCreatedInvitation(workspace.invitations || [], mappedInvitation)
              }
            : workspace
        )
      );
      return { kind: 'invitation', invitation: mappedInvitation };
    },
    [invitationTokenMissingMessage, setWorkspaces, toWorkspaceInvitation]
  );

  return { loadWorkspaceRoles, addOrInviteWorkspaceMember };
}
