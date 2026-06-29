import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Loader2, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/common/Dialog';
import { formInputClassName } from '@/components/common/formControlStyles';
import { WorkspaceInvitation } from '@/types';
import { formatInvitationStatus, formatMemberMutationError, formatRole } from '@/pages/workspace-members/memberUtils';

interface WorkspaceInvitationsPanelProps {
  invitations: WorkspaceInvitation[];
  hasMoreInvitations?: boolean;
  isLoadingMoreInvitations?: boolean;
  loadError?: string | null;
  onCreateInvitation?: (input: { email: string; role: WorkspaceInvitation['role'] }) => Promise<WorkspaceInvitation>;
  onLoadMoreInvitations?: () => void;
  onRevokeInvitation?: (invitation: WorkspaceInvitation) => Promise<void> | void;
}

const replacementInviteLinkInputClassName = formInputClassName('type-body min-w-0');

export const WorkspaceInvitationsPanel: React.FC<WorkspaceInvitationsPanelProps> = ({
  invitations,
  hasMoreInvitations = false,
  isLoadingMoreInvitations = false,
  loadError = null,
  onCreateInvitation,
  onLoadMoreInvitations,
  onRevokeInvitation
}) => {
  const { t } = useTranslation();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null);
  const [copiedReplacementInviteId, setCopiedReplacementInviteId] = useState<string | null>(null);
  const [createdReplacementInvite, setCreatedReplacementInvite] = useState<WorkspaceInvitation | null>(null);
  const [revokingInvitationId, setRevokingInvitationId] = useState<string | null>(null);
  const [recreatingInvitationId, setRecreatingInvitationId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inviteErrorMessage, setInviteErrorMessage] = useState<string | null>(null);
  const [replacementInviteErrorMessage, setReplacementInviteErrorMessage] = useState<string | null>(null);

  const visibleInvitations = invitations.filter(
    (invitation) => invitation.status === 'pending' || invitation.status === 'expired'
  );
  const shouldShowInvitations = isExpanded || Boolean(inviteErrorMessage) || Boolean(loadError);

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

  const copyReplacementInviteLink = async () => {
    if (!createdReplacementInvite?.inviteLink) return;
    setReplacementInviteErrorMessage(null);
    try {
      await navigator.clipboard.writeText(createdReplacementInvite.inviteLink);
      setCopiedReplacementInviteId(createdReplacementInvite.id);
      window.setTimeout(() => setCopiedReplacementInviteId((current) => current === createdReplacementInvite.id ? null : current), 2200);
    } catch {
      setReplacementInviteErrorMessage(t('members.copyFailed'));
    }
  };

  const closeReplacementInviteDialog = () => {
    setCreatedReplacementInvite(null);
    setCopiedReplacementInviteId(null);
    setReplacementInviteErrorMessage(null);
  };

  const recreateInvitation = async (invitation: WorkspaceInvitation) => {
    if (!onCreateInvitation || invitation.status !== 'pending') return;
    setRecreatingInvitationId(invitation.id);
    setInviteErrorMessage(null);
    setReplacementInviteErrorMessage(null);
    try {
      if (onRevokeInvitation) {
        await onRevokeInvitation(invitation);
      }
      const replacementInvite = await onCreateInvitation({ email: invitation.email, role: invitation.role });
      setCreatedReplacementInvite(replacementInvite);
      setCopiedReplacementInviteId(null);
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
    <>
      <div className="mt-8 overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
        <div className="flex flex-col gap-3 border-b border-ui-border px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="type-panel-title">{t('members.pendingInvitations')}</h2>
            <p className="type-body mt-1">{t('members.pendingInvitationsBody')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-label w-fit rounded-full border border-ui-border bg-ui-bg px-3 py-1">
              {t('members.inviteLinksCount', { count: visibleInvitations.length })}
            </span>
            <button
              type="button"
              aria-expanded={shouldShowInvitations}
              onClick={() => setIsExpanded((expanded) => !expanded)}
              className="type-label inline-flex items-center gap-2 rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
            >
              {shouldShowInvitations ? t('members.hideInvitations') : t('members.showInvitations')}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${shouldShowInvitations ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          </div>
        </div>
        {shouldShowInvitations && (visibleInvitations.length === 0 ? (
          <div className="type-body px-5 py-8 text-center">
            {loadError && (
              <div className="type-caption mb-4 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-left text-status-danger-text">
                {loadError}
              </div>
            )}
            {t('members.noPendingInvitations')}
            {hasMoreInvitations && (
              <div ref={loadMoreRef} className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMoreInvitations}
                  disabled={isLoadingMoreInvitations}
                  className="type-label inline-flex items-center gap-2 rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-ui-text transition-colors hover:bg-ui-bg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoadingMoreInvitations && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isLoadingMoreInvitations ? t('members.loadingInvitations') : t('members.loadMoreInvitations')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-ui-border">
            {inviteErrorMessage && (
              <div className="type-caption bg-status-danger-soft px-5 py-3 text-status-danger-text">
                {inviteErrorMessage}
              </div>
            )}
            {loadError && (
              <div className="type-caption bg-status-danger-soft px-5 py-3 text-status-danger-text">
                {loadError}
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
            {hasMoreInvitations && (
              <div ref={loadMoreRef} className="flex justify-center px-5 py-4">
                <button
                  type="button"
                  onClick={onLoadMoreInvitations}
                  disabled={isLoadingMoreInvitations}
                  className="type-label inline-flex items-center gap-2 rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-ui-text transition-colors hover:bg-ui-bg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoadingMoreInvitations && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isLoadingMoreInvitations ? t('members.loadingInvitations') : t('members.loadMoreInvitations')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {createdReplacementInvite && (
        <Dialog
          titleId="replacement-invite-title"
          onClose={closeReplacementInviteDialog}
          className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
        >
          <div className="flex shrink-0 items-start justify-between gap-5 border-b border-ui-border px-6 py-5 sm:px-8">
            <div className="min-w-0">
              <h2 id="replacement-invite-title" className="type-panel-title">
                {t('members.replacementInviteCreated')}
              </h2>
              <p className="type-body mt-1">
                {t('members.replacementInviteBody', { email: createdReplacementInvite.email })}
              </p>
            </div>
            <button
              type="button"
              onClick={closeReplacementInviteDialog}
              aria-label={t('members.closeReplacementInvite')}
              className="shrink-0 rounded-lg p-2 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6 custom-scrollbar sm:px-8">
            <div className="rounded-lg border border-ui-border bg-ui-bg p-5">
              <p className="type-label">{t('members.email')}</p>
              <p className="type-row-title mt-1 break-all">{createdReplacementInvite.email}</p>
              <p className="type-label mt-2">
                {formatRole(createdReplacementInvite.role, createdReplacementInvite.roleTemplate)} · {t('members.expires', { time: new Date(createdReplacementInvite.expiresAt).toLocaleString() })}
              </p>
            </div>

            {createdReplacementInvite.inviteLink ? (
              <div>
                <label htmlFor="replacement-invite-link" className="type-label">
                  {t('members.inviteLink')}
                </label>
                <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    id="replacement-invite-link"
                    readOnly
                    value={createdReplacementInvite.inviteLink}
                    onFocus={(event) => event.currentTarget.select()}
                    className={replacementInviteLinkInputClassName}
                  />
                  <button
                    type="button"
                    onClick={() => void copyReplacementInviteLink()}
                    className="type-label inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ui-border bg-ui-surface px-4 py-2 text-ui-text transition-colors hover:bg-ui-bg"
                  >
                    {copiedReplacementInviteId === createdReplacementInvite.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedReplacementInviteId === createdReplacementInvite.id ? t('members.copied') : t('members.copy')}
                  </button>
                </div>
              </div>
            ) : (
              <p className="type-caption rounded-lg border border-ui-border bg-ui-bg px-3 py-2 text-ui-text-muted">
                {t('members.linkReturnedOnce')}
              </p>
            )}

            <p className="type-caption">
              {t('members.recipientMustUseEmail', { email: createdReplacementInvite.email, time: new Date(createdReplacementInvite.expiresAt).toLocaleString() })}
            </p>

            {replacementInviteErrorMessage && (
              <p className="type-caption rounded-lg bg-status-danger-soft px-3 py-2 text-status-danger-text">
                {replacementInviteErrorMessage}
              </p>
            )}
          </div>

          <div className="flex shrink-0 justify-end border-t border-ui-border bg-ui-surface px-6 py-4 sm:px-8">
            <button
              type="button"
              onClick={closeReplacementInviteDialog}
              className="type-label inline-flex items-center justify-center rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-ui-text transition-colors hover:bg-ui-bg"
            >
              {t('members.close')}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
};
