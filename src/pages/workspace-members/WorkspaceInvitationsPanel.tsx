import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WorkspaceInvitation } from '@/types';
import { formatInvitationStatus, formatMemberMutationError, formatRole } from '@/pages/workspace-members/memberUtils';

interface WorkspaceInvitationsPanelProps {
  invitations: WorkspaceInvitation[];
  hasMoreInvitations?: boolean;
  isLoadingMoreInvitations?: boolean;
  onCreateInvitation?: (input: { email: string; role: WorkspaceInvitation['role'] }) => Promise<WorkspaceInvitation>;
  onLoadMoreInvitations?: () => void;
  onRevokeInvitation?: (invitation: WorkspaceInvitation) => Promise<void> | void;
}

export const WorkspaceInvitationsPanel: React.FC<WorkspaceInvitationsPanelProps> = ({
  invitations,
  hasMoreInvitations = false,
  isLoadingMoreInvitations = false,
  onCreateInvitation,
  onLoadMoreInvitations,
  onRevokeInvitation
}) => {
  const { t } = useTranslation();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null);
  const [revokingInvitationId, setRevokingInvitationId] = useState<string | null>(null);
  const [recreatingInvitationId, setRecreatingInvitationId] = useState<string | null>(null);
  const [inviteErrorMessage, setInviteErrorMessage] = useState<string | null>(null);

  const visibleInvitations = invitations.filter(
    (invitation) => invitation.status === 'pending' || invitation.status === 'expired'
  );

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMoreInvitations || isLoadingMoreInvitations || !onLoadMoreInvitations) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onLoadMoreInvitations();
      }
    }, { rootMargin: '240px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreInvitations, isLoadingMoreInvitations, onLoadMoreInvitations]);

  const copyExistingInviteLink = async (invitation: WorkspaceInvitation) => {
    if (!invitation.inviteLink) return;
    try {
      await navigator.clipboard.writeText(invitation.inviteLink);
      setCopiedInvitationId(invitation.id);
      window.setTimeout(() => setCopiedInvitationId((current) => current === invitation.id ? null : current), 2200);
    } catch {
      setInviteErrorMessage(t('members.copyFailed'));
    }
  };

  const recreateInvitation = async (invitation: WorkspaceInvitation) => {
    if (!onCreateInvitation || invitation.status !== 'pending') return;
    setRecreatingInvitationId(invitation.id);
    setInviteErrorMessage(null);
    try {
      if (onRevokeInvitation) {
        await onRevokeInvitation(invitation);
      }
      await onCreateInvitation({ email: invitation.email, role: invitation.role });
    } catch (error) {
      setInviteErrorMessage(formatMemberMutationError(error, t('members.createInviteFailed')));
    } finally {
      setRecreatingInvitationId(null);
    }
  };

  const revokeInvitation = async (invitation: WorkspaceInvitation) => {
    if (!onRevokeInvitation || invitation.status !== 'pending') return;
    setRevokingInvitationId(invitation.id);
    setInviteErrorMessage(null);
    try {
      await onRevokeInvitation(invitation);
    } catch (error) {
      setInviteErrorMessage(formatMemberMutationError(error, t('members.revokeInviteFailed')));
    } finally {
      setRevokingInvitationId(null);
    }
  };

  return (
    <div className="mt-8 overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
      <div className="flex flex-col gap-3 border-b border-ui-border px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="type-panel-title">{t('members.pendingInvitations')}</h2>
          <p className="type-body mt-1">{t('members.pendingInvitationsBody')}</p>
        </div>
        <span className="type-label w-fit rounded-full border border-ui-border bg-ui-bg px-3 py-1">
          {t('members.inviteLinksCount', { count: visibleInvitations.length })}
        </span>
      </div>
      {visibleInvitations.length === 0 ? (
        <div className="type-body px-5 py-8 text-center">
          {t('members.noPendingInvitations')}
          <div ref={loadMoreRef} className="mt-5 flex justify-center">
            {hasMoreInvitations && (
              <button
                type="button"
                onClick={onLoadMoreInvitations}
                disabled={isLoadingMoreInvitations}
                className="type-label inline-flex items-center gap-2 rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-ui-text transition-colors hover:bg-ui-bg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingMoreInvitations && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isLoadingMoreInvitations ? t('members.loadingInvitations') : t('members.loadMoreInvitations')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-ui-border">
          {inviteErrorMessage && (
            <div className="type-caption bg-status-danger-soft px-5 py-3 text-status-danger-text">
              {inviteErrorMessage}
            </div>
          )}
          {visibleInvitations.map((invitation) => (
            <div key={invitation.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="type-row-title truncate">{invitation.email}</p>
                <p className="type-label mt-1">
                  {formatRole(invitation.role, invitation.roleTemplate)} · {formatInvitationStatus(invitation.status)} · {t('members.expires', { time: new Date(invitation.expiresAt).toLocaleString() })}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {invitation.inviteLink && (
                  <button
                    type="button"
                    onClick={() => void copyExistingInviteLink(invitation)}
                    className="type-label inline-flex items-center gap-2 rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-ui-text transition-colors hover:bg-ui-bg"
                  >
                    {copiedInvitationId === invitation.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedInvitationId === invitation.id ? t('members.copied') : t('members.copy')}
                  </button>
                )}
                {!invitation.inviteLink && invitation.status === 'pending' && (
                  <div className="type-caption max-w-xs rounded-lg border border-status-warning/25 bg-status-warning-soft px-3 py-2 text-status-warning-text">
                    {t('members.inviteLinkUnavailable')}
                  </div>
                )}
                {!invitation.inviteLink && invitation.status === 'pending' && onCreateInvitation && (
                  <button
                    type="button"
                    onClick={() => void recreateInvitation(invitation)}
                    disabled={recreatingInvitationId === invitation.id}
                    className="type-label inline-flex items-center gap-2 rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-ui-text transition-colors hover:bg-ui-bg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {recreatingInvitationId === invitation.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                    {recreatingInvitationId === invitation.id ? t('members.recreatingInvite') : t('members.recreateInvite')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void revokeInvitation(invitation)}
                  disabled={!onRevokeInvitation || invitation.status !== 'pending' || revokingInvitationId === invitation.id}
                  className="type-label inline-flex items-center gap-2 rounded-lg border border-status-danger/25 bg-status-danger-soft px-3 py-2 text-status-danger-text transition-colors hover:bg-status-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {revokingInvitationId === invitation.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  {t('members.revoke')}
                </button>
              </div>
            </div>
          ))}
          <div ref={loadMoreRef} className="flex justify-center px-5 py-4">
            {hasMoreInvitations && (
              <button
                type="button"
                onClick={onLoadMoreInvitations}
                disabled={isLoadingMoreInvitations}
                className="type-label inline-flex items-center gap-2 rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-ui-text transition-colors hover:bg-ui-bg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingMoreInvitations && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isLoadingMoreInvitations ? t('members.loadingInvitations') : t('members.loadMoreInvitations')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
