import { describe, expect, it } from 'vitest';
import { mattermostLinkStatusMessage } from './MattermostLinkRouteScreen';

describe('MattermostLinkRouteScreen', () => {
  it('uses explicit terminal account-linking copy', () => {
    expect(mattermostLinkStatusMessage('linked')).toBe(
      'Account linking successful.\nGo back to the external client.'
    );
    expect(mattermostLinkStatusMessage('expired')).toBe(
      'Account linking unsuccessful due to expired token.\nRetry linking on external client.'
    );
  });
});
