import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const targetToolsView = readFileSync(resolve(__dirname, 'TargetToolsView.tsx'), 'utf8');
const targetToolRow = readFileSync(resolve(__dirname, 'TargetToolRow.tsx'), 'utf8');
const targetInsightsDialog = readFileSync(resolve(__dirname, 'TargetInsightsDialog.tsx'), 'utf8');
const targetInsightsActivityDialog = readFileSync(resolve(__dirname, 'TargetInsightsActivityDialog.tsx'), 'utf8');
const targetInsightsResetDialog = readFileSync(resolve(__dirname, 'TargetInsightsResetDialog.tsx'), 'utf8');
const targetInsightsSettingsDialog = readFileSync(resolve(__dirname, 'TargetInsightsSettingsDialog.tsx'), 'utf8');
const targetInsightsSettingsPanel = readFileSync(resolve(__dirname, 'TargetInsightsSettingsPanel.tsx'), 'utf8');
const targetInsightsViewModel = readFileSync(resolve(__dirname, 'targetInsightsDialogViewModel.ts'), 'utf8');
const targetSkillEditorDialog = readFileSync(resolve(__dirname, 'TargetSkillEditorDialog.tsx'), 'utf8');
const unsavedChangesDialog = readFileSync(resolve(__dirname, 'UnsavedChangesDialog.tsx'), 'utf8');
const enLocale = readFileSync(resolve(__dirname, '../../../i18n/locales/en.js'), 'utf8');

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
    expect(targetToolsView).toContain("tool.id === 'target_insights' ? null : draftFromTool(tool)");
    expect(targetToolsView).toContain("<TargetInsightsDialog");
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

  it('identifies platform-native tools without offering target configuration', () => {
    expect(targetToolsView).toContain("tool.origin === 'platform_native'");
    expect(targetToolRow).toContain("const isPlatformNative = tool.origin === 'platform_native';");
    expect(targetToolRow).toContain("t('tools.alwaysAvailable')");
    expect(targetToolRow).toContain('{isPlatformNative ? (');
    expect(targetToolRow).toContain("t('common.providedByAcornOps')");
    expect(targetToolRow).toContain("t('tools.noConfiguration')");
    expect(targetToolRow).toContain('isPlatformNative ? (');
    expect(enLocale).toContain("providedByAcornOps: 'Provided by AcornOps'");
    expect(enLocale).toContain("platformNativeSummary: 'Available in target chat'");
  });

  it('shows AcornOps provenance on every built-in tool while keeping origin-specific controls', () => {
    expect(targetToolRow).toContain("{t('common.providedByAcornOps')}");
    expect(targetToolRow).not.toContain("{isPlatformNative && (\n                <span className=\"type-micro-label");
    expect(targetToolRow).toContain("const isPlatformNative = tool.origin === 'platform_native';");
  });

  it('presents Insights as files instead of entries', () => {
    expect(targetInsightsViewModel).toContain('function buildInsightFilePath');
    expect(targetInsightsViewModel).toContain('insights/${entry.status}/${slug}.md');
    expect(targetInsightsDialog).toContain('data-target-insights-folder={`insights/${status}`}');
    expect(targetInsightsDialog).toContain("import { Tooltip } from '@/components/common/Tooltip';");
    expect(targetInsightsDialog).toContain('<FilePlus2 className="h-3.5 w-3.5" />');
    expect(targetInsightsDialog).toContain('<Tooltip content={t(`tools.targetInsights.folderHelp.${status}`)} side="right"');
    expect(targetInsightsDialog).toContain("t(`tools.targetInsights.folder.${status}`)");
    expect(targetInsightsDialog).toContain("t(`tools.targetInsights.folderHelp.${status}`)");
    expect(targetInsightsDialog).toContain("t('tools.targetInsights.emptyFolder')");
    expect(targetInsightsDialog).toContain('statusFiles.length > 0 ? statusFiles.map');
    expect(targetInsightsDialog).not.toContain('<span>insights/{status}</span>');
    expect(targetInsightsDialog).not.toContain("t('tools.targetInsights.filesHelp')");
    expect(targetInsightsDialog).toContain("t('tools.targetInsights.newFile')");
    expect(targetInsightsDialog).toContain("t('tools.targetInsights.noFiles')");
    expect(enLocale).toContain("active: 'active'");
    expect(enLocale).toContain("pending: 'pending'");
    expect(enLocale).toContain("archived: 'archived'");
    expect(enLocale).toContain("noFiles: 'No insight files yet.'");
    expect(enLocale).not.toContain("entries: 'Entries'");
    expect(enLocale).not.toContain("newEntry: 'New entry'");
    expect(enLocale).not.toContain("saveEntry: 'Save entry'");
  });

  it('keeps the Insights editor header compact', () => {
    expect(targetInsightsDialog).toContain('selectedFileName');
    expect(targetInsightsDialog).toContain('selectedStatus');
    expect(targetInsightsDialog).toContain('${selectedFileName} (${t(`tools.targetInsights.status.${selectedStatus}`)})');
    expect(targetInsightsDialog).not.toContain('<p className="type-label truncate text-ui-text">{selectedFilePath}</p>');
    expect(targetInsightsDialog).not.toContain('fileEditorHelp');
    expect(targetInsightsDialog).not.toContain("t('tools.targetInsights.details')");
    expect(targetInsightsDialog).not.toContain('formatDateTime');
  });

  it('uses in-app confirmation dialogs for unsaved skill and Insights edits', () => {
    expect(targetSkillEditorDialog).not.toContain('window.confirm');
    expect(targetInsightsDialog).not.toContain('window.confirm');
    expect(targetSkillEditorDialog).toContain('<UnsavedChangesDialog');
    expect(targetInsightsDialog).toContain('<UnsavedChangesDialog');
    expect(unsavedChangesDialog).toContain("import { Dialog } from '@/components/common/Dialog';");
    expect(unsavedChangesDialog).toContain('variant="danger"');
    expect(enLocale).toContain("discardTitle: 'Discard unsaved changes?'");
    expect(enLocale).toContain("keepEditing: 'Keep editing'");
    expect(enLocale).toContain("discardChanges: 'Discard changes'");
    expect(enLocale).not.toContain('discardConfirm');
  });

  it('opens focused Insights modals from row actions instead of panes', () => {
    expect(targetToolRow).toContain("invokeTargetInsightsAction('files')");
    expect(targetToolRow).toContain("invokeTargetInsightsAction('settings')");
    expect(targetToolRow).toContain("invokeTargetInsightsAction('activity')");
    expect(targetToolRow).toContain("invokeTargetInsightsAction('export')");
    expect(targetToolRow).toContain("invokeTargetInsightsAction('reset')");
    expect(targetToolsView).toContain("targetInsightsAction === 'files'");
    expect(targetToolsView).toContain("targetInsightsAction === 'settings'");
    expect(targetToolsView).toContain("targetInsightsAction === 'activity'");
    expect(targetToolsView).toContain("targetInsightsAction === 'reset'");
    expect(targetToolsView).toContain('controlPlaneApi.exportTargetInsights');
    expect(targetToolsView).toContain('document.body.appendChild(link)');
    expect(targetToolsView).toContain('window.setTimeout(() => URL.revokeObjectURL(url), 0)');
    expect(targetInsightsDialog).not.toContain("view === 'activity'");
    expect(targetInsightsDialog).not.toContain("view === 'settings'");
  });

  it('keeps Insights file edits focused on title and Markdown body', () => {
    expect(targetInsightsViewModel).toContain('interface FileDraft');
    expect(targetInsightsViewModel).toContain('title: string;');
    expect(targetInsightsViewModel).toContain('bodyMarkdown: string;');
    expect(targetInsightsViewModel).toContain('draft.title.trim() !== entry.title');
    expect(targetInsightsDialog).toContain("status: 'active'");
    expect(targetInsightsDialog).toContain('const title = draft.title.trim();');
    expect(targetInsightsDialog).toContain('title !== selectedEntry.title ? { title } : {}');
    expect(targetInsightsDialog).toContain('draft.bodyMarkdown !== selectedEntry.bodyMarkdown ? { bodyMarkdown: draft.bodyMarkdown } : {}');
    expect(targetInsightsDialog).not.toContain('tagsText');
    expect(targetInsightsDialog).not.toContain('draft.confidence');
    expect(targetInsightsDialog).not.toContain('draft.status');
  });

  it('does not expose skill-style folder creation for Insights files', () => {
    expect(targetInsightsDialog).not.toContain('TargetSkillFileTree');
    expect(targetInsightsDialog).not.toContain('onFilesChange');
    expect(targetInsightsDialog).not.toContain('newFolder');
    expect(targetInsightsDialog).not.toContain('createFolder');
  });

  it('uses file actions for Insights status transitions', () => {
    expect(targetInsightsDialog).toContain("updateFileStatus('promote')");
    expect(targetInsightsDialog).toContain("updateFileStatus('archive')");
    expect(targetInsightsDialog).toContain("updateFileStatus('restore')");
    expect(targetInsightsDialog).toContain('controlPlaneApi.promoteTargetInsightsEntry');
    expect(targetInsightsDialog).toContain('controlPlaneApi.archiveTargetInsightsEntry');
    expect(enLocale).toContain("promote: 'Promote to Active'");
    expect(enLocale).toContain("restore: 'Restore'");
  });

  it('keeps Insights settings compact but complete', () => {
    expect(targetInsightsSettingsPanel).toContain("checked={settingsDraft.enabled}");
    expect(targetInsightsSettingsPanel).toContain("t('tools.targetInsights.fields.enabled')");
    expect(targetInsightsSettingsPanel).toContain("t('tools.targetInsights.fields.checkpointModel')");
    expect(targetInsightsSettingsDialog).toContain("t('tools.targetInsights.fields.idleCheckpointDelay')");
    expect(targetInsightsSettingsDialog).toContain("t('tools.targetInsights.fields.maxSnippets')");
    expect(targetInsightsSettingsDialog).toContain("t('tools.targetInsights.fields.maxSnippetSize')");
    expect(targetInsightsSettingsDialog).toContain("t('tools.targetInsights.fields.observationsBeforeGeneralization')");
    expect(targetInsightsSettingsPanel).not.toContain("t('tools.targetInsights.reset')");
    expect(targetInsightsSettingsPanel).not.toContain("t('tools.targetInsights.export')");
  });

  it('keeps Insights activity and reset as separate dialogs', () => {
    expect(targetInsightsActivityDialog).toContain('controlPlaneApi.listTargetInsightsActivity');
    expect(targetInsightsActivityDialog).toContain("t('tools.targetInsights.activityTitle')");
    expect(targetInsightsResetDialog).toContain('controlPlaneApi.resetTargetInsights');
    expect(targetInsightsResetDialog).toContain('if (!canEdit) return;');
    expect(targetToolsView).toContain('canEdit={canEditSelectedTool}');
    expect(targetInsightsResetDialog).toContain("t('tools.targetInsights.resetWarningTitle')");
  });
});
