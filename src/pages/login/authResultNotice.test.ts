import { describe, expect, it } from 'vitest';
import { authResultNoticeKey } from './authResultNotice';

describe('auth result notices', () => {
  it('maps only bounded admission and logout results', () => {
    expect(authResultNoticeKey('?auth_result=oidc_access_denied')).toBe('login.oidcAccessDenied');
    expect(authResultNoticeKey('?logout_result=success')).toBe('login.logoutSuccess');
    expect(authResultNoticeKey('?logout_result=local_only')).toBe('login.logoutLocalOnly');
    expect(authResultNoticeKey('?logout_result=incomplete')).toBe('login.logoutIncomplete');
    expect(authResultNoticeKey('?logout_result=provider_error%3Asecret')).toBeUndefined();
    expect(authResultNoticeKey('?auth_result=raw_claim')).toBeUndefined();
  });
});
