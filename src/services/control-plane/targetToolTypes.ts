export interface ControlPlaneTargetToolDomainFilters {
  allowedDomains: string[];
  blockedDomains: string[];
}

export interface ControlPlaneTargetToolConfig {
  authorizationClass?: 'internal_artifact' | 'external_http_read';
  allowedUrlPatterns?: string[];
  domainFilters?: ControlPlaneTargetToolDomainFilters;
  learning?: {
    idleCheckpointDelayMinutes: number;
    minimumObservationsBeforeGeneralization: number;
    checkpointModel: {
      mode: 'workspace_default' | 'custom';
      provider?: 'openai' | 'anthropic' | 'gemini';
      model?: string;
    };
  };
  retrieval?: {
    maxSnippetsPerRetrieval: number;
    maxSnippetSizeBytes: number;
  };
}

export interface ControlPlaneTargetToolItem {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  toggleable?: boolean;
  origin: 'target_setting' | 'platform_native';
  capability: 'read' | 'write';
  runtimeKind: 'provider_native' | 'function';
  visibility?: {
    appearsInAssistantToolList?: boolean;
    appearsInRunEnabledTools?: boolean;
    appearsInToolCalls?: boolean;
  };
  readiness?: {
    learningAvailable: boolean;
    learningPausedReason: 'ai_settings_missing' | 'provider_not_allowed' | 'model_not_allowed' | null;
  };
  availability?: {
    available: boolean;
    unavailableReason: 'openai_responses_api_required' | null;
  };
  permissions?: {
    canEdit: boolean;
  };
  config: ControlPlaneTargetToolConfig;
}

export interface ControlPlaneTargetToolsCatalog {
  workspaceId: string;
  targetId?: string;
  targetType?: 'kubernetes' | 'virtual_machine';
  permissions: {
    canEdit: boolean;
    editableRoles?: string[];
  };
  items: ControlPlaneTargetToolItem[];
}

export interface ControlPlaneTargetAssistantCapabilityToolPreviewItem {
  id: string;
  name: string;
  label?: string;
  description: string;
  capability: 'read' | 'write';
  runtimeKind: 'function' | 'provider_native';
  source: 'builtin' | 'mcp' | 'provider_native';
}

export interface ControlPlaneTargetAssistantCapabilitySkillPreviewItem {
  id: string;
  name: string;
  description: string;
  source: 'manual' | 'git_import';
}

export interface ControlPlaneAssistantCapabilitiesPreview {
  workspaceId: string;
  toolAccessMode: 'read_only' | 'read_write';
  confirmationRequiredForWrite: boolean;
  writeUnavailableReason: 'run_read_only' | 'agent_write_disabled' | null;
  unavailableMcpToolCount: number;
  toolSummary: {
    totalAllowed: number;
    nativeAllowed: number;
    readAllowed: number;
    writeAllowed: number;
  };
  skillSummary: {
    totalAvailable: number;
  };
  tools: ControlPlaneTargetAssistantCapabilityToolPreviewItem[];
  skills: ControlPlaneTargetAssistantCapabilitySkillPreviewItem[];
}

export interface ControlPlaneTargetAssistantCapabilitiesPreview extends ControlPlaneAssistantCapabilitiesPreview {
  targetId: string;
  targetType: 'kubernetes' | 'virtual_machine';
}

export interface ControlPlaneAgentAssistantCapabilitiesPreview extends ControlPlaneAssistantCapabilitiesPreview {
  agentId: string;
}

export interface UpdateTargetToolInput {
  enabled: boolean;
  config?: ControlPlaneTargetToolConfig;
}

export type ControlPlaneTargetInsightsEntryStatus = 'active' | 'pending' | 'archived';

export interface ControlPlaneTargetInsightsEntry {
  id: string;
  workspaceId: string;
  targetId: string;
  targetType: 'kubernetes' | 'virtual_machine';
  title: string;
  status: ControlPlaneTargetInsightsEntryStatus;
  bodyMarkdown: string;
  frontmatter: Record<string, unknown>;
  tags: string[];
  signals: Record<string, unknown>;
  scope: Record<string, unknown>;
  evidenceSummary: string;
  observationCount: number;
  confidence: number;
  firstObservedAt?: string;
  lastObservedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ControlPlaneTargetInsightsCatalog {
  workspaceId: string;
  targetId: string;
  targetType: 'kubernetes' | 'virtual_machine';
  permissions: {
    canEdit: boolean;
  };
  items: ControlPlaneTargetInsightsEntry[];
}

export interface TargetInsightsEntryInput {
  title: string;
  status: ControlPlaneTargetInsightsEntryStatus;
  bodyMarkdown: string;
  tags?: string[];
  evidenceSummary?: string;
  observationCount?: number;
  confidence?: number;
}
