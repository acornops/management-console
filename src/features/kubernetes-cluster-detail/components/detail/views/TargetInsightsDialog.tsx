import React from 'react';
import { Archive, CheckCircle2, ChevronDown, FilePlus2, FileText, Folder, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Dialog } from '@/components/common/Dialog';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { Tooltip } from '@/components/common/Tooltip';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type {
  ControlPlaneTargetInsightsCatalog,
  ControlPlaneTargetToolItem,
  TargetInsightsEntryInput
} from '@/services/controlPlaneApi';
import { formatError } from '@/features/kubernetes-cluster-detail/components/detail/views/targetSkillsViewModel';
import { UnsavedChangesDialog } from '@/features/kubernetes-cluster-detail/components/detail/views/UnsavedChangesDialog';
import {
  applySavedEntryToCatalog,
  buildInsightFilePath,
  draftFromEntry,
  entryToInsightFile,
  hasDraftChanges,
  slugifyTitle,
  statusOrder,
  type FileDraft,
  type InsightFile,
  type InsightFileStatus
} from '@/features/kubernetes-cluster-detail/components/detail/views/targetInsightsDialogViewModel';

interface TargetInsightsDialogProps {
  workspaceId: string;
  targetId: string;
  tool: ControlPlaneTargetToolItem;
  canEdit: boolean;
  savingTool: boolean;
  onClose: () => void;
}

