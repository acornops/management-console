import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');

describe('WorkspaceAuditLogPage audit operation rendering', () => {
  const auditLogPage = readFileSync(resolve(root, 'src/pages/WorkspaceAuditLogPage.tsx'), 'utf8');
  const enLocale = readFileSync(resolve(root, 'src/i18n/locales/en.js'), 'utf8');
  const zhLocale = readFileSync(resolve(root, 'src/i18n/locales/zh.js'), 'utf8');

  it('renders audit event operations in summaries and details', () => {
    expect(auditLogPage).toContain('formatOperation(event, t)}');
    expect(auditLogPage).toContain("[t('auditLog.operation'), formatOperation(selectedEvent, t)]");
    expect(enLocale).toContain("operation: 'Operation'");
    expect(enLocale).toContain("read: 'Read'");
    expect(enLocale).toContain("write: 'Write'");
    expect(zhLocale).toContain("operation: '操作'");
    expect(zhLocale).toContain("read: '读取'");
    expect(zhLocale).toContain("write: '写入'");
  });
});
