import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@acornops/ui';
import { McpServerMutationNotice } from '@/features/targets/admin/McpServerMutationNotice';

interface McpServersNoticesProps {
  toolRefreshError: string | null;
  hasAgentWriteBlockedTools: boolean;
  hasConfiguredWriteTools: boolean;
  canRequestWriteRuns: boolean;
  mutationNotice: string | null;
  onRetryToolRefresh: () => void;
}

export const McpServersNotices: React.FC<McpServersNoticesProps> = ({
  toolRefreshError,
  hasAgentWriteBlockedTools,
  hasConfiguredWriteTools,
  canRequestWriteRuns,
  mutationNotice,
  onRetryToolRefresh
}) => {
  const { t } = useTranslation();
  return (
    <>
      {toolRefreshError && (
        <div className="type-caption mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-warning/25 bg-status-warning-soft px-4 py-3 text-status-warning-text">
          <span>{toolRefreshError}</span>
          <Button size="sm" variant="secondary" onClick={onRetryToolRefresh}>
            {t('common.retry')}
          </Button>
        </div>
      )}
      {hasAgentWriteBlockedTools && (
        <section className="mb-5 rounded-lg border border-status-warning/30 bg-status-warning-soft px-4 py-3 text-status-warning-text">
          <div className="flex min-w-0 gap-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="type-row-title">{t('mcpServers.agentWriteModeNoticeTitle')}</h2>
              <p className="type-caption mt-1">{t('mcpServers.agentWriteModeNoticeBody')}</p>
            </div>
          </div>
        </section>
      )}
      {hasConfiguredWriteTools && !canRequestWriteRuns && (
        <div className="type-caption mb-5 rounded-lg border border-ui-border bg-ui-surface px-4 py-3 text-ui-text-muted">
          {t('mcpServers.roleWriteNotice')}
        </div>
      )}
      <McpServerMutationNotice message={mutationNotice} />
    </>
  );
};
