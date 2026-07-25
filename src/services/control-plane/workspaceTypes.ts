import { ProjectMember, Workspace, WorkspaceInvitation, WorkspaceQuota, WorkspaceRoleTemplate } from '@/types';

export interface ControlPlaneWorkspace {
  id: string;
  name: string;
  plan?: Workspace['plan'];
  createdBy: string;
  currentUserRole?: ProjectMember['role'];
  currentUserRoleTemplate?: WorkspaceRoleTemplate;
  permissions?: Workspace['permissions'];
  clusterCount?: number;
  memberCount?: number;
  quota?: WorkspaceQuota;
}

export type ControlPlaneRoleTemplate = WorkspaceRoleTemplate;

export interface ControlPlaneWorkspaceMember {
  workspaceId: string;
  userId: string;
  email: string;
  displayName: string;
  role: ProjectMember['role'];
  roleTemplate?: WorkspaceRoleTemplate;
  source: 'oidc' | 'internal';
}

export interface ControlPlaneWorkspaceMemberCandidate {
  userId: string;
  email: string;
  displayName: string;
  authMethods: Array<'oidc' | 'password'>;
  status: 'available' | 'member' | 'invited';
}

export interface ControlPlaneWorkspaceMemberCandidateResponse {
  mode: 'disabled' | 'exact_email' | 'directory';
  items: ControlPlaneWorkspaceMemberCandidate[];
}

export interface ControlPlaneWorkspaceInvitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: ProjectMember['role'];
  roleTemplate?: WorkspaceRoleTemplate;
  invitedBy: string;
  status: WorkspaceInvitation['status'];
  acceptedBy?: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  token?: string;
}

export interface ControlPlaneAcceptWorkspaceInvitationResult {
  workspaceId: string;
  member: ControlPlaneWorkspaceMember;
}
