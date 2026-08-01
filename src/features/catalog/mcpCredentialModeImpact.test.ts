import { describe, expect, it } from 'vitest';
import type { WorkflowApiDefinition, WorkflowSchedule } from '@/services/control-plane/workflowApi';
import { enabledScheduleImpactForAgent } from './mcpCredentialModeImpact';

describe('MCP credential mode schedule impact', () => {
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
});
