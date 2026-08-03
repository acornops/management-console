import { formatMemberMutationError } from '@/pages/workspace-members/memberUtils';
import type {
  ProjectMember,
  Workspace,
  WorkspaceAiSettings,
  WorkspaceInvitation,
  WorkspaceMemberAccessResult,
  WorkspaceRoleTemplate
} from '@/types';

export interface CreateWorkspaceModalProps {
  isOpen: boolean;
  currentUserEmail: string;
  onClose: () => void;
  onCreateWorkspace: (name: string) => Promise<Workspace>;
  onLoadWorkspaceAiSettings: (workspaceId: string) => Promise<WorkspaceAiSettings>;
  onOpenAiSettings: (workspaceId: string) => void;
  onLoadWorkspaceRoles: (workspaceId: string) => Promise<WorkspaceRoleTemplate[]>;
  onAddOrInviteWorkspaceMember: (
    workspaceId: string,
    input: { email: string; role: ProjectMember['role'] }
  ) => Promise<WorkspaceMemberAccessResult>;
}

export type CreateWorkspaceStep = 'details' | 'members' | 'ai';

export interface CreateWorkspaceInviteRow {
  id: string;
  email: string;
  role: ProjectMember['role'];
  status?: 'idle' | 'creating' | 'created' | 'failed';
  error?: string;
  member?: ProjectMember;
  invitation?: WorkspaceInvitation;
}

export const MAX_CREATE_WORKSPACE_INVITE_ROWS = 5;

function createRowId(): string {
  return globalThis.crypto?.randomUUID?.() || `invite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createInviteRow(role: ProjectMember['role'] = ''): CreateWorkspaceInviteRow {
  return {
    id: createRowId(),
    email: '',
    role,
    status: 'idle'
  };
}

export function defaultInviteRole(roles: WorkspaceRoleTemplate[]): ProjectMember['role'] {
  return roles.find((role) => !role.protected)?.key || roles[0]?.key || '';
}

export function formatWorkspaceCreationError(error: unknown, fallback: string): string {
  return formatMemberMutationError(error, fallback);
}

export function hasInheritedPlatformLlmCredential(settings: WorkspaceAiSettings): boolean {
  return settings.providers.some(
    (provider) => provider.configured && provider.source === 'platform_default'
  );
}

export function shouldShowAiProviderStep(hasInheritedLlmCredential: boolean | null): boolean {
  return hasInheritedLlmCredential === false;
}

export function normalizeInviteEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidWorkspaceInviteEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isSelfInviteEmail(value: string, currentUserEmail: string): boolean {
  return Boolean(currentUserEmail.trim()) && normalizeInviteEmail(value) === normalizeInviteEmail(currentUserEmail);
}

export function getDuplicateInviteEmailKeys(rows: CreateWorkspaceInviteRow[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const row of rows) {
    if (row.status === 'created') continue;
    const email = normalizeInviteEmail(row.email);
    if (!email) continue;
    if (seen.has(email)) duplicates.add(email);
    seen.add(email);
  }
  return duplicates;
}

export function getSubmittableInviteRows(rows: CreateWorkspaceInviteRow[]): CreateWorkspaceInviteRow[] {
  return rows.filter((row) => row.status !== 'created' && Boolean(row.email.trim()));
}
