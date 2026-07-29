import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const page = readFileSync(resolve(root, 'src/pages/WorkspaceAiSettingsPage.tsx'), 'utf8');
const enLocale = readFileSync(resolve(root, 'src/i18n/locales/en.js'), 'utf8');
const zhLocale = readFileSync(resolve(root, 'src/i18n/locales/zh.js'), 'utf8');

describe('Workspace AI provider credential presentation', () => {
  it('separates configured state from credential source', () => {
    expect(page).toContain("const credentialSourceBadgeKey = isWorkspaceOverride");
    expect(page).toContain("const savedDefaultCredentialSourceBadgeKey = savedDefaultProviderStatus?.source === 'workspace'");
    expect(page).toContain("providerStatus.configured ? 'success' : 'neutral'");
    expect(page).toContain('providerStatus.configured && credentialSourceBadgeKey');
    expect(page).toContain('savedDefaultProviderConfigured && savedDefaultCredentialSourceBadgeKey');
    expect(page).toContain('<StatusBadge tone="neutral">{t(credentialSourceBadgeKey)}</StatusBadge>');

    expect(enLocale).toContain("credentialMissingBadge: 'Not configured'");
    expect(enLocale).toContain("credentialConfiguredBadge: 'Configured'");
    expect(enLocale).toContain("platformDefaultBadge: 'Platform default'");
    expect(enLocale).toContain("workspaceKeyBadge: 'Workspace key'");
    expect(zhLocale).toContain("credentialConfiguredBadge: '已配置'");
    expect(zhLocale).toContain("platformDefaultBadge: '平台默认值'");
    expect(zhLocale).toContain("workspaceKeyBadge: '工作区密钥'");
  });

  it('keeps inherited guidance and provider actions compact', () => {
    expect(enLocale).toContain(
      "credentialInherited: 'Using the platform default. Add a workspace key to override the platform default.'"
    );
    expect(page).toContain("isPlatformDefault ? 'lg:whitespace-nowrap' : ''");
    expect(page).toContain('className="w-full whitespace-nowrap sm:w-auto"');
    expect(page).not.toContain('className="w-full whitespace-nowrap sm:w-40"');
    expect(page).not.toContain('lg:w-[28rem]');
  });
});
