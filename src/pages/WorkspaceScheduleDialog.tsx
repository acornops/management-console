import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button, DialogFrame, InlineAlert, InlineConfirmation } from '@acornops/ui';
import { WorkflowMcpCredentialDialog } from '@/pages/WorkspaceWorkflowsPage.components';
import {
  WorkspaceScheduleFormFields,
  type ScheduleDraftField
} from '@/pages/WorkspaceScheduleFormFields';
import type {
  WorkflowApiDefinition,
  WorkflowCapabilitiesPreview,
  WorkflowMcpRequirementPreview
} from '@/services/control-plane/workflowApi';
import type {
  ScheduleDraft,
  ScheduleFrequency
} from '@/pages/WorkspaceSchedulesPage.helpers';

interface WorkspaceScheduleDialogProps {
  capabilityPreview: WorkflowCapabilitiesPreview | null;
  capabilityPreviewError: string;
  capabilityPreviewing: boolean;
  credentialRequirement: WorkflowMcpRequirementPreview | null;
  currentUser: { id: string; label: string } | null;
  discardConfirmationOpen: boolean;
  draft: ScheduleDraft;
  draftCapabilityReady: boolean;
  draftError: string;
  draftFieldErrors: Partial<Record<ScheduleDraftField, string>>;
  draftOwnerIsCurrentUser: boolean;
  onClose: () => void;
  onCredentialConnected: () => void;
  onDiscardCancel: () => void;
  onDiscardConfirm: () => void;
  onRetryCapabilityPreview: () => void;
  onSave: () => void;
  open: boolean;
  saving: boolean;
  scheduleFrequency: ScheduleFrequency;
  setCredentialRequirement: React.Dispatch<React.SetStateAction<WorkflowMcpRequirementPreview | null>>;
  setDraft: React.Dispatch<React.SetStateAction<ScheduleDraft>>;
  setDraftFieldErrors: React.Dispatch<React.SetStateAction<Partial<Record<ScheduleDraftField, string>>>>;
  setScheduleFrequency: React.Dispatch<React.SetStateAction<ScheduleFrequency>>;
  workflows: WorkflowApiDefinition[];
  workspaceId: string;
}

export const WorkspaceScheduleDialog: React.FC<WorkspaceScheduleDialogProps> = ({
  capabilityPreview,
  capabilityPreviewError,
  capabilityPreviewing,
  credentialRequirement,
  currentUser,
  discardConfirmationOpen,
  draft,
  draftCapabilityReady,
  draftError,
  draftFieldErrors,
  draftOwnerIsCurrentUser,
  onClose,
  onCredentialConnected,
  onDiscardCancel,
  onDiscardConfirm,
  onRetryCapabilityPreview,
  onSave,
  open,
  saving,
  scheduleFrequency,
  setCredentialRequirement,
  setDraft,
  setDraftFieldErrors,
  setScheduleFrequency,
  workflows,
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
          <Button size="sm" variant="primary" onClick={onSave} disabled={saving || capabilityPreviewing || !draftCapabilityReady}>
            {saving ? t('schedules.form.saving') : t('schedules.form.save')}
          </Button>
        </>}
      >
        {discardConfirmationOpen && (
          <InlineConfirmation
            id="discard-schedule-changes"
            title={t('schedules.form.discardTitle')}
            description={t('schedules.form.discardDescription')}
            tone="warning"
            confirmLabel={t('schedules.form.discardConfirm')}
            cancelLabel={t('common.continueEditing')}
            onCancel={onDiscardCancel}
            onConfirm={onDiscardConfirm}
          />
        )}
        {draftError && <InlineAlert tone="danger" role="alert" aria-live="assertive">{draftError}</InlineAlert>}
        <WorkspaceScheduleFormFields
          capabilityPreview={capabilityPreview}
          capabilityPreviewError={capabilityPreviewError}
          capabilityPreviewing={capabilityPreviewing}
          currentUser={currentUser}
          draft={draft}
          draftFieldErrors={draftFieldErrors}
          draftOwnerIsCurrentUser={draftOwnerIsCurrentUser}
          onRetryCapabilityPreview={onRetryCapabilityPreview}
          scheduleFrequency={scheduleFrequency}
          setCredentialRequirement={setCredentialRequirement}
          setDraft={setDraft}
          setDraftFieldErrors={setDraftFieldErrors}
          setScheduleFrequency={setScheduleFrequency}
          workflows={workflows}
        />
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
