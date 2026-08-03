import React from 'react';
import { CollectionResultSummary, DataTableFrame } from '@acornops/ui';

export interface CapabilityInventoryMetric {
  label: string;
  value: React.ReactNode;
  indicator?: 'success' | 'warning';
  valueProps?: React.HTMLAttributes<HTMLParagraphElement>;
}

interface CapabilityInventorySummaryProps extends React.ComponentPropsWithoutRef<'section'> {
  title: string;
  description: string;
  metrics: [CapabilityInventoryMetric, CapabilityInventoryMetric, CapabilityInventoryMetric];
}

export function TargetCapabilityInventorySummary({
  title,
  description,
  metrics,
  className = '',
  ...sectionProps
}: CapabilityInventorySummaryProps) {
  return (
    <section {...sectionProps} className={`mb-6 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm ${className}`.trim()}>
      <div className="grid sm:grid-cols-3 xl:grid-cols-[minmax(18rem,1.5fr)_repeat(3,minmax(9rem,1fr))]">
        <div className="border-b border-ui-border px-5 py-3.5 sm:col-span-3 xl:col-span-1 xl:border-b-0 xl:border-r">
          <h2 className="type-row-title">{title}</h2>
          <p className="type-caption mt-1 min-h-10 text-ui-text-muted">{description}</p>
        </div>
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={`${index < 2 ? 'border-b border-ui-border sm:border-b-0 sm:border-r' : ''} px-5 py-3.5`}
          >
            <p className="type-caption text-ui-text-muted">{metric.label}</p>
            <p
              {...metric.valueProps}
              className={`type-data mt-0.5 ${metric.indicator ? 'inline-flex items-center gap-2' : ''} ${metric.valueProps?.className || ''}`.trim()}
            >
              {metric.value}
              {metric.indicator && (
                <span className={`h-2 w-2 rounded-full ${metric.indicator === 'success' ? 'bg-status-success' : 'bg-status-warning'}`} />
              )}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

interface CapabilityInventoryToolbarProps {
  search: React.ReactNode;
  filter: React.ReactNode;
  resultSummary: React.ReactNode;
}

export function TargetCapabilityInventoryToolbar({ search, filter, resultSummary }: CapabilityInventoryToolbarProps) {
  return (
    <div className="grid gap-4 border-b border-ui-border px-6 py-6 sm:px-8 xl:grid-cols-[minmax(0,1fr)_12rem_9.5rem] xl:items-center">
      {search}
      {filter}
      <CollectionResultSummary className="xl:justify-end">{resultSummary}</CollectionResultSummary>
    </div>
  );
}

export function TargetCapabilityInventoryTable({ children }: React.PropsWithChildren) {
  return (
    <DataTableFrame data-target-capability-table-frame="true" className="rounded-none border-0 shadow-none custom-scrollbar">
      {children}
    </DataTableFrame>
  );
}
