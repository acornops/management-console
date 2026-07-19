export const FIXTURE_IDS = {
  user: 'fixture-user',
  workspace: 'fixture-workspace',
  cluster: 'fixture-cluster',
  virtualMachine: 'fixture-vm',
  workflowAnalystAgent: 'fixture-workflow-analyst',
  specialistAgent: 'fixture-specialist',
  targetDiagnosticsAgent: 'fixture-target-diagnostics-agent',
  incidentReporterAgent: 'fixture-incident-reporter-agent',
  workflow: 'fixture-workflow',
  session: 'fixture-session',
  run: 'fixture-run'
} as const;

const NOW = '2026-07-15T08:30:00.000Z';
const EARLIER = '2026-07-15T07:45:00.000Z';

export interface FixtureState {
  user: Record<string, unknown>;
  workspaces: Array<Record<string, unknown>>;
  members: Array<Record<string, unknown>>;
  invitations: Array<Record<string, unknown>>;
  clusters: Array<Record<string, any>>;
  virtualMachines: Array<Record<string, any>>;
  issues: Array<Record<string, unknown>>;
  auditEvents: Array<Record<string, unknown>>;
  aiSettings: Record<string, any>;
  agents: Array<Record<string, any>>;
  workflows: Array<Record<string, any>>;
  automationTemplates: Array<Record<string, any>>;
  workflowSchedules: Array<Record<string, any>>;
  catalogSources: Array<Record<string, any>>;
  catalogArtifacts: Array<Record<string, any>>;
  sessions: Array<Record<string, any>>;
  messages: Record<string, Array<Record<string, any>>>;
  runs: Record<string, Record<string, any>>;
  resources: Array<Record<string, any>>;
  targetTools: Array<Record<string, any>>;
  targetSkills: Array<Record<string, any>>;
  targetMcpServers: Array<Record<string, any>>;
  agentMcpServers: Array<Record<string, any>>;
  mcpConnections: Record<string, Record<string, any>>;
}

const allPermissions = {
  read_workspace_data: true,
  read_members: true,
  read_audit_log: true,
  delete_workspace: true,
  manage_members: true,
  manage_targets: true,
  manage_mcp: true,
  manage_catalog_sources: true,
  manage_tools: true,
  manage_target_insights: true,
  manage_skills: true,
  manage_workflows: true,
  manage_agents: true,
  manage_ai_settings: true,
  manage_agent_keys: true,
  manage_webhooks: true,
  create_sessions: true,
  create_read_only_runs: true,
  create_read_write_runs: true,
  read_target_logs: true,
  cancel_runs: true,
  delete_sessions: true
};

