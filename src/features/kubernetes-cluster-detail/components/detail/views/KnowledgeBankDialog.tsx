import React from 'react';
import { AlertTriangle, Download, Plus, RotateCcw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Dialog } from '@/components/common/Dialog';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type {
  ControlPlaneKnowledgeBankCatalog,
  ControlPlaneKnowledgeBankEntry,
  ControlPlaneTargetToolItem,
  ControlPlaneWorkspaceAuditEvent
} from '@/services/controlPlaneApi';
import type { WorkspaceAiSettings } from '@/types';
import { formatError } from '@/features/kubernetes-cluster-detail/components/detail/views/targetSkillsViewModel';

type Tab = 'entries' | 'activity' | 'settings';

interface KnowledgeBankDialogProps {
  workspaceId: string;
  targetId: string;
  tool: ControlPlaneTargetToolItem;
  canEdit: boolean;
  savingTool: boolean;
  onClose: () => void;
  onToolUpdated: (tool: ControlPlaneTargetToolItem) => void;
}

interface EntryDraft {
  title: string;
  status: ControlPlaneKnowledgeBankEntry['status'];
  tagsText: string;
  evidenceSummary: string;
  bodyMarkdown: string;
  observationCount: number;
  confidence: number;
}

interface SettingsDraft {
  enabled: boolean;
  idleCheckpointDelayMinutes: number;
  minimumObservationsBeforeGeneralization: number;
  maxSnippetsPerRetrieval: number;
  maxSnippetSizeBytes: number;
  checkpointModelMode: 'workspace_default' | 'custom';
  provider: WorkspaceAiSettings['defaultProvider'];
  model: string;
}

type LearningReadiness = NonNullable<ControlPlaneTargetToolItem['readiness']>;

function entryDraft(entry: ControlPlaneKnowledgeBankEntry | null): EntryDraft {
  return {
    title: entry?.title || '',
    status: entry?.status || 'active',
    tagsText: (entry?.tags || []).join(', '),
    evidenceSummary: entry?.evidenceSummary || '',
    bodyMarkdown: entry?.bodyMarkdown || '',
    observationCount: entry?.observationCount || 0,
    confidence: entry?.confidence || 0.5
  };
}

