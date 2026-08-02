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
  updateResult: string;
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
  updateResult,
  updating,
  workflow,
  workflowDeleteBlocker
}) => {
  const error = updateError || deleteError;
  const feedback = error || updateResult;
  return (
    <WorkflowPanel
      title="Settings"
      description="Edit saved defaults, pause new runs, manage tags, or delete this workspace workflow with confirmation."
    >
        {!canManage && (
          <InlineAlert tone="neutral">
            You can inspect workflow settings. Ask a workspace manager for manage_workflows to change this workflow.
          </InlineAlert>
        )}
        {feedback && (
          <div
            role={error ? 'alert' : 'status'}
            aria-live={error ? 'assertive' : 'polite'}
            aria-atomic="true"
            className={`rounded-md border px-3 py-2 type-caption type-emphasis ${error ? 'border-status-danger/30 bg-status-danger-soft text-status-danger-text' : 'border-status-success/30 bg-status-success-soft text-status-success-text'}`}
          >
            {feedback}
          </div>
        )}
        <WorkflowSection title="Availability">
          <div className="mt-3 flex items-center justify-between gap-4 rounded-md border border-ui-border bg-ui-bg px-4 py-3">
            <div>
              <h4 className="type-row-title">{workflow.status === 'active' ? 'Active' : 'Inactive'}</h4>
              <p className="type-caption mt-1 text-ui-text-muted">Toggle availability for new runs.</p>
            </div>
            <WorkflowAvailabilitySwitch
              checked={workflow.status === 'active'}
              disabled={!canManage || updating}
              label="Toggle workflow active state"
              onChange={onToggleActive}
            />
          </div>
        </WorkflowSection>
        <WorkflowSection title="Workflow defaults">
          <div className="mt-2 grid gap-3">
            {editDraft ? (
              <>
                <label className="block">
                  <span className="type-micro-label text-ui-text-muted">Workflow name</span>
                  <TextInput value={editDraft.name} onChange={(event) => onUpdateDraft({ name: event.target.value })} className="mt-2" disabled={!canManage || updating} />
                </label>
                <label className="block">
                  <span className="type-micro-label text-ui-text-muted">Description</span>
                  <TextInput value={editDraft.description} onChange={(event) => onUpdateDraft({ description: event.target.value })} className="mt-2" disabled={!canManage || updating} />
                </label>
                <div className="block">
                  <label htmlFor="workflow-edit-prompt" className="type-micro-label text-ui-text-muted">Workflow prompt</label>
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
                  <Button variant="secondary" size="sm" onClick={onCancelEditing} disabled={updating}>Reset changes</Button>
                  <Button variant="primary" size="sm" onClick={onSave} disabled={!canManage || updating || !editDraft.name.trim()}>Save workflow</Button>
                </div>
              </>
            ) : (
              <p className="type-caption text-ui-text-muted">Workflow details are unavailable.</p>
            )}
          </div>
        </WorkflowSection>
        <WorkflowSection title="Workflow tags">
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
            title="Delete workflow"
            description="Permanently removes this workspace workflow definition. Past runs remain in audit history."
            detail={workflowDeleteBlocker ? <p id="workflow-delete-blocker" className="type-caption mt-2 max-w-2xl type-emphasis text-status-warning-text">{workflowDeleteBlocker}</p> : undefined}
            headingLevel="h4"
            tone="danger"
            actionClassName="sm:w-auto"
            action={<Button variant="danger" size="sm" onClick={onRequestDelete} disabled={Boolean(workflowDeleteBlocker)} title={workflowDeleteBlocker || undefined} aria-describedby={workflowDeleteBlocker ? 'workflow-delete-blocker' : undefined}>Delete workflow</Button>}
          />
        </DangerZone>
    </WorkflowPanel>
  );
};
