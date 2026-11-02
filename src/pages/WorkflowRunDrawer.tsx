import { useTranslation } from 'react-i18next';
import React from 'react';
import { Button, InlineAlert } from '@acornops/ui';
import { Checkbox } from '@acornops/ui';
import { DrawerFrame } from '@acornops/ui';
import { ICONS } from '@/constants';
import { WorkflowCapabilityLedger } from '@/pages/WorkspaceWorkflowsPage.components';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';
import type { McpReadinessRecovery } from '@/services/control-plane/mcpReadinessRecovery';
import type { WorkflowCapabilitiesPreview } from '@/services/control-plane/workflowApi';

export function WorkflowLaunchReview({ agents, preview }: {
  agents: WorkflowDefinition['agents'];
  preview: WorkflowCapabilitiesPreview | null;
}) {
  const { t } = useTranslation();
  return <section className="rounded-md border border-ui-border px-4 py-3" aria-label={t('workflowUi.launchReview')}>
    <dl className="grid gap-3 type-body">
      <div><dt className="type-micro-label text-ui-text-muted">{t('workflowUi.assignedAgents')}</dt><dd className="mt-1 break-words">{agents.map((agent) => agent.name).join(', ') || t('workflowUi.noAssignedAgents')}</dd></div>
      <div><dt className="type-micro-label text-ui-text-muted">{t('workflowUi.previewStatus')}</dt><dd className="mt-1">{preview ? preview.status === 'ready' ? t('agentChat.ready') : t('workflowUi.previewBlocked') : t('workflowUi.previewUnknown')}</dd></div>
      <div><dt className="type-micro-label text-ui-text-muted">{t('workflowUi.directScope')}</dt><dd className="mt-1">{preview ? preview.mode === 'read_only' ? t('workflowUi.directReadOnly') : t('workflowUi.directReadWrite') : t('workflowUi.previewUnknown')}</dd></div>
      <div><dt className="type-micro-label text-ui-text-muted">{t('workflowUi.directApprovalGates')}</dt><dd className="mt-1 break-words">{preview ? preview.approvalRequirements.join(', ') || t('workflowUi.noDirectGates') : t('workflowUi.previewUnknown')}</dd></div>
    </dl>
    <p className="mt-3 type-caption text-ui-text-muted">{t('workflowUi.directPreviewHelp')}</p>
  </section>;
}

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
  const { t } = useTranslation();
  const writeCapable = Boolean(preview?.tools.write.length);
  const acknowledgementMissing = Boolean(writeCapable && !acknowledged);
  return (
    <DrawerFrame
      open={Boolean(workflow)}
      width="lg"
      closeDisabled={launching}
      onClose={onClose}
      title={t('workflowUi.runWorkflow')}
      titleId="workflow-run-drawer-title"
      description={workflow ? t('workflowUi.reviewNamed', { name: workflow.name }) : undefined}
      footer={
        <>
          <Button variant="tertiary" onClick={onClose} disabled={launching}>
            {t('common.cancel')}
          </Button>
          <Button variant="activation" onClick={onLaunch} disabled={launching || previewing || Boolean(blocker) || acknowledgementMissing} title={blocker || undefined}>
            <ICONS.Send className="h-4 w-4" aria-hidden="true" />
            {launching ? t('workflows.actions.starting') : t('workflowUi.launchWorkflow')}
          </Button>
        </>
      }
    >
      {workflow && (
        <div className="grid gap-5">
          <WorkflowLaunchReview agents={workflow.agents} preview={previewing || previewError ? null : preview} />
          <section className="rounded-md border border-ui-border bg-ui-bg px-4 py-3">
            <div className="type-micro-label text-ui-text-muted">{t('workflowUi.savedPrompt')}</div>
            <p className="mt-2 whitespace-pre-wrap break-words type-body text-ui-text">{workflow.starterPrompt}</p>
          </section>

          {writeCapable && (
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-3 type-body text-ui-text">
              <Checkbox checked={acknowledged} onChange={(event) => onAcknowledgementChange(event.target.checked)} className="mt-0.5 shrink-0" />
              <span>
                <strong className="block">{t('workflowUi.liveChanges')}</strong>
                <span className="type-caption mt-1 block text-ui-text-muted">{t('workflowUi.acknowledgeChanges')}</span>
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
