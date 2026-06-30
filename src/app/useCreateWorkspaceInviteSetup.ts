import React from 'react';
import { mergeCreatedInvitation } from '@/pages/workspace-members/invitationList';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { controlPlaneApi as ControlPlaneApi } from '@/services/controlPlaneApi';
import type { ProjectMember, Workspace, WorkspaceInvitation, WorkspaceRoleTemplate } from '@/types';

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
  createWorkspaceInvitation: (
    workspaceId: string,
    input: { email: string; role: ProjectMember['role'] }
  ) => Promise<WorkspaceInvitation>;
} {
  const loadWorkspaceRoles = React.useCallback(
    (workspaceId: string): Promise<WorkspaceRoleTemplate[]> => controlPlaneApi.getWorkspaceRoles(workspaceId),
    []
  );
  const createWorkspaceInvitation = React.useCallback(
    async (workspaceId: string, input: { email: string; role: ProjectMember['role'] }): Promise<WorkspaceInvitation> => {
      const invitation = await controlPlaneApi.createWorkspaceInvitation(workspaceId, input);
      if (!invitation.token) {
        throw new Error(invitationTokenMissingMessage);
      }
      const mappedInvitation = toWorkspaceInvitation(invitation);
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
      return mappedInvitation;
    },
    [invitationTokenMissingMessage, setWorkspaces, toWorkspaceInvitation]
  );

  return { loadWorkspaceRoles, createWorkspaceInvitation };
}
