import { renderToStaticMarkup } from 'react-dom/server';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/i18n/locales/en.js';
import type { AgentDefinition } from './agents/agentModel';
import type { WorkflowDefinition } from './workflows/workflowModel';
import { AgentAssignmentList, WorkflowCapabilityLedger, WorkflowCapabilitySummary, WorkflowLibraryList, WorkflowSection } from './WorkspaceWorkflowsPage.components';
import { WorkflowAgentAssignmentSection, WorkflowCapabilitiesPanel, WorkflowRunsPanel } from './WorkspaceWorkflowsPage.panels';
import { WorkflowOverviewPanel } from './WorkspaceWorkflowOverviewPanel';
import { mapWorkflowRunSummary } from './workflows/workflowPageHelpers';

function workflowWithRun(run: WorkflowDefinition['runs'][number]): WorkflowDefinition {
  return {
    id: 'workflow-1',
    workspaceId: 'workspace-1',
    name: 'Infrastructure diagnostics',
    description: 'Inspect infrastructure named in the request.',
    status: 'active',
    agentIds: ['agent-1'],
    executionMode: 'direct',
    semanticCapabilityIds: ['infrastructure.diagnostics.read'],
    capabilityRestrictionMode: 'restrict',
    owner: 'AcornOps',
    tags: [],
    lastRun: 'Just now',
    agents: [],
    policy: { mode: 'read_only', approvals: [] },
    starterPrompt: 'Inspect production health.',
    runs: [run]
  };
}

describe('WorkflowSection', () => {
  it('strengthens section headings by weight without promoting their size', () => {
    const html = renderToStaticMarkup(<WorkflowSection title="Capabilities">Content</WorkflowSection>);

    expect(html).toContain('min-w-0 border-t border-ui-border pt-5 first:border-t-0 first:pt-0');
    expect(html).toContain('<h4 class="type-panel-title">Capabilities</h4>');
    expect(html).not.toContain('type-section-title');
  });
});

describe('WorkflowLibraryList', () => {
  it('shows assigned agent names and keeps longer assignments compact', () => {
    const directWorkflow = {
      ...workflowWithRun({
        id: 'run-1', status: 'completed' as const, actor: 'Operator', duration: '1m', approvals: 0,
        output: '', startedAt: 'Just now'
      }),
      agents: [{ agentId: 'agent-1', name: 'Kubernetes Agent', role: 'Direct', required: true }]
    };
    const coordinatedWorkflow = {
      ...directWorkflow,
      id: 'workflow-2',
      name: 'Coordinated diagnostics',
      agentIds: ['agent-1', 'agent-2', 'agent-3'],
      executionMode: 'coordinated' as const,
      agents: [
        { agentId: 'agent-1', name: 'Workflow Analyst', role: 'AcornOps-coordinated', required: true },
        { agentId: 'agent-2', name: 'Kubernetes Specialist', role: 'AcornOps-coordinated', required: true },
        { agentId: 'agent-3', name: 'Security Reviewer', role: 'AcornOps-coordinated', required: true }
      ]
    };
    const workflows = [directWorkflow, coordinatedWorkflow];

    const html = renderToStaticMarkup(
      <WorkflowLibraryList
        workflows={workflows}
        visibleWorkflows={workflows}
        ready
        loadError=""
        onSelectWorkflow={vi.fn()}
        registerWorkflowRow={vi.fn()}
      />
    );

    expect(html).toContain('Kubernetes Agent');
    expect(html).not.toContain('1 agent');
    expect(html).toContain('Workflow Analyst, Kubernetes Specialist +1');
    expect(html).toContain('aria-label="Assigned agents: Workflow Analyst, Kubernetes Specialist, Security Reviewer"');
    expect(html).toContain('title="Workflow Analyst, Kubernetes Specialist, Security Reviewer"');
  });
});

