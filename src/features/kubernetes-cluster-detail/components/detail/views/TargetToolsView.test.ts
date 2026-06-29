import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const targetToolsView = readFileSync(resolve(__dirname, 'TargetToolsView.tsx'), 'utf8');
const targetToolRow = readFileSync(resolve(__dirname, 'TargetToolRow.tsx'), 'utf8');
const knowledgeBankDialog = readFileSync(resolve(__dirname, 'KnowledgeBankDialog.tsx'), 'utf8');
const enLocale = readFileSync(resolve(__dirname, '../../../../../i18n/locales/en.js'), 'utf8');

describe('TargetToolsView inventory polish', () => {
  it('keeps the top summary capability-focused and leaves domain filters in the dialog', () => {
    expect(targetToolsView).toContain("t('tools.toolsMetric')");
    expect(targetToolsView).toContain("t('tools.enabledToolsMetric')");
    expect(targetToolsView).toContain("t('tools.readOnlyTools')");
    expect(targetToolsView).toContain("t('tools.writeCapableTools')");
    expect(targetToolsView).toContain("t('tools.assistantVisibleTools')");
    expect(enLocale).toContain("assistantVisibleTools: 'Visible to assistant'");
    expect(enLocale).not.toContain("assistantVisibleTools: 'Assistant-visible'");
    expect(targetToolsView).toContain('visibility?.appearsInAssistantToolList');
    expect(targetToolsView).toContain('repeat(5,minmax(7rem,1fr))');
    expect(targetToolsView).toContain("t('tools.capabilityColumn')");
    expect(targetToolsView).toContain("t('tools.runtimeColumn')");
    expect(targetToolsView).toContain("t('tools.domainFilters')");
    expect(targetToolsView).toContain("t(toolRuntimeKind(editingTool) === 'provider_native'");
    expect(targetToolsView).not.toContain('domainFiltersMetric');
    expect(targetToolsView).not.toContain('restrictedMetric');
    expect(targetToolsView).not.toContain('filterRestricted');
    expect(targetToolsView).not.toContain('filterUnrestricted');
  });

  it('does not show a read-only permission notice while editable permissions are still loading', () => {
    expect(targetToolsView).toContain('const canEditTools = Boolean(catalog?.permissions?.canEdit);');
    expect(targetToolsView).toContain('const showPermissionNotice = catalog ? !canEditTools : !canManageTools;');
    expect(targetToolsView).toContain('{showPermissionNotice && (');
    expect(targetToolsView).not.toContain('{!canEditTools && (');
  });

  it('allows read-only users to inspect tool settings without exposing save controls', () => {
    expect(targetToolRow).toContain('const canEditTool = canEditTools && (tool.permissions?.canEdit ?? true);');
    expect(targetToolRow).toContain("canEditTool ? t('tools.configureTool') : t('tools.viewTool')");
    expect(targetToolRow).toContain('onConfigure(tool)');
    expect(targetToolRow).not.toContain("menuOptionClassName({ disabled: !canEditTools })");
    expect(targetToolRow).not.toContain('if (!canEditTools) return;');
    expect(targetToolsView).toContain("tool.id === 'knowledge_bank' ? null : draftFromTool(tool)");
    expect(targetToolsView).toContain("<KnowledgeBankDialog");
    expect(targetToolsView).toContain("const canEditSelectedTool = Boolean(editingTool && canEditTools && (editingTool.permissions?.canEdit ?? true));");
    expect(targetToolsView).toContain("t(canEditSelectedTool ? 'tools.configureTitle' : 'tools.viewTitle'");
    expect(targetToolsView).toContain('{editingTool.description}');
    expect(targetToolsView).toContain("tools.runtimeProviderNativeHelp");
    expect(targetToolsView).not.toContain("t(canEditTools ? 'tools.configureBody' : 'tools.viewBody')");
    expect(targetToolsView).toContain('readOnly={!canEditSelectedTool}');
    expect(targetToolsView).toContain(") : (\n              <Button variant=\"secondary\" onClick={closeConfigure}>");
  });

  it('keeps tool row descriptions to one line like the other target tables', () => {
    expect(targetToolRow).toContain('block truncate text-xs leading-5 text-ui-text-muted" title={tool.description}');
    expect(targetToolsView).toContain('xl:grid-cols-[minmax(0,1fr)_12rem_9.5rem]');
    expect(targetToolsView).toContain('type-label flex h-11 items-center justify-center whitespace-nowrap');
    expect(targetToolRow).not.toContain('line-clamp-2 text-xs leading-5 text-ui-text-muted">{tool.description}');
  });

  it('keeps Knowledge Bank settings compact but complete', () => {
    expect(knowledgeBankDialog).toContain("checked={settingsDraft.enabled}");
    expect(knowledgeBankDialog).toContain("t('tools.knowledgeBank.fields.enabled')");
    expect(knowledgeBankDialog).toContain("entrySearch.trim() ? t('tools.knowledgeBank.noEntryMatches') : t('tools.knowledgeBank.noEntries')");
    expect(enLocale).toContain("noEntries: 'No entries yet.'");
  });
});
