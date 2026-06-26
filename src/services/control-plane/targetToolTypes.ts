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

export interface UpdateTargetToolInput {
  enabled: boolean;
  config?: ControlPlaneTargetToolConfig;
}
