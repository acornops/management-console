import React from 'react';
import { AlertTriangle, GitBranch, RefreshCcw, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { ModalStepIndicator } from '@/components/common/ModalStepIndicator';
import { Dialog } from '@/components/common/Dialog';
import { formInputClassName } from '@/components/common/formControlStyles';
import type { ControlPlaneTargetSkillDetail } from '@/services/controlPlaneApi';
import { TargetSkillFileTree } from '@/features/kubernetes-cluster-detail/components/detail/views/TargetSkillFileTree';
import { UnsavedChangesDialog } from '@/features/kubernetes-cluster-detail/components/detail/views/UnsavedChangesDialog';
import {
  sourceLabel,
  summarizeBytes,
  type SkillDraftFile,
  type SkillEditorMode,
  type SkillEditorStep
} from '@/features/kubernetes-cluster-detail/components/detail/views/targetSkillsViewModel';

const skillNameInputClassName = formInputClassName('px-4 font-medium');

interface TargetSkillEditorDialogProps {
  mode: SkillEditorMode;
  step: SkillEditorStep;
  createName: string;
  detail: ControlPlaneTargetSkillDetail | null;
  files: SkillDraftFile[];
  activeFilePath: string;
  loading: boolean;
  saving: boolean;
  canEditSkills: boolean;
  dirty: boolean;
  error: string | null;
  onClose: () => void;
  onStepChange: (step: SkillEditorStep) => void;
  onCreateNameChange: (value: string) => void;
  onCreateNameNext: () => void;
  onFilesChange: (files: SkillDraftFile[]) => void;
  onActiveFilePathChange: (path: string) => void;
  resetVersion: number;
  onReset: () => void;
  onSubmit: () => void;
  onReimport?: () => void;
}

export const TargetSkillEditorDialog: React.FC<TargetSkillEditorDialogProps> = ({
  mode,
  step,
  createName,
  detail,
  files,
  activeFilePath,
  loading,
  saving,
  canEditSkills,
  dirty,
  error,
  onClose,
  onStepChange,
  onCreateNameChange,
  onCreateNameNext,
  onFilesChange,
  onActiveFilePathChange,
  resetVersion,
  onReset,
  onSubmit,
  onReimport
}) => {
  const pendingDiscardActionRef = React.useRef<(() => void) | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = React.useState(false);
  const folderStateKey = `${mode}:${detail?.id || 'new'}:${step}:${resetVersion}`;
  const activeFile = files.find((file) => file.path === activeFilePath) || files[0] || null;
  const isCreateNameStep = mode === 'create' && step === 'name';
  const createSteps = [
    { id: 'name', label: 'Name' },
    { id: 'files', label: 'Edit files' }
  ];

  const requestDiscard = (action: () => void) => {
    if (!dirty || !canEditSkills) {
      action();
      return;
    }
    pendingDiscardActionRef.current = action;
    setShowDiscardDialog(true);
  };

  const cancelDiscard = () => {
    pendingDiscardActionRef.current = null;
    setShowDiscardDialog(false);
  };

  const confirmDiscard = () => {
    const action = pendingDiscardActionRef.current;
    pendingDiscardActionRef.current = null;
    setShowDiscardDialog(false);
    action?.();
  };

  const guardedClose = () => {
    requestDiscard(onClose);
  };

  const updateActiveFile = (content: string) => {
    if (!activeFile || !canEditSkills) return;
    onFilesChange(files.map((file) => file.path === activeFile.path ? { ...file, content } : file));
  };

  return (
    <>
      <Dialog
        titleId="target-skill-editor-title"
        closeDisabled={saving || showDiscardDialog}
        onClose={guardedClose}
        className={`flex max-h-[88vh] w-full flex-col overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-2xl ${
          isCreateNameStep ? 'max-w-xl' : 'max-w-6xl'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-4">
          <div className="min-w-0">
            <h3 id="target-skill-editor-title" className="type-panel-title">
              {mode === 'create' ? 'Create target skill' : detail?.name || (canEditSkills ? 'Edit target skill' : 'View target skill')}
            </h3>
            {mode === 'create' ? (
              <ModalStepIndicator steps={createSteps} currentStepId={step} className="mt-4" />
            ) : (
              <p className="type-caption mt-1 text-ui-text-muted">
                {detail?.description || (canEditSkills ? 'Edit Markdown context for this target skill.' : 'Inspect Markdown context for this target skill.')}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {mode === 'edit' && detail?.source.type === 'git_import' && (
              <Button variant="secondary" size="sm" disabled={!canEditSkills || saving} onClick={onReimport}>
                <RefreshCcw className="h-4 w-4" />
                Reimport
              </Button>
            )}
            <button
              type="button"
              onClick={guardedClose}
              disabled={saving}
              className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-accent-strong disabled:opacity-50"
              aria-label="Close skill editor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 custom-scrollbar">
        {isCreateNameStep ? (
          <div className="rounded-lg border border-ui-border bg-ui-bg p-5">
            <label className="space-y-1">
              <span className="type-label px-1">Skill name</span>
              <input
                value={createName}
                onChange={(event) => onCreateNameChange(event.target.value)}
                placeholder="Troubleshooting CNPG"
                className={skillNameInputClassName}
              />
            </label>
            <p className="type-caption mt-3 text-ui-text-muted">
              The next step creates a starter SKILL.md. You can edit the YAML header and body before saving.
            </p>
            {error && (
              <div className="type-caption mt-4 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
                {error}
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="flex min-h-[26rem] items-center justify-center">
            <InlineLoadingIndicator label="Loading skill detail" />
          </div>
        ) : (
          <div className="grid min-h-[34rem] gap-0 overflow-hidden rounded-lg border border-ui-border bg-ui-bg lg:grid-cols-[17rem_minmax(0,1fr)]">
            <TargetSkillFileTree
              files={files}
              activeFilePath={activeFilePath}
              canEditSkills={canEditSkills}
              resetKey={folderStateKey}
              onFilesChange={onFilesChange}
              onActiveFilePathChange={onActiveFilePathChange}
            />

            <section className="flex min-w-0 flex-col bg-ui-surface">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border px-4 py-3">
                <div className="min-w-0">
                  <p className="type-label truncate text-ui-text">{activeFile?.path || 'SKILL.md'}</p>
                  {detail && (
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                      {detail.source.type === 'git_import' && (
                        <span className="rounded-full border border-ui-border px-2 py-1 text-ui-text-muted">{sourceLabel(detail)}</span>
                      )}
                      <span className="rounded-full border border-ui-border px-2 py-1 text-ui-text-muted">
                        {detail.bundleStats.fileCount} files, {summarizeBytes(detail.bundleStats.totalBytes)}
                      </span>
                      {detail.source.repoUrl && (
                        <span className="rounded-full border border-ui-border px-2 py-1 text-ui-text-muted">
                          <GitBranch className="mr-1 inline h-3 w-3" />
                          {detail.source.ref || 'default'} @ {detail.source.commitSha?.slice(0, 7)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {error && (
                <div className="type-caption m-4 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
                  {error}
                </div>
              )}
              {detail && detail.validationStatus !== 'valid' && (
                <div className="m-4 rounded-lg border border-status-warning/25 bg-status-warning-soft px-4 py-3 text-sm text-status-warning-text">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    Validation issues
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {detail.validationErrors.map((validationError) => (
                      <li key={validationError}>{validationError}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="min-h-0 flex-1 p-4">
                <textarea
                  value={activeFile?.content || ''}
                  readOnly={!canEditSkills || !activeFile}
                  onChange={(event) => updateActiveFile(event.target.value)}
                  className="h-full min-h-[28rem] w-full resize-none rounded-lg border border-ui-border bg-ui-bg px-4 py-3 font-mono text-sm leading-6 text-ui-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-70"
                  spellCheck={false}
                />
              </div>
            </section>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
        {isCreateNameStep ? (
          <>
            <span />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={guardedClose} disabled={saving}>Cancel</Button>
              <Button variant="accent" size="sm" onClick={onCreateNameNext} disabled={!createName.trim() || saving}>Next</Button>
            </div>
          </>
        ) : mode === 'create' ? (
          <>
            <span />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={() => onStepChange('name')} disabled={saving}>Back</Button>
              <Button variant="accent" size="sm" onClick={onSubmit} disabled={!canEditSkills || saving}>
                {saving ? 'Creating...' : 'Create Skill'}
              </Button>
            </div>
          </>
        ) : !canEditSkills ? (
          <>
            <span />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={guardedClose} disabled={saving}>Close</Button>
            </div>
          </>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={onReset} disabled={!dirty || saving || loading}>Reset changes</Button>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={guardedClose} disabled={saving}>Cancel</Button>
              <Button variant="accent" size="sm" onClick={onSubmit} disabled={!canEditSkills || !dirty || saving || loading}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </>
        )}
      </div>
      </Dialog>
      {showDiscardDialog && (
        <UnsavedChangesDialog
          title="Discard unsaved changes?"
          body="Your unsaved skill edits will be lost. This cannot be undone."
          cancelLabel="Keep editing"
          discardLabel="Discard changes"
          onCancel={cancelDiscard}
          onDiscard={confirmDiscard}
        />
      )}
    </>
  );
};
