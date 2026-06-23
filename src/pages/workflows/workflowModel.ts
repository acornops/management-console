export type WorkflowStatus = 'active' | 'draft' | 'paused';
export type WorkflowCapabilityMode = 'read_only' | 'read_write';
export type WorkflowTab = 'chat' | 'runs' | 'mcp' | 'skills' | 'settings';

export interface WorkflowInput {
  name: string;
  label: string;
  type: 'text' | 'select' | 'chat_session_list' | 'repository' | 'format';
  required: boolean;
}

export interface WorkflowStep {
  id: string;
  title: string;
  prompt: string;
  requiredInputs: string[];
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

export interface WorkflowDefinition {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  source?: 'system' | 'user';
  category: string;
  tags: string[];
  lastRun: string;
  primaryAction: string;
  requiredPermissions: string[];
  enabledMcpServers: string[];
  allowedTools: string[];
  enabledSkills: string[];
  contextGrants: string[];
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
    targetRef?: string;
  };
  starterPrompt: string;
  runs: WorkflowRunRecord[];
}

const defaultWorkspaceId = 'current-workspace';

export function createDefaultWorkflowDefinitions(workspaceId = defaultWorkspaceId): WorkflowDefinition[] {
  return [
    {
      id: 'cluster-triage',
      workspaceId,
      name: 'Cluster triage',
      description: 'Investigate a selected cluster using inventory, events, logs, and metrics before recommending next steps.',
      status: 'active',
      source: 'system',
      category: 'cluster-triage',
      tags: ['cluster', 'triage', 'incident'],
      lastRun: 'Today 09:12',
      primaryAction: 'Start triage',
      requiredPermissions: ['read_workspace_data', 'create_read_only_runs'],
      enabledMcpServers: ['acornops-cluster-agent'],
      allowedTools: ['inventory.resources.list', 'events.search', 'logs.summarize', 'metrics.query'],
      enabledSkills: ['acornops-observability', 'acornops-target-boundary-design'],
      contextGrants: ['workspace_metadata', 'target_inventory'],
      inputs: [],
      steps: [
        {
          id: 'triage-selected-cluster',
          title: 'Triage selected cluster',
          prompt: 'Inspect the selected cluster and summarize likely causes, blast radius, and recommended operator actions.',
          requiredInputs: [],
          enabledSkills: ['acornops-observability', 'acornops-target-boundary-design'],
          allowedMcpServers: ['acornops-cluster-agent'],
          allowedTools: ['inventory.resources.list', 'events.search', 'logs.summarize', 'metrics.query'],
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
      starterPrompt: 'Triage the selected cluster. Start by showing the compiled read scope.',
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
      status: 'active',
      source: 'system',
      category: 'git-operations',
      tags: ['repository', 'configuration', 'pull-request'],
      lastRun: 'Yesterday',
      primaryAction: 'Start operation',
      requiredPermissions: ['read_workspace_data', 'create_read_write_runs'],
      enabledMcpServers: ['github'],
      allowedTools: ['github.repositories.read', 'github.branches.list', 'github.prs.list', 'github.branches.create', 'github.prs.create'],
      enabledSkills: ['acornops-cross-repo-change', 'acornops-open-pr'],
      contextGrants: ['workspace_metadata'],
      inputs: [],
      steps: [
        {
          id: 'prepare-repository-change',
          title: 'Prepare repository change',
          prompt: 'Inspect the selected repository, prepare a branch and PR plan, and request approval before write-capable actions.',
          requiredInputs: [],
          enabledSkills: ['acornops-cross-repo-change', 'acornops-open-pr'],
          allowedMcpServers: ['github'],
          allowedTools: ['github.repositories.read', 'github.branches.list', 'github.prs.list', 'github.branches.create', 'github.prs.create'],
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
      starterPrompt: 'Add the requested configuration to the selected repository. Confirm the target repo and intended change before using write tools.',
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
      description: 'Read selected incident chat sessions and generate a PDF report with timeline, impact, and follow-up actions.',
      status: 'active',
      source: 'system',
      category: 'incident-review',
      tags: ['incident', 'chat-history', 'pdf'],
      lastRun: 'Jun 20',
      primaryAction: 'Generate report',
      requiredPermissions: ['read_workspace_data', 'create_read_only_runs'],
      enabledMcpServers: ['workspace-chat', 'artifact-writer'],
      allowedTools: ['chat.sessions.read_selected', 'reports.pdf.generate'],
      enabledSkills: ['acornops-observability'],
      contextGrants: ['selected_chat_sessions'],
      inputs: [],
      steps: [
        {
          id: 'generate-incident-report',
          title: 'Generate incident report',
          prompt: 'Read selected incident chats, extract the timeline and evidence, then generate a PDF report artifact.',
          requiredInputs: [],
          enabledSkills: ['acornops-observability'],
          allowedMcpServers: ['workspace-chat', 'artifact-writer'],
          allowedTools: ['chat.sessions.read_selected', 'reports.pdf.generate'],
          contextGrants: ['selected_chat_sessions'],
          approvalRequired: false,
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
      starterPrompt: 'Generate an incident report from the selected chats. Show the selected chat sessions and report outline before producing the PDF.',
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

export function getWorkflowToolScopeSummary(workflow: WorkflowDefinition): string {
  const serverLabel = workflow.enabledMcpServers.length === 1 ? 'MCP server' : 'MCP servers';
  const toolLabel = workflow.allowedTools.length === 1 ? 'allowed tool' : 'allowed tools';
  return `${workflow.enabledMcpServers.length} ${serverLabel}, ${workflow.allowedTools.length} ${toolLabel}`;
}

export function getOptimisticWorkflowRunStatus(workflow: WorkflowDefinition): WorkflowRunRecord['status'] {
  const requiresApproval = workflow.policy.approvals.length > 0 || workflow.steps.some((step) => step.approvalRequired);
  return requiresApproval ? 'waiting_approval' : 'dispatching';
}

export function getWorkflowTabLabel(tab: WorkflowTab): string {
  if (tab === 'chat') return 'Chat';
  if (tab === 'runs') return 'Runs';
  if (tab === 'mcp') return 'MCP';
  if (tab === 'skills') return 'Skills';
  return 'Settings';
}
