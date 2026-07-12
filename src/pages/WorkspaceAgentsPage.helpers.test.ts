import i18next from 'i18next';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/locales/en';
import { zh } from '@/i18n/locales/zh';
import { createDefaultAgentDefinitions } from '@/pages/agents/agentModel';
import { getAgentCapabilitySummary, getAgentWorkflowAssignmentSummary } from '@/pages/WorkspaceAgentsCatalog';
import { createAgentEditDraft, filterVisibleAgents, isAgentEditDraftDirty, mapApiAgent, withAgentAuditHistoryEntry } from '@/pages/WorkspaceAgentsPage.helpers';

async function catalogTranslator(language: 'en' | 'zh') {
  const instance = i18next.createInstance();
  await instance.init({
    lng: language,
    fallbackLng: 'en',
    resources: { en: { translation: en }, zh: { translation: zh } },
    interpolation: { escapeValue: false }
  });
  return instance.t.bind(instance);
}

describe('WorkspaceAgentsPage helpers', () => {
  it('resolves API agent owner IDs through loaded workspace members', () => {
    const [fallbackAgent] = createDefaultAgentDefinitions('workspace-1');
    const mapped = mapApiAgent({
      id: 'agent-cluster-triage',
      workspaceId: 'workspace-1',
      name: 'Kubernetes Diagnostics',
      ownerUserId: 'user-1'
    }, fallbackAgent, 'Development Workspace', new Map([['user-1', 'Dev User']]));

    expect(mapped.ownerUserId).toBe('user-1');
    expect(mapped.owner).toBe('Dev User');
  });

  it('uses the development owner label for mocked specialist agent ownership', () => {
    const [fallbackAgent] = createDefaultAgentDefinitions('workspace-1');
    const mapped = mapApiAgent({
      id: 'agent-cluster-triage',
      workspaceId: 'workspace-1',
      name: 'Kubernetes Diagnostics',
      ownerUserId: 'user-1'
    }, fallbackAgent, 'Development Workspace');

    expect(mapped.ownerUserId).toBe('user-1');
    expect(mapped.owner).toBe('Dev User');
  });

  it('prepends local agent update history for the detail panel', () => {
    const [fallbackAgent] = createDefaultAgentDefinitions('workspace-1');
    const updated = withAgentAuditHistoryEntry(fallbackAgent, 'Agent definition updated', '2026-07-01T00:00:00.000Z');

    expect(updated.auditHistory[0]).toEqual({
      id: 'agent-audit-2026-07-01T00:00:00.000Z-agent-definition-updated',
      summary: 'Agent definition updated',
      occurredAt: '2026-07-01T00:00:00.000Z'
    });
    expect(updated.auditHistory.slice(1)).toEqual(fallbackAgent.auditHistory);
  });

  it('detects unchanged and changed edit drafts', () => {
    const [agent] = createDefaultAgentDefinitions('workspace-1');
    const draft = createAgentEditDraft(agent);
    expect(isAgentEditDraftDirty(agent, draft)).toBe(false);
    expect(isAgentEditDraftDirty(agent, { ...draft, name: `${draft.name} updated` })).toBe(true);
  });

  it('sorts by server status and name, then filters by server status', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');
    const readyAgent = {
      ...agents[0],
      targetScope: ['kubernetes:prod-cluster'],
      workflowsUsingAgent: ['Cluster triage']
    };
    const reviewAgent = { ...agents[1], status: 'disabled' as const };
    const draftAgent = { ...agents[2], status: 'draft' as const };
    const candidates = [readyAgent, reviewAgent, draftAgent];

    expect(filterVisibleAgents(candidates, '', { focus: 'all' }).map((agent) => agent.id)).toEqual([
      'agent-cluster-triage', 'agent-incident-reporter', 'agent-release-coordinator'
    ]);
    expect(filterVisibleAgents(candidates, '', { focus: 'active' }).map((agent) => agent.id)).toEqual(['agent-cluster-triage']);
    expect(filterVisibleAgents(candidates, '', { focus: 'draft' }).map((agent) => agent.id)).toEqual(['agent-incident-reporter']);
    expect(filterVisibleAgents(candidates, '', { focus: 'disabled' }).map((agent) => agent.id)).toEqual(['agent-release-coordinator']);
  });

  it('excludes the system workflow orchestrator from workspace agent catalog results', () => {
    const [workspaceAgent] = createDefaultAgentDefinitions('workspace-1');
    const systemOrchestrator = {
      ...workspaceAgent,
      id: 'agent-workflow-orchestrator',
      name: 'System Orchestrator',
      owner: 'AcornOps',
      ownerUserId: 'system'
    };

    expect(filterVisibleAgents([systemOrchestrator, workspaceAgent], '', { focus: 'all' }).map((agent) => agent.id)).toEqual([
      'agent-cluster-triage'
    ]);
  });

  it('localizes singular and plural capability counts', async () => {
    const [agent] = createDefaultAgentDefinitions('workspace-1');
    const counts = { ...agent, mcpServers: [], tools: ['inventory.list'], skills: ['triage', 'reporting'] };
    const enT = await catalogTranslator('en');
    const zhT = await catalogTranslator('zh');

    expect(getAgentCapabilitySummary(counts, enT)).toBe('0 MCP servers · 1 tool · 2 skills');
    expect(getAgentCapabilitySummary(counts, zhT)).toBe('0 个 MCP 服务器 · 1 个工具 · 2 个技能');
  });

  it('summarizes zero, one, and many workflow assignments with compact overflow', async () => {
    const [agent] = createDefaultAgentDefinitions('workspace-1');
    const t = await catalogTranslator('en');

    expect(getAgentWorkflowAssignmentSummary({ ...agent, workflowsUsingAgent: [] }, t)).toEqual({
      countLabel: '0 workflows',
      emptyLabel: 'No assigned workflows',
      firstWorkflow: undefined,
      overflowLabel: undefined
    });
    expect(getAgentWorkflowAssignmentSummary({ ...agent, workflowsUsingAgent: ['Cluster triage'] }, t)).toEqual({
      countLabel: '1 workflow',
      emptyLabel: undefined,
      firstWorkflow: 'Cluster triage',
      overflowLabel: undefined
    });
    expect(getAgentWorkflowAssignmentSummary({ ...agent, workflowsUsingAgent: ['Cluster triage', 'Audit access', 'Report incident'] }, t)).toEqual({
      countLabel: '3 workflows',
      emptyLabel: undefined,
      firstWorkflow: 'Cluster triage',
      overflowLabel: '+2'
    });
  });
});
