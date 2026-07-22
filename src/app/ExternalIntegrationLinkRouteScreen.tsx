import React, { useEffect, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { MiniProgressBar } from '@/components/common/Loading';
import {
  buildExternalIntegrationWorkspaceGrants,
  createExternalIntegrationGrantDraft,
  formatExternalIntegrationCapability,
  setExternalIntegrationWorkspaceEnabled,
  toggleExternalIntegrationCapability
} from '@/features/external-integrations/externalIntegrationGrants';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { ControlPlaneRequestError } from '@/services/control-plane/http';
import type {
  ControlPlaneExternalIntegrationGrantableWorkspace,
  ControlPlaneExternalIntegrationLinkPreview,
  ControlPlaneWorkspaceCapability
} from '@/services/control-plane/types';
import { AppRoute } from '@/utils/routes';

interface ExternalIntegrationLinkRouteScreenProps {
  logoSrc: string;
  onLinkStatus: (status: 'linked' | 'expired' | 'cancelled') => void;
  route: Extract<AppRoute, { kind: 'externalIntegrationLink' }>;
}

export function externalIntegrationLinkStatusMessage(status?: 'linked' | 'expired' | 'cancelled'): string {
  if (status === 'linked') return 'Account linking successful.\nGo back to the external client.';
  if (status === 'expired') return 'Account linking unsuccessful due to expired token.\nRetry linking on external client.';
  if (status === 'cancelled') return 'Account linking cancelled.\nGo back to the external client.';
  return 'External integration link unavailable.';
}

export function externalIntegrationLinkApprovalTitle(preview?: Pick<ControlPlaneExternalIntegrationLinkPreview, 'clientDisplayName'> | null): string {
  return preview ? `Link AcornOps to ${preview.clientDisplayName}` : 'Link AcornOps to an external integration';
}

export const externalIntegrationLinkApprovalMessage = 'Approve this request to connect your signed-in AcornOps account to the external account shown below.';

export function externalIntegrationLinkErrorIsExpired(error: unknown): boolean {
  return error instanceof ControlPlaneRequestError
    && (error.status === 410 || error.code === 'EXTERNAL_INTEGRATION_LINK_EXPIRED');
}

export const ExternalIntegrationLinkRouteScreen: React.FC<ExternalIntegrationLinkRouteScreenProps> = ({ logoSrc, onLinkStatus, route }) => {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<ControlPlaneExternalIntegrationLinkPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(Boolean(route.token));
  const [isApproving, setIsApproving] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [grantDraft, setGrantDraft] = useState<Record<string, ControlPlaneWorkspaceCapability[]>>({});
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const translationRef = useRef(t);
  translationRef.current = t;

  useEffect(() => {
    if (!route.token) return;
    let cancelled = false;
    setIsLoadingPreview(true);
    setPreview(null);
    setPreviewError(null);
    setApprovalError(null);
    void controlPlaneApi.previewExternalIntegrationLink(route.token)
      .then((result) => {
        if (!cancelled) {
          setPreview(result);
          setGrantDraft(createExternalIntegrationGrantDraft(result.grantableWorkspaces || []));
        }
      })
      .catch((error) => {
        if (cancelled) return;
        if (externalIntegrationLinkErrorIsExpired(error)) {
          onLinkStatus('expired');
          return;
        }
        setPreviewError(formatControlPlaneError(error, translationRef.current('externalIntegrationLink.loadFailed'), { area: 'auth' }));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onLinkStatus, previewAttempt, route.token]);

  const handleApprove = () => {
    if (!route.token || isApproving || !preview) return;
    setIsApproving(true);
    setApprovalError(null);
    const workspaceGrants = buildExternalIntegrationWorkspaceGrants(grantDraft);
    void controlPlaneApi.completeExternalIntegrationLink(route.token, workspaceGrants)
      .then(() => onLinkStatus('linked'))
      .catch((error) => {
        if (externalIntegrationLinkErrorIsExpired(error)) {
          onLinkStatus('expired');
          return;
        }
        setApprovalError(formatControlPlaneError(error, t('externalIntegrationLink.completeFailed'), { area: 'auth' }));
      })
      .finally(() => setIsApproving(false));
  };

  const setWorkspaceEnabled = (workspace: ControlPlaneExternalIntegrationGrantableWorkspace, enabled: boolean) => {
    setGrantDraft((current) => setExternalIntegrationWorkspaceEnabled(current, workspace, enabled));
  };

  const toggleCapability = (
    workspace: ControlPlaneExternalIntegrationGrantableWorkspace,
    capability: ControlPlaneWorkspaceCapability,
    enabled: boolean
  ) => {
    setGrantDraft((current) => toggleExternalIntegrationCapability(current, workspace, capability, enabled));
  };

  const handleCancel = () => {
    if (isApproving) return;
    onLinkStatus('cancelled');
  };

  if (!route.token) {
    return (
      <div role="status" aria-live="polite" className="flex min-h-screen justify-center bg-ui-bg px-6 pt-28 text-ui-text sm:pt-32">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <img src={logoSrc} className="h-12 w-12" alt="AcornOps" />
          <p className="whitespace-pre-line text-lg font-semibold leading-7 text-ui-text">
            {t(`externalIntegrationLink.status.${route.status || 'unavailable'}`)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ui-bg px-6 py-12 text-ui-text">
      <section className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <img src={logoSrc} className="h-12 w-12" alt="AcornOps" />
        <div className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-ui-border bg-ui-surface text-accent-strong">
            <Link2 aria-hidden="true" className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold text-ui-text">
            {preview
              ? t('externalIntegrationLink.approvalTitleNamed', { name: preview.clientDisplayName })
              : t('externalIntegrationLink.approvalTitle')}
          </h1>
          <p className="text-sm leading-6 text-ui-text-muted">{t('externalIntegrationLink.approvalMessage')}</p>
        </div>
        {isLoadingPreview && (
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-ui-text-muted">{t('externalIntegrationLink.checking')}</span>
            <MiniProgressBar className="w-32" />
          </div>
        )}
        {preview && (
          <>
            <dl className="grid w-full gap-3 rounded-md border border-ui-border bg-ui-surface px-4 py-3 text-left text-sm">
              <div>
                <dt className="text-xs font-medium uppercase text-ui-text-muted">{t('externalIntegrationLink.integration')}</dt>
                <dd className="mt-1 break-words font-medium text-ui-text">{preview.clientDisplayName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-ui-text-muted">{t('externalIntegrationLink.provider')}</dt>
                <dd className="mt-1 break-all font-medium text-ui-text">{preview.provider}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-ui-text-muted">{t('externalIntegrationLink.externalAccount')}</dt>
                <dd className="mt-1 break-all font-medium text-ui-text">{preview.externalDisplayName || preview.externalUserId}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-ui-text-muted">{t('externalIntegrationLink.signedInAs')}</dt>
                <dd className="mt-1 break-all font-medium text-ui-text">{preview.signedInUser.email}</dd>
              </div>
            </dl>
            <div className="w-full rounded-md border border-ui-border bg-ui-surface px-4 py-3 text-left">
              <h2 className="text-sm font-semibold text-ui-text">{t('externalIntegrationLink.workspaceAccess')}</h2>
              <div className="mt-3 grid gap-3">
                {(preview.grantableWorkspaces || []).map((workspace) => {
                  const selectedCapabilities = grantDraft[workspace.workspaceId] || [];
                  const workspaceEnabled = selectedCapabilities.length > 0;
                  return (
                    <div key={workspace.workspaceId} className="rounded-md border border-ui-border bg-ui-bg px-3 py-3">
                      <label className="flex items-start gap-3">
                        <Checkbox
                          checked={workspaceEnabled}
                          disabled={isApproving}
                          onChange={(event) => setWorkspaceEnabled(workspace, event.target.checked)}
                          className="mt-1"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ui-text">{workspace.workspaceName}</span>
                          <span className="block text-xs text-ui-text-muted">{workspace.role}</span>
                        </span>
                      </label>
                      {workspaceEnabled && (
                        <div className="mt-3 grid gap-2 pl-6">
                          {workspace.grantableCapabilities.map((capability) => (
                            <label key={capability} className="flex items-center gap-2 text-xs font-medium text-ui-text-muted">
                              <Checkbox
                                checked={selectedCapabilities.includes(capability)}
                                disabled={isApproving}
                                onChange={(event) => toggleCapability(workspace, capability, event.target.checked)}
                              />
                              {t(`externalIntegrationLink.capabilities.${capability}`, {
                                defaultValue: formatExternalIntegrationCapability(capability)
                              })}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!preview.grantableWorkspaces?.length && (
                  <p className="text-sm text-ui-text-muted">{t('externalIntegrationLink.noWorkspaces')}</p>
                )}
              </div>
            </div>
          </>
        )}
        <Button onClick={handleApprove} disabled={isApproving || isLoadingPreview || !preview} variant="primary" size="lg" className="w-full">
          {isApproving ? t('externalIntegrationLink.approving') : t('externalIntegrationLink.approve')}
        </Button>
        <Button onClick={handleCancel} disabled={isApproving} variant="secondary" size="md" className="w-full">
          {t('externalIntegrationLink.cancel')}
        </Button>
        {isApproving && (
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
            <span className="sr-only">{t('externalIntegrationLink.completing')}</span>
            <MiniProgressBar className="w-32" />
          </div>
        )}
        {previewError && (
          <div role="alert" className="flex w-full flex-col items-center gap-3 text-sm font-medium text-status-danger-text">
            <p>{previewError}</p>
            <Button variant="secondary" size="sm" onClick={() => setPreviewAttempt((attempt) => attempt + 1)}>
              {t('externalIntegrationLink.retry')}
            </Button>
          </div>
        )}
        {approvalError && <p role="alert" className="text-sm font-medium text-status-danger-text">{approvalError}</p>}
      </section>
    </main>
  );
};
