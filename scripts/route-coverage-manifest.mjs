const workspace = '/workspaces/fixture-workspace';
const cluster = '/kubernetes-clusters/fixture-cluster';
const workspaceCluster = `${workspace}/kubernetes-clusters/fixture-cluster`;
const virtualMachine = `${workspace}/virtual-machines/fixture-vm`;

/**
 * Canonical route coverage shared by built-route smoke checks and the
 * route-level visual, accessibility, and text-reflow contract.
 *
 * `ready` is a selector for the first stable landmark rendered by the route.
 * `preserveScroll` marks routes whose baseline intentionally captures a
 * deep-linked section rather than the route origin.
 */
export const routeCoverageManifest = [
  { name: 'login', category: 'login', path: '/?fixtureAnonymous=1', ready: 'h1' },
  { name: 'signed-in-home', category: 'entry', path: '/', ready: '[data-attention-board="true"]' },
  { name: 'workspaces', category: 'entry', path: '/workspaces', ready: '[data-route-state="workspaces"]' },
  { name: 'help', category: 'entry', path: '/help', ready: '[data-route-state="help"]' },
  { name: 'not-found', category: 'entry', path: '/route-coverage-not-found', ready: '[data-route-state="not-found"]' },
  { name: 'global-kubernetes-clusters', category: 'workspace', path: '/kubernetes-clusters', ready: '[data-cluster-catalog-scope]' },
  { name: 'workspace-overview', category: 'workspace', path: `${workspace}/overview`, ready: 'h1' },
  { name: 'workspace-kubernetes-clusters', category: 'workspace', path: `${workspace}/kubernetes-clusters`, ready: 'h1' },
  { name: 'workspace-virtual-machines', category: 'workspace', path: `${workspace}/virtual-machines`, ready: 'h1' },
  { name: 'workspace-catalog', category: 'workspace', path: `${workspace}/catalog`, ready: 'h1' },
  {
    name: 'workspace-catalog-artifact-destination',
    category: 'workspace',
    path: `${workspace}/catalog?artifact=fixture-catalog-artifact&destination=agent%3Afixture-specialist`,
    ready: '[data-catalog-artifact="fixture-catalog-artifact"]'
  },
  { name: 'workspace-agents', category: 'agent', path: `${workspace}/agents`, ready: 'h1' },
  { name: 'agent-chat', category: 'agent', path: `${workspace}/agents/fixture-specialist/chat`, ready: 'h1' },
  { name: 'agent-chat-existing', category: 'agent', path: `${workspace}/agents/fixture-specialist/chat?session=fixture-agent-session`, ready: '[data-target-chat-surface="true"]' },
  { name: 'agent-settings', category: 'agent', path: `${workspace}/agents/fixture-specialist/settings`, ready: 'h1' },
  { name: 'agent-mcp-servers', category: 'agent', path: `${workspace}/agents/fixture-specialist/mcp-servers`, ready: 'h1' },
  { name: 'agent-skills', category: 'agent', path: `${workspace}/agents/fixture-specialist/skills`, ready: 'h1' },
  { name: 'agent-tools', category: 'agent', path: `${workspace}/agents/fixture-specialist/tools`, ready: 'h1' },
  {
    name: 'workspace-agent-capabilities',
    category: 'agent',
    path: `${workspace}/agents?agent=fixture-workflow-analyst&panel=profile&agentTab=capabilities&capabilityTab=mcp`,
    ready: 'h1'
  },
  { name: 'workspace-workflows', category: 'automation', path: `${workspace}/workflows`, ready: 'h1' },
  { name: 'workspace-workflow-create', category: 'automation', path: `${workspace}/workflows?panel=create`, ready: '#create-workflow-title' },
  { name: 'workspace-activity', category: 'automation', path: `${workspace}/activity`, ready: 'h1' },
  { name: 'workspace-schedules', category: 'automation', path: `${workspace}/workflows/schedules`, ready: 'h1' },
  {
    name: 'workspace-schedule-create',
    category: 'automation',
    path: `${workspace}/workflows/schedules?create=schedule&workflowId=fixture-workflow`,
    ready: '#schedule-drawer-title'
  },
  {
    name: 'workspace-incoming-webhooks',
    category: 'automation',
    path: `${workspace}/workflows/incoming-webhooks`,
    ready: 'h1'
  },
  {
    name: 'workspace-incoming-webhook-create',
    category: 'automation',
    path: `${workspace}/workflows/incoming-webhooks?create=webhook&workflowId=fixture-workflow`,
    ready: '#workflow-webhook-drawer-title'
  },
  { name: 'workspace-webhooks', category: 'automation', path: `${workspace}/webhooks`, ready: 'h1' },
  { name: 'workspace-approvals', category: 'governance', path: `${workspace}/approvals`, ready: 'h1' },
  {
    name: 'workspace-approval-focused',
    category: 'governance',
    path: `${workspace}/approvals?runId=fixture-execution-review-run&approvalId=fixture-workspace-approval`,
    ready: '[data-focused-approval="true"]:visible'
  },
  { name: 'workspace-audit-log', category: 'governance', path: `${workspace}/audit-log`, ready: 'h1' },
  { name: 'workspace-members', category: 'settings', path: `${workspace}/members`, ready: 'h1' },
  { name: 'workspace-ai-settings', category: 'settings', path: `${workspace}/ai-settings`, ready: 'h1' },
  {
    name: 'workspace-ai-settings-return',
    category: 'settings',
    path: `${workspace}/ai-settings?returnTo=%2Fworkspaces%2Ffixture-workspace%2Fkubernetes-clusters%2Ffixture-cluster%2Fchat%3Fsession%3Dfixture-session`,
    ready: '[data-assistant-return="true"]'
  },
  { name: 'workspace-settings', category: 'settings', path: `${workspace}/settings`, ready: '[data-settings-tab="workspace"]' },
  {
    name: 'workspace-mcp-registries',
    category: 'settings',
    path: `${workspace}/settings?section=mcp-registries`,
    ready: 'h1',
    preserveScroll: true
  },
  { name: 'account-settings', category: 'settings', path: '/account', ready: 'h1' },
  { name: 'cluster-overview', category: 'kubernetes', path: `${cluster}/overview`, ready: 'h1' },
  { name: 'cluster-resources', category: 'kubernetes', path: `${cluster}/resources`, ready: 'h1' },
  { name: 'cluster-health', category: 'kubernetes', path: `${cluster}/health`, ready: '[data-cluster-route-view="health"]' },
  { name: 'cluster-mcp-servers', category: 'kubernetes', path: `${cluster}/mcp-servers`, ready: 'h1' },
  { name: 'cluster-skills', category: 'kubernetes', path: `${cluster}/skills`, ready: 'h1' },
  { name: 'cluster-tools', category: 'kubernetes', path: `${cluster}/tools`, ready: 'h1' },
  { name: 'cluster-chat', category: 'kubernetes', path: `${workspaceCluster}/chat?session=fixture-session`, ready: 'h1' },
  { name: 'cluster-chat-new', category: 'kubernetes', path: `${workspaceCluster}/chat`, ready: '[data-target-chat-surface="true"]' },
  { name: 'cluster-settings', category: 'kubernetes', path: `${cluster}/settings`, ready: 'h1' },
  { name: 'vm-overview', category: 'virtual-machine', path: `${virtualMachine}/overview`, ready: 'h1' },
  { name: 'vm-resources', category: 'virtual-machine', path: `${virtualMachine}/resources`, ready: 'h1' },
  { name: 'vm-services', category: 'virtual-machine', path: `${virtualMachine}/services`, ready: '[data-vm-resource-category="services"]' },
  { name: 'vm-processes', category: 'virtual-machine', path: `${virtualMachine}/processes`, ready: '[data-vm-resource-category="processes"]' },
  { name: 'vm-network', category: 'virtual-machine', path: `${virtualMachine}/network`, ready: '[data-vm-resource-category="network"]' },
  { name: 'vm-logs', category: 'virtual-machine', path: `${virtualMachine}/logs`, ready: '[data-vm-resource-category="logs"]' },
  { name: 'vm-mcp-servers', category: 'virtual-machine', path: `${virtualMachine}/mcp-servers`, ready: 'h1' },
  { name: 'vm-skills', category: 'virtual-machine', path: `${virtualMachine}/skills`, ready: 'h1' },
  { name: 'vm-tools', category: 'virtual-machine', path: `${virtualMachine}/tools`, ready: 'h1' },
  { name: 'vm-chat', category: 'virtual-machine', path: `${virtualMachine}/chat?session=fixture-vm-session`, ready: 'h1' },
  { name: 'vm-chat-new', category: 'virtual-machine', path: `${virtualMachine}/chat`, ready: '[data-target-chat-surface="true"]' },
  { name: 'vm-settings', category: 'virtual-machine', path: `${virtualMachine}/settings`, ready: 'h1' },
  {
    name: 'workspace-invitation',
    category: 'invitation',
    path: '/invites/fixture-invitation-token',
    ready: 'h1'
  },
  {
    name: 'external-integration-linked',
    category: 'integration',
    path: '/integrations/external/link?status=linked',
    ready: '[role="status"]'
  },
  {
    name: 'external-integration-expired',
    category: 'integration',
    path: '/integrations/external/link?status=expired',
    ready: '[role="status"]'
  },
  {
    name: 'external-integration-cancelled',
    category: 'integration',
    path: '/integrations/external/link?status=cancelled',
    ready: '[role="status"]'
  },
  {
    name: 'external-integration-unavailable',
    category: 'integration',
    path: '/integrations/external/link',
    ready: '[role="status"]'
  }
];

export const requiredRouteCoverageCategories = [
  'entry',
  'workspace',
  'automation',
  'governance',
  'settings',
  'agent',
  'kubernetes',
  'virtual-machine',
  'login',
  'invitation',
  'integration'
];