describe('AgentAssignmentList', () => {
  it('renders a direct assignment without a redundant Direct tag', () => {
    const html = renderToStaticMarkup(
      <AgentAssignmentList
        agents={[{ agentId: 'agent-1', name: 'Kubernetes Agent', avatarEmoji: '☸️', role: 'Direct', required: true }]}
        labelForAgent={null}
      />
    );

    expect(html).toContain('Kubernetes Agent');
    expect(html).toContain('data-agent-avatar="true"');
    expect(html).toContain('>☸️<');
    expect(html).toContain('grid-cols-[2.25rem_minmax(0,1fr)]');
    expect(html).not.toContain('Direct');
  });
});

describe('WorkflowCapabilitySummary', () => {
  it('presents routine readiness and zero tool counts without positive status pills', () => {
    const html = renderToStaticMarkup(
      <WorkflowCapabilitySummary
        workspaceId="workspace-1"
        preview={{
          workflowId: 'workflow-1',
          mode: 'read_write',
          semanticCapabilityIds: [],
          checkedAt: '2026-08-02T00:00:00.000Z',
          status: 'ready',
          reasonCodes: [],
          tools: { read: [], write: [] },
          directMcpServers: [],
          enabledSkills: [],
          mcpRequirements: [],
          approvalRequirements: [],
          counts: { tools: 0, readTools: 0, writeTools: 0, directMcpServers: 0, enabledSkills: 0, approvals: 0 }
        }}
        loading={false}
        error=""
        onRetry={vi.fn()}
      />
    );

    expect(html).toContain('0 read');
    expect(html).toContain('0 write');
    expect(html).toContain('No write tools');
    expect(html).toContain('rounded-md border border-ui-border bg-ui-surface');
    expect(html).not.toContain('border-y');
    expect(html).not.toContain('divide-y divide-ui-border');
    expect(html).not.toContain('>ready<');
    expect(html).not.toContain('bg-status-success-soft');
  });
});

describe('Workflow execution setup', () => {
  it('summarizes inherited access with assigned Agents and leaves details to the Capabilities tab', async () => {
    const translation = createInstance();
    await translation.init({ resources: { en: { translation: en } }, lng: 'en' });
    const workflow = {
      ...workflowWithRun({
      id: 'run-1',
      status: 'completed',
      actor: 'Operator',
      duration: '1m',
      approvals: 0,
      output: '',
      startedAt: 'Just now'
      }),
      agents: [{ agentId: 'agent-1', name: 'Infrastructure Agent', role: 'Direct', required: true }]
    };
    const agent: AgentDefinition = {
      id: 'agent-1', workspaceId: 'workspace-1', name: 'Infrastructure Agent', avatarEmoji: '',
      description: '', instructions: '', status: 'active', reviewState: 'reviewed', providerType: 'internal',
      createdBy: 'user-1', owner: 'Operator', mcpServers: ['operations-mcp'], tools: ['inspect_host'],
      nativeToolConfigs: {}, skills: ['linux-diagnostics'], semanticCapabilityIds: ['infrastructure.diagnostics.read'],
      permissionMode: 'read_only', trustPolicy: { boundary: 'Workspace', dataEgress: 'Blocked' },
      capabilities: [{
        source: 'builtin_tool', resourceType: 'virtual_machine', resourceScope: 'host', toolId: 'inspect_host',
        operation: 'read', requiresApproval: false
      }],
      readiness: { status: 'ready', reasons: [] }
    };

    const html = renderToStaticMarkup(
      <I18nextProvider i18n={translation}>
        <WorkflowAgentAssignmentSection
          workflow={workflow}
          agents={[agent]}
          activeAgentOptions={[]}
          isEditingAgentSelection={false}
          canManageWorkflows
          savingAgentSelectionId=""
          agentSelectionError=""
          onReviewCapabilities={vi.fn()}
          workflowActions={{
            startEditingAgentSelection: vi.fn(),
            updateAgentSelectionDraft: vi.fn(),
            cancelEditingAgentSelection: vi.fn(),
            saveAgentSelection: vi.fn()
          }}
        />
      </I18nextProvider>
    );

    expect(html).toContain('Execution setup');
    expect(html).toContain('<h4 class="type-panel-title">Execution setup</h4>');
    expect(html).toContain('Infrastructure Agent');
    expect(html).toContain('type-ui leading-6 text-ui-text');
    expect(html).toContain('<div class="type-ui text-ui-text-muted">Effective access</div>');
    expect(html).toContain('Read only · 1 tool · 1 MCP server · 1 skill');
    expect(html).toContain('Inherited from assigned Agents and revalidated before every run.');
    expect(html).toContain('View access');
    expect(html).not.toContain('Infrastructure diagnostics read');
    expect(html).not.toContain('Operations MCP');
    expect(html).not.toContain('Linux Diagnostics');
  });
});

