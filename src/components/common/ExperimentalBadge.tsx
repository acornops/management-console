import React from 'react';
import { StatusBadge } from '@acornops/ui';

export const ExperimentalBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <StatusBadge tone="warning" size="compact">
    {children}
  </StatusBadge>
);
