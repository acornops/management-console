import { ClusterMetricHistoryPoint, KubernetesCluster, UserQuota, WorkspaceAuditEvent } from '@/types';
export type {
  ControlPlaneAcceptWorkspaceInvitationResult,
  ControlPlaneRoleTemplate,
  ControlPlaneWorkspace,
  ControlPlaneWorkspaceInvitation,
  ControlPlaneWorkspaceMember
} from './workspaceTypes';
export type {
  ControlPlaneIssueItem,
  ControlPlaneIssueObservationItem,
  ControlPlaneTargetIssueSummary
} from './issueTypes';
export type {
  ControlPlaneTargetAssistantCapabilitiesPreview,
  ControlPlaneTargetAssistantCapabilitySkillPreviewItem,
  ControlPlaneTargetAssistantCapabilityToolPreviewItem,
  ControlPlaneTargetToolConfig,
  ControlPlaneTargetToolDomainFilters,
  ControlPlaneTargetToolItem,
  ControlPlaneTargetToolsCatalog,
  ControlPlaneKnowledgeBankCatalog,
  ControlPlaneKnowledgeBankEntry,
  ControlPlaneKnowledgeBankEntryStatus,
  KnowledgeBankEntryInput,
  UpdateTargetToolInput
} from './targetToolTypes';

export interface PagedResult<T> { items: T[]; nextCursor?: string; }

export interface ControlPlaneUser { id: string; email: string; displayName: string; quota?: UserQuota; }

export interface ControlPlaneAuthConfig {
  oidcEnabled: boolean;
  oidcProviderName: string;
  passwordAuthEnabled: boolean;
  passwordSignupEnabled: boolean;
  passwordEmailVerificationRequired: boolean;
  passwordResetEnabled: boolean;
}

export interface ControlPlaneVerificationRequired { status: 'verification_required'; email: string; resendAfterSeconds?: number; }

export interface ControlPlaneVerificationResendResult { status: 'ok'; message: string; resendAfterSeconds?: number; }

export interface ControlPlanePasswordResetRequestResult { status: 'ok'; message: string; resendAfterSeconds?: number; }

export type ControlPlaneAuthMethod =
  | {
      type: 'password';
      username: string;
      lastChangedAt: string;
      lastLoginAt?: string;
    }
  | {
      type: 'oidc';
      provider: string;
      emailAtLinkTime: string;
      linkedAt: string;
      lastLoginAt?: string;
    };

export interface ControlPlaneAuthMethods {
  methods: ControlPlaneAuthMethod[];
  capabilities: {
    canChangePassword: boolean;
    canLinkOidc: boolean;
    canAddPassword: boolean;
  };
}

export interface ControlPlaneExternalIntegrationLinkPreview {
  integrationClientId: string;
  provider: string;
  clientDisplayName: string;
  externalUserId: string;
  externalDisplayName?: string;
  expiresAt: string;
  signedInUser: ControlPlaneUser;
}

export type TargetType = 'kubernetes' | 'virtual_machine';

interface ControlPlaneTargetScope { targetId: string; targetType: TargetType; clusterId?: string; }

