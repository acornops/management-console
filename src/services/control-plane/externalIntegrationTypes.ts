import type { ControlPlaneUser } from './types';

export interface ControlPlaneExternalIntegrationLinkPreview {
  integrationClientId: string;
  provider: string;
  clientDisplayName: string;
  externalUserId: string;
  externalDisplayName?: string;
  expiresAt: string;
  signedInUser: ControlPlaneUser;
  grantableWorkspaces: ControlPlaneExternalIntegrationGrantableWorkspace[];
}

export type ControlPlaneWorkspaceCapability =
  | 'read_workspace_data'
  | 'create_sessions'
  | 'create_read_only_runs';

export interface ControlPlaneExternalIntegrationWorkspaceGrant {
  workspaceId: string;
  capabilities: ControlPlaneWorkspaceCapability[];
  grantedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ControlPlaneExternalIntegrationGrantableWorkspace {
  workspaceId: string;
  workspaceName: string;
  role: string;
  grantedCapabilities: ControlPlaneWorkspaceCapability[];
  grantableCapabilities: ControlPlaneWorkspaceCapability[];
}

export interface ControlPlaneExternalIntegrationLinkSummary {
  id: string;
  integrationClientId: string;
  provider: string;
  clientDisplayName: string;
  externalUserId: string;
  externalDisplayName?: string;
  linkedAt: string;
  lastAuthenticatedAt: string;
  expiresAt: string;
  grants: ControlPlaneExternalIntegrationWorkspaceGrant[];
  grantableWorkspaces?: ControlPlaneExternalIntegrationGrantableWorkspace[];
}
