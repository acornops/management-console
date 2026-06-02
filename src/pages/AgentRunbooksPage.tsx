import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Select, SelectOption } from '@/components/common/Select';
import { ICONS } from '@/constants';
import { headerMotion } from '@/lib/motion';
import type { TargetSummary } from '@/services/controlPlaneApi';
import { KubernetesCluster, Workspace } from '@/types';
import { createTranslatedDefaultRunbookTemplates } from '@/pages/runbooks/runbookDefaultTemplates';
import {
  createEmptyRunbookDraft,
  createKubernetesRunbookTarget,
  createManualRunbook,
  createVirtualMachineRunbookTarget,
  deleteRunbookTemplate,
  getDefaultApplicabilityForTarget,
  getNextRunbookTargetId,
  getRunbookVmTargetLimit,
  getRunbookDisabledReason,
  isRunbookCompatibleWithTargetType,
  moveRunbookTemplateBefore,
  persistRunbookTemplates,
  readRunbookTemplates,
  runRunbookWithSelectedTarget,
  updateRunbookTemplate,
  type Runbook,
  type RunbookApplicability,
  type RunbookDraft,
  type RunbookExecutionRequest,
  type RunbookTarget,
  type RunbookTemplateFilter
} from '@/pages/runbooks/runbookModel';
import { listRunbookVmTargetsForWorkspace } from '@/pages/runbooks/runbookVmTargets';

const VM_TARGET_REFRESH_INTERVAL_MS = 30000;

interface AgentRunbooksPageProps {
  workspace: Workspace;
  kubernetesClusters: KubernetesCluster[];
  onRunRunbook: (request: RunbookExecutionRequest) => void;
}

