import { useSessionCachedState } from '@/hooks/sessionDataCache';
import type { WorkflowApiDefinition } from '@/services/control-plane/workflowApi';
import type { WorkflowWebhookListResponse } from '@/services/control-plane/workflowWebhookApi';

export function useWorkspaceIncomingWebhookDataCache(workspaceId: string) {
  const cachePrefix = `workspace:${workspaceId}:workflow-webhooks:`;
  const triggerPageCacheKey = `${cachePrefix}page`;
  const [triggerPage, setTriggerPage] = useSessionCachedState<WorkflowWebhookListResponse | null>(triggerPageCacheKey, null);
  const [workflows, setWorkflows] = useSessionCachedState<WorkflowApiDefinition[]>(`${cachePrefix}workflows`, []);

  return { triggerPage, setTriggerPage, workflows, setWorkflows, triggerPageCacheKey };
}
