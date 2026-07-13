export type WorkflowStatus = 'active' | 'draft' | 'paused';
export type WorkflowCapabilityMode = 'read_only' | 'read_write';
export type WorkflowTab = 'overview' | 'agents' | 'capabilities' | 'runs' | 'settings';

export interface WorkflowInput {
  name: string;
  label: string;
  type: 'text' | 'select' | 'cluster' | 'chat_session_list' | 'repository' | 'format';
  required: boolean;
  optionSource?: string;
}

export interface WorkflowStep {
  id: string;
  title: string;
  prompt: string;
  requiredInputs: string[];
  agentIds?: string[];
  enabledSkills: string[];
  allowedMcpServers: string[];
  allowedTools: string[];
  contextGrants: string[];
  approvalRequired: boolean;
  outputArtifacts?: Array<{ id: string; type: string; title: string; required?: boolean }>;
}

export interface WorkflowRunRecord {
  id: string;
  runId?: string;
  status: 'queued' | 'dispatching' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled' | 'cancelling';
  actor: string;
  duration: string;
  approvals: number;
  output: string;
  startedAt: string;
}

export interface WorkflowRunMessage {
  id: string;
  runId: string;
  role: 'operator' | 'agent' | 'system';
  author: string;
  content: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'failed';
}

export interface WorkflowAgentReference {
  agentId: string;
  name: string;
  role: string;
  required: boolean;
}

export interface WorkflowDefinition {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  source?: 'system' | 'user';
  owner: string;
  category: string;
  tags: string[];
  lastRun: string;
  primaryAction: string;
  orchestrator: WorkflowAgentReference;
  agents: WorkflowAgentReference[];
  requiredPermissions: string[];
  enabledMcpServers: string[];
  allowedTools: string[];
  enabledSkills: string[];
  contextGrants: string[];
  disabledCapabilities: string[];
  inputs: WorkflowInput[];
  steps: WorkflowStep[];
  policy: {
    mode: WorkflowCapabilityMode;
    maxRuntime: string;
    retention: string;
    approvals: string[];
  };
  scope: {
    type: 'workspace';
  };
  starterPrompt: string;
  runs: WorkflowRunRecord[];
}

export type WorkflowLaunchPermissions = Partial<Record<'create_sessions' | 'create_read_only_runs' | 'create_read_write_runs', boolean>>;

const defaultWorkspaceId = 'current-workspace';

const defaultSystemOrchestrator: WorkflowAgentReference = {
  agentId: 'agent-workflow-orchestrator',
  name: 'System Orchestrator',
  role: 'Coordinator',
  required: true
};

