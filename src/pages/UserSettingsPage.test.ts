import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const enLocale = readFileSync(resolve(root, 'src/i18n/locales/en.js'), 'utf8');
const zhLocale = readFileSync(resolve(root, 'src/i18n/locales/zh.js'), 'utf8');
const userSettingsPage = readFileSync(resolve(root, 'src/pages/UserSettingsPage.tsx'), 'utf8');
const helpPage = readFileSync(resolve(root, 'src/pages/HelpPage.tsx'), 'utf8');

describe('UserSettingsPage account copy', () => {
  it('uses account settings terminology for the account route title', () => {
    expect(enLocale).toContain("title: 'Account Settings'");
    expect(enLocale).not.toContain("title: 'User Settings'");
    expect(zhLocale).toContain("title: '账号设置'");
    expect(zhLocale).not.toContain("title: '用户设置'");
  });

  it('keeps account and help routes left-aligned with the standard page shell', () => {
    expect(userSettingsPage).toContain('<PageShell embedded={embedded}>');
    expect(helpPage).toContain('<PageShell>');
    expect(userSettingsPage).not.toContain('width="narrow"');
    expect(helpPage).not.toContain('width="narrow"');
  });

  it('offers a stable return path to workspaces', () => {
    const backLinkIndex = userSettingsPage.indexOf('<PageBackLink');
    const headerIndex = userSettingsPage.indexOf('<PageHeader', backLinkIndex);

    expect(backLinkIndex).toBeGreaterThan(-1);
    expect(headerIndex).toBeGreaterThan(backLinkIndex);
    expect(userSettingsPage).toContain("href={AppPaths.workspaces()}");
    expect(userSettingsPage).toContain('handleAppLinkClick(event, AppPaths.workspaces(), () => onGoToWorkspaces())');
    expect(userSettingsPage).toContain("t('settings.backToWorkspaces')");
    expect(userSettingsPage).not.toContain('hasWorkspaces');
    expect(enLocale).toContain("backToWorkspaces: 'Back to workspaces'");
    expect(zhLocale).toContain("backToWorkspaces: '返回工作区'");
  });

  it('presents logout as a neutral exit action instead of a destructive action', () => {
    expect(userSettingsPage).toContain('label={t(\'app.logout\')}');
    expect(userSettingsPage).toContain('variant="secondary"');
    expect(userSettingsPage).not.toContain('border-status-danger/25 bg-status-danger-soft');
    expect(userSettingsPage).not.toContain('<motion.button');
  });
});
