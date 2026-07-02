import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { ProjectMember, WorkspaceInvitation, WorkspaceRoleTemplate } from '@/types';

export function formatRole(role: string, template?: WorkspaceRoleTemplate): string {
  if (template?.displayName) return template.displayName;
  return role
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || role;
}

export function formatInvitationStatus(status: WorkspaceInvitation['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getInitials(member: ProjectMember): string {
  return member.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export function formatMemberMutationError(error: unknown, fallback: string, ownerConflictMessage = fallback): string {
  const formatted = formatControlPlaneError(error, fallback, { area: 'members', ownerConflictMessage });
  const rawMessage = formatted || fallback;
  const jsonMatch = rawMessage.match(/\{[\s\S]*\}$/);
  const jsonText = rawMessage.trim().startsWith('{') ? rawMessage.trim() : jsonMatch?.[0];

  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText) as {
        error?: string | { message?: string; detail?: string; code?: string };
        message?: string;
        detail?: string;
      };
      let parsedMessage = parsed.message || parsed.detail;
      if (typeof parsed.error === 'object' && parsed.error) {
        parsedMessage = parsed.error.message || parsed.error.detail || parsed.error.code || parsedMessage;
      } else if (typeof parsed.error === 'string') {
        parsedMessage = parsed.error || parsedMessage;
      }
      if (parsedMessage) {
        return formatMemberMutationError(new Error(parsedMessage), fallback, ownerConflictMessage);
      }
    } catch {
      // Fall through to keyword normalization below.
    }
  }

  if (/only owner|last owner|sole owner|at least one owner|must have.*owner/i.test(rawMessage)) {
    return ownerConflictMessage;
  }

  return rawMessage || fallback;
}
