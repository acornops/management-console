import { describe, expect, it } from 'vitest';
import {
  externalIntegrationLinkApprovalMessage,
  externalIntegrationLinkApprovalTitle,
  externalIntegrationLinkStatusMessage
} from './ExternalIntegrationLinkRouteScreen';

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
});
