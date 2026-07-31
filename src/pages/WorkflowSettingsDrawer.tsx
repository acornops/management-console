import React from 'react';

import { Button, DrawerFrame, Textarea, TextInput } from '@acornops/ui';
import { ICONS } from '@/constants';
import {
  WorkflowPanel,
  WorkflowSection
} from '@/pages/WorkspaceWorkflowsPage.components';
import { WorkflowTagsEditor } from '@/pages/workflows/WorkflowTagsEditor';
import type {
  WorkflowDefinition
} from '@/pages/workflows/workflowModel';
import { WorkflowAvailabilitySwitch, type WorkflowEditDraft } from '@/pages/workflows/workflowPageHelpers';

interface WorkflowSettingsDrawerProps {
  canManage: boolean;
  deleteError: string;
  editDraft?: WorkflowEditDraft;
  onAddTag: () => void;
  onCancelEditing: () => void;
  onClose: () => void;
  onRemoveTag: (tag: string) => void;
  onRequestDelete: () => void;
  onSave: () => void;
  onTagDraftChange: (value: string) => void;
  onToggleActive: (active: boolean) => void;
  onUpdateDraft: (update: Partial<WorkflowEditDraft>) => void;
  open: boolean;
  tagDraft: string;
  updateError: string;
  updateResult: string;
  updating: boolean;
  workflow: WorkflowDefinition;
  workflowDeleteBlocker: string;
}

export const WorkflowSettingsDrawer: React.FC<WorkflowSettingsDrawerProps> = ({
  canManage,
  deleteError,
  editDraft,
  onAddTag,
  onCancelEditing,
  onClose,
  onRemoveTag,
  onRequestDelete,
  onSave,
  onTagDraftChange,
  onToggleActive,
  onUpdateDraft,
  open,
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
    <DrawerFrame
      open={open}
      width="lg"
      title="Edit workflow"
      titleId="workflow-settings-drawer-title"
      description={`Update availability, defaults, and tags for ${workflow.name}.`}
      onClose={onClose}
    >
      <WorkflowPanel title="Settings" showHeader={false}>
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
                  <TextInput value={editDraft.name} onChange={(event) => onUpdateDraft({ name: event.target.value })} className="mt-2" />
                </label>
                <label className="block">
                  <span className="type-micro-label text-ui-text-muted">Description</span>
                  <TextInput value={editDraft.description} onChange={(event) => onUpdateDraft({ description: event.target.value })} className="mt-2" />
                </label>
                <div className="block">
                  <label htmlFor="workflow-edit-prompt" className="type-micro-label text-ui-text-muted">Workflow prompt</label>
                  <Textarea
                    id="workflow-edit-prompt"
                    value={editDraft.starterPrompt}
                    onChange={(event) => onUpdateDraft({ starterPrompt: event.target.value })}
                    className="mt-2 min-h-32"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={onCancelEditing}>Cancel</Button>
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
            readOnly={false}
            pending={updating}
            onTagDraftChange={onTagDraftChange}
            onAdd={onAddTag}
            onRemove={onRemoveTag}
          />
        </WorkflowSection>
        <details aria-label="Delete workflow" className="group min-w-0 border-t border-status-danger/25 pt-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md text-status-danger-text focus:outline-none focus-visible:ring-2 focus-visible:ring-status-danger/25 [&::-webkit-details-marker]:hidden">
            <span className="type-row-title">Danger zone</span>
            <ICONS.ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-3 flex flex-col gap-3 rounded-lg bg-status-danger-soft px-4 py-3 text-status-danger-text sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h4 className="type-row-title">Delete workflow</h4>
              <p className="type-caption mt-1 max-w-2xl">Permanently removes this workspace workflow definition. Past runs remain in audit history.</p>
              {workflowDeleteBlocker && <p id="workflow-delete-blocker" className="type-caption mt-2 max-w-2xl type-emphasis">{workflowDeleteBlocker}</p>}
            </div>
            <Button variant="danger" size="sm" onClick={onRequestDelete} disabled={Boolean(workflowDeleteBlocker)} title={workflowDeleteBlocker || undefined} aria-describedby={workflowDeleteBlocker ? 'workflow-delete-blocker' : undefined}>Delete workflow</Button>
          </div>
        </details>
      </WorkflowPanel>
    </DrawerFrame>
  );
};
