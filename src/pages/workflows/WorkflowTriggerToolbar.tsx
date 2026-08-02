import React from 'react';

import { Button, CollectionResultSummary } from '@acornops/ui';
import { ICONS } from '@/constants';

interface WorkflowTriggerToolbarProps {
  busy: boolean;
  canCreate: boolean;
  createLabel: string;
  onCreate: () => void;
  onRefresh: () => void;
  refreshLabel: string;
  summary: React.ReactNode;
}

export const WorkflowTriggerToolbar: React.FC<WorkflowTriggerToolbarProps> = ({
  busy,
  canCreate,
  createLabel,
  onCreate,
  onRefresh,
  refreshLabel,
  summary
}) => (
  <div data-workflow-trigger-toolbar="true" className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <CollectionResultSummary>{summary}</CollectionResultSummary>
    <div className="flex items-center gap-2">
      <Button size="sm" variant="secondary" onClick={onRefresh} disabled={busy}>
        <ICONS.RefreshCw className="h-4 w-4" aria-hidden="true" />
        {refreshLabel}
      </Button>
      <Button size="sm" variant="primary" onClick={onCreate} disabled={!canCreate}>
        <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
        {createLabel}
      </Button>
    </div>
  </div>
);
