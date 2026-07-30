import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ProjectMember, WorkspaceMemberCandidate, WorkspaceMemberDiscoveryMode } from '@/types';

type WorkspaceInvitationResponse = Awaited<ReturnType<typeof controlPlaneApi.createWorkspaceInvitation>>;

export interface CreateWorkspaceMemberAccessDependencies {
  searchWorkspaceMemberCandidates: (
    workspaceId: string,
    query: string
  ) => Promise<{ mode: WorkspaceMemberDiscoveryMode; items: WorkspaceMemberCandidate[] }>;
  addWorkspaceMember: (
    workspaceId: string,
    input: { userId: string; email: string; role: ProjectMember['role'] }
  ) => Promise<ProjectMember>;
  createWorkspaceInvitation: (
    workspaceId: string,
    input: { email: string; role: ProjectMember['role'] }
  ) => Promise<WorkspaceInvitationResponse>;
}

type CreateWorkspaceMemberAccessResult =
  | { kind: 'member'; member: ProjectMember }
  | { kind: 'invitation'; invitation: WorkspaceInvitationResponse };

const defaultDependencies: CreateWorkspaceMemberAccessDependencies = {
  searchWorkspaceMemberCandidates: (workspaceId, query) =>
    controlPlaneApi.searchWorkspaceMemberCandidates(workspaceId, query),
  addWorkspaceMember: (workspaceId, input) => controlPlaneApi.addWorkspaceMember(workspaceId, input),
  createWorkspaceInvitation: (workspaceId, input) =>
    controlPlaneApi.createWorkspaceInvitation(workspaceId, input)
};

export async function createWorkspaceMemberAccess(
  workspaceId: string,
  input: { email: string; role: ProjectMember['role'] },
  dependencies: CreateWorkspaceMemberAccessDependencies = defaultDependencies
): Promise<CreateWorkspaceMemberAccessResult> {
  const email = input.email.trim().toLowerCase();
  const discovery = await dependencies.searchWorkspaceMemberCandidates(workspaceId, email);
  const candidate = discovery.items.find(
    (item) => item.email.trim().toLowerCase() === email
  );

  if (candidate) {
    const member = await dependencies.addWorkspaceMember(workspaceId, {
      userId: candidate.userId,
      email: candidate.email,
      role: input.role
    });
    return { kind: 'member', member };
  }

  const invitation = await dependencies.createWorkspaceInvitation(workspaceId, {
    email,
    role: input.role
  });
  return { kind: 'invitation', invitation };
}
