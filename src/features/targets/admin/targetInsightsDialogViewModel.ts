import type {
  ControlPlaneTargetInsightsCatalog,
  ControlPlaneTargetInsightsEntry,
  ControlPlaneTargetToolItem
} from '@/services/controlPlaneApi';
import type { WorkspaceAiSettings } from '@/types';

export type InsightFileStatus = ControlPlaneTargetInsightsEntry['status'];
export type LearningReadiness = NonNullable<ControlPlaneTargetToolItem['readiness']>;

export interface FileDraft {
  title: string;
  bodyMarkdown: string;
}

export interface InsightFile {
  entry: ControlPlaneTargetInsightsEntry;
  path: string;
  fileName: string;
  status: InsightFileStatus;
  searchableText: string;
}

export interface SettingsDraft {
  enabled: boolean;
  idleCheckpointDelayMinutes: number;
  minimumObservationsBeforeGeneralization: number;
  maxSnippetsPerRetrieval: number;
  maxSnippetSizeBytes: number;
  checkpointModelMode: 'workspace_default' | 'custom';
  provider: WorkspaceAiSettings['defaultProvider'];
  model: string;
}

export const statusOrder: InsightFileStatus[] = ['active', 'pending', 'archived'];

export function slugifyTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

export function buildInsightFilePath(entry: ControlPlaneTargetInsightsEntry): string {
  const slug = slugifyTitle(entry.title) || `insight-file-${entry.id.slice(0, 8)}`;
  return `insights/${entry.status}/${slug}.md`;
}

export function entryToInsightFile(entry: ControlPlaneTargetInsightsEntry): InsightFile {
  const path = buildInsightFilePath(entry);
  return {
    entry,
    path,
    fileName: path.split('/').pop() || path,
    status: entry.status,
    searchableText: [
      entry.title,
      entry.status,
      entry.evidenceSummary,
      entry.bodyMarkdown,
      buildInsightFilePath(entry),
      ...(entry.tags || [])
    ].join(' ').toLowerCase()
  };
}

export function draftFromEntry(entry: ControlPlaneTargetInsightsEntry | null): FileDraft {
  return {
    title: entry?.title || '',
    bodyMarkdown: entry?.bodyMarkdown || ''
  };
}

export function hasDraftChanges(entry: ControlPlaneTargetInsightsEntry | null, draft: FileDraft): boolean {
  if (!entry) return Boolean(draft.title.trim() || draft.bodyMarkdown.trim());
  return draft.title.trim() !== entry.title || draft.bodyMarkdown !== entry.bodyMarkdown;
}

export function applySavedEntryToCatalog(
  catalog: ControlPlaneTargetInsightsCatalog | null,
  savedEntry: ControlPlaneTargetInsightsEntry
): ControlPlaneTargetInsightsCatalog | null {
  if (!catalog) return catalog;
  const exists = catalog.items.some((entry) => entry.id === savedEntry.id);
  return {
    ...catalog,
    items: exists
      ? catalog.items.map((entry) => entry.id === savedEntry.id ? savedEntry : entry)
      : [savedEntry, ...catalog.items]
  };
}

export function pauseReasonKey(reason: ControlPlaneTargetToolItem['readiness'] extends infer R ? R extends { learningPausedReason: infer P } ? P : never : never): string {
  if (reason === 'ai_settings_missing') return 'tools.targetInsights.pause.aiSettingsMissing';
  if (reason === 'provider_not_allowed') return 'tools.targetInsights.pause.providerNotAllowed';
  if (reason === 'model_not_allowed') return 'tools.targetInsights.pause.modelNotAllowed';
  return 'tools.targetInsights.pause.ready';
}

export function resolveLearningReadiness(tool: ControlPlaneTargetToolItem, aiSettings: WorkspaceAiSettings | null): LearningReadiness | undefined {
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

export function settingsDraftFromTool(tool: ControlPlaneTargetToolItem): SettingsDraft {
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
