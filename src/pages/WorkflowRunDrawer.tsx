import React from 'react';
import { Button } from '@acornops/ui';
import { Checkbox } from '@acornops/ui';
import { DrawerFrame } from '@acornops/ui';
import { ICONS } from '@/constants';
import { WorkflowCapabilityLedger } from '@/pages/WorkspaceWorkflowsPage.components';
import { WorkflowParameterFields } from '@/pages/WorkspaceWorkflowsPage.launchFields';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';
import type { WorkflowCapabilitiesPreview } from '@/services/control-plane/workflowApi';

export const WorkflowRunDrawer: React.FC<{
  workflow?: WorkflowDefinition;
  values: Record<string, string>;
  errors: Record<string, string>;
  preview: WorkflowCapabilitiesPreview | null;
  previewing: boolean;
  previewError: string;
  blocker: string | null;
  launching: boolean;
  acknowledged: boolean;
  onAcknowledgementChange: (value: boolean) => void;
  onValuesChange: (values: Record<string, string>) => void;
  onRetryPreview: () => void;
  onClose: () => void;
  onLaunch: () => void;
}> = ({
  workflow,
  values,
  errors,
  preview,
  previewing,
  previewError,
  blocker,
  launching,
  acknowledged,
  onAcknowledgementChange,
  onValuesChange,
  onRetryPreview,
  onClose,
  onLaunch
}) => {
  const writeCapable = workflow?.policy.mode === 'read_write';
  const acknowledgementMissing = Boolean(writeCapable && !acknowledged);
  return (
    <DrawerFrame
      open={Boolean(workflow)}
      width="lg"
      closeDisabled={launching}
      onClose={onClose}
      title="Run workflow"
      titleId="workflow-run-drawer-title"
      description={workflow ? `Provide the values for ${workflow.name}. These values apply only to this run.` : undefined}
      footer={
        <>
          <Button variant="tertiary" onClick={onClose} disabled={launching}>
            Cancel
          </Button>
          <Button variant="activation" onClick={onLaunch} disabled={launching || previewing || Boolean(blocker) || acknowledgementMissing} title={blocker || undefined}>
            <ICONS.Send className="h-4 w-4" aria-hidden="true" />
            {launching ? 'Starting…' : 'Launch workflow'}
          </Button>
        </>
      }
    >
      {workflow && (
        <div className="grid gap-5">
          <section className="rounded-md border border-ui-border bg-ui-bg px-4 py-3">
            <div className="type-micro-label text-ui-text-muted">Saved prompt</div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ui-text">{workflow.starterPrompt}</p>
          </section>

          <WorkflowParameterFields workflow={workflow} values={values} errors={errors} onChange={onValuesChange} />

          {writeCapable && (
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-3 text-sm text-ui-text">
              <Checkbox checked={acknowledged} onChange={(event) => onAcknowledgementChange(event.target.checked)} className="mt-0.5 shrink-0" />
              <span>
                <strong className="block">Live-system changes are allowed</strong>
                <span className="type-caption mt-1 block text-ui-text-muted">I understand this workflow can modify live systems.</span>
              </span>
            </label>
          )}

          <WorkflowCapabilityLedger workspaceId={workflow.workspaceId} preview={preview} loading={previewing} error={previewError} onRetry={onRetryPreview} />

          {blocker && (
            <p role="alert" className="rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-2 text-sm font-semibold text-status-warning-text">
              {blocker}
            </p>
          )}
        </div>
      )}
    </DrawerFrame>
  );
};
