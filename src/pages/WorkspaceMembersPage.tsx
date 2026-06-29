import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, MoreVertical, Search, UserPlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { TableLoadingRows } from '@/components/common/Loading';
import { Select, SelectOption } from '@/components/common/Select';
import { Tooltip } from '@/components/common/Tooltip';
import { formInputClassName } from '@/components/common/formControlStyles';
import { fadeTransition, headerMotion } from '@/lib/motion';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { ProjectMember, Workspace, WorkspaceInvitation, WorkspaceRoleTemplate } from '@/types';
import { WorkspaceInvitationsPanel } from '@/pages/workspace-members/WorkspaceInvitationsPanel';
import { WorkspaceInviteModal } from '@/pages/workspace-members/WorkspaceInviteModal';
import { formatMemberMutationError, formatRole, getInitials } from '@/pages/workspace-members/memberUtils';
import { MemberRoleCell } from '@/pages/workspace-members/MemberRoleCell';
import { WorkspaceMemberDetailsPanel } from '@/pages/workspace-members/WorkspaceMemberDetailsPanel';
import { mergeCreatedInvitation } from '@/pages/workspace-members/invitationList';

interface WorkspaceMembersPageProps {
  workspace: Workspace;
  canManageMembers: boolean;
  currentUserRole: ProjectMember['role'];
  embedded?: boolean;
  onCreateInvitation?: (input: { email: string; role: ProjectMember['role'] }) => Promise<WorkspaceInvitation>;
  onRevokeInvitation?: (invitation: WorkspaceInvitation) => Promise<void> | void;
  onUpdateMemberRole?: (member: ProjectMember, role: ProjectMember['role']) => Promise<void> | void;
  onRemoveMember?: (member: ProjectMember) => Promise<void> | void;
}

const memberSearchInputClassName = formInputClassName('py-3 pl-11 pr-4 font-normal');

