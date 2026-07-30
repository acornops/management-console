import { formInputClassName, formTextareaClassName } from '@acornops/ui';

import type { TargetDescriptor } from '@/features/targets/targetDescriptor';
import {
  controlPlaneApi,
  type ControlPlaneTargetToolItem,
  type ControlPlaneTargetToolsCatalog,
  type UpdateTargetToolInput
} from '@/services/controlPlaneApi';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface TargetToolsViewProps {
  target: TargetDescriptor;
  canManageTools?: boolean;
  initialCatalog?: ControlPlaneTargetToolsCatalog | null;
  onCatalogChange?: (catalog: ControlPlaneTargetToolsCatalog) => void;
  dataSource?: TargetToolsDataSource;
}

export interface TargetToolsDataSource {
  listTools: (workspaceId: string, subjectId: string) => Promise<ControlPlaneTargetToolsCatalog>;
  updateTool: (workspaceId: string, subjectId: string, toolId: string, input: UpdateTargetToolInput) => Promise<ControlPlaneTargetToolItem>;
}

export const targetToolsDataSource: TargetToolsDataSource = {
  listTools: (workspaceId, subjectId) => controlPlaneApi.listTargetTools(workspaceId, subjectId),
  updateTool: (workspaceId, subjectId, toolId, input) => controlPlaneApi.updateTargetTool(workspaceId, subjectId, toolId, input)
};

export interface ToolDraft {
  enabled: boolean;
  allowedDomainsText: string;
  blockedDomainsText: string;
}

export type TargetInsightsAction = 'files' | 'settings' | 'activity' | 'reset';

export const toolSearchInputClassName = formInputClassName('py-3 pl-11 pr-4 type-body');
export const toolDomainTextareaClassName = formTextareaClassName('mt-2');

function splitDomainInput(value: string): string[] {
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDomain(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) throw new Error('empty');
  if (
    normalized.includes('://') ||
    normalized.includes('/') ||
    normalized.includes('\\') ||
    normalized.includes(':') ||
    normalized.includes('*') ||
    normalized.includes('?') ||
    normalized.includes('#')
  ) {
    throw new Error('invalid');
  }
  if (normalized.length > 253) throw new Error('invalid');
  const labels = normalized.split('.');
  if (labels.length < 2 || labels.some((label) => !label)) throw new Error('invalid');
  for (const label of labels) {
    if (label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) {
      throw new Error('invalid');
    }
  }
  return normalized;
}

export function parseDomainList(value: string, label: string, t: Translate): string[] {
  const seen = new Set<string>();
  return splitDomainInput(value).map((entry) => {
    let normalized: string;
    try {
      normalized = normalizeDomain(entry);
    } catch {
      throw new Error(t('tools.validation.invalidDomain', { label, domain: entry }));
    }
    if (seen.has(normalized)) {
      throw new Error(t('tools.validation.duplicateDomain', { label, domain: normalized }));
    }
    seen.add(normalized);
    return normalized;
  });
}

function getDomainFilters(tool: ControlPlaneTargetToolItem) {
  return {
    allowedDomains: tool.config?.domainFilters?.allowedDomains || [],
    blockedDomains: tool.config?.domainFilters?.blockedDomains || []
  };
}

export function draftFromTool(tool: ControlPlaneTargetToolItem): ToolDraft {
  const domainFilters = getDomainFilters(tool);
  return {
    enabled: tool.enabled,
    allowedDomainsText: domainFilters.allowedDomains.join('\n'),
    blockedDomainsText: domainFilters.blockedDomains.join('\n')
  };
}

export function summarizeDomainFilters(tool: ControlPlaneTargetToolItem, t: Translate): string {
  const domainFilters = getDomainFilters(tool);
  const allowed = domainFilters.allowedDomains.length;
  const blocked = domainFilters.blockedDomains.length;
  if (allowed === 0 && blocked === 0) return t('tools.domainSummaryAllDomains');
  if (allowed > 0 && blocked > 0) return t('tools.domainSummaryAllowedBlocked', { allowed, blocked });
  if (allowed > 0) return t('tools.domainSummaryAllowedOnly', { count: allowed });
  return t('tools.domainSummaryBlockedOnly', { count: blocked });
}

export function summarizeToolConfig(tool: ControlPlaneTargetToolItem, t: Translate): string {
  if (tool.origin === 'platform_native') return t('tools.platformNativeSummary');
  if (tool.id !== 'target_insights') return summarizeDomainFilters(tool, t);
  if (tool.readiness && !tool.readiness.learningAvailable) return 'Learning paused';
  const maxSnippets = tool.config.retrieval?.maxSnippetsPerRetrieval || 4;
  return `Retrieves up to ${maxSnippets} snippets`;
}

export function toolRuntimeKind(tool: ControlPlaneTargetToolItem): 'provider_native' | 'function' {
  return tool.runtimeKind || 'function';
}

export function toolRuntimeLabel(tool: ControlPlaneTargetToolItem, t: Translate): string {
  return t(toolRuntimeKind(tool) === 'provider_native' ? 'tools.runtimeProviderNative' : 'tools.runtimeFunction');
}

export function toolCapability(tool: ControlPlaneTargetToolItem): 'read' | 'write' {
  return tool.capability === 'write' ? 'write' : 'read';
}

export function toolCapabilityLabel(tool: ControlPlaneTargetToolItem, t: Translate): string {
  return t(toolCapability(tool) === 'write' ? 'tools.capabilityWrite' : 'tools.capabilityRead');
}