function clusterSnapshot() {
  return {
    clusterId: FIXTURE_IDS.cluster,
    workspaceId: FIXTURE_IDS.workspace,
    timestamp: NOW,
    data: {
      metrics: {
        available: true,
        nodes: [{ name: 'fixture-control-plane', usage: { cpu: '325m', memory: '768Mi' } }]
      },
      resources: {
        pods: [
          {
            name: 'checkout-api-6f8c7d9d4c-demo', namespace: 'production', uid: 'pod-checkout',
            creationTimestamp: EARLIER, phase: 'Running', nodeName: 'fixture-control-plane', restartCount: 1,
            labels: { app: 'checkout-api' }, containerStatuses: [{ name: 'api', ready: true, restartCount: 1 }]
          },
          {
            name: 'payments-worker-7c5b9f-demo', namespace: 'production', uid: 'pod-payments',
            creationTimestamp: EARLIER, phase: 'Pending', nodeName: 'fixture-control-plane', restartCount: 4,
            labels: { app: 'payments-worker' },
            containerStatuses: [{ name: 'worker', ready: false, restartCount: 4, state: { waiting: { reason: 'CrashLoopBackOff', message: 'back-off restarting failed container' } } }]
          }
        ],
        nodes: [{
          name: 'fixture-control-plane', uid: 'node-fixture', kubeletVersion: 'v1.31.3+k3s1',
          osImage: 'Alpine Linux', containerRuntimeVersion: 'containerd://1.7.22', architecture: 'amd64',
          operatingSystem: 'linux', labels: { 'node-role.kubernetes.io/control-plane': 'true' },
          status: { conditions: [{ type: 'Ready', status: 'True', reason: 'KubeletReady' }] }
        }],
        namespaces: [
          { name: 'default', uid: 'ns-default', creationTimestamp: EARLIER, status: 'Active' },
          { name: 'production', uid: 'ns-production', creationTimestamp: EARLIER, status: 'Active' }
        ],
        deployments: [
          { name: 'checkout-api', namespace: 'production', uid: 'deploy-checkout', creationTimestamp: EARLIER, replicas: 3, readyReplicas: 3, availableReplicas: 3 },
          { name: 'payments-worker', namespace: 'production', uid: 'deploy-payments', creationTimestamp: EARLIER, replicas: 2, readyReplicas: 1, availableReplicas: 1 }
        ],
        statefulSets: [], daemonSets: [], cronJobs: [], jobs: [],
        services: [{ name: 'checkout-api', namespace: 'production', uid: 'svc-checkout', creationTimestamp: EARLIER, type: 'ClusterIP', clusterIP: '10.43.12.8', ports: [{ name: 'http', port: 80, targetPort: 8080, protocol: 'TCP' }] }],
        ingresses: [{ name: 'checkout', namespace: 'production', uid: 'ingress-checkout', creationTimestamp: EARLIER, ingressClassName: 'traefik', hosts: ['shop.fixture.local'], address: '127.0.0.1' }],
        pvcs: [{ name: 'checkout-cache', namespace: 'production', uid: 'pvc-checkout', creationTimestamp: EARLIER, status: 'Bound', capacity: '10Gi', accessModes: ['ReadWriteOnce'], storageClass: 'local-path' }]
      },
      events: [{ involvedObject: { kind: 'Pod', name: 'payments-worker-7c5b9f-demo', namespace: 'production' }, reason: 'BackOff', message: 'Back-off restarting failed container', type: 'Warning', lastTimestamp: NOW }]
    }
  };
}

