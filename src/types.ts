
export enum HealthStatus {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED'
}

export interface KubernetesCluster {
  id: string;
  name: string;
  cluster: string;
  namespace: string;
  namespaceScope?: {
    include: string[];
    exclude: string[];
  };
  writeConfirmationPolicy?: {
    effectiveRequired: boolean;
    overrideRequired: boolean | null;
    source: 'cluster_override' | 'deployment_default';
  };
  workspaceId: string;
  agentConnectionState?: 'connected' | 'disconnected' | 'not_installed';
  owners: string[];
  healthEndpoint?: string;
  gitlabProjectId?: string;
  gitlabPipelines: string[];
  status: HealthStatus;
  podStats: {
    running: number;
    failed: number;
    pending: number;
  };
  metrics: {
    cpu: string;
    memory: string;
  };
  resourceSummary?: {
    resourceCount: number;
    findingCount: number;
    criticalFindingCount: number;
    namespaceCount: number;
    nodeCount: number;
    resourceFamilyCounts?: {
      workloads: number;
      network: number;
      storage: number;
      cluster: number;
    };
    resourceKindCounts?: Record<string, number>;
  };
  metricHistory?: ClusterMetricHistoryPoint[];
  lastUpdate: string;
  mcpTools: {
    toolId: string;
    enabled: boolean;
    toolType?: 'builtin' | 'mcp';
    capability?: 'read' | 'write';
    description?: string;
    version?: string;
    sourceServerId?: string;
    sourceServerName?: string;
    sourceServerUrl?: string;
    enabledConfigured?: boolean;
    enabledEffective?: boolean;
  }[];
  chatSessions: ChatSession[];
  workloads: Workload[];
  nodes: Node[];
  namespaces: Namespace[];
  services: Service[];
  ingresses: Ingress[];
  pvcs: PVC[];
  alerts: Alert[];
}

export interface VirtualMachine {
  id: string;
  workspaceId: string;
  name: string;
  hostname?: string;
  osFamily: 'linux';
  serviceManager: 'systemd';
  allowedLogSources: string[];
  agentConnectionState?: 'connected' | 'disconnected' | 'not_installed';
  status: HealthStatus;
  lastUpdate: string;
  latestSnapshot?: {
    targetId: string;
    workspaceId: string;
    timestamp: string;
  } | null;
}

export interface ClusterMetricHistoryPoint {
  timestamp: string;
  cpuCores: number | null;
  memoryBytes: number | null;
}

export interface ClusterToolCatalogItem {
  name: string;
  description: string;
  capability: 'read' | 'write';
  version: string;
  source: 'builtin' | 'mcp';
  enabledConfigured: boolean;
  enabledEffective: boolean;
  effectiveDisabledReason: 'server_disabled' | null;
}

export interface ClusterToolCatalogServer {
  id: string;
  name: string;
  url: string;
  type: 'builtin' | 'mcp';
  enabled: boolean;
  isSystem: boolean;
  canDelete: boolean;
  canEditConnection: boolean;
  authType: 'none' | 'bearer_token' | 'custom_header';
  publicHeaders?: Record<string, string>;
  connectionStatus: 'unknown' | 'ok' | 'error';
  lastDiscoveryAt: string | null;
  lastDiscoveryError: string | null;
  toolCounts: {
    total: number;
    enabledConfigured: number;
    enabledEffective: number;
    writeConfigured: number;
    writeEffective: number;
  };
  tools: ClusterToolCatalogItem[];
}

export interface ClusterToolCatalog {
  workspaceId: string;
  clusterId: string;
  permissions: {
    canEdit: boolean;
    editableRoles: string[];
  };
  servers: ClusterToolCatalogServer[];
}

