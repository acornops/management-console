import { useTranslation } from 'react-i18next';
import React from 'react';

import { Button, DangerZone, DangerZoneRow, InlineAlert, TextInput } from '@acornops/ui';
import {
  WorkflowPanel,
  WorkflowSection
} from '@/pages/WorkspaceWorkflowsPage.components';
import { WorkflowTagsEditor } from '@/pages/workflows/WorkflowTagsEditor';
import type {
  WorkflowDefinition
} from '@/pages/workflows/workflowModel';
import { WorkflowAvailabilitySwitch, type WorkflowEditDraft } from '@/pages/workflows/workflowPageHelpers';
import { TargetMentionTextarea } from '@/features/targets/mentions/TargetMentionAutocomplete';

interface WorkflowSettingsPanelProps {
  canManage: boolean;
  deleteError: string;
  editDraft?: WorkflowEditDraft;
  onAddTag: () => void;
  onCancelEditing: () => void;
  onRemoveTag: (tag: string) => void;
  onRequestDelete: () => void;
  onSave: () => void;
  onTagDraftChange: (value: string) => void;
  onToggleActive: (active: boolean) => void;
  onUpdateDraft: (update: Partial<WorkflowEditDraft>) => void;
  tagDraft: string;
  updateError: string;
  updating: boolean;
  workflow: WorkflowDefinition;
  workflowDeleteBlocker: string;
}

export const WorkflowSettingsPanel: React.FC<WorkflowSettingsPanelProps> = ({
  canManage,
  deleteError,
  editDraft,
  onAddTag,
  onCancelEditing,
  onRemoveTag,
  onRequestDelete,
  onSave,
  onTagDraftChange,
  onToggleActive,
  onUpdateDraft,
  tagDraft,
  updateError,
  updating,
  workflow,
  workflowDeleteBlocker
}) => {
  const { t } = useTranslation();
  const error = updateError || deleteError;
  return (
    <WorkflowPanel
      title={t('app.settings')}
      description={t('workflowUi.settingsDescription')}
    >
        {!canManage && (
          <InlineAlert tone="neutral">
            {t('workflowUi.settingsPermission')}
          </InlineAlert>
        )}
        {error && (
          <InlineAlert tone="danger" role="alert" aria-live="assertive" aria-atomic="true">
            {error}
          </InlineAlert>
        )}
        <WorkflowSection title={t('workflowUi.availability')}>
          <div className="mt-3 flex items-center justify-between gap-4 rounded-md border border-ui-border bg-ui-bg px-4 py-3">
            <div>
              <h4 className="type-row-title">{workflow.status === 'active' ? t('schedules.status.active') : t('workflowUi.inactive')}</h4>
              <p className="type-caption mt-1 text-ui-text-muted">{t('workflowUi.availabilityHelp')}</p>
            </div>
            <WorkflowAvailabilitySwitch
              checked={workflow.status === 'active'}
              disabled={!canManage || updating}
              label={t('workflowUi.toggleActive')}
              onChange={onToggleActive}
            />
          </div>
        </WorkflowSection>
        <WorkflowSection title={t('workflowUi.defaults')}>
          <div className="mt-2 grid gap-3">
            {editDraft ? (
              <>
                <label className="block">
                  <span className="type-micro-label text-ui-text-muted">{t('workflowCoordination.creation.nameLabel')}</span>
                  <TextInput value={editDraft.name} onChange={(event) => onUpdateDraft({ name: event.target.value })} className="mt-2" disabled={!canManage || updating} />
                </label>
                <label className="block">
                  <span className="type-micro-label text-ui-text-muted">{t('app.description')}</span>
                  <TextInput value={editDraft.description} onChange={(event) => onUpdateDraft({ description: event.target.value })} className="mt-2" disabled={!canManage || updating} />
                </label>
                <div className="block">
                  <label htmlFor="workflow-edit-prompt" className="type-micro-label text-ui-text-muted">{t('workflowUi.prompt')}</label>
                  <TargetMentionTextarea
                    id="workflow-edit-prompt"
                    value={editDraft.starterPrompt}
                    workspaceId={workflow.workspaceId}
                    onValueChange={(starterPrompt) => onUpdateDraft({ starterPrompt })}
                    className="mt-2 min-h-32"
                    disabled={!canManage || updating}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={onCancelEditing} disabled={updating}>{t('tools.targetInsights.resetChanges')}</Button>
                  <Button variant="primary" size="sm" onClick={onSave} disabled={!canManage || updating || !editDraft.name.trim()}>{t('workflowUi.save')}</Button>
                </div>
              </>
            ) : (
              <p className="type-caption text-ui-text-muted">{t('workflowUi.detailsUnavailable')}</p>
            )}
          </div>
        </WorkflowSection>
        <WorkflowSection title={t('workflowUi.tags')}>
          <WorkflowTagsEditor
            tags={workflow.tags}
            tagDraft={tagDraft}
            readOnly={!canManage}
            pending={updating}
            onTagDraftChange={onTagDraftChange}
            onAdd={onAddTag}
            onRemove={onRemoveTag}
          />
        </WorkflowSection>
        <DangerZone>
          <DangerZoneRow
            id="workflow-delete-title"
            title={t('workflowUi.delete')}
            description={t('workflowUi.deleteDescription')}
            detail={workflowDeleteBlocker ? <p id="workflow-delete-blocker" className="type-caption mt-2 max-w-2xl type-emphasis text-status-warning-text">{workflowDeleteBlocker}</p> : undefined}
            headingLevel="h4"
            tone="danger"
            actionClassName="sm:w-auto"
            action={<Button variant="danger" size="sm" onClick={onRequestDelete} disabled={Boolean(workflowDeleteBlocker)} title={workflowDeleteBlocker || undefined} aria-describedby={workflowDeleteBlocker ? 'workflow-delete-blocker' : undefined}>{t('workflowUi.delete')}</Button>}
          />
        </DangerZone>
    </WorkflowPanel>
  );
};
