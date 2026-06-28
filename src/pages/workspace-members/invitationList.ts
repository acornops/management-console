import { WorkspaceInvitation } from '@/types';

function isSamePendingRecipient(current: WorkspaceInvitation, invitation: WorkspaceInvitation): boolean {
  return current.status === 'pending' && current.email === invitation.email && current.role === invitation.role;
}

export function mergeCreatedInvitation(
  current: WorkspaceInvitation[],
  invitation: WorkspaceInvitation
): WorkspaceInvitation[] {
  const replacementIndex = current.findIndex(
    (item) => item.id === invitation.id || isSamePendingRecipient(item, invitation)
  );
  const existing = replacementIndex >= 0 ? current[replacementIndex] : undefined;
  const nextInvitation = {
    ...invitation,
    inviteLink: invitation.inviteLink ?? existing?.inviteLink
  };

  if (replacementIndex === -1) {
    return [nextInvitation, ...current.filter((item) => item.id !== invitation.id)];
  }

  return current.reduce<WorkspaceInvitation[]>((items, item, index) => {
    if (index === replacementIndex) {
      items.push(nextInvitation);
      return items;
    }
    if (item.id !== invitation.id) {
      items.push(item);
    }
    return items;
  }, []);
}
