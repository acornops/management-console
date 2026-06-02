import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { ControlPlaneWorkspaceInvitation } from '@/services/controlPlaneApi';

interface WorkspaceInvitePageProps {
  token: string;
  currentUserEmail: string;
  onLoadInvitation: (token: string) => Promise<ControlPlaneWorkspaceInvitation>;
  onAcceptInvitation: (token: string) => Promise<void>;
  onGoToWorkspaces: () => void;
}

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function formatInviteError(error: unknown, fallback: string): string {
  const rawMessage = error instanceof Error ? error.message : fallback;
  return rawMessage.replace(/^Control plane request failed \(\d+\):\s*/i, '') || fallback;
}

export const WorkspaceInvitePage: React.FC<WorkspaceInvitePageProps> = ({
  token,
  currentUserEmail,
  onLoadInvitation,
  onAcceptInvitation,
  onGoToWorkspaces
}) => {
  const { t } = useTranslation();
  const [invitation, setInvitation] = useState<ControlPlaneWorkspaceInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setErrorMessage(null);
    onLoadInvitation(token)
      .then((loaded) => {
        if (!active) return;
        setInvitation(loaded);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(formatInviteError(error, t('invite.loadFailed')));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onLoadInvitation, token]);

  const accept = async () => {
    setIsAccepting(true);
    setErrorMessage(null);
    try {
      await onAcceptInvitation(token);
    } catch (error) {
      setErrorMessage(formatInviteError(error, t('invite.acceptFailed')));
    } finally {
      setIsAccepting(false);
    }
  };

  const isCurrentUserExpected = invitation?.email.toLowerCase() === currentUserEmail.toLowerCase();
  const canAccept = Boolean(invitation && invitation.status === 'pending' && isCurrentUserExpected);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-2xl flex-col justify-center">
        <div className="rounded-xl border border-ui-border bg-ui-surface p-8 shadow-sm">
          {isLoading ? (
            <div className="flex items-center gap-3 text-sm font-semibold text-ui-text-muted">
              <Loader2 className="h-5 w-5 animate-spin text-accent-strong" />
              {t('invite.loading')}
            </div>
          ) : invitation ? (
            <div className="space-y-7">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('invite.title')}</p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight text-ui-text">{invitation.workspaceName}</h1>
                  <p className="mt-2 text-sm font-medium leading-6 text-ui-text-muted">
                    {t('invite.invitedAs', { role: formatRole(invitation.role), time: formatDate(invitation.expiresAt) })}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 rounded-lg border border-ui-border bg-ui-bg p-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-ui-text-muted">{t('invite.inviteEmail')}</span>
                  <span className="text-right font-bold text-ui-text">{invitation.email}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-ui-text-muted">{t('invite.signedInAs')}</span>
                  <span className="text-right font-bold text-ui-text">{currentUserEmail}</span>
                </div>
              </div>

              {!isCurrentUserExpected && (
                <div className="rounded-lg border border-status-warning/25 bg-status-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-status-warning-text">
                  {t('invite.emailMismatch', { email: invitation.email })}
                </div>
              )}
              {invitation.status !== 'pending' && (
                <div className="rounded-lg border border-ui-border bg-ui-bg px-4 py-3 text-sm font-semibold leading-6 text-ui-text-muted">
                  {t('invite.notPending', { status: invitation.status })}
                </div>
              )}
              {errorMessage && (
                <div className="flex gap-3 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-sm font-semibold leading-6 text-status-danger-text">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => void accept()}
                  disabled={!canAccept || isAccepting}
                  variant="primary"
                  size="lg"
                  className="flex-1 text-xs uppercase tracking-widest"
                >
                  {isAccepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {t('invite.accept')}
                </Button>
                <Button
                  onClick={onGoToWorkspaces}
                  variant="secondary"
                  size="lg"
                  className="text-xs uppercase tracking-widest"
                >
                  {t('invite.viewWorkspaces')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-danger-soft text-status-danger-text">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-ui-text">{t('invite.unavailable')}</h1>
                <p className="mt-2 text-sm font-medium leading-6 text-ui-text-muted">
                  {errorMessage || t('invite.invalid')}
                </p>
              </div>
              <Button onClick={onGoToWorkspaces} variant="primary" size="lg" className="text-xs uppercase tracking-widest">
                {t('invite.viewWorkspaces')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
