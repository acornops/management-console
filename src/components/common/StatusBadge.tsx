import React from 'react';

export const StatusBadge: React.FC<{
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  children: React.ReactNode;
}> = ({ tone, children }) => {
  const toneClass =
    tone === 'success'
      ? 'border-status-success/25 bg-status-success-soft text-status-success-text'
      : tone === 'warning'
        ? 'border-status-warning/25 bg-status-warning-soft text-status-warning-text'
        : tone === 'danger'
          ? 'border-status-danger/25 bg-status-danger-soft text-status-danger-text'
          : 'border-ui-border bg-ui-bg text-ui-text-muted';

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-widest ${toneClass}`}>
      {children}
    </span>
  );
};
