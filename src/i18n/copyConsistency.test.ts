import { describe, expect, it } from 'vitest';
import { en } from './locales/en.js';
import { zh } from './locales/zh.js';
import { createInstance } from 'i18next';

function stringEntries(value: unknown, path = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[path, value]];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => stringEntries(child, path ? `${path}.${key}` : key));
}

describe('interface copy consistency', () => {
  it('renders member search counts and VM timestamp scope in both bundled locales', async () => {
    const i18n = createInstance();
    await i18n.init({ lng: 'en', interpolation: { escapeValue: false }, resources: { en: { translation: en }, zh: { translation: zh } } });
    expect([0, 1, 3].map(count => i18n.t('members.loadedMatchingCount', { count }))).toEqual(['0 loaded matches', '1 loaded match', '3 loaded matches']);
    expect(i18n.t('loadedLogs.vmScope', { count: 1, timezone: 'Asia/Singapore' })).toContain('Displayed entry times: Asia/Singapore. Exports preserve original timestamp offsets and precision.');
    await i18n.changeLanguage('zh');
    expect([0, 1, 3].map(count => i18n.t('members.loadedMatchingCount', { count }))).toEqual(['已加载 0 个匹配项', '已加载 1 个匹配项', '已加载 3 个匹配项']);
    expect(i18n.t('loadedLogs.vmScope', { count: 1, timezone: 'Asia/Singapore' })).toContain('显示时间使用 Asia/Singapore 时区。导出保留原始时间戳的时区偏移和精度。');
  });
  it('renders loaded-log result and VM entry counts in both bundled locales', async () => {
    const i18n = createInstance();
    await i18n.init({ lng: 'en', resources: { en: { translation: en }, zh: { translation: zh } } });
    expect([0, 1, 3].map(count => i18n.t('loadedLogs.matches', { count }))).toEqual(['0 matches in loaded logs', '1 match in loaded logs', '3 matches in loaded logs']);
    expect(i18n.t('loadedLogs.vmScope', { count: 1, timezone: 'UTC' })).toContain('1 loaded entry, not live.');
    expect(i18n.t('loadedLogs.vmScope', { count: 3, timezone: 'UTC' })).toContain('3 loaded entries, not live.');
    await i18n.changeLanguage('zh');
    expect([0, 1, 3].map(count => i18n.t('loadedLogs.matches', { count }))).toEqual(['已加载日志中有 0 处匹配', '已加载日志中有 1 处匹配', '已加载日志中有 3 处匹配']);
    expect(i18n.t('loadedLogs.vmScope', { count: 1, timezone: 'UTC' })).toContain('已加载 1 个条目');
  });
  it('renders zero, singular and plural skill file counts in both bundled locales', async () => {
    const i18n = createInstance();
    await i18n.init({ lng: 'en', resources: { en: { translation: en }, zh: { translation: zh } } });
    expect([0, 1, 3].map((count) => i18n.t('targetSkills.fileCount', { count }))).toEqual(['0 files', '1 file', '3 files']);
    await i18n.changeLanguage('zh');
    expect([0, 1, 3].map((count) => i18n.t('targetSkills.fileCount', { count }))).toEqual(['0 个文件', '1 个文件', '3 个文件']);
  });
  it('explains the workspace audit automatic local-time filter semantics', () => {
    expect(en.auditLog.rangeHelp).toBe('Times use {{timezone}}. From and To include the exact entered time (seconds :00). Filters update automatically.');
  });
  it('keeps catalog terminology and account/VM guidance scoped to supported controls', () => {
    expect(en.mcpServers.serverInventoryTitle).toBe('MCP server catalog');
    expect(zh.mcpServers.serverInventoryTitle).toBe('MCP 服务器目录');
    expect(en.settings.profileBody).toBe('View your name and email address. Profile editing is not available here.');
    expect(en.settings.notificationsBody).toBe('Notification subscriptions are not configurable on this screen.');
    expect(en.virtualMachines.list.restartApprovalSettings).toBe('The host service allowlist is always enforced. Run permissions on this page separately control approval.');
    expect(en.autoTriage.vmInstructionsPlaceholder).toBe('Check the payments runbook before restarting payment.service. Review related processes and listening ports');
    expect(en.mcpServers.aboutWriteApproval).toBe('Write-capable tools can change target state. Run permissions determine which actions require approval.');
  });
  it('distinguishes target changes from approval and internal artifacts', () => {
    expect(en.virtualMachines.list.agentConnected).toBe('Agent connected');
    expect(zh.virtualMachines.list.agentConnected).toBe('Agent 已连接');
    expect(en.chat.capabilityPreviewReadMeaning).toBe('READ means no target changes. Authorized internal document and insight creation may still be available.');
    expect(en.clusterSetup.accessModeReadWriteBody).toBe('Allows target changes within the granted RBAC scope. Run permissions separately control approval.');
    expect(en.virtualMachines.list.agentAccessReadWriteBody).toBe('Can restart only the systemd services you allow below. Run permissions separately control approval.');
    expect(en.mcpServers.writeSectionHelp).toBe('Can change target state. Run permissions control whether approval is required.');
  });
  it('uses a typographic ellipsis instead of three full stops', () => {
    for (const [locale, messages] of [['en', en], ['zh', zh]] as const) {
      const offenders = stringEntries(messages).filter(([, value]) => value.includes('...'));
      expect(offenders, `${locale} strings with ASCII ellipses`).toEqual([]);
    }
  });

  it('keeps input and search placeholders free of terminal punctuation', () => {
    for (const [locale, messages] of [['en', en], ['zh', zh]] as const) {
      const offenders = stringEntries(messages).filter(([path, value]) => /placeholder/i.test(path) && /[.…。！!?？]$/.test(value));
      expect(offenders, `${locale} punctuated placeholders`).toEqual([]);
    }
  });

  it('names the workspace settings route consistently', () => {
    expect(en.app.workspaceSettings).toBe(en.settingsPage.title);
    expect(zh.app.workspaceSettings).toBe(zh.settingsPage.title);
    expect(en.app.backToWorkspace).toBe('Back to workspace');
  });

  it('identifies the resumable workspace activity as a chat', () => {
    expect(en.overview.quickActionsResumeBody).toBe('Continue your chat with {{targetName}}. Last opened {{updated}}.');
    expect(en.overview.resumeRecentInvestigation).toBe('Resume chat');
    expect(zh.overview.quickActionsResumeBody).toBe('继续与 {{targetName}} 的聊天。上次打开于 {{updated}}。');
    expect(zh.overview.resumeRecentInvestigation).toBe('继续聊天');
  });
});
