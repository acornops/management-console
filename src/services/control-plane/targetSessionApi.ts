import { requestEventStream, requestJson } from './http';
import { pageQuery } from './query';
import type {
  ControlPlaneSession,
  ControlPlaneSessionListPage
} from './types';
import type {
  ControlPlaneTargetChatActivity,
  ControlPlaneTargetChatActivityEvent
} from './sessionActivityTypes';

export const targetSessionApi = {
  async createTargetSession(workspaceId: string, targetId: string, title: string): Promise<ControlPlaneSession> {
    return requestJson<ControlPlaneSession>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/sessions`,
      { method: 'POST', body: JSON.stringify({ title }) }
    );
  },

  async listTargetSessions(workspaceId: string, targetId: string, options?: { limit?: number; cursor?: string; q?: string; status?: string }): Promise<ControlPlaneSessionListPage> {
    return requestJson<ControlPlaneSessionListPage>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/sessions${pageQuery(options)}`
    );
  },

  async getSession(sessionId: string): Promise<ControlPlaneSession> {
    return requestJson<ControlPlaneSession>(`/api/v1/sessions/${encodeURIComponent(sessionId)}`);
  },

  async getTargetChatActivity(workspaceId: string, targetId: string, options?: { windowSeconds?: number }): Promise<ControlPlaneTargetChatActivity> {
    return requestJson<ControlPlaneTargetChatActivity>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/chat-activity${pageQuery({
        filters: { windowSeconds: options?.windowSeconds ? String(options.windowSeconds) : undefined }
      })}`
    );
  },

  async streamTargetChatActivity(
    workspaceId: string,
    targetId: string,
    options?: {
      signal?: AbortSignal;
      after?: string;
      onEvent?: (event: ControlPlaneTargetChatActivityEvent) => void;
    }
  ): Promise<void> {
    const afterQuery = options?.after ? `?after=${encodeURIComponent(options.after)}` : '';
    await requestEventStream<ControlPlaneTargetChatActivityEvent>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/chat-activity/stream${afterQuery}`,
      options
    );
  }
};
