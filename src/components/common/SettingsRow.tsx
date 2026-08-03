import React from 'react';
import { IconTile } from '@acornops/ui';

export interface SettingsRowProps {
  icon: React.ElementType;
  label: React.ReactNode;
  description: React.ReactNode;
  action?: React.ReactNode;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon: Icon,
  label,
  description,
  action
}) => (
  <div className="flex flex-col gap-5 border-b border-ui-border p-6 transition-colors last:border-0 hover:bg-ui-bg/20 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-center gap-4">
      <IconTile>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </IconTile>
      <div className="min-w-0">
        <p className="mb-0.5 type-row-title">{label}</p>
        <div className="break-words type-caption leading-5 text-ui-text-muted">{description}</div>
      </div>
    </div>
    {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
  </div>
);
