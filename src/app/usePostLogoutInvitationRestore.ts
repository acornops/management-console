import { useEffect } from 'react';
import type { NavigateOptions } from '@/hooks/useAppRouter';
import { consumePostLogoutInvitationPath } from '@/app/logoutAppSession';

export function usePostLogoutInvitationRestore(
  enabled: boolean,
  navigate: (path: string, options?: NavigateOptions) => void
): void {
  useEffect(() => {
    if (!enabled) return;
    const invitationPath = consumePostLogoutInvitationPath();
    if (invitationPath) navigate(invitationPath, { replace: true });
  }, [enabled, navigate]);
}