describe('WorkflowOverviewPanel', () => {
  it('keeps the overview focused on execution setup and the workflow-owned prompt', () => {
    const html = renderToStaticMarkup(
      <WorkflowOverviewPanel
        workflow={workflowWithRun({
          id: 'run-1', status: 'completed', actor: 'Operator', duration: '1m', approvals: 0,
          output: '', startedAt: 'Just now'
        })}
        agentAssignment={<div>Execution setup</div>}
      />
    );

    expect(html).toContain('Execution setup');
    expect(html).toContain('<h4 class="type-panel-title">Prompt</h4>');
    expect(html).toContain('Inspect production health.');
    expect(html).not.toContain('Review capabilities');
    expect(html).not.toContain('Capability scope');
  });
});

describe('WorkflowCapabilityLedger', () => {
  it('preserves server and skill display names verbatim', () => {
    const html = renderToStaticMarkup(
      <WorkflowCapabilityLedger
        workspaceId="workspace-1"
        preview={{
          workflowId: 'workflow-1',
          mode: 'read_only',
          semanticCapabilityIds: [],
          checkedAt: '2026-08-02T00:00:00.000Z',
          status: 'ready',
          reasonCodes: [],
          tools: { read: [], write: [] },
          directMcpServers: [{ id: 'server-1', name: 'AcornOps Targets' }],
          enabledSkills: [{ id: 'skill-1', name: "SRE's MCP Toolkit" }],
          mcpRequirements: [],
          approvalRequirements: [],
          counts: { tools: 0, readTools: 0, writeTools: 0, directMcpServers: 1, enabledSkills: 1, approvals: 0 }
        }}
        loading={false}
        error=""
        onRetry={vi.fn()}
      />
    );

    expect(html).toContain('AcornOps Targets');
    expect(html).toContain("SRE&#x27;s MCP Toolkit");
    expect(html).not.toContain('Acorn Ops Targets');
    expect(html).not.toContain('SRE MCP Toolkit');
  });
});

function renderRunsPanel(workflow: WorkflowDefinition, expandedRunLogId = ''): string {
  return renderToStaticMarkup(
    <WorkflowRunsPanel
      workflow={workflow}
      approvalError=""
      runLogError=""
      cancelRunError=""
      approvalRecords={{}}
      expandedRunLogId={expandedRunLogId}
      runEventsByRunId={{}}
      cancelRunAction=""
      workflowActions={{
        stopWorkflowRun: vi.fn(),
        decideApproval: vi.fn(),
        toggleRunLogs: vi.fn()
      }}
      approvalAction=""
      setExpandedRunLogId={vi.fn()}
    />
  );
}