export const WorkspaceMembersPage: React.FC<WorkspaceMembersPageProps> = ({
  workspace,
  canManageMembers,
  currentUserRole,
  embedded = false,
  onCreateInvitation,
  onRevokeInvitation,
  onUpdateMemberRole,
  onRemoveMember
}) => {
  const { t } = useTranslation();
  const closeMemberButtonRef = useRef<HTMLButtonElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);
  const invitationRequestSeqRef = useRef(0);
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | ProjectMember['role']>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | ProjectMember['source']>('all');
  const [members, setMembers] = useState<ProjectMember[]>(workspace.members || []);
  const [roleTemplates, setRoleTemplates] = useState<WorkspaceRoleTemplate[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>(workspace.invitations || []);
  const [nextInvitationCursor, setNextInvitationCursor] = useState<string | undefined>();
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingMoreInvitations, setIsLoadingMoreInvitations] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [invitationListError, setInvitationListError] = useState<string | null>(null);
  const [roleLoadError, setRoleLoadError] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<ProjectMember['role']>('viewer');
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canManageOwners = currentUserRole === 'owner';
  const roleTemplateByKey = new Map(roleTemplates.map((role) => [role.key, role]));
  const fallbackRoleTemplate = (role: string): WorkspaceRoleTemplate | undefined => roleTemplateByKey.get(role);
  const selectedMemberRoleTemplate = selectedMember ? selectedMember.roleTemplate || fallbackRoleTemplate(selectedMember.role) : undefined;
  const pendingRoleTemplate = selectedMember && selectedMember.role === pendingRole
    ? selectedMember.roleTemplate || fallbackRoleTemplate(pendingRole)
    : fallbackRoleTemplate(pendingRole);
  const hasPendingRoleChange = Boolean(selectedMember && pendingRole !== selectedMember.role);
  const canEditSelectedMember = Boolean(
    selectedMember && canManageMembers && (canManageOwners || selectedMemberRoleTemplate?.protected === false)
  );
  const hasCompleteUnfilteredMemberPage =
    !nextCursor &&
    searchTerm.trim().length === 0 &&
    roleFilter === 'all' &&
    sourceFilter === 'all';
  const hasMemberFilters = searchTerm.trim().length > 0 || roleFilter !== 'all' || sourceFilter !== 'all';
  const memberCountLabel = hasMemberFilters
    ? t('members.loadedMatchingCount', { count: members.length })
    : t('members.loadedTotalCount', {
        loaded: members.length,
        total: workspace.memberCount ?? members.length
      });
  const memberEmptyMessage = listError || (hasMemberFilters ? t('members.emptyFiltered') : t('members.empty'));
  const hasInvitationWork = Boolean(
    invitationListError ||
    invitations.some((invitation) => invitation.status === 'pending' || invitation.status === 'expired') ||
    nextInvitationCursor ||
    isLoadingMoreInvitations
  );
  const ownerCount = members.filter((member) => member.role === 'owner').length;
  const selectedMemberIsOnlyOwner = Boolean(
    hasCompleteUnfilteredMemberPage &&
    selectedMember?.role === 'owner' &&
    ownerCount <= 1
  );
  const roleFilterOptions: Array<SelectOption<typeof roleFilter>> = [
    { value: 'all', label: t('members.allRoles') },
    ...roleTemplates.map((role) => ({ value: role.key, label: formatRole(role.key, role) }))
  ];
  const sourceFilterOptions: Array<SelectOption<typeof sourceFilter>> = [
    { value: 'all', label: t('members.allSources') },
    { value: 'OIDC', label: 'OIDC' },
    { value: 'Internal', label: t('members.directLogin') }
  ];
  const memberRoleOptions: Array<SelectOption<ProjectMember['role']>> = roleTemplates.map((role) => ({
    value: role.key,
    label: formatRole(role.key, role),
    disabled: role.protected && !canManageOwners
  }));

  const clearMemberFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setSourceFilter('all');
  };

  const loadMembers = useCallback(async (mode: 'replace' | 'append', cursor?: string) => {
    const requestId = ++requestSeqRef.current;
    if (mode === 'replace') {
      setIsLoadingInitial(true);
    } else {
      setIsLoadingMore(true);
    }
    setListError(null);
    try {
      const page = await controlPlaneApi.listWorkspaceMembers(workspace.id, {
        limit: 50,
        cursor,
        q: searchTerm,
        role: roleFilter,
        source: sourceFilter
      });
      if (requestId !== requestSeqRef.current) return;
      setMembers((current) => mode === 'append' ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch {
      if (requestId !== requestSeqRef.current) return;
      setListError(t('members.loadMembersFailed'));
    } finally {
      if (requestId === requestSeqRef.current) {
        setIsLoadingInitial(false);
        setIsLoadingMore(false);
      }
    }
  }, [roleFilter, searchTerm, sourceFilter, t, workspace.id]);

  useEffect(() => {
    let cancelled = false;
    controlPlaneApi.getWorkspaceRoles(workspace.id)
      .then((roles) => {
        if (cancelled) return;
        setRoleLoadError(null);
        setRoleTemplates(roles);
        setPendingRole((currentRole) => {
          const selectedRoleStillSupported = roles.some((role) => role.key === currentRole);
          if (selectedRoleStillSupported) return currentRole;
          const nextRole = roles.find((role) => !role.protected)?.key || roles[0]?.key;
          return nextRole || currentRole;
        });
        setRoleFilter((currentFilter) => {
          if (currentFilter === 'all' || roles.some((role) => role.key === currentFilter)) return currentFilter;
          return 'all';
        });
      })
      .catch(() => {
        if (!cancelled) {
          setRoleLoadError(t('members.supportedRolesLoadFailed'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [t, workspace.id]);

  const loadInvitations = useCallback(async (mode: 'replace' | 'append', cursor?: string) => {
    const requestId = ++invitationRequestSeqRef.current;
    if (mode === 'append') {
      setIsLoadingMoreInvitations(true);
    }
    setInvitationListError(null);
    try {
      const page = await controlPlaneApi.listWorkspaceInvitationsPage(workspace.id, {
        limit: 50,
        cursor
      });
      if (requestId !== invitationRequestSeqRef.current) return;
      const mappedInvitations = page.items.map((invitation): WorkspaceInvitation => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        roleTemplate: invitation.roleTemplate,
        status: invitation.status,
        invitedBy: invitation.invitedBy,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        acceptedAt: invitation.acceptedAt,
        revokedAt: invitation.revokedAt
      }));
      setInvitations((current) => {
        const existingById = new Map(current.map((invitation) => [invitation.id, invitation]));
        const byId = new Map((mode === 'append' ? current : []).map((invitation) => [invitation.id, invitation]));
        for (const invitation of mappedInvitations) {
          const existing = existingById.get(invitation.id);
          byId.set(invitation.id, {
            ...invitation,
            inviteLink: existing?.inviteLink
          });
        }
        return [...byId.values()];
      });
      setNextInvitationCursor(page.nextCursor);
    } catch {
      if (requestId !== invitationRequestSeqRef.current) return;
      setInvitationListError(t('members.loadInvitationsFailed'));
    } finally {
      if (requestId === invitationRequestSeqRef.current) {
        setIsLoadingMoreInvitations(false);
      }
    }
  }, [t, workspace.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMembers('replace');
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loadMembers]);

  useEffect(() => {
    setInvitations(workspace.invitations || []);
    setNextInvitationCursor(undefined);
    void loadInvitations('replace');
  }, [loadInvitations, workspace.id]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !nextCursor) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !isLoadingInitial && !isLoadingMore && nextCursor) {
        void loadMembers('append', nextCursor);
      }
    }, { rootMargin: '240px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [nextCursor, isLoadingInitial, isLoadingMore, loadMembers]);

  const openMember = (member: ProjectMember) => {
    setSelectedMember(member);
    setPendingRole(member.role);
    setIsConfirmingRemove(false);
    setErrorMessage(null);
  };

  const closeMemberDetails = () => {
    setSelectedMember(null);
    setIsConfirmingRemove(false);
  };

  const openInviteModal = () => {
    if (!canManageMembers) return;
    setIsInviteModalOpen(true);
  };

  const createInvitation = async (input: { email: string; role: ProjectMember['role'] }): Promise<WorkspaceInvitation> => {
    if (!onCreateInvitation) {
      throw new Error(t('members.createInviteFailed'));
    }
    const invitation = await onCreateInvitation(input);
    setInvitations((current) => mergeCreatedInvitation(current, invitation));
    return invitation;
  };

  const revokeInvitation = async (invitation: WorkspaceInvitation): Promise<void> => {
    if (!onRevokeInvitation) return;
    await onRevokeInvitation(invitation);
    setInvitations((current) =>
      current.map((item) => item.id === invitation.id ? { ...item, status: 'revoked' } : item)
    );
  };

  const saveMember = async () => {
    if (!selectedMember || !canEditSelectedMember || !hasPendingRoleChange) return;
    if (selectedMemberIsOnlyOwner && pendingRole !== 'owner') {
      setErrorMessage(t('members.onlyOwnerChangeWarning'));
      return;
    }
    if (pendingRoleTemplate?.protected && !canManageOwners) {
      setErrorMessage(t('members.ownerRoleChangeOnly'));
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onUpdateMemberRole?.(selectedMember, pendingRole);
      const roleTemplate = fallbackRoleTemplate(pendingRole);
      setSelectedMember({ ...selectedMember, role: pendingRole, roleTemplate });
      setMembers((current) => current.map((member) => member.email === selectedMember.email ? { ...member, role: pendingRole, roleTemplate } : member));
      setIsConfirmingRemove(false);
    } catch (error) {
      setErrorMessage(formatMemberMutationError(error, t('members.updateMemberFailed'), t('members.onlyOwnerChangeWarning')));
    } finally {
      setIsSaving(false);
    }
  };

  const removeMember = async () => {
    if (!selectedMember || !canEditSelectedMember) return;
    if (selectedMemberIsOnlyOwner) {
      setErrorMessage(t('members.onlyOwnerRemoveWarning'));
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onRemoveMember?.(selectedMember);
      setMembers((current) => current.filter((member) => member.email !== selectedMember.email));
      setSelectedMember(null);
      setIsConfirmingRemove(false);
    } catch (error) {
      setErrorMessage(formatMemberMutationError(error, t('members.removeMemberFailed'), t('members.onlyOwnerRemoveWarning')));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmRemoveMember = () => {
    if (!canEditSelectedMember || isSaving) return;
    setIsConfirmingRemove(true);
    setErrorMessage(null);
  };

  return (
    <div className={embedded ? '' : 'min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8'}>
      <motion.header {...headerMotion} className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {embedded ? (
            <h2 className="text-xl font-bold tracking-tight text-ui-text">{t('members.title')}</h2>
          ) : (
            <h1 className="type-route-title">{t('members.title')}</h1>
          )}
          <p className="type-body mt-2">{t('members.description')}</p>
        </div>
        <Button
          onClick={openInviteModal}
          disabled={!canManageMembers || roleTemplates.length === 0}
          variant="secondary"
          size="md"
          className="type-label whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" aria-hidden="true" />
          {t('members.inviteMember')}
        </Button>
      </motion.header>

      <motion.div
        {...fadeTransition}
        className="w-full overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm"
      >
        <div className="flex flex-col gap-4 border-b border-ui-border px-5 py-4 sm:px-6 xl:flex-row xl:items-center">
          <div className="flex-1 relative">
            <label htmlFor="workspace-member-search" className="sr-only">
              {t('members.searchPlaceholder')}
            </label>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-text-muted" aria-hidden="true" />
            <input
              id="workspace-member-search"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('members.searchPlaceholder')}
              className={memberSearchInputClassName}
            />
          </div>
          <Select<typeof roleFilter>
            value={roleFilter}
            options={roleFilterOptions}
            onChange={setRoleFilter}
            className="min-w-40"
            ariaLabel={t('members.filterRole')}
          />
          <Select<typeof sourceFilter>
            value={sourceFilter}
            options={sourceFilterOptions}
            onChange={setSourceFilter}
            className="min-w-36"
            ariaLabel={t('members.filterSource')}
          />
          <span className="type-label rounded-full border border-ui-border bg-ui-bg px-3 py-2 text-ui-text-muted">
            {memberCountLabel}
          </span>
          {hasMemberFilters && (
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              onClick={clearMemberFilters}
              className="w-full sm:w-auto"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              {t('members.clearFilters')}
            </Button>
          )}
        </div>
        {roleLoadError && (
          <div className="type-caption border-b border-status-warning/20 bg-status-warning-soft px-5 py-3 text-status-warning-text sm:px-6">
            {roleLoadError}
          </div>
        )}

        <div className="min-w-0">
          <table className="w-full table-fixed text-left" aria-label={t('members.title')}>
            <caption className="sr-only">{t('members.description')}</caption>
            <colgroup>
              <col className="w-[52%] md:w-[42%]" />
              <col className="w-[33%] md:w-[22%]" />
              <col className="hidden md:table-column md:w-[14%]" />
              <col className="hidden md:table-column md:w-[14%]" />
              <col className="w-[15%] md:w-[8%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-ui-border">
                <th scope="col" className="type-label px-4 py-4 sm:px-5 lg:px-6">{t('members.user')}</th>
                <th scope="col" className="type-label px-4 py-4 sm:px-5 lg:px-6">{t('members.role')}</th>
                <th scope="col" className="type-label hidden px-4 py-4 sm:px-5 md:table-cell lg:px-6">{t('members.source')}</th>
                <th scope="col" className="type-label hidden px-4 py-4 sm:px-5 md:table-cell lg:px-6">{t('members.status')}</th>
                <th scope="col" className="type-label px-2 py-4 text-right sm:px-3 lg:px-3">
                  <span className="sr-only">{t('members.manage')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const roleTemplate = member.roleTemplate || fallbackRoleTemplate(member.role);
                return (
                  <tr
                    key={member.email}
                    className="group border-b border-ui-bg transition-colors hover:bg-accent-soft/45"
                  >
                  <td className="px-4 py-4 sm:px-5 lg:px-6">
                    <div className="flex min-w-0 items-center gap-3 lg:gap-4">
                      <div className="type-ui flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong ring-4 ring-ui-surface shadow-sm transition-colors group-hover:bg-accent group-hover:text-[oklch(0.99_0.004_86)]">
                        {getInitials(member)}
                      </div>
                      <div className="min-w-0">
                        <p className="type-panel-title truncate">{member.name}</p>
                        <p className="type-body mt-1 inline-flex max-w-full min-w-0 items-center gap-2">
                          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 truncate">{member.email}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 sm:px-5 lg:px-6">
                    <MemberRoleCell
                      member={member}
                      roleTemplate={roleTemplate}
                    />
                  </td>
                  <td className="type-label hidden break-words px-4 py-4 sm:px-5 md:table-cell lg:px-6">{member.source}</td>
                  <td className="hidden px-4 py-4 sm:px-5 md:table-cell lg:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-2 w-2 shrink-0 rounded-full bg-status-success" aria-hidden="true" />
                      <span className="type-row-title min-w-0 break-words">{t('members.active')}</span>
                    </div>
                  </td>
                  <td className="px-2 py-4 text-right sm:px-3 lg:px-3">
                    <Tooltip content={t('members.manageNamed', { name: member.name })}>
                      <button
                        type="button"
                        onClick={() => openMember(member)}
                        className="rounded-lg p-2 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                        aria-label={t('members.manageNamed', { name: member.name })}
                      >
                        <MoreVertical className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </td>
                  </tr>
                );
              })}
              {members.length === 0 && !isLoadingInitial && (
                <tr>
                  <td colSpan={5} className="type-body px-8 py-12 text-center">
                    {memberEmptyMessage}
                  </td>
                </tr>
              )}
              {isLoadingInitial && (
                <TableLoadingRows
                  columns={5}
                  label={t('members.loadingMembers')}
                  cellClassName="px-4 py-4 sm:px-5 lg:px-6"
                  columnClassNames={['', '', 'hidden md:table-cell', 'hidden md:table-cell', 'text-right']}
                  showAvatarInFirstColumn
                />
              )}
            </tbody>
          </table>
          {nextCursor && (
            <div ref={loadMoreRef} className="flex justify-center px-6 py-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void loadMembers('append', nextCursor)}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? t('common.loading') : t('common.loadMore')}
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {hasInvitationWork && (
        <WorkspaceInvitationsPanel
          invitations={invitations}
          hasMoreInvitations={Boolean(nextInvitationCursor)}
          isLoadingMoreInvitations={isLoadingMoreInvitations}
          loadError={invitationListError}
          onCreateInvitation={onCreateInvitation ? createInvitation : undefined}
          onLoadMoreInvitations={nextInvitationCursor ? () => void loadInvitations('append', nextInvitationCursor) : undefined}
          onRevokeInvitation={onRevokeInvitation ? revokeInvitation : undefined}
        />
      )}

      <AnimatePresence>
        {isInviteModalOpen && (
          <WorkspaceInviteModal
            canManageOwners={canManageOwners}
            roleTemplates={roleTemplates}
            onClose={() => setIsInviteModalOpen(false)}
            onCreateInvitation={onCreateInvitation ? createInvitation : undefined}
          />
        )}
      </AnimatePresence>

      <WorkspaceMemberDetailsPanel
        selectedMember={selectedMember}
        selectedMemberRoleTemplate={selectedMemberRoleTemplate}
        pendingRole={pendingRole}
        pendingRoleTemplate={pendingRoleTemplate}
        roleOptions={memberRoleOptions}
        hasPendingRoleChange={hasPendingRoleChange}
        canEditSelectedMember={canEditSelectedMember}
        selectedMemberIsOnlyOwner={selectedMemberIsOnlyOwner}
        isSaving={isSaving}
        isConfirmingRemove={isConfirmingRemove}
        errorMessage={errorMessage}
        closeButtonRef={closeMemberButtonRef}
        onClose={closeMemberDetails}
        onPendingRoleChange={setPendingRole}
        onConfirmRemove={confirmRemoveMember}
        onCancelRemove={() => setIsConfirmingRemove(false)}
        onRemoveMember={() => void removeMember()}
        onCancelRoleChange={() => selectedMember && setPendingRole(selectedMember.role)}
        onConfirmRoleChange={() => void saveMember()}
      />
    </div>
  );
};
