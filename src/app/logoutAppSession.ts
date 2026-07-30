import { clearChatComposerRuntimesForUser } from '@/features/targets/chat/lib/chatComposerRuntimeStorage';
import type { NavigateOptions } from '@/hooks/useAppRouter';
import { getControlPlaneUrl } from '@/services/control-plane/http';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { AppPaths } from '@/utils/routes';

interface LogoutAppSessionOptions {
  userId?: string;
  clearSessionForLogout: () => void;
  closeAccountMenu: () => void;
  navigate: (path: string, options?: NavigateOptions) => void;
}

export async function logoutAppSession({
  userId,
  clearSessionForLogout,
  closeAccountMenu,
  navigate
}: LogoutAppSessionOptions): Promise<void> {
  let redirectUrl: string | undefined;
  try {
    const result = await controlPlaneApi.logout();
    redirectUrl = result.redirectPath.startsWith('/api/')
      ? getControlPlaneUrl(result.redirectPath).toString()
      : new URL(result.redirectPath, window.location.origin).toString();
  } catch {
    console.error('Logout request failed');
  }

  closeAccountMenu();
  if (userId) clearChatComposerRuntimesForUser(userId);
  clearSessionForLogout();
  if (redirectUrl) {
    window.location.assign(redirectUrl);
    return;
  }
  navigate(AppPaths.workspaces(), { replace: true });
}
