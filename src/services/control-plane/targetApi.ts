import { requestJson } from './http';
import { parseAgentConnection } from '@/utils/agentConnection';
import type { PagedResult, TargetSummary } from './types';

function targetPageQuery(options?: { limit?: number; cursor?: string; q?: string; targetType?: TargetSummary['targetType'] }): string {
  const params = new URLSearchParams();
  if (typeof options?.limit === 'number') params.set('limit', String(options.limit));
  if (options?.cursor) params.set('cursor', options.cursor);
  if (options?.q) params.set('q', options.q);
  if (options?.targetType) params.set('targetType', options.targetType);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function listTargetsForWorkspace(
  workspaceId: string,
  options?: { limit?: number; cursor?: string; q?: string; targetType?: TargetSummary['targetType'] }
): Promise<PagedResult<TargetSummary>> {
  const page = await requestJson<PagedResult<TargetSummary>>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets${targetPageQuery(options)}`
  );
  return { ...page, items: page.items.map((target) => ({ ...target, connection: parseAgentConnection(target.connection) })) };
}

export async function getTarget(workspaceId: string, targetId: string): Promise<TargetSummary> {
  const target = await requestJson<TargetSummary>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}`
  );
  return { ...target, connection: parseAgentConnection(target.connection) };
}
