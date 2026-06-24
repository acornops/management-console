import React, { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { MiniProgressBar } from '@/components/common/Loading';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneExternalIntegrationLinkPreview } from '@/services/control-plane/types';
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

  useEffect(() => {
    if (!route.token) return;
    let cancelled = false;
    setIsLoadingPreview(true);
    setPreview(null);
    setApprovalError(null);
    void controlPlaneApi.previewExternalIntegrationLink(route.token)
      .then((result) => {
        if (!cancelled) setPreview(result);
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
    void controlPlaneApi.completeExternalIntegrationLink(route.token)
      .then(() => onLinkStatus('linked'))
      .catch(() => {
        setApprovalError('Unable to complete the external integration account link. The request may have expired.');
        onLinkStatus('expired');
      })
      .finally(() => setIsApproving(false));
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