describe('WorkflowRunsPanel run identity boundary', () => {
  it('uses the shared collection empty state when a workflow has no runs', () => {
    const workflow = workflowWithRun({
      id: 'run-1', status: 'completed', actor: 'Operator', duration: '1m', approvals: 0,
      output: '', startedAt: 'Just now'
    });
    workflow.runs = [];

    const html = renderRunsPanel(workflow);

    expect(html).toContain('data-empty-state="true"');
    expect(html).toContain('workflowActivity.emptyWorkflowTitle');
    expect(html).toContain('workflowActivity.emptyWorkflowDescription');
    expect(html).not.toContain('No activity yet');
  });

  it('does not expose server run-history controls for an optimistic local run', () => {
    const html = renderRunsPanel(workflowWithRun({
      id: 'local-workflow-run-1784621869248',
      status: 'dispatching',
      actor: 'You',
      duration: 'Starting',
      approvals: 0,
      output: 'Starting workflow run.',
      startedAt: 'Just now'
    }));

    expect(html).toContain('Starting workflow run.');
    expect(html).not.toContain('aria-label="Stop workflow run"');
    expect(html).not.toContain('Show run details');
  });

  it('keeps server run-history controls available after the control plane returns a run ID', () => {
    const html = renderRunsPanel(workflowWithRun({
      id: 'workflow-run-1',
      runId: 'run-1',
      status: 'running',
      actor: 'You',
      duration: 'In progress',
      approvals: 0,
      output: 'Workflow run is in progress.',
      startedAt: 'Just now'
    }));

    expect(html).toContain('aria-label="Stop workflow run"');
    expect(html).toContain('Show run details');
    expect(html).toContain('workflowActivity.status.running');
    expect(html).not.toContain('>Working<');
  });

  it('renders the run summary as an initially expanded collapsible section', () => {
    const html = renderRunsPanel(workflowWithRun({
      id: 'workflow-run-1',
      runId: 'run-1',
      status: 'completed',
      actor: 'You',
      duration: '1m',
      approvals: 0,
      output: 'Production is healthy.',
      startedAt: 'Just now'
    }));

    expect(html).toContain('<details open=""');
    expect(html).toContain('<summary');
    expect(html).toContain('workflowActivity.runSummary');
    expect(html).toContain('Production is healthy.');
  });

  it('keeps expanded workflow runs inspectable without exposing run steering controls', () => {
    const html = renderRunsPanel(workflowWithRun({
      id: 'workflow-run-1',
      runId: 'run-1',
      status: 'running',
      actor: 'You',
      duration: 'In progress',
      approvals: 0,
      output: 'Workflow run is in progress.',
      startedAt: 'Just now'
    }), 'run-1');

    expect(html).toContain('Hide run details');
    expect(html).toContain('justify-start');
    expect(html).not.toContain('Run discussion');
    expect(html).not.toContain('Send instruction');
    expect(html).not.toContain('-mx-4');
  });

  it('labels approval and review pauses without implying that work is still progressing', () => {
    const waiting = mapWorkflowRunSummary({
      id: 'run-waiting',
      executionId: 'execution-waiting',
      status: 'waiting_for_approval',
      requestedAt: '2026-07-15T08:00:00.000Z'
    });
    const needsReview = mapWorkflowRunSummary({
      id: 'run-review',
      executionId: 'execution-review',
      status: 'needs_review',
      requestedAt: '2026-07-15T08:00:00.000Z'
    });

    const waitingHtml = renderRunsPanel(workflowWithRun(waiting));
    const reviewHtml = renderRunsPanel(workflowWithRun(needsReview));

    expect(waiting.duration).not.toBe('Waiting for approval');
    expect(waiting.duration).toMatch(/^\d+(?:h \d+m|m \d+s|s)$/);
    expect(waiting.output).toBe('Workflow run is waiting for approval.');
    expect(waitingHtml).toContain('workflowActivity.status.waiting_for_approval');
    expect(waitingHtml).not.toContain('Workflow run is in progress.');
    expect(waitingHtml).not.toContain('Workflow running');
    expect(reviewHtml).toContain('workflowActivity.status.needs_review');
    expect(reviewHtml).not.toContain('Working');
  });
});