export interface TargetSummary {
  id: string;
  workspaceId: string;
  targetType: TargetType;
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ControlPlaneWorkspaceAuditEvent = WorkspaceAuditEvent;

export interface ControlPlaneResourcePageItem {
  id: string;
  family: 'workloads' | 'network' | 'storage' | 'cluster';
  kind: string;
  name: string;
  namespace?: string;
  status?: string;
  node?: string;
  clusterId: string;
  clusterName: string;
  item: Record<string, unknown>;
}

export interface ControlPlaneClusterSummary {
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
}

export interface ControlPlaneCluster {
  id: string;
  workspaceId: string;
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  namespaceInclude?: string[];
  namespaceExclude?: string[];
  writeConfirmationPolicy?: {
    effectiveRequired: boolean;
    overrideRequired: boolean | null;
    source: 'cluster_override' | 'deployment_default';
  };
  summary?: ControlPlaneClusterSummary;
}

export interface SnapshotMetricNode {
  name?: string;
  usage?: {
    cpu?: string;
    memory?: string;
  };
}

export interface SnapshotResourceNode {
  name?: string;
  uid?: string;
  labels?: Record<string, string>;
  kubeletVersion?: string;
  osImage?: string;
  containerRuntimeVersion?: string;
  architecture?: string;
  operatingSystem?: string;
  capacity?: Record<string, string>;
  allocatable?: Record<string, string>;
  status?: {
    conditions?: Array<{
      type?: string;
      status?: string;
      reason?: string;
      message?: string;
    }>;
  };
}

export interface SnapshotResourceNamespace {
  name?: string;
  uid?: string;
  creationTimestamp?: string;
  labels?: Record<string, string>;
  status?: string;
}

export interface SnapshotResourcePod {
  name?: string;
  namespace?: string;
  uid?: string;
  labels?: Record<string, string>;
  ownerReferences?: Array<{ apiVersion?: string; kind?: string; name?: string; uid?: string; controller?: boolean; blockOwnerDeletion?: boolean }>;
  creationTimestamp?: string;
  phase?: string;
  nodeName?: string;
  restartCount?: number;
  containerStatuses?: Array<{
    name?: string;
    ready?: boolean;
    restartCount?: number;
    state?: { waiting?: { reason?: string; message?: string }; terminated?: { reason?: string; message?: string } };
    lastState?: { waiting?: { reason?: string; message?: string }; terminated?: { reason?: string; message?: string } };
  }>;
}

export interface SnapshotResourceDeployment {
  name?: string;
  namespace?: string;
  uid?: string;
  creationTimestamp?: string;
  replicas?: number;
  availableReplicas?: number;
  readyReplicas?: number;
}

export type SnapshotResourceScalableWorkload = SnapshotResourceDeployment;

export interface SnapshotResourceCronJob {
  name?: string;
  namespace?: string;
  uid?: string;
  creationTimestamp?: string;
  schedule?: string;
  suspend?: boolean;
  active?: number;
  lastScheduleTime?: string;
}

export interface SnapshotResourceJob {
  name?: string;
  namespace?: string;
  uid?: string;
  creationTimestamp?: string;
  completions?: number;
  succeeded?: number;
  failed?: number;
  active?: number;
  startTime?: string;
  completionTime?: string;
}

export interface SnapshotResourceService {
  name?: string;
  namespace?: string;
  uid?: string;
  creationTimestamp?: string;
  type?: string;
  clusterIP?: string;
  selector?: Record<string, string>;
  externalIPs?: string[];
  loadBalancerIP?: string;
  ports?: Array<{
    name?: string;
    port?: number;
    protocol?: string;
    targetPort?: number | string;
    nodePort?: number;
  }>;
}

export interface SnapshotResourceIngress {
  name?: string;
  namespace?: string;
  uid?: string;
  creationTimestamp?: string;
  ingressClassName?: string;
  hosts?: string[];
  address?: string;
  rules?: Array<{
    host?: string;
    paths?: Array<{
      path?: string;
      pathType?: string;
      serviceName?: string;
      servicePort?: number | string;
    }>;
  }>;
  tls?: Array<{
    hosts?: string[];
    secretName?: string;
  }>;
}

export interface SnapshotResourcePVC {
  name?: string;
  namespace?: string;
  uid?: string;
  creationTimestamp?: string;
  status?: string;
  capacity?: string;
  accessModes?: string[];
  storageClass?: string;
  volumeName?: string;
  volumeMode?: string;
}

export interface SnapshotEvent {
  involvedObject?: {
    kind?: string;
    name?: string;
    namespace?: string;
  };
  reason?: string;
  message?: string;
  type?: string;
  lastTimestamp?: string;
}

export interface ControlPlaneClusterSnapshot {
  clusterId: string;
  workspaceId: string;
  timestamp: string;
  data?: {
    metrics?: {
      available?: boolean;
      nodes?: SnapshotMetricNode[];
    };
    resources?: {
      pods?: SnapshotResourcePod[];
      nodes?: SnapshotResourceNode[];
      namespaces?: SnapshotResourceNamespace[];
      services?: SnapshotResourceService[];
      ingresses?: SnapshotResourceIngress[];
      pvcs?: SnapshotResourcePVC[];
      deployments?: SnapshotResourceDeployment[];
      statefulSets?: SnapshotResourceScalableWorkload[];
      daemonSets?: SnapshotResourceScalableWorkload[];
      cronJobs?: SnapshotResourceCronJob[];
      jobs?: SnapshotResourceJob[];
    };
    events?: SnapshotEvent[];
  };
}

export interface ControlPlaneClusterDetail extends ControlPlaneCluster {
  latestSnapshot?: ControlPlaneClusterSnapshot | null;
}

export interface ControlPlaneClusterMetricsHistoryResponse {
  workspaceId: string;
  clusterId: string;
  windowMs: number;
  points: ClusterMetricHistoryPoint[];
}

export interface ControlPlaneWorkspaceClusterMetricsHistoryResponse {
  workspaceId: string;
  windowMs: number;
  items: Array<{
    clusterId: string;
    points: ClusterMetricHistoryPoint[];
  }>;
}

export interface ControlPlanePodLogs {
  name: string;
  namespace: string;
  container: string;
  logs: string;
  tailLines: number;
  previous: boolean;
  fetchedAt: string;
}

export interface ControlPlanePodLogsOptions {
  container?: string;
  previous?: boolean;
  tailLines?: number;
  sinceSeconds?: number;
  limitBytes?: number;
}

export interface ControlPlaneClusterTool {
  name: string;
  mcp_server_url: string;
  timeout_ms: number;
  description?: string;
  capability?: 'read' | 'write';
  version?: string;
  source?: 'mcp' | 'builtin';
  input_schema?: Record<string, unknown>;
  enabled: boolean;
}

export interface ControlPlaneClusterToolCatalog {
  workspaceId: string;
  clusterId?: string;
  targetId?: string;
  targetType?: TargetType;
  permissions: {
    canEdit: boolean;
    editableRoles: string[];
  };
  servers: ControlPlaneClusterToolCatalogServer[];
}

export interface ControlPlaneClusterToolCatalogServer {
  id: string;
  name: string;
  url: string;
  type: 'builtin' | 'mcp';
  enabled: boolean;
  isSystem: boolean;
  canDelete: boolean;
  canEditConnection: boolean;
  canToggle?: boolean;
  authType: 'none' | 'bearer_token' | 'custom_header';
  publicHeaders?: Record<string, string>;
  connectionStatus?: 'unknown' | 'ok' | 'error';
  lastDiscoveryAt?: string | null;
  lastDiscoveryError?: string | null;
  toolCounts: {
    total: number;
    enabledConfigured: number;
    enabledEffective: number;
    writeConfigured: number;
    writeEffective: number;
  };
  tools: ControlPlaneClusterToolCatalogItem[];
}

export interface ControlPlaneClusterToolCatalogItem {
  name: string;
  description: string;
  capability: 'read' | 'write';
  version: string;
  source: 'builtin' | 'mcp';
  enabledConfigured: boolean;
  enabledEffective: boolean;
  effectiveDisabledReason: 'server_disabled' | 'agent_write_disabled' | null;
}

export interface ControlPlaneMcpServer {
  id: string;
  workspace_id: string;
  target_id: string;
  target_type: TargetType;
  server_name: string;
  server_url: string;
  enabled: boolean;
  auth_type: 'none' | 'bearer_token' | 'custom_header';
  auth_secret_name?: string;
  auth_header_name?: string;
  auth_header_prefix?: string;
  public_headers?: Record<string, string> | null;
  connection_status?: 'unknown' | 'ok' | 'error';
  last_discovery_at?: string | null;
  last_discovery_error?: string | null;
  tools: ControlPlaneClusterTool[];
}

export interface ControlPlaneMcpServerTestConnectionResponse {
  server_id: string;
  server_name: string;
  server_url: string;
  connection_status: 'ok' | 'error';
  last_discovery_at: string;
  discovered_tool_count: number;
  discovered_tools: string[];
  error?: string | null;
}

export interface TargetMcpServerToolInput {
  name: string;
  timeoutMs?: number;
  inputSchema?: Record<string, unknown>;
  enabled?: boolean;
}

export interface TargetMcpServerAuthInput {
  type?: 'none' | 'bearer_token' | 'custom_header';
  secretName?: string;
  secretValue?: string;
  headerName?: string;
  headerPrefix?: string;
}

export interface CreateTargetMcpServerInput {
  name: string;
  url: string;
  enabled?: boolean;
  publicHeaders?: Record<string, string>;
  auth?: TargetMcpServerAuthInput;
}

export interface UpdateTargetMcpServerInput {
  name?: string;
  enabled?: boolean;
  publicHeaders?: Record<string, string>;
  auth?: TargetMcpServerAuthInput;
  tools?: TargetMcpServerToolInput[];
  removeTools?: string[];
}
export type {
  ControlPlaneTargetSkillDetail,
  ControlPlaneTargetSkillFile,
  ControlPlaneTargetSkillSource,
  ControlPlaneTargetSkillSummary,
  ControlPlaneTargetSkillsCatalog,
  CreateTargetSkillInput,
  ImportTargetSkillInput,
  TargetSkillSourceType,
  TargetSkillSyncStatus,
  TargetSkillValidationStatus,
  UpdateTargetSkillInput
} from './targetSkillTypes';

export interface RegisterClusterResponse {
  cluster: ControlPlaneCluster;
  agentKey: string;
  installInstructions?: ControlPlaneAgentInstallInstructions;
}

export interface RotateAgentKeyResponse {
  clusterId: string;
  agentKey: string;
  keyVersion: number;
  installInstructions?: ControlPlaneAgentInstallInstructions;
}

export interface ControlPlaneAgentInstallInstructions {
  command: string;
  releaseName: string;
  chartRef: string;
  namespace: string;
  controlPlaneUrl: string;
  namespaceInclude: string[];
  namespaceExclude: string[];
  warnings: string[];
}

export type AgentAccessMode = 'read_only' | 'read_write';

export interface ControlPlaneSession extends ControlPlaneTargetScope {
  id: string;
  workspaceId: string;
  createdBy: string;
  createdByUser?: { id: string; displayName: string };
  title: string;
  status: 'open' | 'archived' | 'deleted';
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  expiresAt: string;
  deletedAt?: string;
}

export type ControlPlaneSessionListPage = PagedResult<ControlPlaneSession>;

export interface ControlPlaneSessionMessage {
  id: string;
  sessionId: string;
  runId?: string;
  role: 'user' | 'assistant';
  kind: 'user' | 'assistant_final';
  content: string;
  metadata?: Record<string, unknown>;
  clientMessageId?: string;
  createdAt: string;
}

export type ControlPlaneSessionMessageListPage = PagedResult<ControlPlaneSessionMessage>;

export type ControlPlaneRunStatus =
  | 'queued'
  | 'dispatching'
  | 'running'
  | 'waiting_for_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'cancelling';

export interface ControlPlaneRun extends ControlPlaneTargetScope {
  id: string;
  workspaceId: string;
  sessionId: string;
  messageId: string;
  status: ControlPlaneRunStatus;
  requestedAt: string;
  startedAt?: string;
  endedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    tool_calls: number;
    reasoning_tokens?: number;
  };
  assistantMessage?: {
    content: string;
    format: 'markdown';
  };
}

