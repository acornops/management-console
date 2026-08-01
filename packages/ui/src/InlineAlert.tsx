import React from 'react';
import { AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export type InlineAlertTone = 'danger' | 'warning' | 'success' | 'neutral';

export interface InlineAlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  action?: React.ReactNode;
  icon?: React.ReactNode;
  title?: React.ReactNode;
  tone: InlineAlertTone;
}

export const InlineAlert = React.forwardRef<HTMLDivElement, InlineAlertProps>(({
  action,
  children,
  className,
  icon,
  role,
  title,
  tone,
  ...props
}, ref) => {
  const Icon = tone === 'neutral' ? Shield : tone === 'success' ? CheckCircle2 : AlertTriangle;
  const toneClass =
    tone === 'danger'
      ? 'border-status-danger/25 bg-status-danger-soft text-status-danger-text'
      : tone === 'warning'
        ? 'border-status-warning/25 bg-status-warning-soft text-status-warning-text'
        : tone === 'success'
          ? 'border-status-success/25 bg-status-success-soft text-status-success-text'
          : 'border-ui-border bg-ui-bg text-ui-text-muted';

  return (
    <div
      ref={ref}
      role={role ?? (tone === 'danger' ? 'alert' : 'status')}
      className={twMerge('type-caption flex items-start gap-3 rounded-lg border px-4 py-3', toneClass, className)}
      {...props}
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">{icon ?? <Icon className="h-4 w-4" />}</span>
      <div className="min-w-0 flex-1">
        {title && <div className="type-row-title">{title}</div>}
        <div className={title ? 'mt-1' : undefined}>{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
});

InlineAlert.displayName = 'InlineAlert';
