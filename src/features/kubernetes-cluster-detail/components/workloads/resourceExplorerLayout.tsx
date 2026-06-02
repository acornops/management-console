import React from 'react';
import { ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RightSidePanel } from '@/components/common/RightSidePanel';
import {
  classNames,
  ResourceInventorySummary,
  ResourceMetaPair,
  ResourceStatusPill,
  resourceMetricGridClass,
  resourceRowActionClass,
  resourceRowGridClass,
  workloadCategories
} from '@/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts';
import { Workload } from '@/types';

function getKindLabelKey(kind: string): string {
  return workloadCategories.includes(kind as 'All' | Workload['type'])
    ? `workloads.categories.${kind}`
    : `resources.categories.${kind}`;
}

export const ResourceInventoryStrip: React.FC<{ summary: ResourceInventorySummary }> = ({ summary }) => {
  const { t } = useTranslation();
  const namespaceScope = t(summary.namespaceScopeKey, { namespace: summary.namespace });

  return (
    <div
      data-resource-inventory-strip="true"
      className="mt-3 border-t border-ui-border pt-3 text-xs"
    >
      <div className="grid grid-cols-2 gap-2 bg-ui-bg/60 p-2 sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,7rem))_minmax(12rem,1fr)] xl:grid-cols-[repeat(3,minmax(0,7rem))_minmax(12rem,1fr)_minmax(10rem,max-content)]">
        <div className="min-w-0 overflow-hidden rounded-md border border-ui-border/70 bg-ui-surface/70 px-3 py-2">
          <p className="type-micro-label">
            {t('resources.inventory.visible')}
          </p>
          <p className="type-data mt-0.5 text-base">{summary.visibleCount}</p>
        </div>
        <div className="min-w-0 overflow-hidden rounded-md border border-ui-border/70 bg-ui-surface/70 px-3 py-2">
          <p className="type-micro-label text-status-success-text">
            {t('resources.inventory.healthy')}
          </p>
          <p className="type-data mt-0.5 text-base text-status-success-text">{summary.healthyCount}</p>
        </div>
        <div className="min-w-0 overflow-hidden rounded-md border border-ui-border/70 bg-ui-surface/70 px-3 py-2">
          <p className="type-micro-label text-status-warning-text">
            {t('resources.inventory.attention')}
          </p>
          <p className="type-data mt-0.5 text-base text-status-warning-text">{summary.attentionCount}</p>
        </div>
        <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-1.5 overflow-hidden rounded-md border border-ui-border/70 bg-ui-surface/70 px-3 py-2 sm:col-span-3 lg:col-span-1">
          <span className="type-micro-label mr-1">
            {t('resources.inventory.resourceMix')}
          </span>
          {summary.kindCounts.length > 0 ? (
            summary.kindCounts.slice(0, 4).map((kindCount) => (
              <span
                key={kindCount.kind}
                data-resource-kind-chip="true"
                className="type-micro-label inline-flex items-center gap-1 rounded-full bg-ui-surface px-2 py-1"
              >
                {t(getKindLabelKey(kindCount.kind), { defaultValue: kindCount.kind })}
                <span className="type-data text-xs text-ui-text">{kindCount.count}</span>
              </span>
            ))
          ) : (
            <span className="type-caption">{t('resources.inventory.noResources')}</span>
          )}
        </div>
        <div className="col-span-2 flex min-w-0 items-center overflow-hidden rounded-md border border-ui-border/70 bg-ui-surface/70 px-3 py-2 sm:col-span-3 lg:col-span-4 xl:col-span-1">
          <span className="type-micro-label truncate" title={namespaceScope}>
            {namespaceScope}
          </span>
        </div>
      </div>
    </div>
  );
};

export const ResourceMetricInline: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const { t } = useTranslation();
  return (
    <div data-resource-metric-inline="true" className="min-w-0">
      <p className="type-micro-label mb-0.5">
        {t(`workloads.metricLabels.${label}`, { defaultValue: label })}
      </p>
      <p className="type-row-title break-words" title={value}>{value}</p>
    </div>
  );
};

export const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="type-body rounded-lg border border-dashed border-ui-border bg-ui-surface p-10 text-center">
    {message}
  </div>
);

export const ResourceList = <T,>({
  items,
  emptyMessage,
  renderItem
}: {
  items: T[];
  emptyMessage: string;
  renderItem: (item: T) => React.ReactNode;
}) => (
  items.length === 0 ? (
    <EmptyState message={emptyMessage} />
  ) : (
    <div
      data-resource-list="true"
      className="min-w-0 w-full max-w-full overflow-hidden rounded-lg border border-ui-border bg-ui-surface divide-y divide-ui-border"
    >
      {items.map(renderItem)}
    </div>
  )
);

export const ResourceDetailsAction: React.FC = () => {
  const { t } = useTranslation();
  return (
    <span className="type-ui inline-flex shrink-0 items-center gap-1 rounded-md border border-ui-border bg-ui-bg px-3 py-1.5 text-ui-text-muted transition-colors group-hover:text-accent-strong">
      {t('workloads.details')}
      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );
};

export const InfrastructureRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  kind: string;
  namespace: string;
  clusterName: string;
  status: string;
  healthy: boolean;
  metrics: Array<{ label: string; value: string }>;
  onClick?: () => void;
}> = ({ icon, title, kind, namespace, clusterName, status, healthy, metrics, onClick }) => {
  const { t } = useTranslation();
  const rowClassName = classNames(
    resourceRowGridClass,
    onClick && 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/30'
  );
  const content = (
    <>
      <div data-resource-row-identity="true" className="flex min-w-0 max-w-full items-center gap-4 sm:gap-5 xl:gap-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-metric-blue/20 bg-metric-blue/10 text-metric-blue">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="type-panel-title break-words [overflow-wrap:anywhere]" title={title}>{title}</h3>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
            <ResourceMetaPair label={t('resources.row.kind')} value={kind} />
            <ResourceMetaPair label={t('resources.row.scope')} value={namespace} tone="accent" />
            <ResourceMetaPair label={t('resources.row.cluster')} value={clusterName || t('common.unknown')} tone="metric" />
          </div>
        </div>
      </div>
      <div className={resourceMetricGridClass}>
        {metrics.length > 0 ? (
          metrics.slice(0, 4).map((metric) => (
            <ResourceMetricInline key={metric.label} label={metric.label} value={metric.value} />
          ))
        ) : (
          <p className="type-label col-span-2">
            {t('workloads.noAdditionalFields')}
          </p>
        )}
      </div>
      <div className={resourceRowActionClass}>
        <ResourceStatusPill status={status} healthy={healthy} />
        <ResourceDetailsAction />
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${t('workloads.details')}: ${title}`}
        className={rowClassName}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={rowClassName}>
      {content}
    </div>
  );
};

export const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="grid grid-cols-[minmax(7rem,0.7fr)_minmax(0,1fr)] gap-4 border-b border-ui-border py-2 last:border-b-0">
    <span className="type-caption">{label}</span>
    <span className="type-caption min-w-0 truncate text-right text-ui-text" title={value}>{value}</span>
  </div>
);

export const SidePanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  const { t } = useTranslation();
  return (
    <RightSidePanel isOpen={isOpen} onClose={onClose} ariaLabel={title}>
      <div className="flex items-center justify-between border-b border-ui-border px-4 py-5 sm:px-8 sm:py-6">
        <h3 className="type-section-title">{title}</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-ui-text-muted transition-colors hover:bg-ui-bg"
          aria-label={t('workloads.closeDetails')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">{children}</div>
    </RightSidePanel>
  );
};
