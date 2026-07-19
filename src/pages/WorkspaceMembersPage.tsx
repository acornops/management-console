import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Mail, MoreVertical, Search, UserPlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { DataTableStateRow } from '@/components/common/DataTable';
import { PageHeader, PageShell } from '@/components/common/PageComposition';
import { Select, SelectOption } from '@/components/common/Select';
import { Tooltip } from '@/components/common/Tooltip';
import { formInputClassName } from '@/components/common/formControlStyles';
import { ICONS } from '@/constants';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { ProjectMember, Workspace, WorkspaceInvitation, WorkspaceRoleTemplate } from '@/types';
import { WorkspaceInvitationsPanel } from '@/pages/workspace-members/WorkspaceInvitationsPanel';
import { WorkspaceInviteModal } from '@/pages/workspace-members/WorkspaceInviteModal';
import { formatMemberMutationError, formatRole, getInitials } from '@/pages/workspace-members/memberUtils';
import { MemberRoleCell } from '@/pages/workspace-members/MemberRoleCell';
import { WorkspaceMemberDetailsPanel } from '@/pages/workspace-members/WorkspaceMemberDetailsPanel';
import { mergeCreatedInvitation } from '@/pages/workspace-members/invitationList';
import { useCursorCollection } from '@/hooks/useCursorCollection';

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
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | ProjectMember['role']>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | ProjectMember['source']>('all');
  const [roleTemplates, setRoleTemplates] = useState<WorkspaceRoleTemplate[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>(workspace.invitations || []);
  const [roleLoadError, setRoleLoadError] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<ProjectMember['role']>('viewer');
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [appliedMemberFilters, setAppliedMemberFilters] = useState<{
    q: string;
    role: 'all' | ProjectMember['role'];
    source: 'all' | ProjectMember['source'];
  }>({ q: '', role: 'all', source: 'all' });
  const loadMemberPage = useCallback(async ({ cursor, filters, limit, signal }: {
    cursor?: string;
    filters: typeof appliedMemberFilters;
    limit: number;
    signal: AbortSignal;
  }) => {
    try {
      return await controlPlaneApi.listWorkspaceMembers(workspace.id, { limit, cursor, ...filters, signal });
    } catch {
      throw new Error(t('members.loadMembersFailed'));
    }
  }, [t, workspace.id]);
  const memberCollection = useCursorCollection({
    filters: appliedMemberFilters,
    getKey: (member: ProjectMember) => member.userId || member.email,
    loadPage: loadMemberPage,
    pageSize: 50,
    strategy: 'sentinel'
  });
  const loadInvitationPage = useCallback(async ({ cursor, limit, signal }: {
    cursor?: string;
    filters: { workspaceId: string };
    limit: number;
    signal: AbortSignal;
  }) => {
    try {
      const page = await controlPlaneApi.listWorkspaceInvitationsPage(workspace.id, { limit, cursor, signal });
      return {
        ...page,
        items: page.items.map((invitation): WorkspaceInvitation => ({
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
        }))
      };
    } catch {
      throw new Error(t('members.loadInvitationsFailed'));
    }
  }, [t, workspace.id]);
  const invitationCollection = useCursorCollection({
    filters: { workspaceId: workspace.id },
    getKey: (invitation: WorkspaceInvitation) => invitation.id,
    loadPage: loadInvitationPage,
    pageSize: 50,
    strategy: 'sentinel'
  });
  const { items: members, nextCursor, phase: memberPhase, error: listError = null } = memberCollection;
  const isLoadingInitial = memberPhase === 'loading' || memberPhase === 'refreshing';
  const isLoadingMore = memberPhase === 'loadingMore';
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
  const memberEmptyTitle = listError
    ? t('members.loadFailedTitle')
    : t(hasMemberFilters ? 'members.emptyFilteredTitle' : 'members.emptyTitle');
  const memberEmptyDescription = listError || t(hasMemberFilters ? 'members.emptyFiltered' : 'members.empty');
  const hasInvitationWork = Boolean(
    invitationCollection.phase === 'loading' ||
    invitationCollection.error ||
    invitations.some((invitation) => invitation.status === 'pending' || invitation.status === 'expired') ||
    invitationCollection.nextCursor ||
    invitationCollection.phase === 'loadingMore'
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedMemberFilters({ q: searchTerm, role: roleFilter, source: sourceFilter });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [roleFilter, searchTerm, sourceFilter]);

  useEffect(() => {
    if (invitationCollection.phase !== 'ready') return;
    setInvitations((current) => {
      const existingById = new Map(current.map((invitation) => [invitation.id, invitation]));
      return invitationCollection.items.map((invitation) => ({
        ...invitation,
        inviteLink: existingById.get(invitation.id)?.inviteLink
      }));
    });
  }, [invitationCollection.items, invitationCollection.phase]);

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
      await memberCollection.refresh();
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
      await memberCollection.refresh();
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
    <PageShell embedded={embedded}>
      {embedded ? (
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><h2 className="type-section-title">{t('members.title')}</h2><p className="type-body mt-2">{t('members.description')}</p></div>
          <Button onClick={openInviteModal} disabled={!canManageMembers || roleTemplates.length === 0} variant="primary" size="md" className="type-label whitespace-nowrap"><UserPlus className="h-4 w-4" aria-hidden="true" />{t('members.inviteMember')}</Button>
        </div>
      ) : <PageHeader title={t('members.title')} description={t('members.description')} actions={
        <Button
          onClick={openInviteModal}
          disabled={!canManageMembers || roleTemplates.length === 0}
          variant="primary"
          size="md"
          className="type-label whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" aria-hidden="true" />
          {t('members.inviteMember')}
        </Button>
      } />}

      <div
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
                      <div className="type-ui flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong ring-4 ring-ui-surface shadow-sm transition-colors group-hover:bg-control-activation group-hover:text-control-activation-fg">
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
                        className="control-target rounded-lg p-2 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                        aria-label={t('members.manageNamed', { name: member.name })}
                      >
                        <MoreVertical className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </td>
                  </tr>
                );
              })}
              <DataTableStateRow
                columns={5}
                phase={isLoadingInitial ? 'loading' : listError ? 'error' : 'ready'}
                itemCount={members.length}
                filtered={hasMemberFilters}
                loading={<div role="status" className="p-6 text-sm text-ui-text-muted">{t('members.loadingMembers')}</div>}
                empty={<EmptyState embedded headingLevel={3} icon={<ICONS.Users />} title={memberEmptyTitle} description={memberEmptyDescription} />}
                filteredEmpty={<EmptyState embedded headingLevel={3} icon={<ICONS.Search />} title={memberEmptyTitle} description={memberEmptyDescription} />}
                error={<EmptyState embedded headingLevel={3} icon={<ICONS.AlertCircle />} title={memberEmptyTitle} description={memberEmptyDescription} />}
              />
            </tbody>
          </table>
          {nextCursor && (
            <div ref={memberCollection.sentinelRef} className="flex justify-center px-6 py-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void memberCollection.loadMore()}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? t('common.loading') : t('common.loadMore')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {hasInvitationWork && (
        <WorkspaceInvitationsPanel
          invitations={invitations}
          hasMoreInvitations={Boolean(invitationCollection.nextCursor)}
          isLoadingMoreInvitations={invitationCollection.phase === 'loadingMore'}
          loadError={invitationCollection.error}
          phase={invitationCollection.phase}
          loadMoreSentinelRef={invitationCollection.sentinelRef}
          onCreateInvitation={onCreateInvitation ? createInvitation : undefined}
          onLoadMoreInvitations={invitationCollection.nextCursor ? () => void invitationCollection.loadMore() : undefined}
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
    </PageShell>
  );
};