export function createDefaultWorkflowDefinitions(workspaceId = defaultWorkspaceId): WorkflowDefinition[] {
  return [
    {
      id: 'cluster-triage',
      workspaceId,
      name: 'Cluster triage',
      description: 'Mention a Kubernetes cluster in the control message and investigate it using live built-in inventory, resource, and log evidence.',
      status: 'active',
      source: 'system',
      owner: 'AcornOps',
      category: 'cluster-triage',
      tags: ['cluster', 'triage', 'incident'],
      lastRun: 'Today 09:12',
      primaryAction: 'Start triage',
      orchestrator: defaultSystemOrchestrator,
      agents: [
        { agentId: 'agent-cluster-triage', name: 'Kubernetes Diagnostics', role: 'Triage capability', required: true }
      ],
      requiredPermissions: ['read_workspace_data', 'create_read_only_runs'],
      enabledMcpServers: ['acornops-cluster-agent'],
      allowedTools: ['get_resource', 'get_resource_logs', 'list_resources'],
      enabledSkills: ['acornops-observability', 'acornops-target-boundary-design'],
      contextGrants: ['workspace_metadata', 'target_inventory'],
      disabledCapabilities: ['write tools'],
      inputs: [{
        name: 'targetId',
        label: 'Kubernetes cluster',
        type: 'cluster',
        required: true,
        optionSource: 'clusters'
      }],
      steps: [
        {
          id: 'triage-selected-cluster',
          title: 'Triage cluster signals',
          prompt: 'Inspect available cluster diagnostic signals and summarize likely causes, blast radius, and recommended operator actions.',
          requiredInputs: ['targetId'],
          agentIds: ['agent-cluster-triage'],
          enabledSkills: ['acornops-observability', 'acornops-target-boundary-design'],
          allowedMcpServers: ['acornops-cluster-agent'],
          allowedTools: ['get_resource', 'get_resource_logs', 'list_resources'],
          contextGrants: ['workspace_metadata', 'target_inventory'],
          approvalRequired: false
        }
      ],
      policy: {
        mode: 'read_only',
        maxRuntime: '',
        retention: '',
        approvals: []
      },
      scope: { type: 'workspace' },
      starterPrompt: 'Triage @cluster[Cluster name] using live built-in inventory, resource, and log evidence.',
      runs: [
        {
          id: 'wf-run-4812',
          status: 'completed',
          actor: 'Maya Chen',
          duration: '8m 12s',
          approvals: 0,
          output: 'Identified restart loop isolated to the billing worker deployment.',
          startedAt: 'Today 09:12'
        }
      ]
    },
    {
      id: 'repository-operation',
      workspaceId,
      name: 'Repository operation',
      description: 'Perform a guided operation against a selected Git repository, such as adding configuration and opening a PR.',
      status: 'paused',
      source: 'system',
      owner: 'AcornOps',
      category: 'git-operations',
      tags: ['repository', 'configuration', 'pull-request'],
      lastRun: 'Yesterday',
      primaryAction: 'Start operation',
      orchestrator: defaultSystemOrchestrator,
      agents: [
        { agentId: 'agent-release-coordinator', name: 'Repository Operator', role: 'Repository capability', required: true },
        { agentId: 'agent-cluster-triage', name: 'Kubernetes Diagnostics', role: 'Context capability', required: false }
      ],
      requiredPermissions: ['read_workspace_data', 'create_read_write_runs'],
      enabledMcpServers: [],
      allowedTools: [],
      enabledSkills: ['acornops-cross-repo-change', 'acornops-open-pr'],
      contextGrants: ['workspace_metadata'],
      disabledCapabilities: ['unapproved branch writes'],
      inputs: [],
      steps: [
        {
          id: 'prepare-repository-change',
          title: 'Prepare repository change',
          prompt: 'Inspect the selected repository, prepare a branch and PR plan, and request approval before write-capable actions.',
          requiredInputs: [],
          agentIds: ['agent-release-coordinator'],
          enabledSkills: ['acornops-cross-repo-change', 'acornops-open-pr'],
          allowedMcpServers: [],
          allowedTools: [],
          contextGrants: ['workspace_metadata'],
          approvalRequired: true
        }
      ],
      policy: {
        mode: 'read_write',
        maxRuntime: '',
        retention: '',
        approvals: ['Before creating branches', 'Before opening pull requests']
      },
      scope: { type: 'workspace' },
      starterPrompt: 'Add the requested configuration to the selected repository. Confirm the repository and intended change before using write tools.',
      runs: [
        {
          id: 'wf-run-4771',
          status: 'completed',
          actor: 'Ning',
          duration: '12m 44s',
          approvals: 2,
          output: 'Draft PR plan prepared with branch and validation notes.',
          startedAt: 'Yesterday 15:30'
        }
      ]
    },
    {
      id: 'incident-report-pdf',
      workspaceId,
      name: 'Incident report PDF',
      description: 'Mention incident chat sessions in the control message and generate a PDF report with timeline, impact, and follow-up actions.',
      status: 'active',
      source: 'system',
      owner: 'AcornOps',
      category: 'incident-review',
      tags: ['incident', 'chat-history', 'pdf'],
      lastRun: 'Jun 20',
      primaryAction: 'Generate report',
      orchestrator: defaultSystemOrchestrator,
      agents: [
        { agentId: 'agent-incident-reporter', name: 'Incident Reporter', role: 'Report capability', required: true },
        { agentId: 'agent-cluster-triage', name: 'Kubernetes Diagnostics', role: 'Finding capability', required: false }
      ],
      requiredPermissions: ['read_workspace_data', 'create_read_only_runs'],
      enabledMcpServers: [],
      allowedTools: ['chat.sessions.read_selected', 'reports.pdf.generate'],
      enabledSkills: ['acornops-observability'],
      contextGrants: ['selected_chat_sessions'],
      disabledCapabilities: ['broad workspace chat history'],
      inputs: [{
        name: 'chatSessionIds',
        label: 'Incident chats',
        type: 'chat_session_list',
        required: true,
        optionSource: 'chatSessions'
      }],
      steps: [
        {
          id: 'generate-incident-report',
          title: 'Generate incident report',
          prompt: 'Read selected incident chats, extract the timeline and evidence, then generate a PDF report artifact.',
          requiredInputs: ['chatSessionIds'],
          agentIds: ['agent-incident-reporter'],
          enabledSkills: ['acornops-observability'],
          allowedMcpServers: [],
          allowedTools: ['chat.sessions.read_selected', 'reports.pdf.generate'],
          contextGrants: ['selected_chat_sessions'],
          approvalRequired: true,
          outputArtifacts: [{ id: 'incident-report', type: 'pdf', title: 'Incident report PDF', required: true }]
        }
      ],
      policy: {
        mode: 'read_only',
        maxRuntime: '',
        retention: '',
        approvals: ['Before reading selected chats']
      },
      scope: { type: 'workspace' },
      starterPrompt: 'Generate an incident report from @chat[Incident chat title]. Show the referenced chat sessions and report outline before producing the PDF.',
      runs: [
        {
          id: 'wf-run-4590',
          status: 'completed',
          actor: 'Alex Rivera',
          duration: '14m 55s',
          approvals: 1,
          output: 'PDF report generated with timeline, customer impact, and follow-up actions.',
          startedAt: 'Jun 20 10:05'
        }
      ]
    }
  ];
}

