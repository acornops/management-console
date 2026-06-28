import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const membersPage = readFileSync(resolve(root, 'src/pages/WorkspaceMembersPage.tsx'), 'utf8');
const memberRoleCell = readFileSync(resolve(root, 'src/pages/workspace-members/MemberRoleCell.tsx'), 'utf8');
const memberDetailsPanel = readFileSync(resolve(root, 'src/pages/workspace-members/WorkspaceMemberDetailsPanel.tsx'), 'utf8');
const roleChangeConfirmation = readFileSync(resolve(root, 'src/pages/workspace-members/RoleChangeConfirmation.tsx'), 'utf8');
const invitationsPanel = readFileSync(resolve(root, 'src/pages/workspace-members/WorkspaceInvitationsPanel.tsx'), 'utf8');
const invitationList = readFileSync(resolve(root, 'src/pages/workspace-members/invitationList.ts'), 'utf8');
const appPageContent = readFileSync(resolve(root, 'src/app/AppPageContent.tsx'), 'utf8');
const membersSurface = `${membersPage}\n${memberRoleCell}\n${memberDetailsPanel}\n${roleChangeConfirmation}`;

describe('WorkspaceMembersPage member role management', () => {
  it('keeps role changes in the member details confirmation flow instead of the table', () => {
    expect(membersPage).not.toContain('canEditMemberRole');
    expect(membersPage).not.toContain('rowRoleOptions');
    expect(membersPage).not.toContain('changeMemberRoleFromRow');
    expect(memberRoleCell).not.toContain('<Select');
    expect(memberRoleCell).not.toContain('manageRoleFromDetails');
    expect(memberRoleCell).toContain('formatRole(member.role, roleTemplate)');
  });

  it('keeps protected roles disabled for non-owner managers', () => {
    expect(membersPage).toContain('disabled: role.protected && !canManageOwners');
    expect(membersPage).toContain('pendingRoleTemplate?.protected && !canManageOwners');
    expect(membersPage).toContain("setErrorMessage(t('members.ownerRoleChangeOnly'))");
  });

  it('blocks known sole-owner demotion before the confirmation mutation', () => {
    expect(membersPage).toContain('selectedMemberIsOnlyOwner && pendingRole !== \'owner\'');
    expect(membersPage).toContain("setErrorMessage(t('members.onlyOwnerChangeWarning'))");
  });

  it('shows selected role capability previews and an explicit role-change confirmation in the member detail panel', () => {
    expect(membersSurface).toContain('<RoleTemplatePreview');
    expect(membersSurface).toContain('roleTemplate={pendingRoleTemplate}');
    expect(membersSurface).toContain('<RoleChangeConfirmation');
    expect(membersSurface).toContain('hasPendingRoleChange={hasPendingRoleChange}');
    expect(membersSurface).toContain("t('members.confirmRoleChange')");
    expect(membersSurface).toContain("emptyMessage={t('members.rolePreviewUnavailable')}");
    expect(membersPage).not.toContain("t('members.accessSummaryBody')");
  });

  it('removes the standalone supported roles section from the page', () => {
    expect(membersPage).not.toContain('SupportedRolesList');
    expect(membersPage).not.toContain("t('members.supportedRoles')");
    expect(membersPage).not.toContain("t('members.supportedRolesBody')");
  });

  it('hides the pending invitations surface when there is no invitation work', () => {
    expect(membersPage).toContain('const hasInvitationWork = Boolean(');
    expect(membersPage).toContain('invitations.some((invitation) => invitation.status === \'pending\' || invitation.status === \'expired\')');
    expect(membersPage).toContain('{hasInvitationWork && (');
    expect(membersPage).toContain('<WorkspaceInvitationsPanel');
  });

  it('keeps pending invitations as a quiet expandable section', () => {
    expect(invitationsPanel).toContain('const [isExpanded, setIsExpanded]');
    expect(invitationsPanel).toContain('const shouldShowInvitations = isExpanded || Boolean(inviteErrorMessage) || Boolean(loadError);');
    expect(invitationsPanel).toContain("t('members.showInvitations')");
    expect(invitationsPanel).toContain("t('members.hideInvitations')");
    expect(invitationsPanel).toContain('aria-expanded={shouldShowInvitations}');
  });

  it('does not repeat raw-link availability guidance on every pending invitation row', () => {
    expect(invitationsPanel).not.toContain("t('members.inviteLinkUnavailable')");
    expect(invitationsPanel).toContain("t('members.recreateInvite')");
  });

  it('shows replacement invite links in a focused dialog instead of relying on a row button morph', () => {
    expect(invitationsPanel).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(invitationsPanel).toContain('const [createdReplacementInvite, setCreatedReplacementInvite]');
    expect(invitationsPanel).toContain('const replacementInvite = await onCreateInvitation');
    expect(invitationsPanel).toContain('setCreatedReplacementInvite(replacementInvite)');
    expect(invitationsPanel).toContain("t('members.replacementInviteCreated')");
    expect(invitationsPanel).toContain("aria-label={t('members.closeReplacementInvite')}");
    expect(invitationsPanel).toContain('value={createdReplacementInvite.inviteLink}');
  });

  it('gives the replacement invite-link dialog enough width and breathing room for long links', () => {
    expect(invitationsPanel).toContain('max-w-2xl');
    expect(invitationsPanel).toContain('sm:px-8');
    expect(invitationsPanel).toContain('rounded-lg border border-ui-border bg-ui-bg p-5');
    expect(invitationsPanel).toContain('min-h-11');
    expect(invitationsPanel).not.toContain('max-w-lg');
  });

  it('preserves returned replacement invite links when merging invitations into page state', () => {
    expect(invitationList).toContain('inviteLink: invitation.inviteLink ?? existing?.inviteLink');
  });

  it('keeps replacement invite rows in place instead of moving them to the top', () => {
    expect(membersPage).toContain('mergeCreatedInvitation(current, invitation)');
    expect(appPageContent).toContain('mergeCreatedInvitation(workspaceContext.invitations || [], mappedInvitation)');
    expect(invitationList).toContain('const replacementIndex = current.findIndex');
    expect(invitationList).toContain('isSamePendingRecipient(item, invitation)');
    expect(membersPage).not.toContain('...current.filter((item) => item.id !== invitation.id)');
    expect(membersPage).not.toContain('const existing = current.find((item) => item.id === invitation.id);');
  });

  it('keeps the members surface compact and avoids empty pagination spacers', () => {
    expect(membersPage).not.toContain('max-w-[1240px]');
    expect(membersPage).toContain('table-fixed');
    expect(membersPage).toContain('md:table-cell');
    expect(membersPage).not.toContain('<thead className="block">');
    expect(membersPage).not.toContain('<tbody className="block">');
    expect(membersPage).not.toContain('grid grid-cols-[minmax(12rem,1fr)_7.5rem_3.75rem]');
    expect(membersPage).not.toContain('md:grid-cols-[minmax(14rem,1.4fr)_minmax(7.5rem,0.7fr)_minmax(5.5rem,0.45fr)_minmax(7.5rem,0.7fr)_3.75rem]');
    expect(membersPage).not.toContain('lg:grid-cols-[minmax(20rem,1.45fr)_minmax(9rem,0.55fr)_minmax(8rem,0.45fr)_minmax(9rem,0.55fr)_4rem]');
    expect(membersPage).not.toContain('lg:grid-cols-[minmax(18rem,24rem)_9rem_8rem_9rem_4rem]');
    expect(membersPage).not.toContain('minmax(1rem,1fr)_5.5rem');
    expect(membersPage).toContain('<span className="sr-only">{t(\'members.manage\')}</span>');
    expect(membersPage).toContain('type-panel-title truncate');
    expect(membersPage).toContain('{nextCursor && (');
    expect(invitationsPanel).toContain('{hasMoreInvitations && (');
  });

  it('keeps the member manage row action on the shared tooltip primitive', () => {
    expect(membersPage).toContain("<Tooltip content={t('members.manageNamed', { name: member.name })}>");
    expect(membersPage).toContain("aria-label={t('members.manageNamed', { name: member.name })}");
  });

  it('separates member empty, filtered empty, member-load, and role-load messages', () => {
    expect(membersPage).toContain('roleLoadError');
    expect(membersPage).toContain("t('members.supportedRolesLoadFailed')");
    expect(membersPage).toContain("t('members.loadMembersFailed')");
    expect(membersPage).toContain("t('members.empty')");
    expect(membersPage).toContain("hasMemberFilters ? t('members.emptyFiltered') : t('members.empty')");
    expect(membersPage).not.toContain("setListError(error instanceof Error ? error.message : t('members.emptyFiltered'))");
  });

  it('gives filtered member lists an explicit recovery path', () => {
    expect(membersPage).toContain('const clearMemberFilters = () => {');
    expect(membersPage).toContain("setSearchTerm('');");
    expect(membersPage).toContain("setRoleFilter('all');");
    expect(membersPage).toContain("setSourceFilter('all');");
    expect(membersPage).toContain("hasMemberFilters && (");
    expect(membersPage).toContain("t('members.clearFilters')");
  });

  it('surfaces invitation list failures instead of logging them only to the console', () => {
    expect(membersPage).toContain('const [invitationListError, setInvitationListError]');
    expect(membersPage).toContain("setInvitationListError(t('members.loadInvitationsFailed'))");
    expect(membersPage).toContain('invitationListError ||');
    expect(membersPage).toContain("loadError={invitationListError}");
    expect(membersPage).not.toContain("console.error('Failed loading workspace invitations'");
  });
});
