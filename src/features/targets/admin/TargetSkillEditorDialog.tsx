import React from 'react';
import { AlertTriangle, GitBranch, RefreshCcw } from 'lucide-react';
import { Button } from '@acornops/ui';
import { CloseButton } from '@acornops/ui';
import { InlineLoadingIndicator } from '@acornops/ui';
import { ModalStepIndicator } from '@acornops/ui';
import { DialogFrame } from '@acornops/ui';
import { formInputClassName } from '@acornops/ui';
import type { ControlPlaneTargetSkillDetail } from '@/services/controlPlaneApi';
import { TargetSkillFileTree } from '@/features/targets/admin/TargetSkillFileTree';
import { UnsavedChangesDialog } from '@/features/targets/admin/UnsavedChangesDialog';
import {
  sourceLabel,
  summarizeBytes,
  type SkillDraftFile,
  type SkillEditorMode,
  type SkillEditorStep
} from '@/features/targets/admin/targetSkillsViewModel';
import { TextInput, Textarea } from '@acornops/ui';
import { useTranslation } from 'react-i18next';

const skillNameInputClassName = formInputClassName('px-4 type-ui');

export function TargetSkillSourceDetails({ source }: { source: ControlPlaneTargetSkillDetail['source'] }) {
  const { t } = useTranslation();
  if (!source.repoUrl) return null;
  const value = [source.repoUrl, source.ref, source.subpath, source.commitSha].filter(Boolean).join('\n');
  return <details className="mt-2 min-w-0 type-caption text-ui-text-muted">
    <summary className="cursor-pointer">{t('targetSkills.sourceDetails')}</summary>
    <p className="mt-2">{t('targetSkills.sourceCopyHelp')}</p>
    <Textarea readOnly aria-label={t('targetSkills.sourceDetails')} value={value} rows={4} className="mt-1 w-full break-all font-mono type-caption" />
  </details>;
}

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
  const { t } = useTranslation();
  const pendingDiscardActionRef = React.useRef<(() => void) | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = React.useState(false);
  const folderStateKey = `${mode}:${detail?.id || 'new'}:${step}:${resetVersion}`;
  const activeFile = files.find((file) => file.path === activeFilePath) || files[0] || null;
  const isCreateNameStep = mode === 'create' && step === 'name';
  const createSteps = [
    { id: 'name', label: t('schedules.form.name') },
    { id: 'files', label: t('tools.targetInsights.editFiles') }
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
      <DialogFrame unframed
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
              {mode === 'create' ? t('skillEditor.createTitle') : detail?.name || (canEditSkills ? t('skillEditor.editTitle') : t('skillEditor.viewTitle'))}
            </h3>
            {mode === 'create' ? (
              <ModalStepIndicator steps={createSteps} currentStepId={step} className="mt-4" />
            ) : (
              <p className="type-caption mt-1 text-ui-text-muted">
                {detail?.description || (canEditSkills ? t('skillEditor.editDescription') : t('skillEditor.viewDescription'))}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {mode === 'edit' && detail?.source.type === 'git_import' && (
              <Button variant="secondary" size="sm" disabled={!canEditSkills || saving} onClick={onReimport}>
                <RefreshCcw className="h-4 w-4" />
                {t('targetSkills.reimport')}
              </Button>
            )}
            <CloseButton
              onClick={guardedClose}
              disabled={saving}
              aria-label={t('skillEditor.close')}
            />
          </div>
        </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 custom-scrollbar">
        {isCreateNameStep ? (
          <div className="rounded-lg border border-ui-border bg-ui-bg p-5">
            <label className="space-y-1">
              <span className="type-label px-1">{t('agentsWorkflows.agents.details.capabilities.editSkill.name')}</span>
              <TextInput
                value={createName}
                onChange={(event) => onCreateNameChange(event.target.value)}
                placeholder={t('skillEditor.namePlaceholder')}
                className={skillNameInputClassName}
              />
            </label>
            <p className="type-caption mt-3 text-ui-text-muted">
              {t('skillEditor.starterHelp')}
            </p>
            {error && (
              <div className="type-caption mt-4 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
                {error}
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="flex min-h-[26rem] items-center justify-center">
            <InlineLoadingIndicator label={t('skillEditor.loading')} />
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
                    <div className="mt-1 flex flex-wrap gap-2 type-caption">
                      {detail.source.type === 'git_import' && (
                        <span className="rounded-full border border-ui-border px-2 py-1 text-ui-text-muted">{sourceLabel(detail)}</span>
                      )}
                      <span className="rounded-full border border-ui-border px-2 py-1 text-ui-text-muted">
                        {t('targetSkills.fileCount', { count: detail.bundleStats.fileCount })}, {summarizeBytes(detail.bundleStats.totalBytes)}
                      </span>
                      {detail.source.repoUrl && (
                        <span className="rounded-full border border-ui-border px-2 py-1 text-ui-text-muted">
                          <GitBranch className="mr-1 inline h-3 w-3" />
                          {detail.source.ref || 'default'} @ {detail.source.commitSha?.slice(0, 7)}
                        </span>
                      )}
                    </div>
                  )}
                  {detail && <TargetSkillSourceDetails source={detail.source} />}
                </div>
              </div>
              {error && (
                <div className="type-caption m-4 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
                  {error}
                </div>
              )}
              {detail && detail.validationStatus !== 'valid' && (
                <div className="m-4 rounded-lg border border-status-warning/25 bg-status-warning-soft px-4 py-3 type-body text-status-warning-text">
                  <div className="flex items-center gap-2 type-emphasis">
                    <AlertTriangle className="h-4 w-4" />
                    {t('skillEditor.validationIssues')}
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {detail.validationErrors.map((validationError) => (
                      <li key={validationError}>{validationError}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="min-h-0 flex-1 p-4">
                <Textarea
                  value={activeFile?.content || ''}
                  readOnly={!canEditSkills || !activeFile}
                  onChange={(event) => updateActiveFile(event.target.value)}
                  className="h-full min-h-[28rem] w-full resize-none rounded-lg border border-ui-border bg-ui-bg px-4 py-3 font-mono type-body leading-6 text-ui-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-70"
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
              <Button variant="secondary" size="sm" onClick={guardedClose} disabled={saving}>{t('common.cancel')}</Button>
              <Button variant="primary" size="sm" onClick={onCreateNameNext} disabled={!createName.trim() || saving}>{t('skillEditor.next')}</Button>
            </div>
          </>
        ) : mode === 'create' ? (
          <>
            <span />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={() => onStepChange('name')} disabled={saving}>{t('skillEditor.back')}</Button>
              <Button variant="primary" size="sm" onClick={onSubmit} disabled={!canEditSkills || saving}>
                {saving ? t('skillEditor.creating') : t('skillEditor.create')}
              </Button>
            </div>
          </>
        ) : !canEditSkills ? (
          <>
            <span />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={guardedClose} disabled={saving}>{t('common.close')}</Button>
            </div>
          </>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={onReset} disabled={!dirty || saving || loading}>{t('tools.targetInsights.resetChanges')}</Button>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={guardedClose} disabled={saving}>{t('common.cancel')}</Button>
              <Button variant="primary" size="sm" onClick={onSubmit} disabled={!canEditSkills || !dirty || saving || loading}>
                {saving ? t('skillEditor.saving') : t('common.saveChanges')}
              </Button>
            </div>
          </>
        )}
      </div>
      </DialogFrame>
      {showDiscardDialog && (
        <UnsavedChangesDialog
          title={t('tools.targetInsights.discardTitle')}
          body={t('skillEditor.discardBody')}
          cancelLabel={t('tools.targetInsights.keepEditing')}
          discardLabel={t('schedules.form.discardConfirm')}
          onCancel={cancelDiscard}
          onDiscard={confirmDiscard}
        />
      )}
    </>
  );
};
