import { ControlPlaneRequestError } from './http';
import { AppPaths } from '@/utils/routes';

export type McpReadinessAction = 'connect_mcp_server' | 'verify_mcp_server';
export type McpReadinessFailureCode =
  | 'MCP_PAT_USER_PRINCIPAL_REQUIRED'
  | 'MCP_PERSONAL_CONNECTION_MISSING'
  | 'MCP_PERSONAL_CONNECTION_ERROR'
  | 'MCP_PERSONAL_TOOL_UNAVAILABLE'
  | 'MCP_INSTALLATION_UNAVAILABLE'
  | 'MCP_REMOTE_DISABLED';

export interface McpReadinessFailure {
  serverId: string;
  toolName: string;
  code: McpReadinessFailureCode;
  action?: McpReadinessAction;
}

export interface McpReadinessRecovery {
  message: string;
  href: string;
  label: string;
  failure?: McpReadinessFailure;
}

type RecoveryContext = {
  workspaceId: string;
} & (
  | { scopeType: 'agent'; agentId: string }
  | { scopeType: 'target'; targetId: string; targetType: 'kubernetes' | 'virtual_machine' }
);

const readinessCodes = new Set<McpReadinessFailureCode>([
  'MCP_PAT_USER_PRINCIPAL_REQUIRED',
  'MCP_PERSONAL_CONNECTION_MISSING',
  'MCP_PERSONAL_CONNECTION_ERROR',
  'MCP_PERSONAL_TOOL_UNAVAILABLE',
  'MCP_INSTALLATION_UNAVAILABLE',
  'MCP_REMOTE_DISABLED'
]);

function boundedIdentifier(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= 256 ? trimmed : undefined;
}

function parseAction(value: unknown): McpReadinessAction | undefined {
  return value === 'connect_mcp_server' || value === 'verify_mcp_server'
    ? value
    : undefined;
}

function parseFailure(value: unknown): McpReadinessFailure | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const serverId = boundedIdentifier(candidate.serverId);
  const toolName = boundedIdentifier(candidate.toolName);
  const code = typeof candidate.code === 'string' && readinessCodes.has(candidate.code as McpReadinessFailureCode)
    ? candidate.code as McpReadinessFailureCode
    : undefined;
  if (!serverId || !toolName || !code) return undefined;
  const action = parseAction(candidate.action);
  return { serverId, toolName, code, ...(action ? { action } : {}) };
}

export function parseMcpReadinessFailures(error: unknown): McpReadinessFailure[] {
  if (!(error instanceof ControlPlaneRequestError)) return [];
  const failures = error.details?.readinessFailures;
  return Array.isArray(failures)
    ? failures.flatMap((failure) => {
      const parsed = parseFailure(failure);
      return parsed ? [parsed] : [];
    }).slice(0, 20)
    : [];
}

function isMcpReadinessError(error: ControlPlaneRequestError): boolean {
  if (
    error.code === 'MCP_PERSONAL_CONNECTION_REQUIRED'
    || error.code === 'MCP_PAT_USER_PRINCIPAL_REQUIRED'
    || error.code === 'MCP_INSTALLATION_UNAVAILABLE'
    || error.code === 'MCP_REMOTE_DISABLED'
  ) return true;
  return Array.isArray(error.details?.readinessErrors);
}

function appendRecoveryQuery(path: string, failure?: McpReadinessFailure): string {
  if (!failure) return path;
  const [pathname, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  params.set('mcpServer', failure.serverId);
  if (failure.action) params.set('mcpAction', failure.action);
  return `${pathname}?${params.toString()}`;
}

function recoveryPath(context: RecoveryContext, failure?: McpReadinessFailure): string {
  if (context.scopeType === 'agent') {
    const params = new URLSearchParams({
      agent: context.agentId,
      panel: 'profile',
      agentTab: 'capabilities',
      capabilityTab: 'mcp'
    });
    if (failure) {
      params.set('mcpServer', failure.serverId);
      if (failure.action) params.set('mcpAction', failure.action);
    }
    return `${AppPaths.workspaceAgents(context.workspaceId)}?${params.toString()}`;
  }
  const basePath = context.targetType === 'kubernetes'
    ? AppPaths.workspaceKubernetesClusterDiagnostics(context.workspaceId, context.targetId, 'mcpServers')
    : AppPaths.workspaceVirtualMachineDetail(context.workspaceId, context.targetId, 'mcpServers');
  return appendRecoveryQuery(basePath, failure);
}

function escapeMarkdownText(value: string): string {
  return value.replace(/([\\`*_[\]{}()<>#+\-.!|])/g, '\\$1');
}

function recoveryMessage(
  error: ControlPlaneRequestError,
  context: RecoveryContext,
  failure?: McpReadinessFailure
): string {
  switch (failure?.code || error.code) {
    case 'MCP_PERSONAL_CONNECTION_MISSING':
    case 'MCP_PERSONAL_CONNECTION_REQUIRED':
      return 'This run needs a personal MCP connection. Connect the required PAT, then retry.';
    case 'MCP_PERSONAL_CONNECTION_ERROR':
      return 'The required personal MCP connection is in error. Verify or replace its PAT, then retry.';
    case 'MCP_PERSONAL_TOOL_UNAVAILABLE':
      return 'The current PAT does not expose a required approved MCP tool. Verify the connection and review discovered tools.';
    case 'MCP_PAT_USER_PRINCIPAL_REQUIRED':
      return 'This MCP tool requires a user-owned personal connection and cannot run as a service principal.';
    case 'MCP_INSTALLATION_UNAVAILABLE':
      if (context.scopeType === 'target' && failure) {
        const targetLabel = context.targetType === 'kubernetes' ? 'Kubernetes' : 'virtual machine';
        return `The required ${targetLabel} tool “${escapeMarkdownText(failure.toolName)}” is unavailable or disabled. Review its MCP server configuration before retrying.`;
      }
      return 'A required MCP installation is unavailable. Review the installation before retrying.';
    case 'MCP_REMOTE_DISABLED':
      return 'Remote MCP is disabled by platform policy. Review the installation and operator configuration.';
    default:
      return 'MCP prerequisites are not ready. Review the relevant installation before retrying.';
  }
}

function recoveryLabel(
  context: RecoveryContext,
  failure?: McpReadinessFailure
): string {
  if (failure?.action === 'connect_mcp_server') return 'Connect the required MCP server';
  if (failure?.action === 'verify_mcp_server') return 'Verify the required MCP server';
  if (context.scopeType === 'target' && failure?.code === 'MCP_INSTALLATION_UNAVAILABLE') {
    return 'Review target MCP tools';
  }
  return 'Review MCP configuration';
}

export function resolveMcpReadinessRecovery(
  error: unknown,
  context: RecoveryContext
): McpReadinessRecovery | null {
  if (!(error instanceof ControlPlaneRequestError) || !isMcpReadinessError(error)) return null;
  const failure = parseMcpReadinessFailures(error)[0];
  return {
    message: recoveryMessage(error, context, failure),
    href: recoveryPath(context, failure),
    label: recoveryLabel(context, failure),
    ...(failure ? { failure } : {})
  };
}
