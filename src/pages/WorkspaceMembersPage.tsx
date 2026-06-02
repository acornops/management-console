import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, MoreVertical, Search, Shield, UserPlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { TableLoadingRows } from '@/components/common/Loading';
import { RightSidePanel } from '@/components/common/RightSidePanel';
import { Select, SelectOption } from '@/components/common/Select';
import { Tooltip } from '@/components/common/Tooltip';
import { fadeTransition, headerMotion } from '@/lib/motion';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { ProjectMember, Workspace, WorkspaceInvitation, WorkspaceRoleTemplate } from '@/types';
import { WorkspaceInvitationsPanel } from '@/pages/workspace-members/WorkspaceInvitationsPanel';
import { WorkspaceInviteModal } from '@/pages/workspace-members/WorkspaceInviteModal';
import { SupportedRolesTable } from '@/pages/workspace-members/SupportedRolesTable';
import { formatMemberMutationError, formatRole, getInitials } from '@/pages/workspace-members/memberUtils';

interface WorkspaceMembersPageProps {
  workspace: Workspace;
  canManageMembers: boolean;
  currentUserRole: ProjectMember['role'];
  onCreateInvitation?: (input: { email: string; role: ProjectMember['role'] }) => Promise<WorkspaceInvitation>;
  onRevokeInvitation?: (invitation: WorkspaceInvitation) => Promise<void> | void;
  onUpdateMemberRole?: (member: ProjectMember, role: ProjectMember['role']) => Promise<void> | void;
  onRemoveMember?: (member: ProjectMember) => Promise<void> | void;
}