export interface ControlPlaneRunEvent {
  schema_version: number;
  run_id: string;
  seq: number;
  ts: string;
  type: string;
  payload: Record<string, unknown>;
}

export interface ControlPlaneRunToolApproval extends ControlPlaneTargetScope {
  id: string;
  runId: string;
  workspaceId: string;
  toolCallId: string;
  toolName: string;
  summary?: string;
  arguments: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  executionStatus?: 'not_started' | 'executing' | 'succeeded' | 'failed' | 'unknown';
  expiresAt: string;
}

export interface ControlPlaneAcceptedMessage {
  message_id: string;
  run_id: string;
}

export interface TargetMcpServer {
  id: string;
  workspaceId: string;
  targetId: string;
  serverName: string;
  serverUrl: string;
  enabled: boolean;
  authType: 'none' | 'bearer_token' | 'custom_header';
  authSecretName?: string;
  authHeaderName?: string;
  authHeaderPrefix?: string;
  publicHeaders?: Record<string, string>;
  connectionStatus: 'unknown' | 'ok' | 'error';
  lastDiscoveryAt?: string | null;
  lastDiscoveryError?: string | null;
  tools: KubernetesCluster['mcpTools'];
}

export interface TargetMcpServerTestConnectionResult {
  serverId: string;
  serverName: string;
  serverUrl: string;
  connectionStatus: 'ok' | 'error';
  lastDiscoveryAt: string;
  discoveredToolCount: number;
  discoveredTools: string[];
  error?: string | null;
}
