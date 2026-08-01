import React from 'react';
import { StatusBadge } from '@acornops/ui';

export const ExperimentalBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <StatusBadge
    tone="neutral"
    size="compact"
    className="border border-ui-border bg-ui-surface-strong text-ui-text"
  >
    {children}
  </StatusBadge>
);
