import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Checkbox,
  DialogFrame,
  InlineAlert,
  InlineLoadingIndicator,
  Select,
  type SelectOption,
  Textarea,
  TextInput,
  formInputClassName,
  formTextareaClassName
} from '@acornops/ui';
import {
  WorkflowMcpCredentialDialog,
  WorkflowPreviewAuthRow,
  workflowCapabilityBlockerMessage
} from '@/pages/WorkspaceWorkflowsPage.components';
import type {
  WorkflowCapabilitiesPreview,
  WorkflowMcpRequirementPreview
} from '@/services/control-plane/workflowApi';
import type { ScheduleDraft } from '@/pages/WorkspaceSchedulesPage.helpers';

interface WorkspaceScheduleDialogProps {
  capabilityPreview: WorkflowCapabilitiesPreview | null;
  capabilityPreviewError: string;
  capabilityPreviewing: boolean;
  credentialRequirement: WorkflowMcpRequirementPreview | null;
  currentUser: { id: string; label: string } | null;
  draft: ScheduleDraft;
  draftCapabilityReady: boolean;
  draftError: string;
  draftOwnerIsCurrentUser: boolean;
  onClose: () => void;
  onCredentialConnected: () => void;
  onRetryCapabilityPreview: () => void;
  onSave: () => void;
  open: boolean;
  saving: boolean;
  setCredentialRequirement: React.Dispatch<React.SetStateAction<WorkflowMcpRequirementPreview | null>>;
  setDraft: React.Dispatch<React.SetStateAction<ScheduleDraft>>;
  workflowOptions: Array<SelectOption<string>>;
  workspaceId: string;
}

const scheduleFormInputClassName = formInputClassName('mt-2');
const scheduleFormTextareaClassName = formTextareaClassName('mt-2');

