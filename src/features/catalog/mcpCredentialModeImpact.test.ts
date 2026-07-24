import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkflowApiDefinition, WorkflowSchedule } from '@/services/control-plane/workflowApi';
import { enabledScheduleImpactForAgent, enabledScheduleImpactForTarget } from './mcpCredentialModeImpact';
import { previewWorkflowCapabilities } from '@/services/control-plane/workflowApi';

vi.mock('@/services/control-plane/workflowApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/control-plane/workflowApi')>(),
  previewWorkflowCapabilities: vi.fn()
}));

describe('MCP credential mode schedule impact', () => {
  beforeEach(() => vi.mocked(previewWorkflowCapabilities).mockReset());

  it('returns only enabled schedules whose workflow uses the Agent', () => {
    const workflows = [
      { id: 'workflow-direct', agentIds: ['agent-1'] },
      { id: 'workflow-coordinated', agentIds: ['agent-2', 'agent-1'] },
      { id: 'workflow-other', agentIds: ['agent-2'] }
    ] as WorkflowApiDefinition[];
    const schedules = [
      { id: 'schedule-direct', workflowId: 'workflow-direct', status: 'enabled' },
      { id: 'schedule-paused', workflowId: 'workflow-direct', status: 'paused' },
      { id: 'schedule-coordinated', workflowId: 'workflow-coordinated', status: 'enabled' },
      { id: 'schedule-other', workflowId: 'workflow-other', status: 'enabled' }
    ] as WorkflowSchedule[];

    expect(enabledScheduleImpactForAgent(workflows, schedules, 'agent-1').map((schedule) => schedule.id))
      .toEqual(['schedule-direct', 'schedule-coordinated']);
  });

  it('uses bounded target tool metadata instead of internal compiled scopes', async () => {
    vi.mocked(previewWorkflowCapabilities)
      .mockResolvedValueOnce({
        workflowId: 'workflow-match',
        workflowVersion: 1,
        mode: 'read_only',
        semanticCapabilityIds: [],
        checkedAt: '2026-07-24T00:00:00.000Z',
        status: 'ready',
        reasonCodes: [],
        targetCandidates: [],
        selectedTarget: { id: 'target-1', name: 'Target', targetType: 'kubernetes', status: 'ready' },
        tools: {
          read: [{ id: 'tool-1', name: 'inspect', label: 'Inspect', access: 'read', source: 'target', serverId: 'server-1' }],
          write: []
        },
        directMcpServers: [],
        enabledSkills: [],
        mcpRequirements: [],
        approvalRequirements: [],
        counts: { targets: 1, readyTargets: 1, tools: 1, readTools: 1, writeTools: 0, directMcpServers: 0, enabledSkills: 0, approvals: 0 }
      })
      .mockResolvedValueOnce({
        workflowId: 'workflow-other',
        workflowVersion: 1,
        mode: 'read_only',
        semanticCapabilityIds: [],
        checkedAt: '2026-07-24T00:00:00.000Z',
        status: 'ready',
        reasonCodes: [],
        targetCandidates: [],
        selectedTarget: { id: 'target-1', name: 'Target', targetType: 'kubernetes', status: 'ready' },
        tools: { read: [], write: [] },
        directMcpServers: [],
        enabledSkills: [],
        mcpRequirements: [],
        approvalRequirements: [],
        counts: { targets: 1, readyTargets: 1, tools: 0, readTools: 0, writeTools: 0, directMcpServers: 0, enabledSkills: 0, approvals: 0 }
      });
    const schedules = [
      { id: 'schedule-match', workflowId: 'workflow-match', status: 'enabled', approvedContextGrants: [], controlMessage: 'Inspect.' },
      { id: 'schedule-other', workflowId: 'workflow-other', status: 'enabled', approvedContextGrants: [], controlMessage: 'Inspect.' },
      { id: 'schedule-paused', workflowId: 'workflow-paused', status: 'paused', approvedContextGrants: [], controlMessage: 'Inspect.' }
    ] as WorkflowSchedule[];

    await expect(enabledScheduleImpactForTarget('workspace-1', schedules, 'target-1', 'server-1'))
      .resolves.toEqual([schedules[0]]);
    expect(previewWorkflowCapabilities).toHaveBeenCalledTimes(2);
  });
});