export function createFixtureState(): FixtureState {
  const workspace = {
    id: FIXTURE_IDS.workspace,
    name: 'AcornOps Fixture Lab',
    plan: { key: 'development', name: 'Development' },
    createdBy: FIXTURE_IDS.user,
    currentUserRole: 'owner',
    currentUserRoleTemplate: { key: 'owner', displayName: 'Owner', description: 'Full workspace access', kind: 'system', capabilities: Object.keys(allPermissions), protected: true, sortOrder: 10 },
    permissions: allPermissions,
    clusterCount: 1,
    memberCount: 3,
    quota: {
      members: { used: 3, limit: 25 },
      kubernetesClusters: { used: 1, limit: 10 },
      virtualMachines: { used: 1, limit: 10 }
    }
  };
  const cluster = {
    id: FIXTURE_IDS.cluster,
    workspaceId: FIXTURE_IDS.workspace,
    name: 'Singapore Production',
    status: 'online',
    namespaceInclude: [],
    namespaceExclude: ['kube-system'],
    writeConfirmationPolicy: { effectiveRequired: true, overrideRequired: null, source: 'deployment_default' },
    summary: {
      resourceCount: 12, findingCount: 2, criticalFindingCount: 1, namespaceCount: 2, nodeCount: 1,
      resourceFamilyCounts: { workloads: 6, network: 3, storage: 1, cluster: 2 },
      resourceKindCounts: { Pod: 2, Deployment: 2, Service: 1, Ingress: 1, PersistentVolumeClaim: 1, Node: 1, Namespace: 2 }
    },
    latestSnapshot: clusterSnapshot()
  };
  const virtualMachine = {
    id: FIXTURE_IDS.virtualMachine,
    workspaceId: FIXTURE_IDS.workspace,
    name: 'Payments VM',
    hostname: 'payments-01.fixture.internal',
    osFamily: 'linux',
    serviceManager: 'systemd',
    allowedLogSources: ['system', 'app', 'security'],
    status: 'online',
    summary: { inventoryCount: 8, findingCount: 1, criticalFindingCount: 0, serviceCount: 4, processCount: 24, listenerCount: 6, logCount: 150 },
    createdAt: EARLIER,
    updatedAt: NOW,
    latestSnapshot: { targetId: FIXTURE_IDS.virtualMachine, workspaceId: FIXTURE_IDS.workspace, timestamp: NOW }
  };
  const targetTools = [
    { id: 'get_resource', name: 'get_resource', description: 'Read a Kubernetes resource', capability: 'read', enabledConfigured: true, enabledEffective: true, effectiveDisabledReason: null, source: 'builtin', version: '1.0.0' },
    { id: 'patch_resource', name: 'patch_resource', description: 'Patch a Kubernetes resource after approval', capability: 'write', enabledConfigured: true, enabledEffective: true, effectiveDisabledReason: null, source: 'builtin', version: '1.0.0' }
  ];
  const agents = [
    {
      id: FIXTURE_IDS.workflowAnalystAgent, workspaceId: FIXTURE_IDS.workspace, name: 'Workflow Analyst',
      description: 'Inspects repository state and prepares bounded operational changes.',
      instructions: 'Inspect repository evidence before proposing or applying a change.',
      status: 'active', origin: { type: 'template', templateId: 'repository-operator', templateVersion: 2 },
      kind: 'specialist', reviewState: 'reviewed', providerType: 'internal', createdBy: FIXTURE_IDS.user,
      version: 3, permissionMode: 'ask_before_changes',
      semanticCapabilityIds: ['target.read', 'issue.read'], targetScope: { type: 'workspace', targetTypes: ['kubernetes', 'virtual_machine'], targetIds: [] },
      contextScope: ['workspace', 'targets'], contextGrants: ['workspace.summary'],
      activity: { runCount: 8, lastRunAt: NOW, lastStatus: 'completed' }, readiness: { status: 'ready', reasons: [] },
      capabilitySummary: 'Repository inspection and issue triage', createdAt: EARLIER, updatedAt: NOW
    },
    {
      id: FIXTURE_IDS.specialistAgent, workspaceId: FIXTURE_IDS.workspace, name: 'Kubernetes Specialist',
      description: 'Investigates Kubernetes health and workload failures.',
      instructions: 'Inspect live cluster evidence before recommending a change.',
      status: 'active', origin: { type: 'manual' }, kind: 'specialist', reviewState: 'reviewed', providerType: 'internal',
      createdBy: FIXTURE_IDS.user, ownerUserId: FIXTURE_IDS.user, version: 2,
      tools: ['get_resource', 'list_resources'], skills: ['fixture-kubernetes-triage'],
      permissionMode: 'ask_before_changes', semanticCapabilityIds: ['target.kubernetes.read'],
      targetScope: { type: 'selected_target', targetTypes: ['kubernetes'], targetIds: [FIXTURE_IDS.cluster] },
      contextScope: ['target'], contextGrants: ['target.snapshot'], activity: { runCount: 12, lastRunAt: NOW, lastStatus: 'completed' },
      readiness: { status: 'ready', reasons: [] }, capabilitySummary: 'Kubernetes inspection and diagnostics', createdAt: EARLIER, updatedAt: NOW
    },
    {
      id: FIXTURE_IDS.targetDiagnosticsAgent, workspaceId: FIXTURE_IDS.workspace, name: 'Target Diagnostics',
      description: 'Collects diagnostic evidence from an explicitly selected target.',
      instructions: 'Inspect only the exact target scope compiled for this run.',
      status: 'active', origin: { type: 'template', templateId: 'acornops-starter', templateVersion: 3 },
      kind: 'specialist', reviewState: 'reviewed', providerType: 'internal', createdBy: FIXTURE_IDS.user,
      version: 1, permissionMode: 'ask_before_changes', semanticCapabilityIds: ['target.diagnostics.read'],
      targetScope: { type: 'selected_target', targetTypes: ['kubernetes', 'virtual_machine'], targetIds: [] },
      contextScope: ['target'], contextGrants: [], activity: { runCount: 0 }, readiness: { status: 'ready', reasons: [] },
      capabilitySummary: 'Target diagnostics', createdAt: EARLIER, updatedAt: NOW
    },
    {
      id: FIXTURE_IDS.incidentReporterAgent, workspaceId: FIXTURE_IDS.workspace, name: 'Incident Reporter',
      description: 'Produces an incident report from explicitly granted evidence.',
      instructions: 'Use only evidence and context present in the compiled scope.',
      status: 'active', origin: { type: 'template', templateId: 'acornops-starter', templateVersion: 3 },
      kind: 'specialist', reviewState: 'reviewed', providerType: 'internal', createdBy: FIXTURE_IDS.user,
      version: 1, permissionMode: 'ask_before_changes', semanticCapabilityIds: ['chat.sessions.read_selected', 'reports.pdf.generate'],
      targetScope: { type: 'workspace', targetTypes: [], targetIds: [] }, contextScope: ['workspace'],
      contextGrants: ['selected_chat_sessions'], activity: { runCount: 0 }, readiness: { status: 'ready', reasons: [] },
      capabilitySummary: 'Incident reporting', createdAt: EARLIER, updatedAt: NOW
    }
  ];
  const workflows = [{
    id: FIXTURE_IDS.workflow, workspaceId: FIXTURE_IDS.workspace, version: 2,
    origin: { type: 'manual' }, source: 'user', name: 'Production health review',
    description: 'Review target health and summarize prioritized follow-up actions.', status: 'active',
    createdBy: FIXTURE_IDS.user, createdByUser: { id: FIXTURE_IDS.user, displayName: 'Ning', email: 'ning@fixture.acornops.dev' },
    createdAt: EARLIER, prompt: 'Review recent issues and produce a concise operational summary.',
    starterPrompt: 'Review production health', agentIds: [FIXTURE_IDS.workflowAnalystAgent, FIXTURE_IDS.specialistAgent],
    executionMode: 'coordinated',
    targetConstraints: { targetTypes: ['kubernetes', 'virtual_machine'], targetIds: [FIXTURE_IDS.cluster, FIXTURE_IDS.virtualMachine] },
    category: 'Operations', tags: ['production', 'health'], inputs: [],
    capabilityPolicy: { mode: 'read_only', semanticCapabilityIds: ['target.read', 'issue.read'], contextGrants: ['workspace.summary'], maxRuntimeSeconds: 600, retentionDays: 30, approvalRequirements: [] },
    readiness: { status: 'ready', reasons: [] }
  }, {
    id: 'fixture-template-target-diagnostics', workspaceId: FIXTURE_IDS.workspace, version: 1,
    origin: { type: 'template', templateId: 'acornops-starter', templateVersion: 3 }, source: 'system',
    name: 'Target diagnostics', description: 'Inspect one exact target using live diagnostic evidence.', status: 'draft',
    createdBy: FIXTURE_IDS.user, createdAt: EARLIER,
    prompt: 'Inspect the selected target using live diagnostic evidence and summarize safe next actions.',
    agentIds: [FIXTURE_IDS.targetDiagnosticsAgent], executionMode: 'direct',
    targetConstraints: { targetTypes: ['kubernetes', 'virtual_machine'], targetIds: [FIXTURE_IDS.cluster] },
    category: 'Operations', tags: ['diagnostics'], inputs: [],
    capabilityPolicy: { mode: 'read_only', semanticCapabilityIds: ['target.kubernetes.read'], contextGrants: [], maxRuntimeSeconds: 900, retentionDays: 90, approvalRequirements: [] },
    readiness: { status: 'ready', reasons: [] }
  }, {
    id: 'fixture-template-incident-report', workspaceId: FIXTURE_IDS.workspace, version: 1,
    origin: { type: 'template', templateId: 'acornops-starter', templateVersion: 3 }, source: 'system',
    name: 'Incident report', description: 'Generate an incident report from explicitly granted evidence.', status: 'active',
    createdBy: FIXTURE_IDS.user, createdAt: EARLIER,
    prompt: 'Generate an incident report with provenance from only the granted evidence.',
    agentIds: [FIXTURE_IDS.incidentReporterAgent], executionMode: 'direct',
    targetConstraints: null, category: 'Reporting', tags: ['incident'],
    inputs: [{ name: 'incidentChats', label: 'Incident chats', type: 'chat_session_list', required: true, optionSource: 'chatSessions' }],
    capabilityPolicy: { mode: 'read_only', restrictionMode: 'inherit', semanticCapabilityIds: [], contextGrants: ['selected_chat_sessions'], maxRuntimeSeconds: 900, retentionDays: 180, approvalRequirements: [] },
    readiness: { status: 'ready', reasons: [] }
  }];
  const automationTemplates = [
    {
      id: 'target-diagnostics', version: 3, name: 'Target diagnostics',
      description: 'Inspect one exact target using live diagnostic evidence.', installMode: 'automatic',
      installationStatus: 'ready', setupSteps: [], blockerCodes: [],
      workflowId: 'fixture-template-target-diagnostics'
    },
    {
      id: 'target-remediation', version: 3, name: 'Target remediation',
      description: 'Diagnose and safely change one exact target with approval-gated writes.', installMode: 'opt_in',
      installationStatus: 'not_installed', setupSteps: ['Install workflow', 'Select an exact Kubernetes target', 'Preview approval-gated tools', 'Activate'],
      blockerCodes: ['TEMPLATE_NOT_INSTALLED']
    },
    {
      id: 'incident-report', version: 3, name: 'Incident report',
      description: 'Generate an incident report from explicitly granted evidence.', installMode: 'automatic',
      installationStatus: 'active', setupSteps: [], blockerCodes: [],
      workflowId: 'fixture-template-incident-report'
    },
    {
      id: 'incident-investigation', version: 3, name: 'Incident investigation',
      description: 'Coordinate target diagnostics and incident reporting for an exact target and selected chats.', installMode: 'opt_in',
      installationStatus: 'not_installed', setupSteps: ['Install workflow', 'Select an exact target and incident chats', 'Preview coordinated access', 'Activate'],
      blockerCodes: ['TEMPLATE_NOT_INSTALLED']
    }
  ];
  const sessions = [{
    id: FIXTURE_IDS.session, workspaceId: FIXTURE_IDS.workspace, targetId: FIXTURE_IDS.cluster, targetType: 'kubernetes', clusterId: FIXTURE_IDS.cluster,
    createdBy: FIXTURE_IDS.user, createdByUser: { id: FIXTURE_IDS.user, displayName: 'Ning' },
    title: 'Payments restart investigation', status: 'open', createdAt: EARLIER, updatedAt: NOW, lastMessageAt: NOW,
    expiresAt: '2026-08-14T08:30:00.000Z'
  }];
  const messages = {
    [FIXTURE_IDS.session]: [
      { id: 'fixture-message-user', sessionId: FIXTURE_IDS.session, runId: FIXTURE_IDS.run, role: 'user', kind: 'user', content: 'Why is the payments worker restarting?', createdAt: EARLIER },
      { id: 'fixture-message-assistant', sessionId: FIXTURE_IDS.session, runId: FIXTURE_IDS.run, role: 'assistant', kind: 'assistant_final', content: 'The worker is in CrashLoopBackOff after four restarts. Its latest event points to a failed container startup; inspect the application log and secret mount before changing the Deployment.', createdAt: NOW }
    ]
  };
  return {
    user: { id: FIXTURE_IDS.user, email: 'ning@fixture.acornops.dev', displayName: 'Ning', quota: { workspaceMemberships: { used: 1, limit: 10 } } },
    workspaces: [workspace],
    members: [
      { workspaceId: FIXTURE_IDS.workspace, userId: FIXTURE_IDS.user, email: 'ning@fixture.acornops.dev', displayName: 'Ning', role: 'owner', roleTemplate: workspace.currentUserRoleTemplate, source: 'internal' },
      { workspaceId: FIXTURE_IDS.workspace, userId: 'fixture-member-2', email: 'maya@fixture.acornops.dev', displayName: 'Maya Chen', role: 'admin', source: 'oidc' },
      { workspaceId: FIXTURE_IDS.workspace, userId: 'fixture-member-3', email: 'sam@fixture.acornops.dev', displayName: 'Sam Rivera', role: 'viewer', source: 'oidc' }
    ],
    invitations: [{ id: 'fixture-invitation', workspaceId: FIXTURE_IDS.workspace, workspaceName: workspace.name, email: 'alex@fixture.acornops.dev', role: 'viewer', invitedBy: FIXTURE_IDS.user, status: 'pending', createdAt: NOW, expiresAt: '2026-07-22T08:30:00.000Z', token: 'fixture-invitation-token' }],
    clusters: [cluster],
    virtualMachines: [virtualMachine],
    issues: [{ id: 'fixture-issue', workspaceId: FIXTURE_IDS.workspace, targetId: FIXTURE_IDS.cluster, targetType: 'kubernetes', targetName: cluster.name, fingerprint: 'fixture/payments/crashloop', issueType: 'pod_crash_loop', status: 'active', severity: 'critical', title: 'Payments worker is restarting', summary: 'One replica is in CrashLoopBackOff.', scopeKind: 'Pod', scopeName: 'payments-worker-7c5b9f-demo', namespace: 'production', objectKind: 'Pod', objectName: 'payments-worker-7c5b9f-demo', reason: 'CrashLoopBackOff', firstSeenAt: EARLIER, lastSeenAt: NOW, lastObservedSnapshotAt: NOW, occurrenceCount: 4, reopenedCount: 0, cleanSnapshotCount: 0, latestEvidence: { restartCount: 4 }, createdAt: EARLIER, updatedAt: NOW }],
    auditEvents: [{ id: 'fixture-audit', workspaceId: FIXTURE_IDS.workspace, category: 'target', eventType: 'target.snapshot.updated', operation: 'write', actor: { type: 'system', displayName: 'AgentK' }, object: { type: 'kubernetes_cluster', id: FIXTURE_IDS.cluster, name: cluster.name }, summary: 'Cluster snapshot and issue signals updated', metadata: { resourceCount: 12 }, occurredAt: NOW }],
    aiSettings: {
      workspaceId: FIXTURE_IDS.workspace, defaultProvider: 'openai', defaultModel: 'gpt-5.5', reasoningSummaryMode: 'concise', reasoningEffort: 'medium',
      allowedReasoningSummaryModes: ['off', 'auto', 'concise', 'detailed'], allowedReasoningEfforts: ['off', 'low', 'medium', 'high'], reasoningSummariesEnabled: true,
      allowedProviders: ['openai', 'anthropic', 'gemini'],
      allowedProviderModels: { openai: ['gpt-5.5', 'gpt-5.4-mini'], anthropic: ['claude-sonnet-4-6'], gemini: ['gemini-3.5-flash'] },
      allowedModels: ['gpt-5.5', 'gpt-5.4-mini', 'claude-sonnet-4-6', 'gemini-3.5-flash'],
      providers: [{ provider: 'openai', configured: true, enabled: true }, { provider: 'anthropic', configured: false, enabled: true }, { provider: 'gemini', configured: false, enabled: true }]
    },
    agents,
    workflows,
    automationTemplates,
    workflowSchedules: [
      { id: 'fixture-schedule', workspaceId: FIXTURE_IDS.workspace, workflowId: FIXTURE_IDS.workflow, workflowVersion: 2, name: 'Weekday morning review', status: 'enabled', cron: '0 9 * * 1-5', timezone: 'Asia/Singapore', inputDefaults: {}, approvedContextGrants: ['workspace.summary'], principal: { type: 'user', id: FIXTURE_IDS.user }, createdBy: { userId: FIXTURE_IDS.user, displayName: 'Ning' }, updatedAt: NOW },
      { id: 'fixture-mcp-auto-pause', workspaceId: FIXTURE_IDS.workspace, workflowId: FIXTURE_IDS.workflow, workflowVersion: 2, name: 'MCP recovery review', status: 'paused', cron: '15 9 * * 1-5', timezone: 'Asia/Singapore', inputDefaults: {}, approvedContextGrants: ['workspace.summary'], principal: { type: 'user', id: FIXTURE_IDS.user }, lastStatus: 'auto_paused', lastError: 'MCP_PERSONAL_CONNECTION_REQUIRED: personal connection is missing for a required approved MCP tool.', createdBy: { userId: FIXTURE_IDS.user, displayName: 'Ning' }, updatedAt: NOW }
    ],
    catalogSources: [{ id: 'fixture-catalog-source', workspaceId: FIXTURE_IDS.workspace, displayName: 'Internal MCP Registry', baseUrl: 'https://registry.internal.example', authType: 'none', credentialConfigured: false, networkRoute: 'direct', enabled: true, managementMode: 'bootstrap', bindings: [{ id: 'fixture-binding', artifactKind: 'mcp_server', adapterType: 'mcp_registry_v0_1', adapterBasePath: '/v0.1', syncStatus: 'ready', lastSyncAt: NOW }] }],
    catalogArtifacts: [{ id: 'fixture-catalog-artifact', workspaceId: FIXTURE_IDS.workspace, sourceId: 'fixture-catalog-source', bindingId: 'fixture-binding', artifactKind: 'mcp_server', name: 'github-observer', title: 'GitHub Observer', description: 'Read-only repository and pull request context for operational workflows.', version: '1.4.0', digest: 'sha256:fixture-catalog-digest', metadata: { publisher: 'AcornOps', categories: ['developer-tools'] }, compatible: true, remoteEndpoints: [{ type: 'streamable-http', url: 'https://mcp.fixture.acornops.dev/github', supported: true, requiresPersonalAuth: true }], publishedAt: EARLIER, upstreamUpdatedAt: NOW }],
    sessions,
    messages,
    runs: { [FIXTURE_IDS.run]: { id: FIXTURE_IDS.run, workspaceId: FIXTURE_IDS.workspace, sessionId: FIXTURE_IDS.session, messageId: 'fixture-message-user', targetId: FIXTURE_IDS.cluster, targetType: 'kubernetes', clusterId: FIXTURE_IDS.cluster, status: 'completed', requestedAt: EARLIER, startedAt: EARLIER, endedAt: NOW, usage: { input_tokens: 640, output_tokens: 118, tool_calls: 2 }, assistantMessage: { content: messages[FIXTURE_IDS.session][1].content, format: 'markdown' } } },
    resources: [
      { id: 'production/checkout-api', family: 'workloads', kind: 'Deployment', name: 'checkout-api', namespace: 'production', status: 'Healthy', clusterId: FIXTURE_IDS.cluster, clusterName: cluster.name, item: { replicas: 3, readyReplicas: 3, availableReplicas: 3 } },
      { id: 'production/payments-worker', family: 'workloads', kind: 'Pod', name: 'payments-worker-7c5b9f-demo', namespace: 'production', status: 'Critical', node: 'fixture-control-plane', clusterId: FIXTURE_IDS.cluster, clusterName: cluster.name, item: { phase: 'Running', restartCount: 4 } }
    ],
    targetTools,
    targetSkills: [{ id: 'fixture-kubernetes-triage', name: 'Kubernetes triage', description: 'Evidence-first workload health investigation.', enabled: true, revision: 1, contentDigest: 'sha256:fixture-skill', source: { type: 'manual' }, files: [{ path: 'SKILL.md', content: '# Kubernetes triage\nInspect events, status, and logs.', contentDigest: 'sha256:fixture-skill-file' }] }],
    targetMcpServers: [{ id: 'fixture-mcp', workspace_id: FIXTURE_IDS.workspace, target_id: FIXTURE_IDS.cluster, target_type: 'kubernetes', server_name: 'AcornOps Kubernetes Tools', server_url: 'builtin://agentk', enabled: true, auth_type: 'none', auth_scope: 'none', connection_status: 'ok', last_discovery_at: NOW, last_discovery_error: null, revision: 1, tools: targetTools.map((tool) => ({ name: tool.name, description: tool.description, capability: tool.capability, version: tool.version, source: tool.source, enabled: true, mcp_server_url: 'builtin://agentk', timeout_ms: 10000 })) }],
    agentMcpServers: [],
    mcpConnections: {}
  };
}

let fixtureState = createFixtureState();

export function getFixtureState(): FixtureState {
  return fixtureState;
}

export function resetFixtureStore(): FixtureState {
  fixtureState = createFixtureState();
  return fixtureState;
}
