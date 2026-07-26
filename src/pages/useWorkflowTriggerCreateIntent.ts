import React from 'react';

import type { WorkflowTriggerType } from '@/utils/routes';

export function useWorkflowTriggerCreateIntent(
  requestedType: WorkflowTriggerType | undefined,
  currentType: WorkflowTriggerType,
  enabled: boolean,
  onCreate: () => void
): void {
  const consumedTypeRef = React.useRef<WorkflowTriggerType | undefined>(undefined);
  const onCreateRef = React.useRef(onCreate);
  onCreateRef.current = onCreate;

  React.useEffect(() => {
    if (!enabled || requestedType !== currentType || consumedTypeRef.current === requestedType) return;
    consumedTypeRef.current = requestedType;
    onCreateRef.current();
  }, [currentType, enabled, requestedType]);
}
