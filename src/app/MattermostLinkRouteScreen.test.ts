import { describe, expect, it } from 'vitest';
import {
  mattermostLinkApprovalMessage,
  mattermostLinkApprovalTitle,
  mattermostLinkStatusMessage
} from './MattermostLinkRouteScreen';

describe('MattermostLinkRouteScreen', () => {
  it('uses explicit account-linking approval copy', () => {
    expect(mattermostLinkApprovalTitle).toBe('Link AcornOps to Mattermost');
    expect(mattermostLinkApprovalMessage).toBe(
      'Approve this request to connect your signed-in AcornOps account to Mattermost.'
    );
  });

  it('uses explicit terminal account-linking copy', () => {
    expect(mattermostLinkStatusMessage('linked')).toBe(
      'Account linking successful.\nGo back to the external client.'
    );
    expect(mattermostLinkStatusMessage('expired')).toBe(
      'Account linking unsuccessful due to expired token.\nRetry linking on external client.'
    );
    expect(mattermostLinkStatusMessage('cancelled')).toBe(
      'Account linking cancelled.\nGo back to the external client.'
    );
  });
});
