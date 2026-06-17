import React, { useEffect, useRef } from 'react';
import { AppSessionRestoringScreen } from '@/app/AppSessionRestoringScreen';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { AppRoute } from '@/utils/routes';

interface MattermostLinkRouteScreenProps {
  logoSrc: string;
  onLinkStatus: (status: 'linked' | 'expired') => void;
  route: Extract<AppRoute, { kind: 'mattermostLink' }>;
}

function mattermostLinkStatusLabel(route: Extract<AppRoute, { kind: 'mattermostLink' }>): string {
  if (route.token) return 'Loading';
  return mattermostLinkStatusMessage(route.status);
}

export function mattermostLinkStatusMessage(status?: 'linked' | 'expired'): string {
  if (status === 'linked') return 'Account linking successful.\nGo back to the external client.';
  if (status === 'expired') return 'Account linking unsuccessful due to expired token.\nRetry linking on external client.';
  return 'Mattermost link unavailable.';
}

export const MattermostLinkRouteScreen: React.FC<MattermostLinkRouteScreenProps> = ({ logoSrc, onLinkStatus, route }) => {
  const redirectTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!route.token || redirectTokenRef.current === route.token) return;
    redirectTokenRef.current = route.token;
    void controlPlaneApi.completeMattermostLink(route.token)
      .then(() => onLinkStatus('linked'))
      .catch(() => onLinkStatus('expired'));
  }, [onLinkStatus, route.token]);

  if (!route.token) {
    return (
      <div role="status" aria-live="polite" className="flex min-h-screen justify-center bg-ui-bg px-6 pt-16 text-ui-text">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <img src={logoSrc} className="h-12 w-12" alt="AcornOps" />
          <p className="whitespace-pre-line text-lg font-semibold text-ui-text">{mattermostLinkStatusMessage(route.status)}</p>
        </div>
      </div>
    );
  }

  return <AppSessionRestoringScreen logoSrc={logoSrc} label={mattermostLinkStatusLabel(route)} />;
};
