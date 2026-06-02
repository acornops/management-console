import { ProjectMember, Workspace } from '@/types';
import { ControlPlaneWorkspace, ControlPlaneWorkspaceMember } from './types';

export function mapWorkspaceMember(member: ControlPlaneWorkspaceMember): ProjectMember {
  return {
    userId: member.userId,
    email: member.email,
    name: member.displayName || member.email,
    role: member.role,
    roleTemplate: member.roleTemplate,
    source: member.source === 'oidc' ? 'OIDC' : 'Internal'
  };
}

export function mapWorkspace(workspace: ControlPlaneWorkspace, members: ProjectMember[] = []): Workspace {
  const currentUserRole = workspace.currentUserRole || 'viewer';
  return {
    id: workspace.id,
    name: workspace.name,
    description: '',
    plan: workspace.plan,
    members,
    currentUserRole,
    currentUserRoleTemplate: workspace.currentUserRoleTemplate,
    permissions: workspace.permissions,
    clusterCount: typeof workspace.clusterCount === 'number' ? workspace.clusterCount : 0,
    memberCount: typeof workspace.memberCount === 'number' ? workspace.memberCount : members.length,
    quota: workspace.quota,
    clusterIds: []
  };
}
