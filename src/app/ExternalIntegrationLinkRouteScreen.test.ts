import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  externalIntegrationLinkApprovalMessage,
  externalIntegrationLinkApprovalTitle,
  externalIntegrationLinkStatusMessage
} from './ExternalIntegrationLinkRouteScreen';

const root = resolve(__dirname, '../..');
const routeScreen = readFileSync(resolve(root, 'src/app/ExternalIntegrationLinkRouteScreen.tsx'), 'utf8');

describe('ExternalIntegrationLinkRouteScreen', () => {
  it('uses explicit account-linking approval copy', () => {
    expect(externalIntegrationLinkApprovalTitle()).toBe('Link AcornOps to an external integration');
    expect(externalIntegrationLinkApprovalTitle({ clientDisplayName: 'Mattermost Engineering' })).toBe(
      'Link AcornOps to Mattermost Engineering'
    );
    expect(externalIntegrationLinkApprovalMessage).toBe(
      'Approve this request to connect your signed-in AcornOps account to the external account shown below.'
    );
  });

  it('uses explicit terminal account-linking copy', () => {
    expect(externalIntegrationLinkStatusMessage('linked')).toBe(
      'Account linking successful.\nGo back to the external client.'
    );
    expect(externalIntegrationLinkStatusMessage('expired')).toBe(
      'Account linking unsuccessful due to expired token.\nRetry linking on external client.'
    );
    expect(externalIntegrationLinkStatusMessage('cancelled')).toBe(
      'Account linking cancelled.\nGo back to the external client.'
    );
  });

  it('collects workspace grants before completing the link', () => {
    expect(routeScreen).toContain('grantableWorkspaces');
    expect(routeScreen).toContain('workspaceGrants');
    expect(routeScreen).toContain('controlPlaneApi.completeExternalIntegrationLink(route.token, workspaceGrants)');
    expect(routeScreen).toContain('Workspace access');
  });
});