export function getWorkflowCategoryLabel(category: string): string {
  return category
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function parseWorkflowSearchTokens(query: string): string[] {
  return query.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
}

export function appendWorkflowSearchTag(query: string, tag: string): string {
  const current = query.trim();
  const currentTokens = parseWorkflowSearchTokens(current);
  const tagTokens = parseWorkflowSearchTokens(tag);
  if (tagTokens.every((token) => currentTokens.includes(token))) return current;
  return [current, tag].filter(Boolean).join(' ');
}

function workflowRouteParams(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

function normalizeWorkflowRouteTarget(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getWorkflowRouteQuery(search: string): string {
  return workflowRouteParams(search).get('q')?.trim() || '';
}

export function getWorkflowRouteSelectionTarget(search: string): string {
  const params = workflowRouteParams(search);
  return (
    params.get('workflow') ||
    params.get('workflowId') ||
    params.get('selectedWorkflow') ||
    params.get('q') ||
    ''
  ).trim();
}

export function filterWorkflowDefinitions(workflows: WorkflowDefinition[], query: string): WorkflowDefinition[] {
  const queryTokens = parseWorkflowSearchTokens(query);
  if (queryTokens.length === 0) return workflows;

  return workflows.filter((workflow) => {
    const searchable = [
      workflow.name,
      workflow.description,
      workflow.category,
      workflow.tags.join(' '),
      workflow.status,
      workflow.policy.mode,
      workflow.policy.approvals.join(' '),
      workflow.steps.some((step) => step.approvalRequired) ? 'approval' : '',
      workflow.requiredPermissions.join(' '),
      workflow.enabledMcpServers.join(' '),
      workflow.allowedTools.join(' '),
      workflow.enabledSkills.join(' '),
      workflow.contextGrants.join(' ')
    ].join(' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ');
    return queryTokens.every((token) => searchable.includes(token));
  });
}

export function getWorkflowById(workflows: WorkflowDefinition[], workflowId: string): WorkflowDefinition | undefined {
  return workflows.find((workflow) => workflow.id === workflowId);
}

export function findWorkflowByRouteTarget(workflows: WorkflowDefinition[], target: string): WorkflowDefinition | undefined {
  const normalizedTarget = normalizeWorkflowRouteTarget(target);
  if (!normalizedTarget) return undefined;
  return workflows.find((workflow) => (
    normalizeWorkflowRouteTarget(workflow.id) === normalizedTarget ||
    normalizeWorkflowRouteTarget(workflow.name) === normalizedTarget
  ));
}

export function getWorkflowToolScopeSummary(workflow: WorkflowDefinition): string {
  const toolLabel = workflow.allowedTools.length === 1 ? 'allowed tool' : 'allowed tools';
  return `${workflow.agents[0]?.name || workflow.orchestrator.name}, ${workflow.allowedTools.length} ${toolLabel}, ${workflow.policy.mode.replace('_', ' ')}`;
}

export function getOptimisticWorkflowRunStatus(workflow: WorkflowDefinition): WorkflowRunRecord['status'] {
  const requiresApproval = workflow.policy.approvals.length > 0 || workflow.steps.some((step) => step.approvalRequired);
  return requiresApproval ? 'waiting_approval' : 'dispatching';
}

export function getWorkflowLaunchBlocker(
  workflow: WorkflowDefinition,
  message: string,
  permissions?: WorkflowLaunchPermissions
): string | null {
  if (workflow.status !== 'active') return 'Activate this workflow before launching it.';
  if (!message.trim()) return 'Add a control message before launching.';
  if (!permissions?.create_sessions) return 'You need create_sessions to launch workflows.';
  if (workflow.policy.mode === 'read_write' && !permissions.create_read_write_runs) {
    return 'You need create_read_write_runs to launch this workflow.';
  }
  if (workflow.policy.mode === 'read_only' && !permissions.create_read_only_runs) {
    return 'You need create_read_only_runs to launch this workflow.';
  }
  return null;
}

export function getWorkflowTabLabel(tab: WorkflowTab): string {
  if (tab === 'overview') return 'Overview';
  if (tab === 'agents') return 'Agents';
  if (tab === 'capabilities') return 'Capability review';
  if (tab === 'runs') return 'Runs';
  return 'Settings';
}
