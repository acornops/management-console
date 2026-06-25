import React from 'react';
import { GitBranch, Plus } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Dialog } from '@/components/common/Dialog';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { controlPlaneApi, ControlPlaneTargetSkillDetail, ControlPlaneTargetSkillsCatalog, ImportTargetSkillInput } from '@/services/controlPlaneApi';
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
} from '@/features/kubernetes-cluster-detail/components/detail/views/targetSkillsViewModel';
import { TargetSkillEditorDialog } from '@/features/kubernetes-cluster-detail/components/detail/views/TargetSkillEditorDialog';
import { TargetSkillsInventory } from '@/features/kubernetes-cluster-detail/components/detail/views/TargetSkillsInventory';

export const TargetSkillsView: React.FC<TargetSkillsViewProps> = ({
  cluster,
  targetContext,
  canManageSkills = false
}) => {
  const activeTarget = targetContext || {
    workspaceId: cluster.workspaceId,
    targetId: cluster.id,
    targetType: 'kubernetes' as const
  };

  const [catalog, setCatalog] = React.useState<ControlPlaneTargetSkillsCatalog | null>(null);
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
  const [importDraft, setImportDraft] = React.useState<ImportTargetSkillInput>({ repoUrl: '', ref: '', subpath: '' });
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
      const nextCatalog = await controlPlaneApi.listTargetSkills(activeTarget.workspaceId, activeTarget.targetId, { limit: 50 });
      setCatalog(nextCatalog);
      setSelectedSkillId((current) => current && nextCatalog.items.some((item) => item.id === current)
        ? current
        : nextCatalog.items[0]?.id || null);
    } catch (error) {
      setCatalog(null);
      setCatalogError(formatError(error, 'Failed loading target skills.'));
    } finally {
      setCatalogLoading(false);
    }
  }, [activeTarget.targetId, activeTarget.workspaceId]);

  const loadSkillDetail = React.useCallback(async (skillId: string) => {
    setDetailLoading(true);
    setEditorError(null);
    try {
      const detail = await controlPlaneApi.getTargetSkill(activeTarget.workspaceId, activeTarget.targetId, skillId);
      setDetailsById((current) => ({ ...current, [skillId]: detail }));
      setDraftFiles(toDraftFiles(detail.files));
      setActiveFilePath('SKILL.md');
    } catch (error) {
      setEditorError(formatError(error, 'Failed loading skill detail.'));
    } finally {
      setDetailLoading(false);
    }
  }, [activeTarget.targetId, activeTarget.workspaceId]);

  React.useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

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
      const detail = await controlPlaneApi.updateTargetSkill(activeTarget.workspaceId, activeTarget.targetId, skillId, { enabled });
      syncSkill(detail);
    } catch (error) {
      setCatalogError(formatError(error, 'Failed updating skill state.'));
    } finally {
      setToggleSkillId(null);
    }
  };

  const handleSave = async () => {
    if (!selectedSkillId || !selectedDetail || !canEditSkills) return;
    setEditorSaving(true);
    setEditorError(null);
    try {
      const detail = await controlPlaneApi.updateTargetSkill(activeTarget.workspaceId, activeTarget.targetId, selectedSkillId, {
        files: toRequestFiles(draftFiles)
      });
      syncSkill(detail);
      await loadCatalog();
      closeEditor();
    } catch (error) {
      setEditorError(formatError(error, 'Failed saving skill changes.'));
    } finally {
      setEditorSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!canEditSkills) return;
    setEditorError(null);
    setEditorSaving(true);
    try {
      const detail = await controlPlaneApi.createTargetSkill(activeTarget.workspaceId, activeTarget.targetId, {
        files: toRequestFiles(draftFiles)
      });
      await loadCatalog();
      setSelectedSkillId(detail.id);
      syncSkill(detail);
      closeEditor();
    } catch (error) {
      setEditorError(formatError(error, 'Failed creating skill.'));
    } finally {
      setEditorSaving(false);
    }
  };

  const handleImport = async () => {
    if (!canEditSkills) return;
    setImportError(null);
    setEditorSaving(true);
    try {
      const detail = await controlPlaneApi.importTargetSkill(activeTarget.workspaceId, activeTarget.targetId, {
        repoUrl: importDraft.repoUrl.trim(),
        ref: importDraft.ref?.trim() || undefined,
        subpath: importDraft.subpath?.trim() || undefined
      });
      setIsImportDialogOpen(false);
      setImportDraft({ repoUrl: '', ref: '', subpath: '' });
      await loadCatalog();
      setSelectedSkillId(detail.id);
      syncSkill(detail);
    } catch (error) {
      setImportError(formatError(error, 'Failed importing skill.'));
    } finally {
      setEditorSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteSkillId || !canEditSkills) return;
    setPendingDangerAction(confirmDeleteSkillId);
    try {
      await controlPlaneApi.deleteTargetSkill(activeTarget.workspaceId, activeTarget.targetId, confirmDeleteSkillId);
      removeSkill(confirmDeleteSkillId);
      setConfirmDeleteSkillId(null);
      closeEditor();
    } catch (error) {
      setEditorError(formatError(error, 'Failed deleting skill.'));
    } finally {
      setPendingDangerAction(null);
    }
  };

  const handleReimport = async () => {
    if (!confirmReimportSkillId || !canEditSkills) return;
    setPendingDangerAction(confirmReimportSkillId);
    try {
      const detail = await controlPlaneApi.reimportTargetSkill(activeTarget.workspaceId, activeTarget.targetId, confirmReimportSkillId, {
        force: confirmForceReimport
      });
      syncSkill(detail);
      await loadCatalog();
      setConfirmReimportSkillId(null);
      setConfirmForceReimport(false);
    } catch (error) {
      setEditorError(formatError(error, 'Failed reimporting skill.'));
    } finally {
      setPendingDangerAction(null);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="type-route-title">Skills</h1>
          <p className="type-body mt-2">
            Markdown-only instruction files scoped to {cluster.name}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="md" onClick={openImportDialog} disabled={!canEditSkills}>
            <GitBranch className="h-4 w-4" />
            Import
          </Button>
          <Button variant="secondary" size="md" onClick={openCreateEditor} disabled={!canEditSkills}>
            <Plus className="h-4 w-4" />
            Create Skill
          </Button>
        </div>
        {!canEditSkills && (
          <p className="type-caption lg:max-w-xs">
            {catalog?.permissions?.editableRoles?.length
              ? `Editable by: ${catalog.permissions.editableRoles.join(', ')}`
              : 'Read-only. You can inspect configured skills but not change them.'}
          </p>
        )}
      </header>

      {catalogError && (
        <div className="type-caption mb-5 rounded-xl border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
          {catalogError}
        </div>
      )}

      {catalogLoading && !catalog && (
        <InlineLoadingIndicator label="Loading skills" className="mb-5" />
      )}

      {!catalogLoading && catalog?.items?.length === 0 && (
        <div className="rounded-xl border border-ui-border bg-ui-surface p-10 text-center shadow-sm">
          <p className="type-body">No target skills configured.</p>
          {canEditSkills && (
            <Button onClick={openCreateEditor} variant="accent" size="sm" className="mt-6">
              <Plus className="h-4 w-4" />
              Create first skill
            </Button>
          )}
        </div>
      )}

      {catalog?.items?.length ? (
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
            <h3 id="import-target-skill-title" className="text-base font-semibold text-ui-text">Import skill from GitHub</h3>
            <p className="mt-1 text-sm text-ui-text-muted">Imports a pinned local snapshot from a public GitHub repository or skill folder URL.</p>
          </div>
          <div className="space-y-4 px-6 py-5">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ui-text">GitHub URL</span>
              <input value={importDraft.repoUrl} onChange={(event) => setImportDraft((current) => ({ ...current, repoUrl: event.target.value }))} placeholder="https://github.com/openai/skills/tree/main/skills/.curated/cli-creator" className="w-full rounded-lg border border-ui-border bg-ui-bg px-3 py-2 text-sm text-ui-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ui-text">Ref</span>
                <input value={importDraft.ref || ''} onChange={(event) => setImportDraft((current) => ({ ...current, ref: event.target.value }))} placeholder="main" className="w-full rounded-lg border border-ui-border bg-ui-bg px-3 py-2 text-sm text-ui-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ui-text">Subpath</span>
                <input value={importDraft.subpath || ''} onChange={(event) => setImportDraft((current) => ({ ...current, subpath: event.target.value }))} placeholder="skills/troubleshooting-cnpg" className="w-full rounded-lg border border-ui-border bg-ui-bg px-3 py-2 text-sm text-ui-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
              </label>
            </div>
            <div className="rounded-lg border border-ui-border px-3 py-3">
              <div className="text-sm font-medium text-ui-text">Imported snapshot</div>
              <div className="text-xs text-ui-text-muted">Paste a folder URL directly, or use Ref and Subpath with a bare repository URL. Imported files remain editable local snapshots.</div>
            </div>
            {importError && <div className="rounded-lg border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-sm text-status-danger">{importError}</div>}
          </div>
          <div className="flex justify-end gap-2 border-t border-ui-border px-6 py-4">
            <Button variant="secondary" size="sm" onClick={closeImportDialog}>Cancel</Button>
            <Button variant="accent" size="sm" onClick={() => void handleImport()} disabled={!importDraft.repoUrl.trim() || editorSaving}>{editorSaving ? 'Importing...' : 'Import Skill'}</Button>
          </div>
        </Dialog>
      )}

      {confirmDeleteSkillId && (
        <Dialog titleId="delete-target-skill-title" onClose={() => setConfirmDeleteSkillId(null)} className="w-full max-w-lg rounded-lg border border-ui-border bg-ui-surface shadow-xl">
          <div className="border-b border-ui-border px-6 py-4">
            <h3 id="delete-target-skill-title" className="text-base font-semibold text-ui-text">Delete target skill</h3>
          </div>
          <div className="px-6 py-5 text-sm text-ui-text-muted">
            Delete this target-scoped troubleshooting skill and remove its Markdown files from the target.
          </div>
          <div className="flex justify-end gap-2 border-t border-ui-border px-6 py-4">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteSkillId(null)}>Cancel</Button>
            <Button variant="accent" size="sm" onClick={() => void handleDelete()} disabled={pendingDangerAction === confirmDeleteSkillId}>
              {pendingDangerAction === confirmDeleteSkillId ? 'Deleting...' : 'Delete Skill'}
            </Button>
          </div>
        </Dialog>
      )}

      {confirmReimportSkillId && (
        <Dialog titleId="reimport-target-skill-title" onClose={() => setConfirmReimportSkillId(null)} className="w-full max-w-lg rounded-lg border border-ui-border bg-ui-surface shadow-xl">
          <div className="border-b border-ui-border px-6 py-4">
            <h3 id="reimport-target-skill-title" className="text-base font-semibold text-ui-text">Reimport target skill</h3>
          </div>
          <div className="space-y-4 px-6 py-5 text-sm text-ui-text-muted">
            <p>Reimport overwrites the local skill files with the stored GitHub source snapshot.</p>
            {selectedSkill?.source.syncStatus === 'modified' && (
              <label className="flex items-start gap-3 rounded-lg border border-ui-border px-3 py-3">
                <input type="checkbox" checked={confirmForceReimport} onChange={(event) => setConfirmForceReimport(event.target.checked)} className="mt-1" />
                <span>Confirm overwrite for locally modified imported skill.</span>
              </label>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-ui-border px-6 py-4">
            <Button variant="secondary" size="sm" onClick={() => setConfirmReimportSkillId(null)}>Cancel</Button>
            <Button
              variant="accent"
              size="sm"
              onClick={() => void handleReimport()}
              disabled={pendingDangerAction === confirmReimportSkillId || (selectedSkill?.source.syncStatus === 'modified' && !confirmForceReimport)}
            >
              {pendingDangerAction === confirmReimportSkillId ? 'Reimporting...' : 'Reimport'}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
};
