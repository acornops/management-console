import React from 'react';
import { ICONS } from '@/constants';

export const InlineAlert: React.FC<{
  tone: 'danger' | 'warning' | 'neutral';
  children: React.ReactNode;
  className?: string;
}> = ({ tone, children, className = '' }) => {
  const Icon = tone === 'neutral' ? ICONS.Shield : ICONS.AlertTriangle;
  const toneClass =
    tone === 'danger'
      ? 'border-status-danger/25 bg-status-danger-soft text-status-danger-text'
      : tone === 'warning'
        ? 'border-status-warning/25 bg-status-warning-soft text-status-warning-text'
        : 'border-ui-border bg-ui-bg text-ui-text-muted';

  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-xs font-semibold leading-5 ${toneClass} ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
};
