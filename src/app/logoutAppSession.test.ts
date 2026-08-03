import { describe, expect, it } from 'vitest';
import { safePostLogoutInvitationPath } from './logoutAppSession';

describe('post-logout invitation routing', () => {
  it('preserves only a single encoded invitation-token route', () => {
    expect(safePostLogoutInvitationPath('/invites/fixture-token')).toBe('/invites/fixture-token');
    expect(safePostLogoutInvitationPath('/invites/wi_token%2Fwith%20space')).toBe('/invites/wi_token%2Fwith%20space');
  });

  it.each([
    undefined,
    '',
    '/workspaces',
    '/invites/',
    '/invites/token/extra',
    '/invites/token?redirect=https://example.com',
    '//example.com/invites/token',
    'https://example.com/invites/token'
  ])('rejects an unsafe post-logout destination: %s', (path) => {
    expect(safePostLogoutInvitationPath(path)).toBeUndefined();
  });
});
