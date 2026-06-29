import React from 'react';
import { Archive, CheckCircle2, ChevronDown, FilePlus2, FileText, Folder, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Dialog } from '@/components/common/Dialog';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { Tooltip } from '@/components/common/Tooltip';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type {
  ControlPlaneKnowledgeBankCatalog,
  ControlPlaneTargetToolItem,
  KnowledgeBankEntryInput
} from '@/services/controlPlaneApi';
import { formatError } from '@/features/kubernetes-cluster-detail/components/detail/views/targetSkillsViewModel';
import { UnsavedChangesDialog } from '@/features/kubernetes-cluster-detail/components/detail/views/UnsavedChangesDialog';
import {
  applySavedEntryToCatalog,
  buildKnowledgeFilePath,
  draftFromEntry,
  entryToKnowledgeFile,
  hasDraftChanges,
  slugifyTitle,
  statusOrder,
  type FileDraft,
  type KnowledgeFile,
  type KnowledgeFileStatus
} from '@/features/kubernetes-cluster-detail/components/detail/views/knowledgeBankDialogViewModel';

interface KnowledgeBankDialogProps {
  workspaceId: string;
  targetId: string;
  tool: ControlPlaneTargetToolItem;
  canEdit: boolean;
  savingTool: boolean;
  onClose: () => void;
}