export interface Workload {
  id: string;
  uid?: string;
  name: string;
  type: 'Deployment' | 'StatefulSet' | 'DaemonSet' | 'CronJob' | 'Job' | 'Pod';
  namespace: string;
  status: string;
  replicas?: string;
  desiredReplicas?: number;
  readyReplicas?: number;
  availableReplicas?: number;
  restarts?: number;
  age: string;
  node?: string;
  cpu?: string;
  memory?: string;
  containers?: string[];
  containerStatuses?: {
    name: string;
    ready?: boolean;
    restartCount?: number;
    state?: 'running' | 'waiting' | 'terminated' | 'unknown';
    reason?: string;
  }[];
  schedule?: string;
  lastRun?: string;
  completions?: string;
  duration?: string;
}

export interface Node {
  name: string;
  uid?: string;
  status: string;
  role: string;
  version: string;
  cpu: string;
  memory: string;
  osImage?: string;
  containerRuntimeVersion?: string;
  architecture?: string;
  operatingSystem?: string;
  capacity?: Record<string, string>;
  allocatable?: Record<string, string>;
  conditions?: Array<{
    type: string;
    status: string;
    reason?: string;
    message?: string;
  }>;
  labels?: Record<string, string>;
}

export interface Namespace {
  id: string;
  uid?: string;
  name: string;
  status: string;
  age: string;
  labels?: Record<string, string>;
}

export interface Service {
  id: string;
  name: string;
  namespace: string;
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer';
  clusterIP: string;
  ports: string;
  selector?: Record<string, string>;
  externalIPs?: string[];
  loadBalancerIP?: string;
  portDetails?: Array<{
    name?: string;
    port?: number;
    protocol?: string;
    targetPort?: number | string;
    nodePort?: number;
  }>;
  age: string;
}

export interface Ingress {
  id: string;
  name: string;
  namespace: string;
  hosts: string[];
  address: string;
  ingressClassName?: string;
  rules?: Array<{
    host?: string;
    paths: Array<{
      path?: string;
      pathType?: string;
      serviceName?: string;
      servicePort?: number | string;
    }>;
  }>;
  tls?: Array<{
    hosts: string[];
    secretName?: string;
  }>;
  age: string;
}

export interface PVC {
  id: string;
  name: string;
  namespace: string;
  status: string;
  capacity: string;
  accessModes: string[];
  storageClass: string;
  volumeName?: string;
  volumeMode?: string;
  age: string;
}

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  namespace?: string;
  source?: 'snapshot' | 'event';
  objectKind?: string;
  objectName?: string;
  reason?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  plan?: WorkspacePlan;
  members: ProjectMember[];
  invitations?: WorkspaceInvitation[];
  currentUserRole?: ProjectMember['role'];
  currentUserRoleTemplate?: WorkspaceRoleTemplate;
  clusterCount?: number;
  memberCount?: number;
  quota?: WorkspaceQuota;
  permissions?: {
    read_workspace_data: boolean;
    read_members: boolean;
    read_audit_log: boolean;
    delete_workspace: boolean;
    manage_members: boolean;
    manage_targets: boolean;
    manage_mcp: boolean;
    manage_tools: boolean;
    manage_ai_settings: boolean;
    manage_agent_keys: boolean;
    manage_webhooks: boolean;
    create_sessions: boolean;
    create_read_only_runs: boolean;
    create_read_write_runs: boolean;
    read_target_logs: boolean;
    cancel_runs: boolean;
    delete_sessions: boolean;
  };
  clusterIds: string[];
}

export interface WorkspacePlan {
  key: string;
  name: string;
}

export interface QuotaUsage {
  used: number;
  limit: number;
}

export interface UserQuota {
  workspaceMemberships: QuotaUsage;
}

export interface WorkspaceQuota {
  members: QuotaUsage;
  kubernetesClusters: QuotaUsage;
  virtualMachines: QuotaUsage;
}

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: ProjectMember['role'];
  roleTemplate?: WorkspaceRoleTemplate;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  inviteLink?: string;
}

