const workspace = '/workspaces/fixture-workspace';
const cluster = '/kubernetes-clusters/fixture-cluster';
const workspaceCluster = `${workspace}/kubernetes-clusters/fixture-cluster`;
const virtualMachine = `${workspace}/virtual-machines/fixture-vm`;

/**
 * Canonical route coverage shared by built-route smoke checks and the
 * route-level visual, accessibility, and text-reflow contract.
 *
 * `ready` is a selector for the first stable landmark rendered by the route.
 */
export const routeCoverageManifest = [
  { name: 'login', category: 'login', path: '/?fixtureAnonymous=1', ready: 'h1' },
  { name: 'workspace-overview', category: 'workspace', path: `${workspace}/overview`, ready: 'h1' },
  { name: 'workspace-kubernetes-clusters', category: 'workspace', path: `${workspace}/kubernetes-clusters`, ready: 'h1' },
  { name: 'workspace-virtual-machines', category: 'workspace', path: `${workspace}/virtual-machines`, ready: 'h1' },
  { name: 'workspace-catalog', category: 'workspace', path: `${workspace}/catalog`, ready: 'h1' },
  { name: 'workspace-agents', category: 'agent', path: `${workspace}/agents`, ready: 'h1' },
  { name: 'agent-chat', category: 'agent', path: `${workspace}/agents/fixture-specialist/chat`, ready: 'h1' },
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
  { name: 'workspace-runs', category: 'automation', path: `${workspace}/runs`, ready: 'h1' },
  { name: 'workspace-schedules', category: 'automation', path: `${workspace}/triggers`, ready: 'h1' },
  {
    name: 'workspace-event-triggers',
    category: 'automation',
    path: `${workspace}/triggers?type=acornops_event`,
    ready: 'h1'
  },
  {
    name: 'workspace-webhook-triggers',
    category: 'automation',
    path: `${workspace}/triggers?type=webhook`,
    ready: 'h1'
  },
  { name: 'workspace-webhooks', category: 'automation', path: `${workspace}/webhooks`, ready: 'h1' },
  { name: 'workspace-approvals', category: 'governance', path: `${workspace}/approvals`, ready: 'h1' },
  { name: 'workspace-audit-log', category: 'governance', path: `${workspace}/audit-log`, ready: 'h1' },
  { name: 'workspace-members', category: 'settings', path: `${workspace}/members`, ready: 'h1' },
  { name: 'workspace-ai-settings', category: 'settings', path: `${workspace}/ai-settings`, ready: 'h1' },
  {
    name: 'workspace-mcp-registries',
    category: 'settings',
    path: `${workspace}/settings?section=mcp-registries`,
    ready: 'h1'
  },
  { name: 'account-settings', category: 'settings', path: '/account', ready: 'h1' },
  { name: 'cluster-overview', category: 'kubernetes', path: `${cluster}/overview`, ready: 'h1' },
  { name: 'cluster-resources', category: 'kubernetes', path: `${cluster}/resources`, ready: 'h1' },
  { name: 'cluster-mcp-servers', category: 'kubernetes', path: `${cluster}/mcp-servers`, ready: 'h1' },
  { name: 'cluster-skills', category: 'kubernetes', path: `${cluster}/skills`, ready: 'h1' },
  { name: 'cluster-tools', category: 'kubernetes', path: `${cluster}/tools`, ready: 'h1' },
  { name: 'cluster-chat', category: 'kubernetes', path: `${workspaceCluster}/chat?session=fixture-session`, ready: 'h1' },
  { name: 'cluster-settings', category: 'kubernetes', path: `${cluster}/settings`, ready: 'h1' },
  { name: 'vm-overview', category: 'virtual-machine', path: `${virtualMachine}/overview`, ready: 'h1' },
  { name: 'vm-resources', category: 'virtual-machine', path: `${virtualMachine}/resources`, ready: 'h1' },
  { name: 'vm-mcp-servers', category: 'virtual-machine', path: `${virtualMachine}/mcp-servers`, ready: 'h1' },
  { name: 'vm-skills', category: 'virtual-machine', path: `${virtualMachine}/skills`, ready: 'h1' },
  { name: 'vm-tools', category: 'virtual-machine', path: `${virtualMachine}/tools`, ready: 'h1' },
  { name: 'vm-chat', category: 'virtual-machine', path: `${virtualMachine}/chat?session=fixture-session`, ready: 'h1' },
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
  }
];

export const requiredRouteCoverageCategories = [
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