function parseTags(value: string): string[] {
  return [...new Set(value.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 32);
}

function pauseReasonKey(reason: ControlPlaneTargetToolItem['readiness'] extends infer R ? R extends { learningPausedReason: infer P } ? P : never : never): string {
  if (reason === 'ai_settings_missing') return 'tools.knowledgeBank.pause.aiSettingsMissing';
  if (reason === 'provider_not_allowed') return 'tools.knowledgeBank.pause.providerNotAllowed';
  if (reason === 'model_not_allowed') return 'tools.knowledgeBank.pause.modelNotAllowed';
  return 'tools.knowledgeBank.pause.ready';
}

function resolveLearningReadiness(tool: ControlPlaneTargetToolItem, aiSettings: WorkspaceAiSettings | null): LearningReadiness | undefined {
  if (!aiSettings) return tool.readiness;
  const checkpointModel = tool.config.learning?.checkpointModel;
  const provider = checkpointModel?.mode === 'custom' && checkpointModel.provider
    ? checkpointModel.provider
    : aiSettings.defaultProvider;
  const model = checkpointModel?.mode === 'custom' && checkpointModel.model
    ? checkpointModel.model
    : aiSettings.defaultModel;
  if (!aiSettings.allowedProviders.includes(provider)) {
    return { learningAvailable: false, learningPausedReason: 'provider_not_allowed' };
  }
  if (!aiSettings.allowedModels.includes(model) || !(aiSettings.allowedProviderModels[provider] || []).includes(model)) {
    return { learningAvailable: false, learningPausedReason: 'model_not_allowed' };
  }
  const providerStatus = aiSettings.providers.find((item) => item.provider === provider);
  if (!providerStatus?.configured) {
    return { learningAvailable: false, learningPausedReason: 'ai_settings_missing' };
  }
  return { learningAvailable: true, learningPausedReason: null };
}

function settingsDraftFromTool(tool: ControlPlaneTargetToolItem): SettingsDraft {
  const checkpointModel = tool.config.learning?.checkpointModel;
  return {
    enabled: tool.enabled,
    idleCheckpointDelayMinutes: tool.config.learning?.idleCheckpointDelayMinutes || 30,
    minimumObservationsBeforeGeneralization: tool.config.learning?.minimumObservationsBeforeGeneralization || 3,
    maxSnippetsPerRetrieval: tool.config.retrieval?.maxSnippetsPerRetrieval || 4,
    maxSnippetSizeBytes: tool.config.retrieval?.maxSnippetSizeBytes || 1536,
    checkpointModelMode: checkpointModel?.mode === 'custom' ? 'custom' : 'workspace_default',
    provider: checkpointModel?.provider || 'openai',
    model: checkpointModel?.model || ''
  };
}

export const KnowledgeBankDialog: React.FC<KnowledgeBankDialogProps> = ({
  workspaceId,
  targetId,
  tool,
  canEdit,
  savingTool,
  onClose,
  onToolUpdated
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<Tab>('entries');
  const [catalog, setCatalog] = React.useState<ControlPlaneKnowledgeBankCatalog | null>(null);
  const [activity, setActivity] = React.useState<ControlPlaneWorkspaceAuditEvent[]>([]);
  const [aiSettings, setAiSettings] = React.useState<WorkspaceAiSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [selectedEntryId, setSelectedEntryId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<EntryDraft>(() => entryDraft(null));
  const [entrySaving, setEntrySaving] = React.useState(false);
  const [settingsSaving, setSettingsSaving] = React.useState(false);
  const [entrySearch, setEntrySearch] = React.useState('');
  const [settingsDraft, setSettingsDraft] = React.useState<SettingsDraft>(() => settingsDraftFromTool(tool));

  const selectedEntry = React.useMemo(
    () => catalog?.items.find((entry) => entry.id === selectedEntryId) || null,
    [catalog, selectedEntryId]
  );
  const filteredEntries = React.useMemo(() => {
    const entries = catalog?.items || [];
    const query = entrySearch.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => [
      entry.title,
      entry.status,
      entry.evidenceSummary,
      entry.bodyMarkdown,
      ...(entry.tags || [])
    ].join(' ').toLowerCase().includes(query));
  }, [catalog, entrySearch]);
  const selectableModels = aiSettings?.allowedProviderModels[settingsDraft.provider as keyof WorkspaceAiSettings['allowedProviderModels']] || [];
  const learningReadiness = React.useMemo(() => resolveLearningReadiness(tool, aiSettings), [aiSettings, tool]);
  const numericSettingsFields: Array<{
    key: 'idleCheckpointDelayMinutes' | 'maxSnippetsPerRetrieval' | 'maxSnippetSizeBytes' | 'minimumObservationsBeforeGeneralization';
    label: string;
    min: number;
    max: number;
    step: number;
  }> = [
    {
      key: 'idleCheckpointDelayMinutes',
      label: t('tools.knowledgeBank.fields.idleCheckpointDelay'),
      min: 5,
      max: 1440,
      step: 5
    },
    {
      key: 'maxSnippetsPerRetrieval',
      label: t('tools.knowledgeBank.fields.maxSnippets'),
      min: 1,
      max: 8,
      step: 1
    },
    {
      key: 'maxSnippetSizeBytes',
      label: t('tools.knowledgeBank.fields.maxSnippetSize'),
      min: 512,
      max: 4096,
      step: 128
    },
    {
      key: 'minimumObservationsBeforeGeneralization',
      label: t('tools.knowledgeBank.fields.observationsBeforeGeneralization'),
      min: 2,
      max: 10,
      step: 1
    }
  ];

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [entries, settings] = await Promise.all([
        controlPlaneApi.listKnowledgeBankEntries(workspaceId, targetId, { limit: 100 }),
        controlPlaneApi.getWorkspaceAiSettings(workspaceId).catch(() => null)
      ]);
      setCatalog(entries);
      setAiSettings(settings);
      const first = entries.items[0] || null;
      setSelectedEntryId(first?.id || null);
      setDraft(entryDraft(first));
    } catch (err) {
      setError(formatError(err, t('tools.knowledgeBank.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [targetId, t, workspaceId]);

  const loadActivity = React.useCallback(async () => {
    try {
      const body = await controlPlaneApi.listKnowledgeBankActivity(workspaceId, targetId);
      setActivity(body.items || []);
    } catch {
      setActivity([]);
    }
  }, [targetId, workspaceId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setSettingsDraft(settingsDraftFromTool(tool));
  }, [tool]);

  React.useEffect(() => {
    if (tab === 'activity') void loadActivity();
  }, [loadActivity, tab]);

  const selectEntry = (entry: ControlPlaneKnowledgeBankEntry) => {
    setSelectedEntryId(entry.id);
    setDraft(entryDraft(entry));
  };

  const startNewEntry = () => {
    setSelectedEntryId(null);
    setDraft(entryDraft(null));
  };

  const saveEntry = async () => {
    if (!canEdit || !draft.title.trim()) return;
    setEntrySaving(true);
    setError('');
    const input = {
      title: draft.title.trim(),
      status: draft.status,
      bodyMarkdown: draft.bodyMarkdown,
      tags: parseTags(draft.tagsText),
      evidenceSummary: draft.evidenceSummary,
      observationCount: draft.observationCount,
      confidence: draft.confidence
    };
    try {
      const saved = selectedEntry
        ? await controlPlaneApi.updateKnowledgeBankEntry(workspaceId, targetId, selectedEntry.id, input)
        : await controlPlaneApi.createKnowledgeBankEntry(workspaceId, targetId, input);
      setCatalog((current) => current ? {
        ...current,
        items: selectedEntry
          ? current.items.map((entry) => entry.id === saved.id ? saved : entry)
          : [saved, ...current.items]
      } : current);
      setSelectedEntryId(saved.id);
      setDraft(entryDraft(saved));
    } catch (err) {
      setError(formatError(err, t('tools.knowledgeBank.saveEntryFailed')));
    } finally {
      setEntrySaving(false);
    }
  };

  const archiveEntry = async () => {
    if (!canEdit || !selectedEntry) return;
    setEntrySaving(true);
    setError('');
    try {
      const saved = await controlPlaneApi.archiveKnowledgeBankEntry(workspaceId, targetId, selectedEntry.id);
      setCatalog((current) => current ? {
        ...current,
        items: current.items.map((entry) => entry.id === saved.id ? saved : entry)
      } : current);
      setDraft(entryDraft(saved));
    } catch (err) {
      setError(formatError(err, t('tools.knowledgeBank.archiveFailed')));
    } finally {
      setEntrySaving(false);
    }
  };

  const saveSettings = async () => {
    if (!canEdit) return;
    setSettingsSaving(true);
    setError('');
    try {
      const checkpointModel = settingsDraft.checkpointModelMode === 'custom'
        ? { mode: 'custom' as const, provider: settingsDraft.provider as 'openai' | 'anthropic' | 'gemini', model: settingsDraft.model || selectableModels[0] || '' }
        : { mode: 'workspace_default' as const };
      const updated = await controlPlaneApi.updateTargetTool(workspaceId, targetId, tool.id, {
        enabled: settingsDraft.enabled,
        config: {
          learning: {
            idleCheckpointDelayMinutes: settingsDraft.idleCheckpointDelayMinutes,
            minimumObservationsBeforeGeneralization: settingsDraft.minimumObservationsBeforeGeneralization,
            checkpointModel
          },
          retrieval: {
            maxSnippetsPerRetrieval: settingsDraft.maxSnippetsPerRetrieval,
            maxSnippetSizeBytes: settingsDraft.maxSnippetSizeBytes
          }
        }
      });
      onToolUpdated(updated);
    } catch (err) {
      setError(formatError(err, t('tools.knowledgeBank.saveSettingsFailed')));
    } finally {
      setSettingsSaving(false);
    }
  };

  const resetBank = async () => {
    if (!canEdit || !window.confirm(t('tools.knowledgeBank.resetConfirm'))) return;
    setSettingsSaving(true);
    setError('');
    try {
      await controlPlaneApi.resetKnowledgeBank(workspaceId, targetId);
      await load();
    } catch (err) {
      setError(formatError(err, t('tools.knowledgeBank.resetFailed')));
    } finally {
      setSettingsSaving(false);
    }
  };

  const exportBank = async () => {
    setError('');
    try {
      const text = await controlPlaneApi.exportKnowledgeBank(workspaceId, targetId);
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `knowledge-bank-${targetId}.md`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(formatError(err, t('tools.knowledgeBank.exportFailed')));
    }
  };

  return (
    <Dialog
      titleId="knowledge-bank-dialog-title"
      closeDisabled={entrySaving || settingsSaving || savingTool}
      onClose={onClose}
      className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-2xl"
    >
      <div className="border-b border-ui-border bg-ui-bg px-6 py-4">
        <h3 id="knowledge-bank-dialog-title" className="type-panel-title">{t('tools.knowledgeBank.title')}</h3>
        <p className="type-caption mt-1 text-ui-text-muted">{tool.description}</p>
        {learningReadiness && !learningReadiness.learningAvailable && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-status-warning/25 bg-status-warning-soft px-3 py-2 text-sm text-status-warning-text">
            <AlertTriangle className="h-4 w-4" />
            {t(pauseReasonKey(learningReadiness.learningPausedReason))}
          </div>
        )}
      </div>
      <div className="flex gap-2 border-b border-ui-border px-6 py-3">
        {(['entries', 'activity', 'settings'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-md px-3 py-2 text-sm font-semibold capitalize transition-colors ${
              tab === item ? 'bg-accent-soft text-accent-strong' : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
            }`}
          >
            {t(`tools.knowledgeBank.tabs.${item}`)}
          </button>
        ))}
      </div>
      {error && (
        <div className="type-caption mx-6 mt-4 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex min-h-[30rem] items-center justify-center">
          <InlineLoadingIndicator label={t('tools.knowledgeBank.loading')} />
        </div>
      ) : tab === 'entries' ? (
        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-r border-ui-border bg-ui-bg p-4">
            <Button variant="secondary" size="sm" onClick={startNewEntry} disabled={!canEdit || entrySaving} className="mb-3 w-full justify-center">
              <Plus className="h-4 w-4" />
              {t('tools.knowledgeBank.newEntry')}
            </Button>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
              <input
                type="text"
                value={entrySearch}
                onChange={(event) => setEntrySearch(event.target.value)}
                aria-label={t('tools.knowledgeBank.searchEntries')}
                placeholder={t('tools.knowledgeBank.searchEntries')}
                className="w-full rounded-md border border-ui-border bg-ui-surface py-2 pl-9 pr-3 text-sm text-ui-text outline-none transition-colors placeholder:text-ui-text-muted/60 focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
              />
            </div>
            <div className="space-y-2">
              {filteredEntries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => selectEntry(entry)}
                  className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                    entry.id === selectedEntryId ? 'border-accent/40 bg-accent-soft text-ui-text' : 'border-ui-border bg-ui-surface text-ui-text-muted hover:text-ui-text'
                  }`}
                >
                  <span className="block truncate text-sm font-semibold">{entry.title}</span>
                  <span className="type-caption mt-1 block">{t(`tools.knowledgeBank.status.${entry.status}`)}</span>
                </button>
              ))}
              {filteredEntries.length === 0 && (
                <p className="type-caption px-2 py-4 text-ui-text-muted">
                  {entrySearch.trim() ? t('tools.knowledgeBank.noEntryMatches') : t('tools.knowledgeBank.noEntries')}
                </p>
              )}
            </div>
          </aside>
          <section className="min-h-0 overflow-y-auto p-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem_8rem]">
              <label className="block">
                <span className="type-label">{t('tools.knowledgeBank.fields.title')}</span>
                <input className="mt-2 w-full rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15" value={draft.title} readOnly={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label className="block">
                <span className="type-label">{t('tools.knowledgeBank.fields.status')}</span>
                <select className="mt-2 h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm outline-none" value={draft.status} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as EntryDraft['status'] }))}>
                  <option value="active">{t('tools.knowledgeBank.status.active')}</option>
                  <option value="pending">{t('tools.knowledgeBank.status.pending')}</option>
                  <option value="archived">{t('tools.knowledgeBank.status.archived')}</option>
                </select>
              </label>
              <label className="block">
                <span className="type-label">{t('tools.knowledgeBank.fields.confidence')}</span>
                <input type="number" min={0} max={1} step={0.05} className="mt-2 h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm outline-none" value={draft.confidence} readOnly={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, confidence: Number(event.target.value) }))} />
              </label>
            </div>
            <label className="mt-4 block">
              <span className="type-label">{t('tools.knowledgeBank.fields.tags')}</span>
              <input className="mt-2 w-full rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15" value={draft.tagsText} readOnly={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, tagsText: event.target.value }))} />
            </label>
            <label className="mt-4 block">
              <span className="type-label">{t('tools.knowledgeBank.fields.evidenceSummary')}</span>
              <textarea rows={3} className="mt-2 w-full resize-y rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15" value={draft.evidenceSummary} readOnly={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, evidenceSummary: event.target.value }))} />
            </label>
            <label className="mt-4 block">
              <span className="type-label">{t('tools.knowledgeBank.fields.bodyMarkdown')}</span>
              <textarea rows={14} className="mt-2 w-full resize-y rounded-md border border-ui-border bg-ui-bg px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15" value={draft.bodyMarkdown} readOnly={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, bodyMarkdown: event.target.value }))} />
            </label>
          </section>
        </div>
      ) : tab === 'activity' ? (
        <div className="min-h-[30rem] flex-1 overflow-y-auto p-6">
          <div className="divide-y divide-ui-border rounded-lg border border-ui-border">
            {activity.length > 0 ? activity.map((event) => (
              <div key={event.id} className="px-4 py-3">
                <p className="text-sm font-semibold text-ui-text">{event.summary}</p>
                <p className="type-caption mt-1 text-ui-text-muted">{event.eventType} · {new Date(event.occurredAt).toLocaleString()}</p>
              </div>
            )) : (
              <p className="type-caption px-4 py-6 text-ui-text-muted">{t('tools.knowledgeBank.noActivity')}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-[30rem] flex-1 overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex min-h-10 items-center gap-3 rounded-md border border-ui-border bg-ui-bg px-3 py-2">
              <input
                type="checkbox"
                checked={settingsDraft.enabled}
                disabled={!canEdit || settingsSaving}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, enabled: event.target.checked }))}
                className="h-4 w-4 rounded border-ui-border text-accent focus:ring-accent/20"
              />
              <span className="type-label">{t('tools.knowledgeBank.fields.enabled')}</span>
            </label>
            <label className="block">
              <span className="type-label">{t('tools.knowledgeBank.fields.checkpointModel')}</span>
              <select className="mt-2 h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm outline-none" value={settingsDraft.checkpointModelMode} disabled={!canEdit || settingsSaving} onChange={(event) => setSettingsDraft((current) => ({ ...current, checkpointModelMode: event.target.value as typeof current.checkpointModelMode }))}>
                <option value="workspace_default">{t('tools.knowledgeBank.model.workspaceDefault')}</option>
                <option value="custom">{t('tools.knowledgeBank.model.custom')}</option>
              </select>
            </label>
            {settingsDraft.checkpointModelMode === 'custom' && (
              <label className="block">
                <span className="type-label">{t('tools.knowledgeBank.fields.provider')}</span>
                <select className="mt-2 h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm outline-none" value={settingsDraft.provider} disabled={!canEdit || settingsSaving} onChange={(event) => setSettingsDraft((current) => ({ ...current, provider: event.target.value as typeof current.provider, model: '' }))}>
                  {(aiSettings?.allowedProviders || ['openai', 'anthropic', 'gemini']).map((provider) => <option key={provider} value={provider}>{provider}</option>)}
                </select>
              </label>
            )}
            {settingsDraft.checkpointModelMode === 'custom' && (
              <label className="block">
                <span className="type-label">{t('tools.knowledgeBank.fields.model')}</span>
                <select className="mt-2 h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm outline-none" value={settingsDraft.model || selectableModels[0] || ''} disabled={!canEdit || settingsSaving} onChange={(event) => setSettingsDraft((current) => ({ ...current, model: event.target.value }))}>
                  {selectableModels.map((model) => <option key={model} value={model}>{model}</option>)}
                </select>
              </label>
            )}
            {numericSettingsFields.map((field) => (
              <label key={field.key} className="block">
                <span className="type-label">{field.label}</span>
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  className="mt-2 h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm outline-none"
                  value={settingsDraft[field.key]}
                  readOnly={!canEdit}
                  disabled={settingsSaving}
                  onChange={(event) => setSettingsDraft((current) => ({ ...current, [field.key]: Number(event.target.value) }))}
                />
              </label>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void exportBank()}>
              <Download className="h-4 w-4" />
              {t('tools.knowledgeBank.export')}
            </Button>
            <Button variant="tertiary" onClick={() => void resetBank()} disabled={!canEdit || settingsSaving}>
              <RotateCcw className="h-4 w-4" />
              {t('tools.knowledgeBank.reset')}
            </Button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
        <span className="type-caption text-ui-text-muted">{canEdit ? t('tools.knowledgeBank.targetOnly') : t('tools.knowledgeBank.readOnly')}</span>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={entrySaving || settingsSaving}>{t('tools.knowledgeBank.close')}</Button>
          {tab === 'entries' && canEdit && (
            <Button variant="accent" onClick={() => void saveEntry()} disabled={entrySaving || !draft.title.trim()}>
              {entrySaving ? t('common.saving') : t('tools.knowledgeBank.saveEntry')}
            </Button>
          )}
          {tab === 'entries' && canEdit && selectedEntry && (
            <Button variant="tertiary" onClick={() => void archiveEntry()} disabled={entrySaving}>{t('tools.knowledgeBank.archive')}</Button>
          )}
          {tab === 'settings' && canEdit && (
            <Button variant="accent" onClick={() => void saveSettings()} disabled={settingsSaving || savingTool}>
              {settingsSaving ? t('common.saving') : t('tools.knowledgeBank.saveSettings')}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
};
