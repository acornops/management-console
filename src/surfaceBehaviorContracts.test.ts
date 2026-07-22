import { describe, expect, it } from 'vitest';

import {
  auditLogPage,
  chatSubmit,
  clusterOverviewView,
  enLocale,
  fieldValidationMessage,
  loginAuthPanel,
  loginAuthPanelParts,
  loginPasswordAuthForm,
  markdownComponents,
  membersPage,
  resourcesView,
  workspaceInviteModal
} from './stylesTestSupport';

describe('surface behavior contracts', () => {
  it('labels paged member and issue counts as loaded counts', () => {
    expect(membersPage).toContain('members.loadedTotalCount');
    expect(membersPage).toContain('members.loadedMatchingCount');
    expect(enLocale).toContain("inviteLinksCount: '{{count}} loaded links'");
    expect(enLocale).toContain("active: 'Active'");
  });

  it('resets resource pages through the shared collection filter lifecycle', () => {
    expect(resourcesView).toContain('const resourceCollection = useCursorCollection({');
    expect(resourcesView).toContain('filters: resourceQuery');
    expect(resourcesView).toContain("strategy: 'sentinel'");
    expect(resourcesView).not.toContain('setResourceItems([]);');
    expect(resourcesView).not.toContain('window.setTimeout');
  });

  it('does not require the full MCP tool list before requesting write-capable chat runs', () => {
    expect(chatSubmit).toContain("canRequestWriteRuns ? 'read_write' : 'read_only'");
    expect(chatSubmit).not.toContain('app.mcpTools || []');
  });

  it('keeps table rows visibly highlighted on hover', () => {
    expect(membersPage).toContain('transition-colors hover:bg-accent-soft/45');
    expect(clusterOverviewView).toContain('transition-colors last:border-b-0 hover:bg-ui-bg/70');
    expect(markdownComponents).toContain("import remarkGfm from 'remark-gfm';");
    expect(markdownComponents).toContain('export const markdownRemarkPlugins = [remarkGfm];');
    expect(markdownComponents).toContain("const tableRowHoverClass = isUserTone ? 'hover:bg-ui-bg/10' : 'hover:bg-ui-bg/70'");
    expect(markdownComponents).toContain('<tr className={`transition-colors ${tableRowHoverClass}`}>{children}</tr>');
  });

  it('keeps workspace members and audit log tables inside the viewport', () => {
    expect(membersPage).not.toContain('overflow-x-auto');
    expect(membersPage).not.toContain('min-w-[760px]');
    expect(auditLogPage).not.toContain('overflow-x-auto');
    expect(auditLogPage).not.toContain('min-w-[920px]');
  });

  it('keeps workspace member actions in the table rhythm on wide screens', () => {
    expect(membersPage).not.toContain('minmax(1rem,1fr)_5.5rem');
    expect(membersPage).not.toContain('<th className="hidden px-4 py-4 md:block" aria-hidden="true" />');
    expect(membersPage).not.toContain('<td className="hidden md:block" aria-hidden="true" />');
    expect(membersPage).toContain('table-fixed');
    expect(membersPage).toContain('md:table-cell');
    expect(membersPage).not.toContain('lg:grid-cols-[minmax(18rem,24rem)_9rem_8rem_9rem_4rem]');
    expect(membersPage).toContain('<span className="sr-only">{t(\'members.manage\')}</span>');
  });

  it('keeps workspace member and audit log pages on the shared route margins', () => {
    expect(membersPage).toContain('<PageShell embedded={embedded}>');
    expect(auditLogPage).toContain('<PageShell>');
    expect(auditLogPage).not.toContain('mx-auto max-w-7xl px-5 py-8 lg:px-8');
    expect(auditLogPage).not.toContain('overflow-hidden border-y border-ui-border bg-ui-surface');
  });

  it('uses app-styled validation instead of native browser validation bubbles', () => {
    const validationSurfaces = [
      workspaceInviteModal,
      loginAuthPanel,
      loginPasswordAuthForm,
      loginAuthPanelParts
    ].join('\n');
    expect(validationSurfaces).toContain('noValidate');
    expect(validationSurfaces).toContain('aria-invalid={Boolean(');
    expect(validationSurfaces).toContain('FieldValidationMessage');
    expect(validationSurfaces).not.toMatch(/\srequired(?:\s|>|$)/);
    expect(fieldValidationMessage).toContain('role="alert"');
    expect(fieldValidationMessage).toContain('border-status-danger/25 bg-status-danger-soft');
  });

  it('keeps audit log time presets available for log-style filtering', () => {
    expect(auditLogPage).toContain("const timePresetOptions: AuditTimePreset[] = ['today', 'last24h', 'past7d', 'past30d'];");
    expect(auditLogPage).toContain('<FilterToggleGroup');
    expect(auditLogPage).toContain('activeValue={activeTimePreset');
    expect(auditLogPage).toContain('applyNormalizedFilters(nextFilters);');
  });

  it('auto-applies audit log filter selections without relying on an apply button', () => {
    expect(auditLogPage).toContain('data-audit-filter-toolbar="true"');
    expect(auditLogPage).toContain('aria-controls="audit-custom-range-controls"');
    expect(auditLogPage).toContain('const timer = window.setTimeout(() => {');
    expect(auditLogPage).toContain('applyNormalizedFilters(draftFilters);');
    expect(auditLogPage).not.toContain("t('auditLog.applyFilters')");
  });
});
