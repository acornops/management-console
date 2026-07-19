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

  it('keeps audit filters discoverable with audit object vocabulary', () => {
    expect(auditLogPage).toContain('const eventTypeOptions');
    expect(auditLogPage).toContain('const objectTypeOptions');
    expect(auditLogPage).toContain('<Select<string>');
    expect(auditLogPage).toContain("t('auditLog.allEventTypes')");
    expect(auditLogPage).toContain("t('auditLog.allObjectTypes')");
    expect(auditLogPage).toContain("t('auditLog.object')");
    expect(auditLogPage).toContain('objectType: filters.objectType.trim() || undefined');
    expect(auditLogPage).toContain("value: 'kubernetes', label: 'kubernetes'");
    expect(auditLogPage).toContain("value: 'kubernetes_cluster', label: 'kubernetes_cluster'");
    expect(auditLogPage).not.toContain('<datalist');
    expect(enLocale).toContain("allEventTypes: 'All event types'");
    expect(enLocale).toContain("allObjectTypes: 'All object types'");
    expect(enLocale).toContain("target: 'Deployment targets'");
    expect(enLocale).toContain("object: 'Object'");
    expect(zhLocale).toContain("allEventTypes: '所有事件类型'");
    expect(zhLocale).toContain("allObjectTypes: '所有对象类型'");
    expect(zhLocale).toContain("target: '部署目标'");
    expect(zhLocale).toContain("object: '对象'");
  });

  it('keeps audit log mobile rows and pagination usable without extra clicks', () => {
    expect(auditLogPage).toContain('useCursorCollection({');
    expect(auditLogPage).toContain("strategy: 'sentinel'");
    expect(auditLogPage).toContain('ref={auditCollection.sentinelRef}');
    expect(auditLogPage).toContain('void auditCollection.loadMore()');
    expect(auditLogPage).not.toContain('new IntersectionObserver');
    expect(auditLogPage).toContain('md:hidden');
    expect(auditLogPage).toContain('{formatActor(event)}');
    expect(auditLogPage).toContain('{formatObject(event)} · {event.object.type}');
  });

  it('keeps the audit details row action on the shared tooltip primitive', () => {
    expect(auditLogPage).toContain("<Tooltip content={t('auditLog.viewDetails')}>");
    expect(auditLogPage).toContain("aria-label={t('auditLog.viewDetails')}");
  });
});
