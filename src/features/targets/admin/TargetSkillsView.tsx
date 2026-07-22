import React from 'react';
import { GitBranch, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { TextInput } from '@/components/common/ComponentVocabulary';
import { Dialog } from '@/components/common/Dialog';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { Select } from '@/components/common/Select';
import { controlPlaneApi, ControlPlaneTargetSkillDetail, ControlPlaneTargetSkillsCatalog, GitTargetSkillImportInput } from '@/services/controlPlaneApi';
import { GitSkillImportError, importTargetSkillFromGit } from '@/services/gitSkillImport';
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

export const TargetSkillsView: React.FC<TargetSkillsViewProps> = ({
  target,
  canManageSkills = false,
  initialCatalog = null,
  onCatalogChange
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
  const [importDraft, setImportDraft] = React.useState<GitTargetSkillImportInput>({ provider: 'github', repoUrl: '', apiBaseUrl: '', ref: '', subpath: '' });
  const [importError, setImportError] = React.useState<string | null>(null);
  const [confirmDeleteSkillId, setConfirmDeleteSkillId] = React.useState<string | null>(null);
  const [confirmReimportSkillId, setConfirmReimportSkillId] = React.useState<string | null>(null);
  const [confirmForceReimport, setConfirmForceReimport] = React.useState(false);
  const [pendingDangerAction, setPendingDangerAction] = React.useState<string | null>(null);

  const selectedSkill = selectedSkillId ? catalog?.items.find((item) => item.id === selectedSkillId) || null : null;
  const selectedDetail = selectedSkillId ? detailsById[selectedSkillId] || null : null;
  const draftSignature = React.useMemo(() => JSON.stringify(toRequestFiles(draftFiles)), [draftFiles]);
  const detailSignature = React.useMemo(
    () => JSON.stringify(selectedDetail ? toRequestFiles(toDraftFiles(selectedDetail.files)) : []),
    [selectedDetail]
  );
  const editorDirty = editorMode === 'create'
    ? editorStep === 'files' && draftFiles.length > 0
    : Boolean(selectedDetail) && draftSignature !== detailSignature;
  const canEditSkills = Boolean(canManageSkills && catalog?.permissions?.canEdit);
  const showPermissionNotice = catalog ? !canEditSkills : !canManageSkills;
  const formatTargetSkillError = React.useCallback((error: unknown, fallbackKey: string): string => {
    if (error instanceof GitSkillImportError) {
      return t(`targetSkills.gitImportErrors.${error.code}`, { defaultValue: error.message });
    }
    return formatError(error, t(fallbackKey));
  }, [t]);

  const openImportDialog = () => {
    setImportError(null);
    setIsImportDialogOpen(true);
  };

  const closeImportDialog = () => {
    setImportError(null);
    setIsImportDialogOpen(false);
  };

  const loadCatalog = React.useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const nextCatalog = await controlPlaneApi.listTargetSkills(target.workspaceId, target.id, { limit: 50 });
      setCatalog(nextCatalog);
      setSelectedSkillId((current) => current && nextCatalog.items.some((item) => item.id === current)
        ? current
        : nextCatalog.items[0]?.id || null);
    } catch (error) {
      setCatalogError(formatTargetSkillError(error, 'targetSkills.loadFailed'));
    } finally {
      setCatalogLoading(false);
    }
  }, [target.id, target.workspaceId, formatTargetSkillError]);

  const loadSkillDetail = React.useCallback(async (skillId: string) => {
    setDetailLoading(true);
    setEditorError(null);
    try {
      const detail = await controlPlaneApi.getTargetSkill(target.workspaceId, target.id, skillId);
      setDetailsById((current) => ({ ...current, [skillId]: detail }));
      setDraftFiles(toDraftFiles(detail.files));
      setActiveFilePath('SKILL.md');
    } catch (error) {
      setEditorError(formatTargetSkillError(error, 'targetSkills.loadDetailFailed'));
    } finally {
      setDetailLoading(false);
    }
  }, [target.id, target.workspaceId, formatTargetSkillError]);

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
      setActiveFilePath((current) => detail.files.some((file) => file.path === current) ? current : 'SKILL.md');
      return;
    }
    void loadSkillDetail(selectedSkillId);
  }, [detailsById, editorMode, loadSkillDetail, selectedSkillId]);

  const syncSkill = (detail: ControlPlaneTargetSkillDetail) => {
    setDetailsById((current) => ({ ...current, [detail.id]: detail }));
    setCatalog((current) => current ? {
      ...current,
      items: current.items.map((item) => item.id === detail.id ? detail : item)
    } : current);
    setDraftFiles(toDraftFiles(detail.files));
    setActiveFilePath((current) => detail.files.some((file) => file.path === current) ? current : 'SKILL.md');
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
    setCatalog((current) => current ? {
      ...current,
      items: current.items.filter((item) => item.id !== skillId)
    } : current);
    setSelectedSkillId((current) => current === skillId ? null : current);
  };

  const handleCreateNameNext = () => {
    const normalizedName = normalizeSkillName(createName);
    setDraftFiles([{
      path: 'SKILL.md',
      content: buildSkillTemplate(normalizedName, DEFAULT_SKILL_DESCRIPTION, DEFAULT_SKILL_BODY)
    }]);
    setActiveFilePath('SKILL.md');
    setEditorStep('files');
  };

  const resetEditorDraft = () => {
    setEditorError(null);
    setEditorResetVersion((current) => current + 1);
    if (editorMode === 'create') {
      const normalizedName = normalizeSkillName(createName);
      setDraftFiles([{
        path: 'SKILL.md',
        content: buildSkillTemplate(normalizedName, DEFAULT_SKILL_DESCRIPTION, DEFAULT_SKILL_BODY)
      }]);
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
      const detail = await controlPlaneApi.updateTargetSkill(target.workspaceId, target.id, skillId, { enabled });
      syncSkill(detail);
    } catch (error) {
      setCatalogError(formatTargetSkillError(error, 'targetSkills.updateFailed'));
    } finally {
      setToggleSkillId(null);
    }
  };

  const handleSave = async () => {
    if (!selectedSkillId || !selectedDetail || !canEditSkills) return;
    setEditorSaving(true);
    setEditorError(null);
    try {
      const detail = await controlPlaneApi.updateTargetSkill(target.workspaceId, target.id, selectedSkillId, {
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
      const detail = await controlPlaneApi.createTargetSkill(target.workspaceId, target.id, {
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
    if (!canEditSkills) return;
    setImportError(null);
    setEditorSaving(true);
    try {
      const imported = await importTargetSkillFromGit({
        provider: importDraft.provider,
        repoUrl: importDraft.repoUrl.trim(),
        apiBaseUrl: importDraft.apiBaseUrl?.trim() || undefined,
        ref: importDraft.ref?.trim() || undefined,
        subpath: importDraft.subpath?.trim() || undefined
      });
      const detail = await controlPlaneApi.importTargetSkill(target.workspaceId, target.id, imported);
      setIsImportDialogOpen(false);
      setImportDraft({ provider: 'github', repoUrl: '', apiBaseUrl: '', ref: '', subpath: '' });
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
      await controlPlaneApi.deleteTargetSkill(target.workspaceId, target.id, confirmDeleteSkillId);
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
      const imported = await importTargetSkillFromGit({
        provider: selectedSkill.source.provider,
        repoUrl: selectedSkill.source.repoUrl,
        apiBaseUrl: selectedSkill.source.apiBaseUrl,
        ref: selectedSkill.source.ref,
        subpath: selectedSkill.source.subpath
      });
      const detail = await controlPlaneApi.reimportTargetSkill(target.workspaceId, target.id, confirmReimportSkillId, {
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
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="type-route-title">{t('targetSkills.title')}</h1>
          <p className="type-body mt-2">
            {t('targetSkills.description', { name: target.name })}
          </p>
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
              ? t('targetSkills.manageNoAccessWithRoles', { roles: catalog.permissions.editableRoles.join(', ') })
              : t('targetSkills.manageNoAccess')}
          </p>
        )}
      </header>

      {catalogError && (
        <div className="type-caption mb-5 rounded-xl border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
          {catalogError}
        </div>
      )}

      {catalogLoading && !catalog && (
        <InlineLoadingIndicator label={t('targetSkills.loading')} className="mb-5" />
      )}

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
          onReimport={selectedDetail ? () => setConfirmReimportSkillId(selectedDetail.id) : undefined}
        />
      )}

      {isImportDialogOpen && (
        <Dialog titleId="import-target-skill-title" onClose={closeImportDialog} className="w-full max-w-xl rounded-lg border border-ui-border bg-ui-surface shadow-xl">
          <div className="border-b border-ui-border px-6 py-4">
            <h3 id="import-target-skill-title" className="text-base font-semibold text-ui-text">{t('targetSkills.importTitle')}</h3>
            <p className="mt-1 text-sm text-ui-text-muted">{t('targetSkills.importDescription')}</p>
          </div>
          <div className="space-y-4 px-6 py-5">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ui-text">{t('targetSkills.provider')}</span>
              <Select
                value={importDraft.provider}
                options={[
                  { value: 'github', label: t('targetSkills.providerGithub') },
                  { value: 'gitlab', label: t('targetSkills.providerGitlab') }
                ]}
                onChange={(provider) => setImportDraft((current) => ({ ...current, provider }))}
                ariaLabel={t('targetSkills.provider')}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ui-text">{t('targetSkills.repositoryUrl')}</span>
              <TextInput value={importDraft.repoUrl} onChange={(event) => setImportDraft((current) => ({ ...current, repoUrl: event.target.value }))} placeholder="https://github.com/openai/skills/tree/main/skills/.curated/cli-creator" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ui-text">{t('targetSkills.apiBaseUrl')}</span>
              <TextInput value={importDraft.apiBaseUrl || ''} onChange={(event) => setImportDraft((current) => ({ ...current, apiBaseUrl: event.target.value }))} placeholder={importDraft.provider === 'gitlab' ? 'https://git.internal/gitlab/api/v4' : 'https://github.internal/api/v3'} />
              <span className="mt-1 block text-xs text-ui-text-muted">{t('targetSkills.apiBaseUrlHelp')}</span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ui-text">{t('targetSkills.ref')}</span>
                <TextInput value={importDraft.ref || ''} onChange={(event) => setImportDraft((current) => ({ ...current, ref: event.target.value }))} placeholder="main" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ui-text">{t('targetSkills.subpath')}</span>
                <TextInput value={importDraft.subpath || ''} onChange={(event) => setImportDraft((current) => ({ ...current, subpath: event.target.value }))} placeholder="skills/troubleshooting-cnpg" />
              </label>
            </div>
            <div className="rounded-lg border border-ui-border px-3 py-3">
              <div className="text-sm font-medium text-ui-text">{t('targetSkills.importedSnapshot')}</div>
              <div className="text-xs text-ui-text-muted">{t('targetSkills.importedSnapshotHelp')}</div>
            </div>
            {importError && <div className="rounded-lg border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-sm text-status-danger">{importError}</div>}
          </div>
          <div className="flex justify-end gap-2 border-t border-ui-border px-6 py-4">
            <Button variant="secondary" size="sm" onClick={closeImportDialog}>{t('common.cancel')}</Button>
            <Button variant="primary" size="sm" onClick={() => void handleImport()} disabled={!importDraft.repoUrl.trim() || editorSaving}>{editorSaving ? t('targetSkills.importing') : t('targetSkills.importSkill')}</Button>
          </div>
        </Dialog>
      )}

      {confirmDeleteSkillId && (
        <Dialog titleId="delete-target-skill-title" onClose={() => setConfirmDeleteSkillId(null)} className="w-full max-w-lg rounded-lg border border-ui-border bg-ui-surface shadow-xl">
          <div className="border-b border-ui-border px-6 py-4">
            <h3 id="delete-target-skill-title" className="text-base font-semibold text-ui-text">{t('targetSkills.deleteTitle')}</h3>
          </div>
          <div className="px-6 py-5 text-sm text-ui-text-muted">
            {t('targetSkills.deleteBody')}
          </div>
          <div className="flex justify-end gap-2 border-t border-ui-border px-6 py-4">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteSkillId(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" size="sm" onClick={() => void handleDelete()} disabled={pendingDangerAction === confirmDeleteSkillId}>
              {pendingDangerAction === confirmDeleteSkillId ? t('targetSkills.deleting') : t('targetSkills.deleteSkill')}
            </Button>
          </div>
        </Dialog>
      )}

      {confirmReimportSkillId && (
        <Dialog titleId="reimport-target-skill-title" onClose={() => setConfirmReimportSkillId(null)} className="w-full max-w-lg rounded-lg border border-ui-border bg-ui-surface shadow-xl">
          <div className="border-b border-ui-border px-6 py-4">
            <h3 id="reimport-target-skill-title" className="text-base font-semibold text-ui-text">{t('targetSkills.reimportTitle')}</h3>
          </div>
          <div className="space-y-4 px-6 py-5 text-sm text-ui-text-muted">
            <p>{t('targetSkills.reimportBody')}</p>
            {selectedSkill?.source.syncStatus === 'modified' && (
              <label className="flex items-start gap-3 rounded-lg border border-ui-border px-3 py-3">
                <Checkbox checked={confirmForceReimport} onChange={(event) => setConfirmForceReimport(event.target.checked)} className="mt-1" />
                <span>{t('targetSkills.confirmOverwrite')}</span>
              </label>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-ui-border px-6 py-4">
            <Button variant="secondary" size="sm" onClick={() => setConfirmReimportSkillId(null)}>{t('common.cancel')}</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleReimport()}
              disabled={pendingDangerAction === confirmReimportSkillId || (selectedSkill?.source.syncStatus === 'modified' && !confirmForceReimport)}
            >
              {pendingDangerAction === confirmReimportSkillId ? t('targetSkills.reimporting') : t('targetSkills.reimport')}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
};