export const KnowledgeBankDialog: React.FC<KnowledgeBankDialogProps> = ({
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
  const [catalog, setCatalog] = React.useState<ControlPlaneKnowledgeBankCatalog | null>(null);
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
  const files = React.useMemo(() => (catalog?.items || []).map(entryToKnowledgeFile), [catalog]);
  const filteredFiles = React.useMemo(() => {
    const query = fileSearch.trim().toLowerCase();
    if (!query) return files;
    return files.filter((file) => file.searchableText.includes(query));
  }, [fileSearch, files]);
  const filesByStatus = React.useMemo(() => Object.fromEntries(
    statusOrder.map((status) => [status, filteredFiles.filter((file) => file.status === status)])
  ) as Record<KnowledgeFileStatus, KnowledgeFile[]>, [filteredFiles]);
  const hasOpenDraft = Boolean(selectedEntry || creatingNewFile);
  const selectedFileName = selectedEntry
    ? buildKnowledgeFilePath(selectedEntry).split('/').pop() || 'knowledge-file.md'
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
      const entries = await controlPlaneApi.listKnowledgeBankEntries(workspaceId, targetId, { limit: 100 });
      setCatalog(entries);
      const first = entries.items[0] || null;
      setSelectedEntryId(first?.id || null);
      setCreatingNewFile(false);
      setDraft(draftFromEntry(first));
    } catch (err) {
      setError(formatError(err, t('tools.knowledgeBank.loadFailed')));
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

  const selectFile = (file: KnowledgeFile) => {
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
        ? await controlPlaneApi.updateKnowledgeBankEntry(workspaceId, targetId, selectedEntry.id, {
            ...(title !== selectedEntry.title ? { title } : {}),
            ...(draft.bodyMarkdown !== selectedEntry.bodyMarkdown ? { bodyMarkdown: draft.bodyMarkdown } : {})
          })
        : await controlPlaneApi.createKnowledgeBankEntry(workspaceId, targetId, {
            title,
            status: 'active',
            bodyMarkdown: draft.bodyMarkdown
          } satisfies KnowledgeBankEntryInput);
      setCatalog((current) => applySavedEntryToCatalog(current, saved));
      setSelectedEntryId(saved.id);
      setCreatingNewFile(false);
      setDraft(draftFromEntry(saved));
    } catch (err) {
      setError(formatError(err, t('tools.knowledgeBank.saveFileFailed')));
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
        ? await controlPlaneApi.archiveKnowledgeBankEntry(workspaceId, targetId, selectedEntry.id)
        : await controlPlaneApi.promoteKnowledgeBankEntry(workspaceId, targetId, selectedEntry.id);
      setCatalog((current) => applySavedEntryToCatalog(current, saved));
      setSelectedEntryId(saved.id);
      setCreatingNewFile(false);
      setDraft(draftFromEntry(saved));
    } catch (err) {
      const key = action === 'archive'
        ? 'tools.knowledgeBank.archiveFileFailed'
        : action === 'restore'
          ? 'tools.knowledgeBank.restoreFileFailed'
          : 'tools.knowledgeBank.promoteFileFailed';
      setError(formatError(err, t(key)));
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
          <h4 className="type-row-title">{t('tools.knowledgeBank.files')}</h4>
          <button
            type="button"
            className="rounded-md p-1.5 text-ui-text-muted hover:bg-ui-surface hover:text-ui-text disabled:opacity-50"
            disabled={!canMutateFile}
            onClick={startNewFile}
            title={t('tools.knowledgeBank.newFile')}
            aria-label={t('tools.knowledgeBank.newFile')}
          >
            <FilePlus2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="border-b border-ui-border p-3">
        <label htmlFor="knowledge-bank-file-search" className="sr-only">{t('tools.knowledgeBank.searchFiles')}</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
          <input
            id="knowledge-bank-file-search"
            type="text"
            value={fileSearch}
            onChange={(event) => setFileSearch(event.target.value)}
            placeholder={t('tools.knowledgeBank.searchFiles')}
            className="w-full rounded-md border border-ui-border bg-ui-surface py-2 pl-9 pr-3 text-sm text-ui-text outline-none transition-colors placeholder:text-ui-text-muted/60 focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
        {filteredFiles.length === 0 && hasSearchQuery && !creatingNewFile ? (
          <p className="type-caption rounded-md px-2 py-3 text-ui-text-muted">{t('tools.knowledgeBank.noFileMatches')}</p>
        ) : (
          <div className="space-y-3">
            {statusOrder.map((status) => {
              const statusFiles = filesByStatus[status];
              return (
                <div key={status} data-knowledge-bank-folder={`knowledge-bank/${status}`}>
                  <Tooltip content={t(`tools.knowledgeBank.folderHelp.${status}`)} side="right" className="mb-1">
                    <div className="flex items-center gap-1.5 px-1 text-xs font-semibold text-ui-text">
                      <ChevronDown className="h-3.5 w-3.5" />
                      <Folder className="h-3.5 w-3.5" />
                      <span>{t(`tools.knowledgeBank.folder.${status}`)}</span>
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
                      <p className="type-caption py-1.5 pl-7 pr-2 text-ui-text-muted/75">{t('tools.knowledgeBank.emptyFolder')}</p>
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
            {t('tools.knowledgeBank.promote')}
          </Button>
          <Button variant="tertiary" size="sm" onClick={() => updateFileStatus('archive')} disabled={!canMutateFile}>
            <Archive className="h-4 w-4" />
            {t('tools.knowledgeBank.archive')}
          </Button>
        </>
      );
    }
    if (selectedEntry.status === 'archived') {
      return (
        <Button variant="secondary" size="sm" onClick={() => updateFileStatus('restore')} disabled={!canMutateFile}>
          <CheckCircle2 className="h-4 w-4" />
          {t('tools.knowledgeBank.restore')}
        </Button>
      );
    }
    return (
      <Button variant="tertiary" size="sm" onClick={() => updateFileStatus('archive')} disabled={!canMutateFile}>
        <Archive className="h-4 w-4" />
        {t('tools.knowledgeBank.archive')}
      </Button>
    );
  };

  return (
    <>
      <Dialog
        titleId="knowledge-bank-dialog-title"
        closeDisabled={fileSaving || savingTool || showDiscardDialog}
        onClose={guardedClose}
        className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-2xl"
      >
      <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-4">
        <div className="min-w-0">
          <h3 id="knowledge-bank-dialog-title" className="type-panel-title">{t('tools.knowledgeBank.title')}</h3>
          <p className="type-caption mt-1 text-ui-text-muted">{tool.description}</p>
        </div>
        <button
          type="button"
          onClick={guardedClose}
          disabled={fileSaving || savingTool}
          className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-accent-strong disabled:opacity-50"
          aria-label={t('tools.knowledgeBank.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 custom-scrollbar">
        {loading ? (
          <div className="flex min-h-[34rem] items-center justify-center">
            <InlineLoadingIndicator label={t('tools.knowledgeBank.loading')} />
          </div>
        ) : (
          <div className="grid min-h-[34rem] gap-0 overflow-hidden rounded-lg border border-ui-border bg-ui-bg lg:grid-cols-[17rem_minmax(0,1fr)]">
            {renderFileTree()}
            <section className="flex min-w-0 flex-col bg-ui-surface">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border px-4 py-3">
                <div className="min-w-0">
                  <p className="type-label truncate text-ui-text">
                    {hasOpenDraft
                      ? `${selectedFileName} (${t(`tools.knowledgeBank.status.${selectedStatus}`)})`
                      : t('tools.knowledgeBank.files')}
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
                    <span className="type-label">{t('tools.knowledgeBank.fields.title')}</span>
                    <input
                      ref={titleInputRef}
                      className="mt-2 w-full rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-70"
                      value={draft.title}
                      readOnly={!canEdit}
                      onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                      placeholder={t('tools.knowledgeBank.titlePlaceholder')}
                    />
                  </label>
                  <textarea
                    value={draft.bodyMarkdown}
                    readOnly={!canEdit}
                    onChange={(event) => setDraft((current) => ({ ...current, bodyMarkdown: event.target.value }))}
                    className="min-h-[22rem] w-full flex-1 resize-none rounded-lg border border-ui-border bg-ui-bg px-4 py-3 font-mono text-sm leading-6 text-ui-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-70"
                    spellCheck={false}
                    placeholder={t('tools.knowledgeBank.bodyPlaceholder')}
                  />
                </div>
              ) : (
                <div className="flex min-h-[28rem] flex-1 items-center justify-center px-6 text-center">
                  <div className="max-w-sm">
                    <p className="type-row-title">{t('tools.knowledgeBank.noFiles')}</p>
                    <p className="type-caption mt-2 text-ui-text-muted">{t('tools.knowledgeBank.noFilesHelp')}</p>
                    {canEdit && (
                      <Button variant="secondary" size="sm" className="mt-4" onClick={startNewFile}>
                        <FilePlus2 className="h-4 w-4" />
                        {t('tools.knowledgeBank.newFile')}
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
            <Button variant="secondary" size="sm" onClick={resetDraft} disabled={!draftDirty || fileSaving || savingTool}>{t('tools.knowledgeBank.resetChanges')}</Button>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={guardedClose} disabled={fileSaving || savingTool}>{t('tools.knowledgeBank.cancel')}</Button>
              <Button variant="accent" size="sm" onClick={() => void saveFile()} disabled={!hasOpenDraft || fileSaving || !draftDirty || !draft.title.trim()}>
                {fileSaving ? t('common.saving') : t('tools.knowledgeBank.saveChanges')}
              </Button>
            </div>
          </>
        )}
      </div>
      </Dialog>
      {showDiscardDialog && (
        <UnsavedChangesDialog
          title={t('tools.knowledgeBank.discardTitle')}
          body={t('tools.knowledgeBank.discardBody')}
          cancelLabel={t('tools.knowledgeBank.keepEditing')}
          discardLabel={t('tools.knowledgeBank.discardChanges')}
          onCancel={cancelDiscard}
          onDiscard={confirmDiscard}
        />
      )}
    </>
  );
};
