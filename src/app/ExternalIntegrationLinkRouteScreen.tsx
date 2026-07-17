import React, { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { MiniProgressBar } from '@/components/common/Loading';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import {
  createExternalIntegrationGrantDraft,
  externalIntegrationWorkspaceGrants,
  formatExternalIntegrationCapability,
  setExternalIntegrationWorkspaceEnabled,
  toggleExternalIntegrationCapability
} from '@/services/control-plane/externalIntegrationCapabilities';
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

export const ExternalIntegrationLinkRouteScreen: React.FC<ExternalIntegrationLinkRouteScreenProps> = ({ logoSrc, onLinkStatus, route }) => {
  const [preview, setPreview] = useState<ControlPlaneExternalIntegrationLinkPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(Boolean(route.token));
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [grantDraft, setGrantDraft] = useState<Record<string, ControlPlaneWorkspaceCapability[]>>({});

  useEffect(() => {
    if (!route.token) return;
    let cancelled = false;
    setIsLoadingPreview(true);
    setPreview(null);
    setApprovalError(null);
    void controlPlaneApi.previewExternalIntegrationLink(route.token)
      .then((result) => {
        if (!cancelled) {
          setPreview(result);
          setGrantDraft(createExternalIntegrationGrantDraft(result.grantableWorkspaces || []));
        }
      })
      .catch(() => {
        if (!cancelled) onLinkStatus('expired');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onLinkStatus, route.token]);

  const handleApprove = () => {
    if (!route.token || isApproving || !preview) return;
    setIsApproving(true);
    setApprovalError(null);
    const workspaceGrants = externalIntegrationWorkspaceGrants(grantDraft);
    void controlPlaneApi.completeExternalIntegrationLink(route.token, workspaceGrants)
      .then(() => onLinkStatus('linked'))
      .catch(() => {
        setApprovalError('Unable to complete the external integration account link. The request may have expired.');
        onLinkStatus('expired');
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
          <p className="whitespace-pre-line text-lg font-semibold leading-7 text-ui-text">{externalIntegrationLinkStatusMessage(route.status)}</p>
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
          <h1 className="text-2xl font-semibold text-ui-text">{externalIntegrationLinkApprovalTitle(preview)}</h1>
          <p className="text-sm leading-6 text-ui-text-muted">{externalIntegrationLinkApprovalMessage}</p>
        </div>
        {isLoadingPreview && (
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-ui-text-muted">Checking link request</span>
            <MiniProgressBar className="w-32" />
          </div>
        )}
        {preview && (
          <>
            <dl className="grid w-full gap-3 rounded-md border border-ui-border bg-ui-surface px-4 py-3 text-left text-sm">
              <div>
                <dt className="text-xs font-medium uppercase text-ui-text-muted">Integration</dt>
                <dd className="mt-1 font-medium text-ui-text">{preview.clientDisplayName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-ui-text-muted">Provider</dt>
                <dd className="mt-1 font-medium text-ui-text">{preview.provider}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-ui-text-muted">External account</dt>
                <dd className="mt-1 font-medium text-ui-text">{preview.externalDisplayName || preview.externalUserId}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-ui-text-muted">Signed in as</dt>
                <dd className="mt-1 font-medium text-ui-text">{preview.signedInUser.email}</dd>
              </div>
            </dl>
            <div className="w-full rounded-md border border-ui-border bg-ui-surface px-4 py-3 text-left">
              <h2 className="text-sm font-semibold text-ui-text">Workspace access</h2>
              <div className="mt-3 grid gap-3">
                {(preview.grantableWorkspaces || []).map((workspace) => {
                  const selectedCapabilities = grantDraft[workspace.workspaceId] || [];
                  const workspaceEnabled = selectedCapabilities.length > 0;
                  return (
                    <div key={workspace.workspaceId} className="rounded-md border border-ui-border bg-ui-bg px-3 py-3">
                      <label className="flex items-start gap-3">
                        <Checkbox
                          checked={workspaceEnabled}
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
                                onChange={(event) => toggleCapability(workspace, capability, event.target.checked)}
                              />
                              {formatExternalIntegrationCapability(capability)}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!preview.grantableWorkspaces?.length && (
                  <p className="text-sm text-ui-text-muted">No workspaces are available for this external integration.</p>
                )}
              </div>
            </div>
          </>
        )}
        <Button onClick={handleApprove} disabled={isApproving || isLoadingPreview || !preview} variant="primary" size="lg" className="w-full">
          {isApproving ? 'Approving' : 'Approve'}
        </Button>
        <Button onClick={handleCancel} disabled={isApproving} variant="secondary" size="md" className="w-full">
          Cancel linking
        </Button>
        {isApproving && (
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
            <span className="sr-only">Completing external integration account link</span>
            <MiniProgressBar className="w-32" />
          </div>
        )}
        {approvalError && <p role="alert" className="text-sm font-medium text-status-danger-text">{approvalError}</p>}
      </section>
    </main>
  );
};
