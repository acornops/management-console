import React from 'react';

import { IconTile } from '@acornops/ui';

export interface TelemetryFactItem {
  detail?: React.ReactNode;
  icon: React.ElementType;
  id: string;
  label: React.ReactNode;
  markerClassName?: string;
  value: React.ReactNode;
}

export interface TelemetryFactGridProps extends React.HTMLAttributes<HTMLDListElement> {
  items: TelemetryFactItem[];
  variant: 'compact' | 'strip' | 'cards';
}

export function TelemetryFactGrid({ items, variant, className, ...props }: TelemetryFactGridProps) {
  if (variant === 'cards') {
    return (
      <dl {...props} className={['grid w-full grid-cols-1 gap-4 md:grid-cols-2', className].filter(Boolean).join(' ')}>
        {items.map(({ detail, icon: Icon, id, label, value }) => (
          <div key={id} className="rounded-lg border border-ui-border bg-ui-surface p-4 shadow-sm">
            <dt className="flex items-center gap-3">
              <IconTile size="sm" tone="metric">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </IconTile>
              <span className="min-w-0 type-micro-label text-ui-text-muted">{label}</span>
            </dt>
            <dd className="ml-11 mt-1 type-data">{value}</dd>
            {detail && <dd className="mt-3 truncate type-caption text-ui-text-muted">{detail}</dd>}
          </div>
        ))}
      </dl>
    );
  }

  const compact = variant === 'compact';
  return (
    <dl {...props} className={[
      'grid min-w-0 grid-cols-2',
      compact
        ? 'gap-4 border-t border-ui-border/60 py-3'
        : 'overflow-hidden border-b border-ui-border bg-ui-surface/70',
      className
    ].filter(Boolean).join(' ')}>
      {items.map(({ icon: Icon, id, label, markerClassName, value }, index) => (
        <div
          key={id}
          className={compact
            ? 'min-w-0'
            : `min-w-0 border-ui-border px-3 py-2.5 ${index === 0 ? 'border-r' : ''}`}
        >
          <dt className="type-micro-label flex min-w-0 items-center gap-1.5 text-ui-text-muted">
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {markerClassName && <span className={`h-1.5 w-3 shrink-0 rounded-full ${markerClassName}`} aria-hidden="true" />}
            <span>{label}</span>
          </dt>
          <dd
            className={compact
              ? 'mt-1 truncate type-caption type-emphasis text-ui-text'
              : 'mt-0.5 min-w-0 break-words type-caption type-emphasis text-ui-text'}
            title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