export const WorkspaceMembersPage: React.FC<WorkspaceMembersPageProps> = ({
  workspace,
  canManageMembers,
  currentUserRole,
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
  const [pendingRole, setPendingRole] = useState<ProjectMember['role']>('viewer');
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canManageOwners = currentUserRole === 'owner';
  const roleTemplateByKey = new Map(roleTemplates.map((role) => [role.key, role]));
  const fallbackRoleTemplate = (role: string): WorkspaceRoleTemplate | undefined => roleTemplateByKey.get(role);
  const selectedMemberRoleTemplate = selectedMember ? selectedMember.roleTemplate || fallbackRoleTemplate(selectedMember.role) : undefined;
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
    } catch (error) {
      if (requestId !== requestSeqRef.current) return;
      setListError(error instanceof Error ? error.message : t('members.emptyFiltered'));
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
      .catch((error) => {
        if (!cancelled) {
          setListError(error instanceof Error ? error.message : t('members.emptyFiltered'));
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
    } catch (error) {
      console.error('Failed loading workspace invitations', error);
    } finally {
      if (requestId === invitationRequestSeqRef.current) {
        setIsLoadingMoreInvitations(false);
      }
    }
  }, [workspace.id]);

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
    setInvitations((current) => [
      invitation,
      ...current.filter((item) => item.id !== invitation.id)
    ]);
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
    if (!selectedMember || !canEditSelectedMember) return;
    if (selectedMemberIsOnlyOwner && pendingRole !== 'owner') {
      setErrorMessage(t('members.onlyOwnerChangeWarning'));
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
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <motion.header {...headerMotion} className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="type-route-title">{t('members.title')}</h1>
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
        className="bg-ui-surface rounded-xl border border-ui-border shadow-sm overflow-hidden min-h-[400px] w-full"
      >
        <div className="flex flex-col gap-4 border-b border-ui-border px-6 py-6 sm:px-8 xl:flex-row xl:items-center">
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
              className="w-full rounded-lg border border-transparent bg-ui-bg py-3 pl-11 pr-4 text-sm text-ui-text outline-none transition-colors placeholder:text-ui-text-muted/60 focus-visible:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent/10"
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
        </div>

        <div className="min-w-0">
          <table className="w-full table-fixed text-left" aria-label={t('members.title')}>
            <caption className="sr-only">{t('members.description')}</caption>
            <thead>
              <tr className="border-b border-ui-border">
                <th className="type-label px-4 py-5 sm:px-6 lg:px-8">{t('members.user')}</th>
                <th className="type-label px-4 py-5 sm:px-6 lg:px-8">{t('members.role')}</th>
                <th className="type-label hidden px-4 py-5 sm:px-6 md:table-cell lg:px-8">{t('members.source')}</th>
                <th className="type-label hidden px-4 py-5 sm:px-6 md:table-cell lg:px-8">{t('members.status')}</th>
                <th className="type-label px-4 py-5 text-right sm:px-6 lg:px-8">{t('members.manage')}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const roleTemplate = member.roleTemplate || fallbackRoleTemplate(member.role);
                const highlightRole = roleTemplate?.protected || roleTemplate?.capabilities.includes('manage_members');
                return (
                  <tr
                    key={member.email}
                    className="group border-b border-ui-bg transition-colors hover:bg-accent-soft/45"
                  >
                  <td className="px-4 py-6 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-4 lg:gap-5">
                      <div className="type-ui flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong ring-4 ring-ui-surface shadow-sm transition-colors group-hover:bg-accent group-hover:text-[oklch(0.99_0.004_86)]">
                        {getInitials(member)}
                      </div>
                      <div className="min-w-0">
                        <p className="type-panel-title break-words">{member.name}</p>
                        <p className="type-body mt-1 inline-flex max-w-full min-w-0 items-center gap-2">
                          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 truncate">{member.email}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-6 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                      <Shield className={`h-4 w-4 shrink-0 ${highlightRole ? 'text-accent-strong' : 'text-ui-text-muted'}`} aria-hidden="true" />
                      <span className="type-ui min-w-0 break-words text-ui-text">{formatRole(member.role, roleTemplate)}</span>
                    </div>
                  </td>
                  <td className="type-label hidden break-words px-4 py-6 sm:px-6 md:table-cell lg:px-8">{member.source}</td>
                  <td className="hidden px-4 py-6 sm:px-6 md:table-cell lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-2 w-2 shrink-0 rounded-full bg-status-success" aria-hidden="true" />
                      <span className="type-row-title min-w-0 break-words">{t('members.active')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-6 text-right sm:px-6 lg:px-8">
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
                    {listError || t('members.emptyFiltered')}
                  </td>
                </tr>
              )}
              {isLoadingInitial && (
                <TableLoadingRows
                  columns={5}
                  label={t('members.loadingMembers')}
                  cellClassName="px-4 py-6 sm:px-6 lg:px-8"
                  columnClassNames={['', '', 'hidden md:table-cell', 'hidden md:table-cell', 'text-right']}
                  showAvatarInFirstColumn
                />
              )}
            </tbody>
          </table>
          <div ref={loadMoreRef} className="flex justify-center px-8 py-6">
            {nextCursor && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void loadMembers('append', nextCursor)}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? t('common.loading') : t('common.loadMore')}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        {...fadeTransition}
        className="mt-8 overflow-hidden rounded-lg border border-ui-border bg-ui-surface"
      >
        <div className="flex flex-col gap-2 border-b border-ui-border px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="type-panel-title">{t('members.supportedRoles')}</h2>
            <p className="type-body mt-1">{t('members.supportedRolesBody')}</p>
          </div>
          <span className="type-label w-fit rounded-full border border-ui-border bg-ui-bg px-3 py-1">
            {t('members.supportedRolesCount', { count: roleTemplates.length })}
          </span>
        </div>
        <SupportedRolesTable roleTemplates={roleTemplates} />
      </motion.div>

      <WorkspaceInvitationsPanel
        invitations={invitations}
        hasMoreInvitations={Boolean(nextInvitationCursor)}
        isLoadingMoreInvitations={isLoadingMoreInvitations}
        onCreateInvitation={onCreateInvitation ? createInvitation : undefined}
        onLoadMoreInvitations={nextInvitationCursor ? () => void loadInvitations('append', nextInvitationCursor) : undefined}
        onRevokeInvitation={onRevokeInvitation ? revokeInvitation : undefined}
      />

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

      <RightSidePanel
        isOpen={Boolean(selectedMember)}
        onClose={closeMemberDetails}
        titleId="member-details-title"
        initialFocusRef={closeMemberButtonRef}
      >
        {selectedMember && (
          <>
            <div className="flex items-center justify-between border-b border-ui-border px-8 py-6">
              <h2 id="member-details-title" className="type-section-title">{t('members.memberDetails')}</h2>
              <button
                ref={closeMemberButtonRef}
                type="button"
                onClick={closeMemberDetails}
                className="rounded-lg p-2 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                aria-label={t('members.closeMemberDetails')}
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-5 border-b border-ui-border bg-ui-bg/60 px-8 py-6">
                <div className="type-data flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-ui-text text-xl text-ui-bg">
                  {getInitials(selectedMember)}
                </div>
                <div className="min-w-0">
                  <h3 className="type-section-title truncate">{selectedMember.name}</h3>
                  <p className="type-body mt-1 truncate">{selectedMember.email}</p>
                  <div className="type-label mt-3 w-fit rounded-full bg-ui-surface px-3 py-1 text-ui-text">
                    {formatRole(selectedMember.role, selectedMember.roleTemplate || fallbackRoleTemplate(selectedMember.role))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-b border-ui-border px-8 py-6">
                <label className="type-label block px-1">{t('members.role')}</label>
                <Select<ProjectMember['role']>
                  value={pendingRole}
                  options={memberRoleOptions}
                  onChange={setPendingRole}
                  disabled={!canEditSelectedMember || isSaving}
                />
                {!canEditSelectedMember && (
                  <p className="type-caption px-1">{t('members.noManageMemberAccess')}</p>
                )}
                {selectedMemberIsOnlyOwner && (
                  <p className="type-caption px-1">{t('members.onlyOwnerWarning')}</p>
                )}
              </div>

              <div className="border-b border-ui-border px-8 py-6">
                <h4 className="type-label">{t('members.accessSummary')}</h4>
                <div className="mt-3 divide-y divide-ui-border text-sm">
                  <div className="flex items-center justify-between gap-4 py-3">
                    <span className="text-ui-text-muted">{t('members.source')}</span>
                    <span className="type-ui text-ui-text">{selectedMember.source === 'Internal' ? t('members.directLogin') : selectedMember.source}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <span className="text-ui-text-muted">{t('members.role')}</span>
                    <span className="type-ui text-ui-text">{formatRole(selectedMember.role, selectedMember.roleTemplate || fallbackRoleTemplate(selectedMember.role))}</span>
                  </div>
                  <p className="type-caption pt-3">{t('members.accessSummaryBody')}</p>
                </div>
              </div>

              {errorMessage && (
                <div className="type-caption border-b border-status-danger/20 bg-status-danger-soft px-8 py-3 text-status-danger-text">
                  {errorMessage}
                </div>
              )}

              <div className="border-b border-status-danger/20 bg-status-danger-soft px-8 py-5">
                {isConfirmingRemove ? (
                  <div className="space-y-4">
                    <div>
                      <p className="type-row-title text-status-danger-text">{t('members.confirmRemoveAccess')}</p>
                      <p className="type-caption mt-1 text-status-danger-text">{t('members.confirmRemoveAccessBody', { name: selectedMember.name })}</p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setIsConfirmingRemove(false)}
                        disabled={isSaving}
                        variant="secondary"
                        size="md"
                        className="flex-1"
                      >
                        {t('app.cancel')}
                      </Button>
                      <Button
                        onClick={() => void removeMember()}
                        disabled={!canEditSelectedMember || isSaving}
                        variant="danger"
                        size="md"
                        className="flex-1"
                      >
                        {isSaving ? t('members.removing') : t('members.confirmRemove')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={confirmRemoveMember}
                    disabled={!canEditSelectedMember || isSaving}
                    className="type-ui w-full rounded-md px-1 py-1 text-left text-status-danger-text transition-colors hover:text-status-danger-text focus:outline-none focus-visible:ring-2 focus-visible:ring-status-danger/25 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t('members.removeAccess')}
                    <span className="type-caption mt-1 block text-status-danger-text">
                      {t('members.removeAccessBody')}
                    </span>
                  </button>
                )}
              </div>

              <div className="flex justify-end px-8 py-6">
                <Button
                  onClick={() => void saveMember()}
                  disabled={!canEditSelectedMember || isSaving}
                  variant="primary"
                  size="lg"
                  className="min-w-40"
                >
                  {isSaving ? t('members.saving') : t('members.saveChanges')}
                </Button>
              </div>
            </div>
          </>
        )}
      </RightSidePanel>
    </div>
  );
};
