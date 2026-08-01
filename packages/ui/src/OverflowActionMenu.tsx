import React from 'react';

import { ActionMenu } from './ActionMenu';

export interface OverflowActionMenuProps {
  children: (close: (restoreFocus?: boolean) => void) => React.ReactNode;
  disabled?: boolean;
  estimatedHeight?: number;
  label: string;
}

export const OverflowActionMenu = React.forwardRef<HTMLButtonElement, OverflowActionMenuProps>((props, ref) => (
  <ActionMenu ref={ref} {...props} />
));

OverflowActionMenu.displayName = 'OverflowActionMenu';
