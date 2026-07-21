export type AuthResultNoticeKey =
  | 'login.oidcAccessDenied'
  | 'login.logoutSuccess'
  | 'login.logoutLocalOnly'
  | 'login.logoutIncomplete';

export function authResultNoticeKey(search: string): AuthResultNoticeKey | undefined {
  const params = new URLSearchParams(search);
  if (params.get('auth_result') === 'oidc_access_denied') return 'login.oidcAccessDenied';
  const logoutResult = params.get('logout_result');
  if (logoutResult === 'success') return 'login.logoutSuccess';
  if (logoutResult === 'local_only') return 'login.logoutLocalOnly';
  if (logoutResult === 'incomplete') return 'login.logoutIncomplete';
  return undefined;
}

export function clearAuthResultParameters(): void {
  const url = new URL(window.location.href);
  const hadResult = url.searchParams.has('auth_result') || url.searchParams.has('logout_result');
  if (!hadResult) return;
  url.searchParams.delete('auth_result');
  url.searchParams.delete('logout_result');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}