export const AgentRunbooksPage: React.FC<AgentRunbooksPageProps> = ({ workspace, kubernetesClusters, onRunRunbook }) => {
  const { t } = useTranslation();
  const defaultRunbookTemplates = useMemo(
    () => createTranslatedDefaultRunbookTemplates(t),
    [t]
  );
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [vmTargets, setVmTargets] = useState<TargetSummary[]>([]);
  const [vmTargetStatus, setVmTargetStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [templates, setTemplates] = useState<Runbook[]>(() => readRunbookTemplates(workspace.id, defaultRunbookTemplates));
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState(workspace.id);
  const [isCreatingRunbook, setIsCreatingRunbook] = useState(false);
  const [editingRunbookId, setEditingRunbookId] = useState<string | null>(null);
  const [deleteRunbookId, setDeleteRunbookId] = useState<string | null>(null);
  const [templateFilter, setTemplateFilter] = useState<RunbookTemplateFilter>('compatible');
  const [draft, setDraft] = useState<RunbookDraft>(() => createEmptyRunbookDraft());
  const [draggedRunbookId, setDraggedRunbookId] = useState<string | null>(null);
  const [dragOverRunbookId, setDragOverRunbookId] = useState<string | null>(null);
  const vmTargetRequestSeqRef = useRef(0);
  const vmTargetLimit = useMemo(() => getRunbookVmTargetLimit(workspace), [workspace]);

  const runbookTargets = useMemo<RunbookTarget[]>(() => {
    const kubernetesTargets = kubernetesClusters.map((cluster) =>
      createKubernetesRunbookTarget(cluster, {
        disconnected: t('runbooks.targetDisconnectedReason'),
        notInstalled: t('runbooks.targetNotInstalledReason')
      })
    );
    const virtualMachineTargets = vmTargets.map((target) =>
      createVirtualMachineRunbookTarget(target, {
        offline: t('runbooks.vmOfflineReason'),
        degraded: t('runbooks.vmDegradedReason'),
        awaitingAgent: t('runbooks.vmAwaitingAgentReason')
      })
    );
    return [...kubernetesTargets, ...virtualMachineTargets];
  }, [kubernetesClusters, t, vmTargets]);

  const selectedTarget = useMemo(
    () => runbookTargets.find((target) => target.id === selectedTargetId) || null,
    [runbookTargets, selectedTargetId]
  );

  const runnableSelectedTarget = selectedTarget?.runnable ? selectedTarget : null;

  const visibleTemplates = useMemo(
    () =>
      templates.filter((runbook) => {
        if (templateFilter === 'all') return true;
        if (templateFilter === 'kubernetes' || templateFilter === 'virtual_machine') {
          return runbook.applicability === templateFilter || runbook.applicability === 'all';
        }
        return runnableSelectedTarget ? isRunbookCompatibleWithTargetType(runbook, runnableSelectedTarget.targetType) : true;
      }),
    [runnableSelectedTarget, templateFilter, templates]
  );

  const runTargetOptions: Array<SelectOption<string>> = [
    ...runbookTargets.map((target) => ({
      value: target.id,
      label: `${target.name} - ${t(`runbooks.targetTypes.${target.targetType}`)} - ${t(`runbooks.targetStatuses.${target.status}`)}`,
      disabled: !target.runnable
    }))
  ];

  const loadVmTargets = useCallback(async (showLoading: boolean, isCancelled: () => boolean) => {
    const requestSeq = vmTargetRequestSeqRef.current + 1;
    vmTargetRequestSeqRef.current = requestSeq;
    if (showLoading) setVmTargetStatus('loading');
    try {
      const nextTargets = await listRunbookVmTargetsForWorkspace(workspace.id, vmTargetLimit);
      if (isCancelled() || requestSeq !== vmTargetRequestSeqRef.current) return;
      setVmTargets(nextTargets);
      setVmTargetStatus('ready');
    } catch (error) {
      console.error('Failed loading VM runbook targets', error);
      if (isCancelled() || requestSeq !== vmTargetRequestSeqRef.current) return;
      setVmTargets([]);
      setVmTargetStatus('error');
    }
  }, [vmTargetLimit, workspace.id]);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    void loadVmTargets(true, isCancelled);
    const intervalId = window.setInterval(() => {
      void loadVmTargets(false, isCancelled);
    }, VM_TARGET_REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [loadVmTargets]);

  useEffect(() => {
    setTemplates(readRunbookTemplates(workspace.id, defaultRunbookTemplates));
    setLoadedWorkspaceId(workspace.id);
    setSelectedTargetId('');
    setIsCreatingRunbook(false);
    setEditingRunbookId(null);
    setDeleteRunbookId(null);
    setDraft(createEmptyRunbookDraft());
  }, [defaultRunbookTemplates, workspace.id]);

  useEffect(() => {
    setSelectedTargetId((currentSelectedTargetId) => getNextRunbookTargetId(runbookTargets, currentSelectedTargetId));
  }, [runbookTargets]);

  useEffect(() => {
    if (loadedWorkspaceId !== workspace.id) return;
    try {
      persistRunbookTemplates(workspace.id, templates);
    } catch {
      // Runbooks still work for this session if browser storage is unavailable.
    }
  }, [loadedWorkspaceId, templates, workspace.id]);

  const startCreatingRunbook = () => {
    setEditingRunbookId(null);
    setDeleteRunbookId(null);
    setDraft(createEmptyRunbookDraft(getDefaultApplicabilityForTarget(runnableSelectedTarget)));
    setIsCreatingRunbook(true);
  };

  const startEditingRunbook = (runbook: Runbook) => {
    setIsCreatingRunbook(false);
    setDeleteRunbookId(null);
    setEditingRunbookId(runbook.id);
    setDraft({
      title: runbook.title,
      description: runbook.description,
      prompt: runbook.prompt,
      applicability: runbook.applicability
    });
  };

  const closeTemplateForm = () => {
    setDraft(createEmptyRunbookDraft(getDefaultApplicabilityForTarget(runnableSelectedTarget)));
    setIsCreatingRunbook(false);
    setEditingRunbookId(null);
  };

  const handleTemplateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingRunbookId) {
      const title = draft.title.trim();
      const prompt = draft.prompt.trim();
      if (!title || !prompt) return;
      setTemplates((currentTemplates) =>
        updateRunbookTemplate(currentTemplates, editingRunbookId, draft, t('runbooks.manualDescriptionFallback')) || currentTemplates
      );
      closeTemplateForm();
      return;
    }

    const runbook = createManualRunbook(draft, t('runbooks.manualDescriptionFallback'));
    if (!runbook) return;

    setTemplates((currentRunbooks) => [...currentRunbooks, runbook]);
    closeTemplateForm();
  };

  const openDeleteRunbook = (runbook: Runbook) => {
    setIsCreatingRunbook(false);
    setEditingRunbookId(null);
    setDeleteRunbookId(runbook.id);
  };

  const confirmDeleteRunbook = (runbook: Runbook) => {
    setTemplates((currentRunbooks) => deleteRunbookTemplate(currentRunbooks, runbook.id));
    setDeleteRunbookId(null);
    if (editingRunbookId === runbook.id) closeTemplateForm();
  };

  const handleRunbook = (runbook: Runbook) => {
    runRunbookWithSelectedTarget(runbookTargets, selectedTargetId, runbook, onRunRunbook);
  };

  const clearRunbookDragState = () => {
    setDraggedRunbookId(null);
    setDragOverRunbookId(null);
  };

  const handleRunbookDragStart = (event: React.DragEvent<HTMLButtonElement>, runbookId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', runbookId);
    setDraggedRunbookId(runbookId);
    setDragOverRunbookId(null);
  };

  const handleRunbookDragOver = (event: React.DragEvent<HTMLElement>, targetRunbookId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverRunbookId(targetRunbookId === draggedRunbookId ? null : targetRunbookId);
  };

  const handleRunbookDragLeave = (event: React.DragEvent<HTMLElement>, targetRunbookId: string) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setDragOverRunbookId((currentRunbookId) => currentRunbookId === targetRunbookId ? null : currentRunbookId);
  };

  const handleRunbookDrop = (event: React.DragEvent<HTMLElement>, targetRunbookId: string) => {
    event.preventDefault();
    const sourceRunbookId = event.dataTransfer.getData('text/plain') || draggedRunbookId;
    clearRunbookDragState();
    if (!sourceRunbookId) return;
    setTemplates((currentTemplates) => moveRunbookTemplateBefore(currentTemplates, sourceRunbookId, targetRunbookId));
  };

  const formIsOpen = isCreatingRunbook;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <motion.header {...headerMotion} className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="type-route-title">{t('runbooks.title')}</h1>
          <p className="type-body mt-2 max-w-2xl">{t('runbooks.summaryFor')}</p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:max-w-2xl lg:justify-end">
          <Button onClick={startCreatingRunbook} variant="accent" size="md" className="whitespace-nowrap">
            <ICONS.Plus className="h-4 w-4" />
            {t('runbooks.createRunbook')}
          </Button>
          <Button
            disabled
            variant="secondary"
            size="md"
            className="whitespace-nowrap opacity-60"
            title={t('runbooks.generateRunbookUnavailable')}
          >
            <ICONS.Zap className="h-4 w-4" />
            {t('runbooks.generateRunbook')}
          </Button>
        </div>
      </motion.header>

      <AnimatePresence>
      {formIsOpen && (
        <motion.form
          onSubmit={handleTemplateSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="mb-6 rounded-lg border border-ui-border bg-ui-surface p-5"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="type-panel-title">{editingRunbookId ? t('runbooks.editTitle') : t('runbooks.createTitle')}</h2>
              <p className="type-body mt-1">{t('runbooks.createBody')}</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="type-label">{t('runbooks.nameLabel')}</span>
              <input
                value={draft.title}
                onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, title: event.target.value }))}
                className="mt-2 w-full rounded-md border border-ui-border bg-ui-bg px-4 py-3 text-sm font-medium text-ui-text outline-none transition-colors placeholder:text-ui-text-muted/60 focus:border-accent/40"
                placeholder={t('runbooks.namePlaceholder')}
                required
              />
            </label>
            <label className="block">
              <span className="type-label">{t('runbooks.descriptionLabel')}</span>
              <input
                value={draft.description}
                onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))}
                className="mt-2 w-full rounded-md border border-ui-border bg-ui-bg px-4 py-3 text-sm font-medium text-ui-text outline-none transition-colors placeholder:text-ui-text-muted/60 focus:border-accent/40"
                placeholder={t('runbooks.descriptionPlaceholder')}
              />
            </label>
            <label className="block lg:col-span-2">
              <span className="type-label">{t('runbooks.applicabilityLabel')}</span>
              <Select<RunbookApplicability>
                ariaLabel={t('runbooks.applicabilityLabel')}
                value={draft.applicability}
                options={[
                  { value: 'kubernetes', label: t('runbooks.applicability.kubernetes') },
                  { value: 'virtual_machine', label: t('runbooks.applicability.virtual_machine') },
                  { value: 'all', label: t('runbooks.applicability.all') }
                ]}
                onChange={(applicability) => setDraft((currentDraft) => ({ ...currentDraft, applicability }))}
                size="sm"
                className="mt-2 max-w-sm"
              />
            </label>
            <label className="block lg:col-span-2">
              <span className="type-label">{t('runbooks.promptLabel')}</span>
              <textarea
                value={draft.prompt}
                onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, prompt: event.target.value }))}
                className="mt-2 min-h-32 w-full resize-y rounded-md border border-ui-border bg-ui-bg px-4 py-3 text-sm font-medium leading-6 text-ui-text outline-none transition-colors placeholder:text-ui-text-muted/60 focus:border-accent/40"
                placeholder={t('runbooks.promptPlaceholder')}
                required
              />
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button onClick={closeTemplateForm} variant="secondary" size="md">
              {t('runbooks.cancel')}
            </Button>
            <Button type="submit" variant="primary" size="md">
              <ICONS.CheckCircle2 className="h-4 w-4" />
              {editingRunbookId ? t('runbooks.saveChanges') : t('runbooks.saveRunbook')}
            </Button>
          </div>
        </motion.form>
      )}
      </AnimatePresence>

      <div className="mb-5 flex flex-col gap-4 border-y border-ui-border bg-ui-surface/60 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label className="type-label" htmlFor="runbook-target">
            {t('runbooks.runTarget')}
          </label>
          <Select<string>
            id="runbook-target"
            ariaLabel={t('runbooks.runTarget')}
            value={selectedTargetId}
            options={runTargetOptions}
            onChange={setSelectedTargetId}
            size="sm"
            className="min-w-0 sm:min-w-80"
            placeholder={t('runbooks.selectRunTarget')}
          />
        </div>
        <div className="flex flex-col gap-1 lg:items-end">
          {!runnableSelectedTarget && (
            <p className="type-body">
              {vmTargetStatus === 'error' ? t('runbooks.vmTargetsLoadFailed') : t('runbooks.targetHelper')}
            </p>
          )}
          {vmTargetStatus === 'loading' && <p className="type-caption">{t('runbooks.loadingVmTargets')}</p>}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['compatible', 'all', 'kubernetes', 'virtual_machine'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            aria-pressed={templateFilter === filter}
            onClick={() => setTemplateFilter(filter)}
            className={`type-ui rounded-md border px-3 py-2 transition-colors ${
              templateFilter === filter
                ? 'border-accent/40 bg-accent-soft text-accent-strong'
                : 'border-ui-border bg-ui-surface text-ui-text-muted hover:border-accent/30 hover:text-ui-text'
            }`}
          >
            {t(`runbooks.filters.${filter}`)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
        {visibleTemplates.length === 0 && (
          <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="type-panel-title">{t('runbooks.emptyTemplatesTitle')}</h2>
              <p className="type-body mt-1">{t('runbooks.emptyTemplatesBody')}</p>
            </div>
            <Button onClick={startCreatingRunbook} variant="secondary" size="md" className="whitespace-nowrap">
              <ICONS.Plus className="h-4 w-4" />
              {t('runbooks.createRunbook')}
            </Button>
          </div>
        )}
        {visibleTemplates.map((runbook) => {
          const disabledReason = getRunbookDisabledReason(runbook, selectedTarget, {
            noTarget: t('runbooks.disabledNoTarget'),
            targetUnavailable: t('runbooks.disabledTargetUnavailable'),
            kubernetesOnly: t('runbooks.disabledKubernetesOnly'),
            vmOnly: t('runbooks.disabledVmOnly')
          });
          const isDropTarget = dragOverRunbookId === runbook.id && draggedRunbookId !== runbook.id;
          return (
            <article
              key={runbook.id}
              onDragOver={(event) => handleRunbookDragOver(event, runbook.id)}
              onDragLeave={(event) => handleRunbookDragLeave(event, runbook.id)}
              onDrop={(event) => handleRunbookDrop(event, runbook.id)}
              onDragEnd={clearRunbookDragState}
              className={`relative grid grid-cols-[max-content_minmax(0,1fr)] gap-x-5 gap-y-4 border-b border-ui-border p-5 transition-colors last:border-b-0 xl:grid-cols-[max-content_minmax(14rem,0.65fr)_minmax(30rem,1.4fr)_max-content] xl:items-start ${
                draggedRunbookId === runbook.id ? 'bg-accent-soft/45' : ''
              } ${
                isDropTarget
                  ? 'bg-accent-soft/60 before:absolute before:left-4 before:right-4 before:top-0 before:h-1 before:rounded-full before:bg-accent before:content-[""]'
                  : ''
              }`}
            >
              <button
                type="button"
                draggable
                onDragStart={(event) => handleRunbookDragStart(event, runbook.id)}
                className="self-center cursor-grab rounded-md border border-ui-border bg-ui-bg p-2 text-ui-text-muted transition-colors hover:border-accent/30 hover:bg-accent-soft hover:text-accent-strong active:cursor-grabbing focus-visible:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/15"
                aria-label={t('runbooks.reorderRunbook', { name: runbook.title })}
                title={t('runbooks.reorderRunbook', { name: runbook.title })}
              >
                <ICONS.GripVertical className="h-4 w-4" />
              </button>

              <div className="min-w-0">
                <h2 className="type-panel-title min-w-0 break-words">{runbook.title}</h2>
                <p className="type-caption mt-0.5">{runbook.description}</p>
                <div className="type-caption mt-2 flex flex-wrap items-center gap-2">
                  <ICONS.BookOpen className="h-4 w-4" />
                  <span className="rounded-full bg-ui-bg px-2.5 py-1">
                    {t(`runbooks.applicability.${runbook.applicability}`)}
                  </span>
                  {runbook.applicability === 'virtual_machine' && (
                    <span className="rounded-full bg-ui-bg px-2.5 py-1">{t('runbooks.readOnly')}</span>
                  )}
                </div>
              </div>

              <div className="col-span-2 min-w-0 border-t border-ui-border pt-4 xl:col-span-1 xl:border-t-0 xl:pt-0" aria-label={t('runbooks.promptLabel')}>
                <div className="flex min-w-0 items-start gap-3">
                  <p className="type-body min-w-0 flex-1 break-words">{runbook.prompt}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEditingRunbook(runbook)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-ui-text-muted transition-colors hover:border-accent/30 hover:bg-accent-soft hover:text-accent-strong focus-visible:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/15"
                      aria-label={t('runbooks.editRunbook', { name: runbook.title })}
                      title={t('runbooks.editRunbook', { name: runbook.title })}
                    >
                      <ICONS.Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteRunbook(runbook)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-ui-text-muted transition-colors hover:border-rose-200 hover:bg-status-danger-soft hover:text-status-danger-text focus-visible:border-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-100"
                      aria-label={t('runbooks.deleteRunbook', { name: runbook.title })}
                      title={t('runbooks.deleteRunbook', { name: runbook.title })}
                    >
                      <ICONS.Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-span-2 flex flex-col gap-2 xl:col-span-1 xl:self-start">
                <button
                  type="button"
                  onClick={() => handleRunbook(runbook)}
                  disabled={Boolean(disabledReason)}
                  className="type-ui flex w-full items-center justify-center gap-2 rounded-md border border-ui-border bg-ui-bg px-4 py-3 text-ui-text transition-colors hover:border-ui-text-muted/40 hover:bg-ui-surface disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto"
                >
                  <ICONS.Terminal className="h-4 w-4" />
                  {runnableSelectedTarget
                    ? isRunbookCompatibleWithTargetType(runbook, runnableSelectedTarget.targetType)
                      ? t('runbooks.runForTarget', { name: runnableSelectedTarget.name })
                      : t('runbooks.notAvailableForTarget', { type: t(`runbooks.targetTypes.${runnableSelectedTarget.targetType}`) })
                    : t('runbooks.selectTargetToRun')}
                </button>
                {disabledReason && <p className="type-caption max-w-56 text-left xl:text-right">{disabledReason}</p>}
              </div>

              <AnimatePresence>
              {editingRunbookId === runbook.id && (
                <motion.form
                  data-runbook-inline-editor="true"
                  onSubmit={handleTemplateSubmit}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16 }}
                  className="col-span-2 rounded-lg border border-ui-border bg-ui-bg p-4 xl:col-span-4"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="type-row-title">{t('runbooks.editTitle')}</h3>
                      <p className="type-caption mt-1">{runbook.title}</p>
                    </div>
                    <Button onClick={closeTemplateForm} variant="tertiary" size="sm">
                      {t('runbooks.cancel')}
                    </Button>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="block">
                      <span className="type-label">{t('runbooks.nameLabel')}</span>
                      <input
                        value={draft.title}
                        onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, title: event.target.value }))}
                        className="mt-2 w-full rounded-md border border-ui-border bg-ui-surface px-4 py-3 text-sm font-medium text-ui-text outline-none transition-colors placeholder:text-ui-text-muted/60 focus:border-accent/40"
                        placeholder={t('runbooks.namePlaceholder')}
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="type-label">{t('runbooks.descriptionLabel')}</span>
                      <input
                        value={draft.description}
                        onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))}
                        className="mt-2 w-full rounded-md border border-ui-border bg-ui-surface px-4 py-3 text-sm font-medium text-ui-text outline-none transition-colors placeholder:text-ui-text-muted/60 focus:border-accent/40"
                        placeholder={t('runbooks.descriptionPlaceholder')}
                      />
                    </label>
                    <label className="block lg:col-span-2">
                      <span className="type-label">{t('runbooks.applicabilityLabel')}</span>
                      <Select<RunbookApplicability>
                        ariaLabel={t('runbooks.applicabilityLabel')}
                        value={draft.applicability}
                        options={[
                          { value: 'kubernetes', label: t('runbooks.applicability.kubernetes') },
                          { value: 'virtual_machine', label: t('runbooks.applicability.virtual_machine') },
                          { value: 'all', label: t('runbooks.applicability.all') }
                        ]}
                        onChange={(applicability) => setDraft((currentDraft) => ({ ...currentDraft, applicability }))}
                        size="sm"
                        className="mt-2 max-w-sm"
                      />
                    </label>
                    <label className="block lg:col-span-2">
                      <span className="type-label">{t('runbooks.promptLabel')}</span>
                      <textarea
                        value={draft.prompt}
                        onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, prompt: event.target.value }))}
                        className="mt-2 min-h-28 w-full resize-y rounded-md border border-ui-border bg-ui-surface px-4 py-3 text-sm font-medium leading-6 text-ui-text outline-none transition-colors placeholder:text-ui-text-muted/60 focus:border-accent/40"
                        placeholder={t('runbooks.promptPlaceholder')}
                        required
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex justify-end gap-3">
                    <Button onClick={closeTemplateForm} variant="secondary" size="sm">
                      {t('runbooks.cancel')}
                    </Button>
                    <Button type="submit" variant="primary" size="sm">
                      <ICONS.CheckCircle2 className="h-4 w-4" />
                      {t('runbooks.saveChanges')}
                    </Button>
                  </div>
                </motion.form>
              )}
              </AnimatePresence>

              <AnimatePresence>
              {deleteRunbookId === runbook.id && (
                <motion.div
                  data-runbook-inline-delete="true"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16 }}
                  className="col-span-2 flex flex-col gap-3 rounded-lg border border-status-danger/25 bg-status-danger-soft p-4 text-status-danger-text xl:col-span-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="type-caption min-w-0 text-status-danger-text">
                    {t('runbooks.confirmDelete', { name: runbook.title })}
                  </p>
                  <div className="flex shrink-0 justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setDeleteRunbookId(null)}>
                      {t('runbooks.cancel')}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => confirmDeleteRunbook(runbook)}>
                      <ICONS.Trash2 className="h-4 w-4" />
                      {t('runbooks.delete')}
                    </Button>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </article>
          );
        })}
      </div>
    </div>
  );
};