export const WorkspaceScheduleDialog: React.FC<WorkspaceScheduleDialogProps> = ({
  capabilityPreview,
  capabilityPreviewError,
  capabilityPreviewing,
  credentialRequirement,
  currentUser,
  draft,
  draftCapabilityReady,
  draftError,
  draftOwnerIsCurrentUser,
  onClose,
  onCredentialConnected,
  onRetryCapabilityPreview,
  onSave,
  open,
  saving,
  setCredentialRequirement,
  setDraft,
  workflowOptions,
  workspaceId
}) => {
  const { t } = useTranslation();

  return (
    <>
      <DialogFrame
        open={open}
        onClose={onClose}
        closeDisabled={saving}
        titleId="schedule-drawer-title"
        title={draft.id ? t('schedules.form.editTitle') : t('schedules.form.createTitle')}
        description={t('schedules.form.body')}
        closeLabel={t('schedules.form.close')}
        width="md"
        className="max-h-[min(80vh,36rem)]"
        bodyClassName="space-y-4"
        footer={<>
          <Button size="sm" variant="tertiary" onClick={onClose}>{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
          <Button size="sm" variant="primary" onClick={onSave} disabled={saving || capabilityPreviewing || !draftCapabilityReady || !draft.workflowId || !draft.name.trim() || !draft.runsAsUserId}>
            {saving ? t('schedules.form.saving') : t('schedules.form.save')}
          </Button>
        </>}
      >
        {draftError && <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 type-body type-emphasis text-status-danger-text">{draftError}</div>}
        <label className="block type-body type-emphasis text-ui-text">
          {t('schedules.form.workflow')}
          <Select<string>
            value={draft.workflowId}
            options={workflowOptions}
            onChange={(workflowId) => setDraft((current) => ({ ...current, workflowId }))}
            className="mt-2"
            ariaLabel={t('schedules.form.workflow')}
          />
        </label>
        <label className="block type-body type-emphasis text-ui-text">
          {t('schedules.form.name')}
          <TextInput value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className={scheduleFormInputClassName} />
        </label>
        <div className="block type-body type-emphasis text-ui-text">
          {t('schedules.form.runsAs')}
          <div className="mt-2 min-h-11 rounded-md border border-ui-border bg-ui-bg px-3 py-2.5 type-body text-ui-text">
            {currentUser?.id === draft.runsAsUserId ? currentUser.label : draft.runsAsUserId}
          </div>
          <span className="type-caption mt-1 block text-ui-text-muted">{t('schedules.form.runsAsHelp')}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block type-body type-emphasis text-ui-text">
            {t('schedules.form.cron')}
            <TextInput value={draft.cron} onChange={(event) => setDraft((current) => ({ ...current, cron: event.target.value }))} className={scheduleFormInputClassName} />
            <span className="type-caption mt-1 block text-ui-text-muted">{t('schedules.form.cronHelp')}</span>
          </label>
          <label className="block type-body type-emphasis text-ui-text">
            {t('schedules.form.timezone')}
            <TextInput value={draft.timezone} onChange={(event) => setDraft((current) => ({ ...current, timezone: event.target.value }))} className={scheduleFormInputClassName} />
          </label>
        </div>
        <label className="flex items-center gap-3 type-body type-emphasis text-ui-text">
          <Checkbox checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} />
          {t('schedules.form.enabled')}
        </label>
        <label className="block type-body type-emphasis text-ui-text">
          {t('schedules.form.approvedContextGrants')}
          <Textarea value={draft.approvedContextGrants} onChange={(event) => setDraft((current) => ({ ...current, approvedContextGrants: event.target.value }))} className={scheduleFormTextareaClassName} />
          <span className="type-caption mt-1 block text-ui-text-muted">{t('schedules.form.approvedContextGrantsHelp')}</span>
        </label>
        {draftOwnerIsCurrentUser ? (
          <section aria-labelledby="schedule-credential-readiness" className="rounded-md border border-ui-border bg-ui-bg px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 id="schedule-credential-readiness" className="type-row-title">{t(capabilityPreview?.mcpRequirements.length ? 'agentsWorkflows.schedule.credentialReadiness' : 'agentsWorkflows.schedule.capabilityReadiness')}</h3>
                <p className="type-caption mt-1 text-ui-text-muted">{capabilityPreview?.mcpRequirements.length
                  ? t('agentsWorkflows.schedule.credentialReadinessHelp', { owner: currentUser?.label || t('agentsWorkflows.schedule.scheduleOwner') })
                  : t('agentsWorkflows.schedule.capabilityReadinessHelp')}</p>
              </div>
              {capabilityPreviewError && <Button type="button" size="sm" variant="secondary" onClick={onRetryCapabilityPreview}>{t('common.retry')}</Button>}
            </div>
            {capabilityPreviewing ? (
              <InlineLoadingIndicator label={t('agentsWorkflows.schedule.previewing')} className="mt-3" />
            ) : capabilityPreviewError ? (
              <p role="alert" className="type-caption mt-3 text-status-danger-text">{capabilityPreviewError}</p>
            ) : capabilityPreview?.mcpRequirements.length ? (
              <dl className="mt-3 border-t border-ui-border pt-1">
                <WorkflowPreviewAuthRow requirements={capabilityPreview.mcpRequirements} onConnectCredential={setCredentialRequirement} />
              </dl>
            ) : capabilityPreview?.status === 'ready' ? (
              <p role="status" className="type-caption mt-3 type-emphasis text-status-success-text">{t('schedules.form.credentialsReady')}</p>
            ) : capabilityPreview ? (
              <p role="alert" className="type-caption mt-3 text-status-warning-text">{workflowCapabilityBlockerMessage(t('agentsWorkflows.schedule.capabilityBlocked'))}</p>
            ) : null}
          </section>
        ) : (
          <InlineAlert tone="warning">{t('schedules.form.otherOwnerCredentialHelp')}</InlineAlert>
        )}
      </DialogFrame>
      {credentialRequirement && (
        <WorkflowMcpCredentialDialog
          workspaceId={workspaceId}
          requirement={credentialRequirement}
          onClose={() => setCredentialRequirement(null)}
          onConnected={onCredentialConnected}
        />
      )}
    </>
  );
};
