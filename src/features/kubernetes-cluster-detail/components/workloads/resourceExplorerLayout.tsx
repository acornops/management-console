import React from 'react';
import { ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RightSidePanel } from '@/components/common/RightSidePanel';
import { CloseButton } from '@/components/common/ComponentVocabulary';
import {
  classNames,
  ResourceMetaPair,
  ResourceStatusPill,
  resourceMetricGridClass,
  resourceRowActionClass,
  resourceRowGridClass,
  resourceRowHeaderClass
} from '@/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts';

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
}) => {
  const { t } = useTranslation();

  return items.length === 0 ? (
    <EmptyState message={emptyMessage} />
  ) : (
    <div
      data-resource-list="true"
      className="min-w-0 w-full max-w-full overflow-hidden rounded-lg border border-ui-border bg-ui-surface divide-y divide-ui-border"
    >
      <div data-resource-list-header="true" className={resourceRowHeaderClass}>
        <span className="type-label">{t('resources.table.resource')}</span>
        <span className="type-label">{t('resources.table.metrics')}</span>
        <span className="type-label justify-self-end text-right">{t('resources.table.status')}</span>
      </div>
      {items.map(renderItem)}
    </div>
  );
};

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
        className={`control-target ${rowClassName}`}
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
        <CloseButton
          onClick={onClose}
          aria-label={t('workloads.closeDetails')}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">{children}</div>
    </RightSidePanel>
  );
};
