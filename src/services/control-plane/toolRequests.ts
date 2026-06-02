import { requestJson } from './http';
import type { ControlPlaneClusterTool } from './types';

export async function updateTargetToolRequest(
  workspaceId: string,
  targetId: string,
  toolName: string,
  enabled: boolean,
  options?: { capability?: 'read' | 'write' }
): Promise<void> {
  await requestJson<ControlPlaneClusterTool>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/tools/${encodeURIComponent(toolName)}`,
    { method: 'PATCH', body: JSON.stringify({ enabled, capability: options?.capability }) }
  );
}