export const TargetInsightsDialog: React.FC<TargetInsightsDialogProps> = ({
  workspaceId,
  targetId,
  tool,
  canEdit,
  savingTool,
  onClose
}) => {
  const { t } = useTranslation();
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const pendingDiscardActionRef = React.useRef<(() => void) | null>(null);
  const [catalog, setCatalog] = React.useState<ControlPlaneTargetInsightsCatalog | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [selectedEntryId, setSelectedEntryId] = React.useState<string | null>(null);
  const [creatingNewFile, setCreatingNewFile] = React.useState(false);
  const [draft, setDraft] = React.useState<FileDraft>(() => draftFromEntry(null));
  const [fileSaving, setFileSaving] = React.useState(false);
  const [fileSearch, setFileSearch] = React.useState('');
  const [showDiscardDialog, setShowDiscardDialog] = React.useState(false);

  const selectedEntry = React.useMemo(
    () => catalog?.items.find((entry) => entry.id === selectedEntryId) || null,
    [catalog, selectedEntryId]
  );
  const files = React.useMemo(() => (catalog?.items || []).map(entryToInsightFile), [catalog]);
  const filteredFiles = React.useMemo(() => {
    const query = fileSearch.trim().toLowerCase();
    if (!query) return files;
    return files.filter((file) => file.searchableText.includes(query));
  }, [fileSearch, files]);
  const filesByStatus = React.useMemo(() => Object.fromEntries(
    statusOrder.map((status) => [status, filteredFiles.filter((file) => file.status === status)])
  ) as Record<InsightFileStatus, InsightFile[]>, [filteredFiles]);
  const hasOpenDraft = Boolean(selectedEntry || creatingNewFile);
  const selectedFileName = selectedEntry
    ? buildInsightFilePath(selectedEntry).split('/').pop() || 'insight-file.md'
    : `${slugifyTitle(draft.title) || 'new-file'}.md`;
  const selectedStatus = selectedEntry?.status || 'active';
  const draftDirty = hasOpenDraft && hasDraftChanges(selectedEntry, draft);
  const canMutateFile = canEdit && !fileSaving && !savingTool;
  const hasSearchQuery = Boolean(fileSearch.trim());

  const requestDiscard = React.useCallback((action: () => void) => {
    if (!draftDirty || !canEdit) {
      action();
      return;
    }
    pendingDiscardActionRef.current = action;
    setShowDiscardDialog(true);
  }, [canEdit, draftDirty]);

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

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const entries = await controlPlaneApi.listTargetInsightsEntries(workspaceId, targetId, { limit: 100 });
      setCatalog(entries);
      const first = entries.items[0] || null;
      setSelectedEntryId(first?.id || null);
      setCreatingNewFile(false);
      setDraft(draftFromEntry(first));
    } catch (err) {
      setError(formatError(err, t('tools.targetInsights.loadFailed'), 'targetInsights'));
    } finally {
      setLoading(false);
    }
  }, [targetId, t, workspaceId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (creatingNewFile) titleInputRef.current?.focus();
  }, [creatingNewFile]);

  const selectFile = (file: InsightFile) => {
    if (file.entry.id === selectedEntryId && !creatingNewFile) return;
    requestDiscard(() => {
      setSelectedEntryId(file.entry.id);
      setCreatingNewFile(false);
      setDraft(draftFromEntry(file.entry));
    });
  };

  const startNewFile = () => {
    if (!canEdit) return;
    requestDiscard(() => {
      setSelectedEntryId(null);
      setCreatingNewFile(true);
      setDraft(draftFromEntry(null));
    });
  };

  const resetDraft = () => {
    setDraft(draftFromEntry(selectedEntry));
    if (!selectedEntry) setCreatingNewFile(false);
  };

  const saveFile = async () => {
    if (!canEdit || !hasOpenDraft || !draft.title.trim()) return;
    const title = draft.title.trim();
    setFileSaving(true);
    setError('');
    try {
      const saved = selectedEntry
        ? await controlPlaneApi.updateTargetInsightsEntry(workspaceId, targetId, selectedEntry.id, {
            ...(title !== selectedEntry.title ? { title } : {}),
            ...(draft.bodyMarkdown !== selectedEntry.bodyMarkdown ? { bodyMarkdown: draft.bodyMarkdown } : {})
          })
        : await controlPlaneApi.createTargetInsightsEntry(workspaceId, targetId, {
            title,
            status: 'active',
            bodyMarkdown: draft.bodyMarkdown
          } satisfies TargetInsightsEntryInput);
      setCatalog((current) => applySavedEntryToCatalog(current, saved));
      setSelectedEntryId(saved.id);
      setCreatingNewFile(false);
      setDraft(draftFromEntry(saved));
    } catch (err) {
      setError(formatError(err, t('tools.targetInsights.saveFileFailed'), 'targetInsights'));
    } finally {
      setFileSaving(false);
    }
  };

  const performFileStatusUpdate = async (action: 'promote' | 'archive' | 'restore') => {
    if (!canEdit || !selectedEntry) return;
    setFileSaving(true);
    setError('');
    try {
      const saved = action === 'archive'
        ? await controlPlaneApi.archiveTargetInsightsEntry(workspaceId, targetId, selectedEntry.id)
        : await controlPlaneApi.promoteTargetInsightsEntry(workspaceId, targetId, selectedEntry.id);
      setCatalog((current) => applySavedEntryToCatalog(current, saved));
      setSelectedEntryId(saved.id);
      setCreatingNewFile(false);
      setDraft(draftFromEntry(saved));
    } catch (err) {
      const key = action === 'archive'
        ? 'tools.targetInsights.archiveFileFailed'
        : action === 'restore'
          ? 'tools.targetInsights.restoreFileFailed'
          : 'tools.targetInsights.promoteFileFailed';
      setError(formatError(err, t(key), 'targetInsights'));
    } finally {
      setFileSaving(false);
    }
  };

  const updateFileStatus = (action: 'promote' | 'archive' | 'restore') => {
    if (!canEdit || !selectedEntry) return;
    requestDiscard(() => {
      void performFileStatusUpdate(action);
    });
  };

  const renderFileTree = () => (
    <aside className="flex min-h-0 flex-col border-b border-ui-border bg-ui-bg lg:border-b-0 lg:border-r">
      <div className="border-b border-ui-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="type-row-title">{t('tools.targetInsights.files')}</h4>
          <button
            type="button"
            className="rounded-md p-1.5 text-ui-text-muted hover:bg-ui-surface hover:text-ui-text disabled:opacity-50"
            disabled={!canMutateFile}
            onClick={startNewFile}
            title={t('tools.targetInsights.newFile')}
            aria-label={t('tools.targetInsights.newFile')}
          >
            <FilePlus2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="border-b border-ui-border p-3">
        <label htmlFor="target-insights-file-search" className="sr-only">{t('tools.targetInsights.searchFiles')}</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
          <input
            id="target-insights-file-search"
            type="text"
            value={fileSearch}
            onChange={(event) => setFileSearch(event.target.value)}
            placeholder={t('tools.targetInsights.searchFiles')}
            className="w-full rounded-md border border-ui-border bg-ui-surface py-2 pl-9 pr-3 text-sm text-ui-text outline-none transition-colors placeholder:text-ui-text-muted/60 focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
        {filteredFiles.length === 0 && hasSearchQuery && !creatingNewFile ? (
          <p className="type-caption rounded-md px-2 py-3 text-ui-text-muted">{t('tools.targetInsights.noFileMatches')}</p>
        ) : (
          <div className="space-y-3">
            {statusOrder.map((status) => {
              const statusFiles = filesByStatus[status];
              return (
                <div key={status} data-target-insights-folder={`insights/${status}`}>
                  <Tooltip content={t(`tools.targetInsights.folderHelp.${status}`)} side="right" className="mb-1">
                    <div className="flex items-center gap-1.5 px-1 text-xs font-semibold text-ui-text">
                      <ChevronDown className="h-3.5 w-3.5" />
                      <Folder className="h-3.5 w-3.5" />
                      <span>{t(`tools.targetInsights.folder.${status}`)}</span>
                    </div>
                  </Tooltip>
                  <div className="space-y-1">
                    {status === 'active' && creatingNewFile && (
                      <div className="flex w-full min-w-0 items-center gap-2 rounded-md bg-accent-soft/20 py-1.5 pl-7 pr-2 text-left text-xs text-accent-strong">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{selectedFileName}</span>
                      </div>
                    )}
                    {statusFiles.length > 0 ? statusFiles.map((file) => (
                      <button
                        key={file.entry.id}
                        type="button"
                        onClick={() => selectFile(file)}
                        className={`flex w-full min-w-0 items-center gap-2 rounded-md py-1.5 pl-7 pr-2 text-left text-xs transition-colors ${
                          file.entry.id === selectedEntryId && !creatingNewFile
                            ? 'bg-accent-soft/20 text-accent-strong'
                            : 'text-ui-text-muted hover:bg-ui-surface hover:text-ui-text'
                        }`}
                        title={file.path}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{file.fileName}</span>
                      </button>
                    )) : status !== 'active' || !creatingNewFile ? (
                      <p className="type-caption py-1.5 pl-7 pr-2 text-ui-text-muted/75">{t('tools.targetInsights.emptyFolder')}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );

  const renderStatusActions = () => {
    if (!canEdit || !selectedEntry) return null;
    if (selectedEntry.status === 'pending') {
      return (
        <>
          <Button variant="secondary" size="sm" onClick={() => updateFileStatus('promote')} disabled={!canMutateFile}>
            <CheckCircle2 className="h-4 w-4" />
            {t('tools.targetInsights.promote')}
          </Button>
          <Button variant="tertiary" size="sm" onClick={() => updateFileStatus('archive')} disabled={!canMutateFile}>
            <Archive className="h-4 w-4" />
            {t('tools.targetInsights.archive')}
          </Button>
        </>
      );
    }
    if (selectedEntry.status === 'archived') {
      return (
        <Button variant="secondary" size="sm" onClick={() => updateFileStatus('restore')} disabled={!canMutateFile}>
          <CheckCircle2 className="h-4 w-4" />
          {t('tools.targetInsights.restore')}
        </Button>
      );
    }
    return (
      <Button variant="tertiary" size="sm" onClick={() => updateFileStatus('archive')} disabled={!canMutateFile}>
        <Archive className="h-4 w-4" />
        {t('tools.targetInsights.archive')}
      </Button>
    );
  };

  return (
    <>
      <Dialog
        titleId="target-insights-dialog-title"
        closeDisabled={fileSaving || savingTool || showDiscardDialog}
        onClose={guardedClose}
        className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-2xl"
      >
      <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-4">
        <div className="min-w-0">
          <h3 id="target-insights-dialog-title" className="type-panel-title">{t('tools.targetInsights.title')}</h3>
          <p className="type-caption mt-1 text-ui-text-muted">{tool.description}</p>
        </div>
        <button
          type="button"
          onClick={guardedClose}
          disabled={fileSaving || savingTool}
          className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-accent-strong disabled:opacity-50"
          aria-label={t('tools.targetInsights.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 custom-scrollbar">
        {loading ? (
          <div className="flex min-h-[34rem] items-center justify-center">
            <InlineLoadingIndicator label={t('tools.targetInsights.loading')} />
          </div>
        ) : (
          <div className="grid min-h-[34rem] gap-0 overflow-hidden rounded-lg border border-ui-border bg-ui-bg lg:grid-cols-[17rem_minmax(0,1fr)]">
            {renderFileTree()}
            <section className="flex min-w-0 flex-col bg-ui-surface">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border px-4 py-3">
                <div className="min-w-0">
                  <p className="type-label truncate text-ui-text">
                    {hasOpenDraft
                      ? `${selectedFileName} (${t(`tools.targetInsights.status.${selectedStatus}`)})`
                      : t('tools.targetInsights.files')}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">{renderStatusActions()}</div>
              </div>
              {error && (
                <div className="type-caption m-4 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
                  {error}
                </div>
              )}
              {hasOpenDraft ? (
                <div className="min-h-0 flex-1 space-y-3 p-4">
                  <label className="block">
                    <span className="type-label">{t('tools.targetInsights.fields.title')}</span>
                    <input
                      ref={titleInputRef}
                      className="mt-2 w-full rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-70"
                      value={draft.title}
                      readOnly={!canEdit}
                      onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                      placeholder={t('tools.targetInsights.titlePlaceholder')}
                    />
                  </label>
                  <textarea
                    value={draft.bodyMarkdown}
                    readOnly={!canEdit}
                    onChange={(event) => setDraft((current) => ({ ...current, bodyMarkdown: event.target.value }))}
                    className="min-h-[22rem] w-full flex-1 resize-none rounded-lg border border-ui-border bg-ui-bg px-4 py-3 font-mono text-sm leading-6 text-ui-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-70"
                    spellCheck={false}
                    placeholder={t('tools.targetInsights.bodyPlaceholder')}
                  />
                </div>
              ) : (
                <div className="flex min-h-[28rem] flex-1 items-center justify-center px-6 text-center">
                  <div className="max-w-sm">
                    <p className="type-row-title">{t('tools.targetInsights.noFiles')}</p>
                    <p className="type-caption mt-2 text-ui-text-muted">{t('tools.targetInsights.noFilesHelp')}</p>
                    {canEdit && (
                      <Button variant="secondary" size="sm" className="mt-4" onClick={startNewFile}>
                        <FilePlus2 className="h-4 w-4" />
                        {t('tools.targetInsights.newFile')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
        {!canEdit ? (
          <>
            <span />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={guardedClose} disabled={fileSaving || savingTool}>{t('common.close')}</Button>
            </div>
          </>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={resetDraft} disabled={!draftDirty || fileSaving || savingTool}>{t('tools.targetInsights.resetChanges')}</Button>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={guardedClose} disabled={fileSaving || savingTool}>{t('tools.targetInsights.cancel')}</Button>
              <Button variant="accent" size="sm" onClick={() => void saveFile()} disabled={!hasOpenDraft || fileSaving || !draftDirty || !draft.title.trim()}>
                {fileSaving ? t('common.saving') : t('tools.targetInsights.saveChanges')}
              </Button>
            </div>
          </>
        )}
      </div>
      </Dialog>
      {showDiscardDialog && (
        <UnsavedChangesDialog
          title={t('tools.targetInsights.discardTitle')}
          body={t('tools.targetInsights.discardBody')}
          cancelLabel={t('tools.targetInsights.keepEditing')}
          discardLabel={t('tools.targetInsights.discardChanges')}
          onCancel={cancelDiscard}
          onDiscard={confirmDiscard}
        />
      )}
    </>
  );
};