describe('WorkflowCapabilitiesPanel', () => {
  it('groups tools by Agent and labels write tools that require approval', () => {
    const workflow = workflowWithRun({
      id: 'workflow-run-1',
      runId: 'run-1',
      status: 'running',
      actor: 'You',
      duration: 'In progress',
      approvals: 0,
      output: 'Workflow run is in progress.',
      startedAt: 'Just now'
    });
    workflow.agents = [{ agentId: 'agent-1', name: 'Kubernetes Operator', role: 'Direct', required: true }];
    const agent: AgentDefinition = {
      id: 'agent-1', workspaceId: 'workspace-1', name: 'Kubernetes Operator', avatarEmoji: '☸️',
      description: '', instructions: '', status: 'active', reviewState: 'reviewed',
      providerType: 'internal', createdBy: 'user-1', owner: 'Operator',
      mcpServers: [], tools: ['read_resource', 'mystery_tool', 'patch_resource'], nativeToolConfigs: {}, skills: [], semanticCapabilityIds: ['infrastructure.diagnostics.read'],
      permissionMode: 'ask_before_changes',
      trustPolicy: { boundary: 'Workspace', dataEgress: 'Blocked' },
      capabilities: [
        { source: 'builtin_tool', resourceType: 'kubernetes', resourceScope: 'infrastructure', toolId: 'read_resource', operation: 'read', requiresApproval: false },
        { source: 'builtin_tool', resourceType: 'kubernetes', resourceScope: 'infrastructure', toolId: 'patch_resource', operation: 'write', requiresApproval: true }
      ],
      readiness: { status: 'ready', reasons: [] }
    };

    const html = renderToStaticMarkup(
      <WorkflowCapabilitiesPanel workflow={workflow} agents={[agent]} catalogFailures={[]} onRetryCatalog={vi.fn()} />
    );

    expect(html).toContain('Capabilities');
    expect(html).toContain("Review each selected Agent&#x27;s write policy, MCP servers, skills, and tools.");
    expect(html).toContain('Kubernetes Operator');
    expect(html).not.toContain('Selected Agent');
    expect(html).not.toContain('>Direct<');
    expect(html).toContain('patch_resource');
    expect(html).toContain('Write');
    expect(html).toContain('Write · approval');
    expect(html).not.toContain('>Approval required</span>');
    expect(html).toContain('Approval required for writes');
    expect(html).not.toContain('Capability scope');
    expect(html).not.toContain('Infrastructure diagnostics read');
    expect(html).not.toContain('Workflow approval gates');
    expect(html).toContain('class="type-panel-title grid grid-cols-[2rem_minmax(0,1fr)]');
    expect(html).toContain('data-agent-avatar="true"');
    expect(html).toContain('>☸️<');
    expect(html).not.toContain('data-icon-tile="true"');
    expect(html).toContain('<dt class="type-row-title">Write policy</dt>');
    expect(html).toContain('<dt class="type-row-title">MCP servers</dt>');
    expect(html).toContain('<dt class="type-row-title">Skills</dt>');
    expect(html).toContain('<dt class="type-row-title">Tools</dt>');
    expect(html.match(/>None<\/span>/g)).toHaveLength(2);
    expect(html.indexOf('<dt class="type-row-title">Write policy</dt>')).toBeLessThan(html.indexOf('<dt class="type-row-title">MCP servers</dt>'));
    expect(html.indexOf('<dt class="type-row-title">MCP servers</dt>')).toBeLessThan(html.indexOf('<dt class="type-row-title">Skills</dt>'));
    expect(html.indexOf('<dt class="type-row-title">Skills</dt>')).toBeLessThan(html.indexOf('<dt class="type-row-title">Tools</dt>'));
    expect(html.indexOf('patch_resource')).toBeLessThan(html.indexOf('read_resource'));
    expect(html.indexOf('read_resource')).toBeLessThan(html.indexOf('mystery_tool'));
    expect(html).not.toContain('Direct MCP servers');
    expect(html).not.toContain('Installed skills');
    expect(html).not.toContain('Write access');
    expect(html).not.toContain('font-mono type-body leading-6');
    expect(html).not.toContain('class="mt-4"');
  });
});
