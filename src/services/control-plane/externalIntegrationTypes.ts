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

// The control plane owns the grantable capability catalog. Keep this wire type
// open so a newly deployed server capability remains visible and selectable
// before the console adds specialized display copy for it.
export type ControlPlaneWorkspaceCapability = string;

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
