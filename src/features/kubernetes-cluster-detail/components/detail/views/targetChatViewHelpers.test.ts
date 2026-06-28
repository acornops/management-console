import { describe, expect, it } from 'vitest';
import {
  resolveClusterChatFooterKey,
  resolveComposerReasoningEffort
} from '@/features/kubernetes-cluster-detail/components/detail/views/targetChatViewHelpers';
import { HealthStatus, type KubernetesCluster, type WorkspaceAiSettings } from '@/types';

function clusterWithPolicy(effectiveRequired?: boolean): KubernetesCluster {
  return {
    id: 'cluster-1',
    name: 'Development Cluster',
    cluster: 'dev',
    namespace: 'default',
    workspaceId: 'workspace-1',
    owners: [],
    gitlabPipelines: [],
    status: HealthStatus.GREEN,
    podStats: { running: 0, failed: 0, pending: 0 },
    metrics: { cpu: '0', memory: '0' },
    mcpTools: [],
    chatSessions: [],
    workloads: [],
    nodes: [],
    namespaces: [],
    services: [],
    ingresses: [],
    pvcs: [],
    alerts: [],
    lastUpdate: '2026-06-01T00:00:00.000Z',
    ...(effectiveRequired === undefined
      ? {}
      : {
          writeConfirmationPolicy: {
            effectiveRequired,
            overrideRequired: effectiveRequired,
            source: 'cluster_override' as const
          }
        })
  };
}

function aiSettings(overrides: Partial<WorkspaceAiSettings> = {}): WorkspaceAiSettings {
  return {
    workspaceId: 'workspace-1',
    defaultProvider: 'openai',
    defaultModel: 'gpt-5-nano',
    reasoningSummaryMode: 'auto',
    reasoningEffort: 'medium',
    allowedReasoningSummaryModes: ['off', 'auto', 'concise', 'detailed'],
    allowedReasoningEfforts: ['off', 'low', 'medium', 'high'],
    reasoningSummariesEnabled: true,
    allowedProviders: ['openai'],
    allowedProviderModels: { openai: ['gpt-5-nano'], anthropic: [], gemini: [] },
    allowedModels: [],
    providers: [{ provider: 'openai', configured: true, enabled: true }],
    ...overrides
  };
}

describe('target chat view helpers', () => {
  it('uses policy-aware composer footer copy for cluster chat', () => {
    expect(resolveClusterChatFooterKey(clusterWithPolicy(false), false)).toBe('chat.footerReadOnlyRole');
    expect(resolveClusterChatFooterKey(clusterWithPolicy(), true)).toBe('chat.footerApprovalRequired');
    expect(resolveClusterChatFooterKey(clusterWithPolicy(true), true)).toBe('chat.footerApprovalRequired');
    expect(resolveClusterChatFooterKey(clusterWithPolicy(false), true)).toBe('chat.footerApprovalNotRequired');
  });

  it('uses the workspace reasoning effort default until the user changes the composer effort', () => {
    expect(resolveComposerReasoningEffort(aiSettings(), 'low', false)).toBe('medium');
    expect(resolveComposerReasoningEffort(aiSettings(), 'high', true)).toBe('high');
  });

  it('falls back when the configured workspace reasoning effort is outside policy', () => {
    expect(
      resolveComposerReasoningEffort(
        aiSettings({ reasoningEffort: 'high', allowedReasoningEfforts: ['off', 'low'] }),
        'medium',
        true
      )
    ).toBe('low');
    expect(
      resolveComposerReasoningEffort(
        aiSettings({ reasoningEffort: 'high', allowedReasoningEfforts: ['off'] }),
        'medium',
        false
      )
    ).toBe('off');
  });
});
