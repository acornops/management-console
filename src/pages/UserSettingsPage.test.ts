import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const enLocale = readFileSync(resolve(root, 'src/i18n/locales/en.js'), 'utf8');
const zhLocale = readFileSync(resolve(root, 'src/i18n/locales/zh.js'), 'utf8');
const userSettingsPage = readFileSync(resolve(root, 'src/pages/UserSettingsPage.tsx'), 'utf8');

describe('UserSettingsPage account copy', () => {
  it('uses account settings terminology for the account route title', () => {
    expect(enLocale).toContain("title: 'Account Settings'");
    expect(enLocale).not.toContain("title: 'User Settings'");
    expect(zhLocale).toContain("title: '账号设置'");
    expect(zhLocale).not.toContain("title: '用户设置'");
  });

  it('exposes external integration workspace grant management', () => {
    expect(userSettingsPage).toContain('controlPlaneApi.listExternalIntegrationLinks()');
    expect(userSettingsPage).toContain('controlPlaneApi.updateExternalIntegrationLinkGrants');
    expect(userSettingsPage).toContain('controlPlaneApi.unlinkExternalIntegration');
    expect(userSettingsPage).toContain('Permissions successfully changed for');
    expect(userSettingsPage).toContain('External Integrations');
    expect(userSettingsPage).toContain('Save grants');
    expect(userSettingsPage).toContain('Unlink');
  });
});
