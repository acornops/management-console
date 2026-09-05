import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, CollectionState } from '@acornops/ui';
import { McpServersCatalogLoading } from '@/features/targets/admin/TargetCapabilityInventoryLoading';

interface McpServersCatalogStateProps {
  phase: ComponentProps<typeof CollectionState>['phase'];
  itemCount: number;
  error: string | null;
  onRetry: () => void;
  children: ReactNode;
}

export function McpServersCatalogState({
  phase,
  itemCount,
  error,
  onRetry,
  children
}: McpServersCatalogStateProps) {
  const { t } = useTranslation();
  const errorFeedback = error ? (
    <div className="type-caption flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
      <span>{error}</span>
      <Button size="sm" variant="secondary" onClick={onRetry}>{t('common.retry')}</Button>
    </div>
  ) : <span className="sr-only">{t('mcpServers.loadingCatalog')}</span>;

  return (
    <CollectionState
      phase={phase}
      itemCount={itemCount}
      loading={<McpServersCatalogLoading caption={t('mcpServers.title')} label={t('mcpServers.loadingCatalog')}
        labels={{ server: t('mcpServers.server'), status: t('mcpServers.status'), enabled: t('mcpServers.enabled'), tools: t('mcpServers.tools'), actions: t('mcpServers.actions') }}
      />}
      empty={children}
      error={<div className="mb-5">{errorFeedback}</div>}
      feedback={<div className="mt-4">{errorFeedback}</div>}
    >
      {children}
    </CollectionState>
  );
}
