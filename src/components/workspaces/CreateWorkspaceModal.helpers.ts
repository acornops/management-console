import type { ProjectMember, WorkspaceAiSettings, WorkspaceInvitation } from '@/types';

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

export function hasInheritedPlatformLlmCredential(settings: WorkspaceAiSettings): boolean {
  return settings.providers.some(
    (provider) => provider.configured && provider.source === 'platform_default'
  );
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
