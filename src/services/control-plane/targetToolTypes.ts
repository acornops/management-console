export interface ControlPlaneTargetToolDomainFilters {
  allowedDomains: string[];
  blockedDomains: string[];
}

export interface ControlPlaneTargetToolConfig {
  domainFilters: ControlPlaneTargetToolDomainFilters;
}

export interface ControlPlaneTargetToolItem {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  capability: 'read' | 'write';
  runtimeKind: 'provider_native' | 'function';
  visibility?: {
    appearsInAssistantToolList?: boolean;
    appearsInRunEnabledTools?: boolean;
    appearsInToolCalls?: boolean;
  };
  config: ControlPlaneTargetToolConfig;
}

export interface ControlPlaneTargetToolsCatalog {
  workspaceId: string;
  targetId: string;
  targetType: 'kubernetes' | 'virtual_machine';
  permissions: {
    canEdit: boolean;
    editableRoles?: string[];
  };
  items: ControlPlaneTargetToolItem[];
}

export interface ControlPlaneTargetAssistantToolPreviewItem {
  id: string;
  name: string;
  label?: string;
  description: string;
  capability: 'read' | 'write';
  runtimeKind: 'function' | 'provider_native';
  source: 'builtin' | 'mcp' | 'provider_native';
}

export interface ControlPlaneTargetAssistantToolPreview {
  workspaceId: string;
  targetId: string;
  targetType: 'kubernetes' | 'virtual_machine';
  toolAccessMode: 'read_only' | 'read_write';
  targetSupportsWrite: boolean;
  confirmationRequiredForWrite: boolean;
  approvalTimeoutSeconds: number;
  writeUnavailableReason: 'run_read_only' | 'agent_write_disabled' | null;
  summary: {
    totalAllowed: number;
    functionAllowed: number;
    nativeAllowed: number;
    readAllowed: number;
    writeAllowed: number;
    configuredWrite: number;
    excludedWrite: number;
  };
  items: ControlPlaneTargetAssistantToolPreviewItem[];
}

export interface UpdateTargetToolInput {
  enabled: boolean;
  config?: ControlPlaneTargetToolConfig;
}
