import React from 'react';
import { Button, InlineAlert } from '@acornops/ui';
import { Checkbox } from '@acornops/ui';
import { DrawerFrame } from '@acornops/ui';
import { ICONS } from '@/constants';
import { WorkflowCapabilityLedger } from '@/pages/WorkspaceWorkflowsPage.components';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';
import type { McpReadinessRecovery } from '@/services/control-plane/mcpReadinessRecovery';
import type { WorkflowCapabilitiesPreview } from '@/services/control-plane/workflowApi';

export const WorkflowRunDrawer: React.FC<{
  workflow?: WorkflowDefinition;
  preview: WorkflowCapabilitiesPreview | null;
  previewing: boolean;
  previewError: string;
  blocker: string | null;
  launchError: string;
  launchRecovery: McpReadinessRecovery | null;
  launching: boolean;
  acknowledged: boolean;
  onAcknowledgementChange: (value: boolean) => void;
  onRetryPreview: () => void;
  onClose: () => void;
  onLaunch: () => void;
}> = ({
  workflow,
  preview,
  previewing,
  previewError,
  blocker,
  launchError,
  launchRecovery,
  launching,
  acknowledged,
  onAcknowledgementChange,
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
      description={workflow ? `Review the saved prompt and run capabilities for ${workflow.name}.` : undefined}
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
            <p className="mt-2 whitespace-pre-wrap break-words type-body text-ui-text">{workflow.starterPrompt}</p>
          </section>

          {writeCapable && (
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-3 type-body text-ui-text">
              <Checkbox checked={acknowledged} onChange={(event) => onAcknowledgementChange(event.target.checked)} className="mt-0.5 shrink-0" />
              <span>
                <strong className="block">Live-system changes are allowed</strong>
                <span className="type-caption mt-1 block text-ui-text-muted">I understand this workflow can modify live systems.</span>
              </span>
            </label>
          )}

          <WorkflowCapabilityLedger workspaceId={workflow.workspaceId} preview={preview} loading={previewing} error={previewError} onRetry={onRetryPreview} />

          {blocker && (
            <InlineAlert tone="warning" className="type-body type-emphasis">
              {blocker}
            </InlineAlert>
          )}
          {launchError && (
            <InlineAlert tone="danger" className="type-body type-emphasis">
              {launchError}
              {launchRecovery && <a className="ml-2 underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-control-boundary" href={launchRecovery.href}>{launchRecovery.label}</a>}
            </InlineAlert>
          )}
        </div>
      )}
    </DrawerFrame>
  );
};
