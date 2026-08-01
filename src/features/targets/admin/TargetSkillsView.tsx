import React from 'react';
import { GitBranch, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@acornops/ui';
import { Checkbox } from '@acornops/ui';
import { TextInput } from '@acornops/ui';
import { DialogFrame } from '@acornops/ui';
import { InlineLoadingIndicator } from '@acornops/ui';
import { PageShell } from '@acornops/ui';
import {
  controlPlaneApi,
  ControlPlaneTargetSkillDetail,
  ControlPlaneTargetSkillsCatalog,
  CreateTargetSkillInput,
  ImportTargetSkillInput,
  ReimportTargetSkillInput,
  ResolveGitTargetSkillInput,
  UpdateTargetSkillInput
} from '@/services/controlPlaneApi';
import {
  buildSkillTemplate,
  DEFAULT_SKILL_BODY,
  DEFAULT_SKILL_DESCRIPTION,
  formatError,
  normalizeSkillName,
  type SkillDraftFile,
  type SkillEditorMode,
  type SkillEditorStep,
  type TargetSkillsViewProps,
  toDraftFiles,
  toRequestFiles
} from '@/features/targets/admin/targetSkillsViewModel';
import { TargetSkillEditorDialog } from '@/features/targets/admin/TargetSkillEditorDialog';
import { TargetSkillsInventory } from '@/features/targets/admin/TargetSkillsInventory';

export interface TargetSkillsDataSource {
  createSkill: (workspaceId: string, subjectId: string, input: CreateTargetSkillInput) => Promise<ControlPlaneTargetSkillDetail>;
  deleteSkill: (workspaceId: string, subjectId: string, skillId: string) => Promise<void>;
  getSkill: (workspaceId: string, subjectId: string, skillId: string) => Promise<ControlPlaneTargetSkillDetail>;
  importSkill: (workspaceId: string, subjectId: string, input: ImportTargetSkillInput) => Promise<ControlPlaneTargetSkillDetail>;
  resolveSkill: (workspaceId: string, subjectId: string, input: ResolveGitTargetSkillInput) => Promise<ImportTargetSkillInput>;
  listSkills: (workspaceId: string, subjectId: string) => Promise<ControlPlaneTargetSkillsCatalog>;
  reimportSkill: (workspaceId: string, subjectId: string, skillId: string, input: ReimportTargetSkillInput) => Promise<ControlPlaneTargetSkillDetail>;
  updateSkill: (workspaceId: string, subjectId: string, skillId: string, input: UpdateTargetSkillInput) => Promise<ControlPlaneTargetSkillDetail>;
}

const targetSkillsDataSource: TargetSkillsDataSource = {
  createSkill: (workspaceId, subjectId, input) => controlPlaneApi.createTargetSkill(workspaceId, subjectId, input),
  deleteSkill: (workspaceId, subjectId, skillId) => controlPlaneApi.deleteTargetSkill(workspaceId, subjectId, skillId),
  getSkill: (workspaceId, subjectId, skillId) => controlPlaneApi.getTargetSkill(workspaceId, subjectId, skillId),
  importSkill: (workspaceId, subjectId, input) => controlPlaneApi.importTargetSkill(workspaceId, subjectId, input),
  resolveSkill: (workspaceId, subjectId, input) => controlPlaneApi.resolveTargetGitSkill(workspaceId, subjectId, input),
  listSkills: (workspaceId, subjectId) => controlPlaneApi.listTargetSkills(workspaceId, subjectId, { limit: 50 }),
  reimportSkill: (workspaceId, subjectId, skillId, input) => controlPlaneApi.reimportTargetSkill(workspaceId, subjectId, skillId, input),
  updateSkill: (workspaceId, subjectId, skillId, input) => controlPlaneApi.updateTargetSkill(workspaceId, subjectId, skillId, input)
};

interface TargetSkillsViewWithDataSourceProps extends TargetSkillsViewProps {
  dataSource?: TargetSkillsDataSource;
}

export const TargetSkillsView: React.FC<TargetSkillsViewWithDataSourceProps> = ({
  subject,
  canManageSkills = false,
  initialCatalog = null,
  onCatalogChange,
  dataSource = targetSkillsDataSource
}) => {
  const { t } = useTranslation();

  const [catalog, setCatalog] = React.useState<ControlPlaneTargetSkillsCatalog | null>(() => initialCatalog);
  const [catalogLoading, setCatalogLoading] = React.useState(false);
  const [catalogError, setCatalogError] = React.useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = React.useState<string | null>(null);
  const [detailsById, setDetailsById] = React.useState<Record<string, ControlPlaneTargetSkillDetail>>({});
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [editorError, setEditorError] = React.useState<string | null>(null);
  const [draftFiles, setDraftFiles] = React.useState<SkillDraftFile[]>([]);
  const [activeFilePath, setActiveFilePath] = React.useState('SKILL.md');
  const [editorSaving, setEditorSaving] = React.useState(false);
  const [editorMode, setEditorMode] = React.useState<SkillEditorMode | null>(null);
  const [editorStep, setEditorStep] = React.useState<SkillEditorStep>('name');
  const [editorResetVersion, setEditorResetVersion] = React.useState(0);
  const [createName, setCreateName] = React.useState('');
  const [toggleSkillId, setToggleSkillId] = React.useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [importUrl, setImportUrl] = React.useState('');
  const [importError, setImportError] = React.useState<string | null>(null);
  const [confirmDeleteSkillId, setConfirmDeleteSkillId] = React.useState<string | null>(null);
  const [confirmReimportSkillId, setConfirmReimportSkillId] = React.useState<string | null>(null);
  const [confirmForceReimport, setConfirmForceReimport] = React.useState(false);
  const [pendingDangerAction, setPendingDangerAction] = React.useState<string | null>(null);

  const selectedSkill = selectedSkillId ? catalog?.items.find((item) => item.id === selectedSkillId) || null : null;
  const selectedDetail = selectedSkillId ? detailsById[selectedSkillId] || null : null;
  const draftSignature = React.useMemo(() => JSON.stringify(toRequestFiles(draftFiles)), [draftFiles]);
  const detailSignature = React.useMemo(() => JSON.stringify(selectedDetail ? toRequestFiles(toDraftFiles(selectedDetail.files)) : []), [selectedDetail]);
  const editorDirty = editorMode === 'create' ? editorStep === 'files' && draftFiles.length > 0 : Boolean(selectedDetail) && draftSignature !== detailSignature;
  const canEditSkills = Boolean(canManageSkills && catalog?.permissions?.canEdit);
  const showPermissionNotice = catalog ? !canEditSkills : !canManageSkills;
  const formatTargetSkillError = React.useCallback(
    (error: unknown, fallbackKey: string): string => {
      return formatError(error, t(fallbackKey));
    },
    [t]
  );

  const openImportDialog = () => {
    setImportError(null);
    setIsImportDialogOpen(true);
  };

  const closeImportDialog = () => {
    if (editorSaving) return;
    setImportError(null);
    setIsImportDialogOpen(false);
  };

  const loadCatalog = React.useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const nextCatalog = await dataSource.listSkills(subject.workspaceId, subject.id);
      setCatalog(nextCatalog);
      setSelectedSkillId((current) => (current && nextCatalog.items.some((item) => item.id === current) ? current : nextCatalog.items[0]?.id || null));
    } catch (error) {
      setCatalogError(formatTargetSkillError(error, 'targetSkills.loadFailed'));
    } finally {
      setCatalogLoading(false);
    }
  }, [dataSource, subject.id, subject.workspaceId, formatTargetSkillError]);

  const loadSkillDetail = React.useCallback(
    async (skillId: string) => {
      setDetailLoading(true);
      setEditorError(null);
      try {
        const detail = await dataSource.getSkill(subject.workspaceId, subject.id, skillId);
        setDetailsById((current) => ({ ...current, [skillId]: detail }));
        setDraftFiles(toDraftFiles(detail.files));
        setActiveFilePath('SKILL.md');
      } catch (error) {
        setEditorError(formatTargetSkillError(error, 'targetSkills.loadDetailFailed'));
      } finally {
        setDetailLoading(false);
      }
    },
    [dataSource, subject.id, subject.workspaceId, formatTargetSkillError]
  );

  React.useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  React.useEffect(() => {
    if (catalog) onCatalogChange?.(catalog);
  }, [catalog, onCatalogChange]);

  React.useEffect(() => {
    if (editorMode !== 'edit' || !selectedSkillId) return;
    if (detailsById[selectedSkillId]) {
      const detail = detailsById[selectedSkillId];
      setDraftFiles(toDraftFiles(detail.files));
      setActiveFilePath((current) => (detail.files.some((file) => file.path === current) ? current : 'SKILL.md'));
      return;
    }
    void loadSkillDetail(selectedSkillId);
  }, [detailsById, editorMode, loadSkillDetail, selectedSkillId]);

  const syncSkill = (detail: ControlPlaneTargetSkillDetail) => {
    setDetailsById((current) => ({ ...current, [detail.id]: detail }));
    setCatalog((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) => (item.id === detail.id ? detail : item))
          }
        : current
    );
    setDraftFiles(toDraftFiles(detail.files));
    setActiveFilePath((current) => (detail.files.some((file) => file.path === current) ? current : 'SKILL.md'));
  };

  const closeEditor = () => {
    setEditorMode(null);
    setEditorStep('name');
    setEditorError(null);
    setCreateName('');
  };

  const openCreateEditor = () => {
    if (!canEditSkills) return;
    setSelectedSkillId(null);
    setCreateName('');
    setDraftFiles([]);
    setActiveFilePath('SKILL.md');
    setEditorError(null);
    setEditorMode('create');
    setEditorStep('name');
  };

  const openEditEditor = (skillId: string) => {
    setSelectedSkillId(skillId);
    setEditorMode('edit');
    setEditorStep('files');
    setEditorError(null);
    if (detailsById[skillId]) {
      const detail = detailsById[skillId];
      setDraftFiles(toDraftFiles(detail.files));
      setActiveFilePath('SKILL.md');
    } else {
      void loadSkillDetail(skillId);
    }
  };

  const removeSkill = (skillId: string) => {
    setDetailsById((current) => {
      const next = { ...current };
      delete next[skillId];
      return next;
    });
    setCatalog((current) =>
      current
        ? {
            ...current,
            items: current.items.filter((item) => item.id !== skillId)
          }
        : current
    );
    setSelectedSkillId((current) => (current === skillId ? null : current));
  };

  const handleCreateNameNext = () => {
    const normalizedName = normalizeSkillName(createName);
    setDraftFiles([
      {
        path: 'SKILL.md',
        content: buildSkillTemplate(normalizedName, DEFAULT_SKILL_DESCRIPTION, DEFAULT_SKILL_BODY)
      }
    ]);
    setActiveFilePath('SKILL.md');
    setEditorStep('files');
  };

  const resetEditorDraft = () => {
    setEditorError(null);
    setEditorResetVersion((current) => current + 1);
    if (editorMode === 'create') {
      const normalizedName = normalizeSkillName(createName);
      setDraftFiles([
        {
          path: 'SKILL.md',
          content: buildSkillTemplate(normalizedName, DEFAULT_SKILL_DESCRIPTION, DEFAULT_SKILL_BODY)
        }
      ]);
      setActiveFilePath('SKILL.md');
      return;
    }
    if (selectedDetail) {
      setDraftFiles(toDraftFiles(selectedDetail.files));
      setActiveFilePath('SKILL.md');
    }
  };

  const handleToggleSkill = async (skillId: string, enabled: boolean) => {
    if (!canEditSkills) return;
    setToggleSkillId(skillId);
    setCatalogError(null);
    try {
      const detail = await dataSource.updateSkill(subject.workspaceId, subject.id, skillId, { enabled });
      syncSkill(detail);
    } catch (error) {
      setCatalogError(formatTargetSkillError(error, 'targetSkills.updateFailed'));
    } finally {
      setToggleSkillId(null);
    }
  };

  const handleSave = async () => {
    if (!selectedSkillId || !selectedDetail || !canEditSkills || selectedDetail.inherited) return;
    setEditorSaving(true);
    setEditorError(null);
    try {
      const detail = await dataSource.updateSkill(subject.workspaceId, subject.id, selectedSkillId, {
        files: toRequestFiles(draftFiles)
      });
      syncSkill(detail);
      await loadCatalog();
      closeEditor();
    } catch (error) {
      setEditorError(formatTargetSkillError(error, 'targetSkills.saveFailed'));
    } finally {
      setEditorSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!canEditSkills) return;
    setEditorError(null);
    setEditorSaving(true);
    try {
      const detail = await dataSource.createSkill(subject.workspaceId, subject.id, {
        files: toRequestFiles(draftFiles)
      });
      await loadCatalog();
      setSelectedSkillId(detail.id);
      syncSkill(detail);
      closeEditor();
    } catch (error) {
      setEditorError(formatTargetSkillError(error, 'targetSkills.createFailed'));
    } finally {
      setEditorSaving(false);
    }
  };

  const handleImport = async () => {
    if (!canEditSkills || editorSaving || !importUrl.trim()) return;
    setImportError(null);
    setEditorSaving(true);
    try {
      const imported = await dataSource.resolveSkill(subject.workspaceId, subject.id, {
        repoUrl: importUrl.trim()
      });
      const detail = await dataSource.importSkill(subject.workspaceId, subject.id, imported);
      setIsImportDialogOpen(false);
      setImportUrl('');
      await loadCatalog();
      setSelectedSkillId(detail.id);
      syncSkill(detail);
    } catch (error) {
      setImportError(formatTargetSkillError(error, 'targetSkills.importFailed'));
    } finally {
      setEditorSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteSkillId || !canEditSkills) return;
    setPendingDangerAction(confirmDeleteSkillId);
    try {
      await dataSource.deleteSkill(subject.workspaceId, subject.id, confirmDeleteSkillId);
      removeSkill(confirmDeleteSkillId);
      setConfirmDeleteSkillId(null);
      closeEditor();
    } catch (error) {
      setEditorError(formatTargetSkillError(error, 'targetSkills.deleteFailed'));
    } finally {
      setPendingDangerAction(null);
    }
  };

  const handleReimport = async () => {
    if (!confirmReimportSkillId || !selectedSkill || !canEditSkills) return;
    if (selectedSkill.source.type !== 'git_import' || !selectedSkill.source.provider || !selectedSkill.source.repoUrl) {
      setEditorError(t('targetSkills.gitImportErrors.invalidSource'));
      return;
    }
    setPendingDangerAction(confirmReimportSkillId);
    try {
      const imported = await dataSource.resolveSkill(subject.workspaceId, subject.id, {
        repoUrl: selectedSkill.source.repoUrl,
        ref: selectedSkill.source.ref,
        subpath: selectedSkill.source.subpath
      });
      const detail = await dataSource.reimportSkill(subject.workspaceId, subject.id, confirmReimportSkillId, {
        ...imported,
        force: confirmForceReimport
      });
      syncSkill(detail);
      await loadCatalog();
      setConfirmReimportSkillId(null);
      setConfirmForceReimport(false);
    } catch (error) {
      setEditorError(formatTargetSkillError(error, 'targetSkills.reimportFailed'));
    } finally {
      setPendingDangerAction(null);
    }
  };

  return (
    <PageShell>
      <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="type-route-title">{t('targetSkills.title')}</h1>
          <p className="type-body mt-2">{t('targetSkills.description', { name: subject.name })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="md" onClick={openImportDialog} disabled={!canEditSkills}>
            <GitBranch className="h-4 w-4" />
            {t('targetSkills.import')}
          </Button>
          <Button variant="secondary" size="md" onClick={openCreateEditor} disabled={!canEditSkills}>
            <Plus className="h-4 w-4" />
            {t('targetSkills.createSkill')}
          </Button>
        </div>
        {showPermissionNotice && (
          <p className="type-caption lg:max-w-xs">
            {catalog?.permissions?.editableRoles?.length
              ? t('targetSkills.manageNoAccessWithRoles', {
                  roles: catalog.permissions.editableRoles.join(', ')
                })
              : t('targetSkills.manageNoAccess')}
          </p>
        )}
      </header>

      {catalogError && <div className="type-caption mb-5 rounded-xl border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">{catalogError}</div>}

      {catalogLoading && !catalog && <InlineLoadingIndicator label={t('targetSkills.loading')} className="mb-5" />}

      {catalog ? (
        <TargetSkillsInventory
          skills={catalog.items}
          canEditSkills={canEditSkills}
          pendingToggleSkillId={toggleSkillId}
          onEditSkill={openEditEditor}
          onDeleteSkill={setConfirmDeleteSkillId}
          onToggleSkill={(skillId, enabled) => void handleToggleSkill(skillId, enabled)}
        />
      ) : null}

      {editorMode && (
        <TargetSkillEditorDialog
          mode={editorMode}
          step={editorStep}
          createName={createName}
          detail={selectedDetail}
          files={draftFiles}
          activeFilePath={activeFilePath}
          loading={detailLoading}
          saving={editorSaving}
          canEditSkills={canEditSkills}
          dirty={editorDirty}
          error={editorError}
          onClose={closeEditor}
          onStepChange={setEditorStep}
          onCreateNameChange={setCreateName}
          onCreateNameNext={handleCreateNameNext}
          onFilesChange={setDraftFiles}
          onActiveFilePathChange={setActiveFilePath}
          resetVersion={editorResetVersion}
          onReset={resetEditorDraft}
          onSubmit={() => void (editorMode === 'create' ? handleCreate() : handleSave())}
          onReimport={selectedDetail && !selectedDetail.inherited ? () => setConfirmReimportSkillId(selectedDetail.id) : undefined}
        />
      )}

      {isImportDialogOpen && (
        <DialogFrame unframed titleId="import-target-skill-title" onClose={closeImportDialog} className="w-full max-w-xl rounded-lg border border-ui-border bg-ui-surface shadow-xl">
          <div className="border-b border-ui-border px-6 py-4">
            <h3 id="import-target-skill-title" className="type-panel-title text-ui-text">
              {t('targetSkills.importTitle')}
            </h3>
            <p className="mt-1 type-body text-ui-text-muted">{t('targetSkills.importDescription')}</p>
          </div>
          <form
            aria-busy={editorSaving}
            onSubmit={(event) => {
              event.preventDefault();
              void handleImport();
            }}
          >
            <div className="space-y-4 px-6 py-5">
              <label className="block">
                <span className="mb-1 block type-ui text-ui-text">{t('targetSkills.repositoryUrl')}</span>
                <TextInput
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  maxLength={2048}
                  pattern="https://[^?#]+"
                  autoFocus
                  value={importUrl}
                  onChange={(event) => {
                    setImportUrl(event.target.value);
                    if (importError) setImportError(null);
                  }}
                  placeholder="https://github.com/openai/skills/tree/main/skills/.curated/cli-creator"
                  aria-describedby={`target-skill-import-url-help${importError ? ' target-skill-import-error' : ''}`}
                  aria-invalid={Boolean(importError)}
                />
                <span id="target-skill-import-url-help" className="mt-1 block type-caption text-ui-text-muted">{t('targetSkills.repositoryUrlHelp')}</span>
              </label>
              <div className="rounded-lg border border-ui-border px-3 py-3">
                <div className="type-ui text-ui-text">{t('targetSkills.importedSnapshot')}</div>
                <div className="type-caption text-ui-text-muted">{t('targetSkills.importedSnapshotHelp')}</div>
              </div>
              {importError && <div id="target-skill-import-error" role="alert" className="rounded-lg border border-status-danger/30 bg-status-danger/10 px-3 py-2 type-body text-status-danger">{importError}</div>}
            </div>
            <div className="flex justify-end gap-2 border-t border-ui-border px-6 py-4">
              <Button type="button" variant="secondary" size="sm" onClick={closeImportDialog} disabled={editorSaving}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={!importUrl.trim() || editorSaving}>
                {editorSaving ? t('targetSkills.importing') : t('targetSkills.importSkill')}
              </Button>
            </div>
          </form>
        </DialogFrame>
      )}

      {confirmDeleteSkillId && (
        <DialogFrame unframed
          titleId="delete-target-skill-title"
          onClose={() => setConfirmDeleteSkillId(null)}
          className="w-full max-w-lg rounded-lg border border-ui-border bg-ui-surface shadow-xl"
        >
          <div className="border-b border-ui-border px-6 py-4">
            <h3 id="delete-target-skill-title" className="type-panel-title text-ui-text">
              {t('targetSkills.deleteTitle')}
            </h3>
          </div>
          <div className="px-6 py-5 type-body text-ui-text-muted">{t('targetSkills.deleteBody')}</div>
          <div className="flex justify-end gap-2 border-t border-ui-border px-6 py-4">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteSkillId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" size="sm" onClick={() => void handleDelete()} disabled={pendingDangerAction === confirmDeleteSkillId}>
              {pendingDangerAction === confirmDeleteSkillId ? t('targetSkills.deleting') : t('targetSkills.deleteSkill')}
            </Button>
          </div>
        </DialogFrame>
      )}

      {confirmReimportSkillId && (
        <DialogFrame unframed
          titleId="reimport-target-skill-title"
          onClose={() => setConfirmReimportSkillId(null)}
          className="w-full max-w-lg rounded-lg border border-ui-border bg-ui-surface shadow-xl"
        >
          <div className="border-b border-ui-border px-6 py-4">
            <h3 id="reimport-target-skill-title" className="type-panel-title text-ui-text">
              {t('targetSkills.reimportTitle')}
            </h3>
          </div>
          <div className="space-y-4 px-6 py-5 type-body text-ui-text-muted">
            <p>{t('targetSkills.reimportBody')}</p>
            {selectedSkill?.source.syncStatus === 'modified' && (
              <label className="flex items-start gap-3 rounded-lg border border-ui-border px-3 py-3">
                <Checkbox checked={confirmForceReimport} onChange={(event) => setConfirmForceReimport(event.target.checked)} className="mt-1" />
                <span>{t('targetSkills.confirmOverwrite')}</span>
              </label>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-ui-border px-6 py-4">
            <Button variant="secondary" size="sm" onClick={() => setConfirmReimportSkillId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleReimport()}
              disabled={pendingDangerAction === confirmReimportSkillId || (selectedSkill?.source.syncStatus === 'modified' && !confirmForceReimport)}
            >
              {pendingDangerAction === confirmReimportSkillId ? t('targetSkills.reimporting') : t('targetSkills.reimport')}
            </Button>
          </div>
        </DialogFrame>
      )}
    </PageShell>
  );
};
