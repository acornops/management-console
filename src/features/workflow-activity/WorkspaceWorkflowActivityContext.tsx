import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  listWorkspaceWorkflowExecutions,
  type WorkflowExecutionPage
} from '@/services/control-plane/workflowApi';

export interface WorkspaceWorkflowActivityValue {
  workspaceId: string | null;
  openCount: number;
  attentionCount: number;
  error: string;
  announcement: string;
  revision: number;
  refresh: () => Promise<void>;
}

const emptyValue: WorkspaceWorkflowActivityValue = {
  workspaceId: null,
  openCount: 0,
  attentionCount: 0,
  error: '',
  announcement: '',
  revision: 0,
  refresh: async () => undefined
};

const WorkspaceWorkflowActivityContext =
  React.createContext<WorkspaceWorkflowActivityValue>(emptyValue);

export function useWorkspaceWorkflowActivityStore(
  workspaceId: string | null,
  enabled: boolean
): WorkspaceWorkflowActivityValue {
  const { t } = useTranslation();
  const [page, setPage] = React.useState<WorkflowExecutionPage | null>(null);
  const [error, setError] = React.useState('');
  const [announcement, setAnnouncement] = React.useState('');
  const [revision, setRevision] = React.useState(0);
  const activeWorkspaceRef = React.useRef(workspaceId);
  const pageRef = React.useRef<WorkflowExecutionPage | null>(page);
  const requestRef = React.useRef(0);
  activeWorkspaceRef.current = workspaceId;
  pageRef.current = page;

  const refresh = React.useCallback(async () => {
    if (!workspaceId || !enabled) return;
    const requestId = ++requestRef.current;
    try {
      const next = await listWorkspaceWorkflowExecutions(workspaceId, { limit: 1 });
      if (activeWorkspaceRef.current !== workspaceId || requestId !== requestRef.current) return;
      if (pageRef.current) {
        if (next.summary.attentionCount > pageRef.current.summary.attentionCount) {
          setAnnouncement(t('workflowActivity.announcements.attention'));
        } else if (next.summary.openCount > pageRef.current.summary.openCount) {
          setAnnouncement(t('workflowActivity.announcements.started'));
        }
      }
      const previous = pageRef.current;
      const signature = (value: WorkflowExecutionPage | null) => value?.items
        .map((item) => `${item.id}:${item.status}:${item.updatedAt}`)
        .join('|') || '';
      const changed = !previous
        || previous.summary.openCount !== next.summary.openCount
        || previous.summary.attentionCount !== next.summary.attentionCount
        || previous.summary.latestUpdatedAt !== next.summary.latestUpdatedAt
        || signature(previous) !== signature(next);
      setPage(next);
      setError('');
      if (changed) setRevision((value) => value + 1);
    } catch (refreshError) {
      if (activeWorkspaceRef.current !== workspaceId || requestId !== requestRef.current) return;
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : t('workflowActivity.loadError')
      );
    }
  }, [enabled, t, workspaceId]);

  React.useEffect(() => {
    pageRef.current = null;
    setPage(null);
    setError('');
    setAnnouncement('');
    requestRef.current += 1;
    if (enabled && workspaceId) void refresh();
  }, [enabled, refresh, workspaceId]);

  React.useEffect(() => {
    if (!announcement) return;
    const timer = window.setTimeout(() => setAnnouncement(''), 1_000);
    return () => window.clearTimeout(timer);
  }, [announcement]);

  React.useEffect(() => {
    if (!enabled || !workspaceId) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const timer = window.setInterval(refreshWhenVisible, 2_000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [enabled, refresh, workspaceId]);

  return {
    workspaceId,
    openCount: page?.summary.openCount || 0,
    attentionCount: page?.summary.attentionCount || 0,
    error,
    announcement,
    revision,
    refresh
  };
}

export const WorkspaceWorkflowActivityProvider: React.FC<{
  value: WorkspaceWorkflowActivityValue;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <WorkspaceWorkflowActivityContext.Provider value={value}>
    {children}
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {value.announcement}
    </div>
  </WorkspaceWorkflowActivityContext.Provider>
);

export function useWorkspaceWorkflowActivity(): WorkspaceWorkflowActivityValue {
  return React.useContext(WorkspaceWorkflowActivityContext);
}
