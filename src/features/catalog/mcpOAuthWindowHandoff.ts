const MCP_OAUTH_POPUP_MARKER = 'acornops.mcpOAuth.popup';
export const MCP_OAUTH_RESULT_STORAGE_KEY = 'acornops.mcpOAuth.result';

export interface McpOAuthWindowResult {
  id: string;
  result: string;
  returnPath: string;
}

export function openMcpOAuthAuthorizationTab(): Window | null {
  const authorizationTab = window.open('about:blank', '_blank');
  if (!authorizationTab) return null;

  authorizationTab.opener = null;
  authorizationTab.document.title = 'Opening authorization';
  try {
    authorizationTab.sessionStorage.setItem(MCP_OAUTH_POPUP_MARKER, 'true');
  } catch {
    // Authorization remains safe and usable if browser storage is unavailable.
  }
  return authorizationTab;
}

export function publishMcpOAuthWindowResult(result: string, returnPath: string): boolean {
  const payload: McpOAuthWindowResult = {
    id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    result,
    returnPath
  };
  try {
    window.localStorage.setItem(MCP_OAUTH_RESULT_STORAGE_KEY, JSON.stringify(payload));
    window.localStorage.removeItem(MCP_OAUTH_RESULT_STORAGE_KEY);
    return true;
  } catch {
    // The callback tab still renders the result when cross-tab storage is unavailable.
    return false;
  }
}

export function readMcpOAuthWindowResult(
  event: Pick<StorageEvent, 'key' | 'newValue'>
): McpOAuthWindowResult | null {
  if (event.key !== MCP_OAUTH_RESULT_STORAGE_KEY || !event.newValue) return null;
  try {
    const payload: unknown = JSON.parse(event.newValue);
    if (
      !payload
      || typeof payload !== 'object'
      || typeof (payload as McpOAuthWindowResult).id !== 'string'
      || typeof (payload as McpOAuthWindowResult).result !== 'string'
      || typeof (payload as McpOAuthWindowResult).returnPath !== 'string'
    ) {
      return null;
    }
    const candidate = payload as McpOAuthWindowResult;
    if (
      candidate.id.length === 0
      || candidate.id.length > 128
      || candidate.result.length === 0
      || candidate.result.length > 128
      || !candidate.returnPath.startsWith('/')
      || candidate.returnPath.startsWith('//')
      || candidate.returnPath.length > 2048
    ) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

export function isMcpOAuthPopupWindow(): boolean {
  try {
    return window.sessionStorage.getItem(MCP_OAUTH_POPUP_MARKER) === 'true';
  } catch {
    return false;
  }
}
