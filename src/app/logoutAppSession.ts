import { clearChatComposerRuntimesForUser } from '@/features/targets/chat/lib/chatComposerRuntimeStorage';
import type { NavigateOptions } from '@/hooks/useAppRouter';
import { getControlPlaneUrl } from '@/services/control-plane/http';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { AppPaths } from '@/utils/routes';

interface LogoutAppSessionOptions {
  userId?: string;
  clearSessionForLogout: () => void;
  closeAccountMenu: () => void;
  postLogoutPath?: string;
  navigate: (path: string, options?: NavigateOptions) => void;
}

const POST_LOGOUT_INVITATION_PATH_KEY = 'acornops_post_logout_invitation_path';

export function safePostLogoutInvitationPath(path: string | undefined): string | undefined {
  if (!path || !/^\/invites\/[A-Za-z0-9._~!$&'()*+,;=:@%-]+$/.test(path)) return undefined;
  return path;
}

export function consumePostLogoutInvitationPath(): string | undefined {
  const path = safePostLogoutInvitationPath(window.sessionStorage.getItem(POST_LOGOUT_INVITATION_PATH_KEY) || undefined);
  window.sessionStorage.removeItem(POST_LOGOUT_INVITATION_PATH_KEY);
  return path;
}

export async function logoutAppSession({
  userId,
  clearSessionForLogout,
  closeAccountMenu,
  postLogoutPath,
  navigate
}: LogoutAppSessionOptions): Promise<void> {
  const invitationPath = safePostLogoutInvitationPath(postLogoutPath);
  if (invitationPath) {
    window.sessionStorage.setItem(POST_LOGOUT_INVITATION_PATH_KEY, invitationPath);
  } else {
    window.sessionStorage.removeItem(POST_LOGOUT_INVITATION_PATH_KEY);
  }
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
  navigate(invitationPath || AppPaths.workspaces(), { replace: true });
}