export interface ChatSession {
  id: string;
  name: string;
  backendSessionId?: string;
  status?: 'open' | 'archived' | 'deleted';
  createdBy?: string;
  createdByUser?: {
    id: string;
    displayName: string;
  };
  hasActiveRun?: boolean;
  recentActivityWarning?: {
    message: string;
    actionSessionId?: string;
    actionLabel?: string;
    dismissed?: boolean;
  };
  hydrated?: boolean;
  messagesLoadFailed?: boolean;
  messagesNextCursor?: string;
  messages: ChatMessage[];
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  runId?: string;
  clientMessageId?: string;
  transientStatus?: 'pending_assistant';
  approval?: PendingApproval;
}

export interface PendingApproval {
  id: string;
  runId?: string;
  toolCallId?: string;
  action: string;
  toolName?: string;
  arguments?: Record<string, unknown>;
  expiresAt?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'expired';
}

export interface User {
  id: string;
  email: string;
  name: string;
  groups: string[];
  quota?: UserQuota;
}

export type PasswordAuthResult =
  | { status: 'signed_in' }
  | { status: 'verification_required'; email: string; resendAfterSeconds?: number; deliveryFailed?: boolean };

export interface ProjectMember {
  userId?: string;
  email: string;
  name: string;
  role: string;
  roleTemplate?: WorkspaceRoleTemplate;
  source: 'OIDC' | 'Internal';
}

export type WorkspaceCapability =
  | 'read_workspace_data'
  | 'read_members'
  | 'read_audit_log'
  | 'delete_workspace'
  | 'manage_members'
  | 'manage_targets'
  | 'manage_mcp'
  | 'manage_tools'
  | 'manage_ai_settings'
  | 'manage_agent_keys'
  | 'manage_webhooks'
  | 'create_sessions'
  | 'create_read_only_runs'
  | 'create_read_write_runs'
  | 'read_target_logs'
  | 'cancel_runs'
  | 'delete_sessions';

export interface WorkspaceRoleTemplate {
  key: string;
  displayName: string;
  description: string;
  kind: 'system' | 'custom';
  capabilities: WorkspaceCapability[];
  protected: boolean;
  sortOrder: number;
}

export type WorkspaceAuditCategory = 'membership' | 'workspace' | 'target' | 'session' | 'run' | 'approval' | 'mcp' | 'tool';
export type WorkspaceAuditOperation = 'read' | 'write';

export interface WorkspaceAuditEvent {
  id: string;
  workspaceId: string;
  category: WorkspaceAuditCategory;
  eventType: string;
  operation: WorkspaceAuditOperation;
  actor: {
    type: 'user' | 'system' | 'admin_token';
    userId?: string;
    tokenId?: string;
    email?: string;
    displayName?: string;
  };
  object: {
    type: string;
    id?: string;
    name?: string;
  };
  summary: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export type LlmProvider = 'openai' | 'anthropic' | 'gemini';
export type ReasoningSummaryMode = 'off' | 'auto' | 'concise' | 'detailed';
export type ReasoningEffort = 'default' | 'low' | 'medium' | 'high';

export interface WorkspaceAiProviderStatus {
  provider: LlmProvider;
  configured: boolean;
  enabled: boolean;
}

export interface WorkspaceAiSettings {
  workspaceId: string;
  defaultProvider: LlmProvider;
  defaultModel: string;
  reasoningSummaryMode: ReasoningSummaryMode;
  reasoningEffort: ReasoningEffort;
  allowedReasoningSummaryModes: ReasoningSummaryMode[];
  allowedReasoningEfforts: ReasoningEffort[];
  reasoningSummariesEnabled: boolean;
  allowedProviders: LlmProvider[];
  allowedModels: string[];
  providers: WorkspaceAiProviderStatus[];
}

export interface MCPIntegration {
  id: string;
  name: string;
  type: 'custom' | 'web_search' | 'github' | 'slack' | 'jira';
  status: 'connected' | 'disconnected' | 'error';
  config?: Record<string, any>;
}
