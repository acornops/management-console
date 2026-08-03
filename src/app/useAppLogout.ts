import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { NavigateOptions } from '@/hooks/useAppRouter';
import { logoutAppSession } from '@/app/logoutAppSession';

export function useAppLogout(
  userId: string | undefined,
  clearSessionForLogout: () => void,
  navigate: (path: string, options?: NavigateOptions) => void,
  setIsAccountMenuOpen: Dispatch<SetStateAction<boolean>>
): (postLogoutPath?: string) => Promise<void> {
  return useCallback((postLogoutPath?: string) => logoutAppSession({
    userId,
    clearSessionForLogout,
    closeAccountMenu: () => setIsAccountMenuOpen(false),
    postLogoutPath,
    navigate
  }), [clearSessionForLogout, navigate, setIsAccountMenuOpen, userId]);
}
