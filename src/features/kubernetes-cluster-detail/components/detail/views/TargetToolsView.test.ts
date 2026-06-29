import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const targetToolsView = readFileSync(resolve(__dirname, 'TargetToolsView.tsx'), 'utf8');
const targetToolRow = readFileSync(resolve(__dirname, 'TargetToolRow.tsx'), 'utf8');
const knowledgeBankDialog = readFileSync(resolve(__dirname, 'KnowledgeBankDialog.tsx'), 'utf8');
const knowledgeBankActivityDialog = readFileSync(resolve(__dirname, 'KnowledgeBankActivityDialog.tsx'), 'utf8');
const knowledgeBankResetDialog = readFileSync(resolve(__dirname, 'KnowledgeBankResetDialog.tsx'), 'utf8');
const knowledgeBankSettingsDialog = readFileSync(resolve(__dirname, 'KnowledgeBankSettingsDialog.tsx'), 'utf8');
const knowledgeBankSettingsPanel = readFileSync(resolve(__dirname, 'KnowledgeBankSettingsPanel.tsx'), 'utf8');
const knowledgeBankViewModel = readFileSync(resolve(__dirname, 'knowledgeBankDialogViewModel.ts'), 'utf8');
const targetSkillEditorDialog = readFileSync(resolve(__dirname, 'TargetSkillEditorDialog.tsx'), 'utf8');
const unsavedChangesDialog = readFileSync(resolve(__dirname, 'UnsavedChangesDialog.tsx'), 'utf8');
const enLocale = readFileSync(resolve(__dirname, '../../../../../i18n/locales/en.js'), 'utf8');
const knowledgeBankSpec = readFileSync(resolve(__dirname, '../../../../../../docs/product-specs/knowledge-bank-console.md'), 'utf8');

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

  it('presents Knowledge Bank as files instead of entries', () => {
    expect(knowledgeBankViewModel).toContain('function buildKnowledgeFilePath');
    expect(knowledgeBankViewModel).toContain('knowledge-bank/${entry.status}/${slug}.md');
    expect(knowledgeBankDialog).toContain('data-knowledge-bank-folder={`knowledge-bank/${status}`}');
    expect(knowledgeBankDialog).toContain("import { Tooltip } from '@/components/common/Tooltip';");
    expect(knowledgeBankDialog).toContain('<FilePlus2 className="h-3.5 w-3.5" />');
    expect(knowledgeBankDialog).toContain('<Tooltip content={t(`tools.knowledgeBank.folderHelp.${status}`)} side="right"');
    expect(knowledgeBankDialog).toContain("t(`tools.knowledgeBank.folder.${status}`)");
    expect(knowledgeBankDialog).toContain("t(`tools.knowledgeBank.folderHelp.${status}`)");
    expect(knowledgeBankDialog).toContain("t('tools.knowledgeBank.emptyFolder')");
    expect(knowledgeBankDialog).toContain('statusFiles.length > 0 ? statusFiles.map');
    expect(knowledgeBankDialog).not.toContain('<span>knowledge-bank/{status}</span>');
    expect(knowledgeBankDialog).not.toContain("t('tools.knowledgeBank.filesHelp')");
    expect(knowledgeBankDialog).toContain("t('tools.knowledgeBank.newFile')");
    expect(knowledgeBankDialog).toContain("t('tools.knowledgeBank.noFiles')");
    expect(enLocale).toContain("active: 'active'");
    expect(enLocale).toContain("pending: 'pending'");
    expect(enLocale).toContain("archived: 'archived'");
    expect(enLocale).toContain("noFiles: 'No knowledge files yet.'");
    expect(enLocale).not.toContain("entries: 'Entries'");
    expect(enLocale).not.toContain("newEntry: 'New entry'");
    expect(enLocale).not.toContain("saveEntry: 'Save entry'");
  });

  it('keeps the Knowledge Bank editor header compact', () => {
    expect(knowledgeBankDialog).toContain('selectedFileName');
    expect(knowledgeBankDialog).toContain('selectedStatus');
    expect(knowledgeBankDialog).toContain('${selectedFileName} (${t(`tools.knowledgeBank.status.${selectedStatus}`)})');
    expect(knowledgeBankDialog).not.toContain('<p className="type-label truncate text-ui-text">{selectedFilePath}</p>');
    expect(knowledgeBankDialog).not.toContain('fileEditorHelp');
    expect(knowledgeBankDialog).not.toContain("t('tools.knowledgeBank.details')");
    expect(knowledgeBankDialog).not.toContain('formatDateTime');
    expect(knowledgeBankSpec).toContain('should not show the full virtual path in the editor header');
    expect(knowledgeBankSpec).toContain('should not include a default details section');
  });

  it('uses in-app confirmation dialogs for unsaved skill and Knowledge Bank edits', () => {
    expect(targetSkillEditorDialog).not.toContain('window.confirm');
    expect(knowledgeBankDialog).not.toContain('window.confirm');
    expect(targetSkillEditorDialog).toContain('<UnsavedChangesDialog');
    expect(knowledgeBankDialog).toContain('<UnsavedChangesDialog');
    expect(unsavedChangesDialog).toContain("import { Dialog } from '@/components/common/Dialog';");
    expect(unsavedChangesDialog).toContain('variant="danger"');
    expect(enLocale).toContain("discardTitle: 'Discard unsaved changes?'");
    expect(enLocale).toContain("keepEditing: 'Keep editing'");
    expect(enLocale).toContain("discardChanges: 'Discard changes'");
    expect(enLocale).not.toContain('discardConfirm');
  });

  it('opens focused Knowledge Bank modals from row actions instead of panes', () => {
    expect(targetToolRow).toContain("invokeKnowledgeBankAction('files')");
    expect(targetToolRow).toContain("invokeKnowledgeBankAction('settings')");
    expect(targetToolRow).toContain("invokeKnowledgeBankAction('activity')");
    expect(targetToolRow).toContain("invokeKnowledgeBankAction('export')");
    expect(targetToolRow).toContain("invokeKnowledgeBankAction('reset')");
    expect(targetToolsView).toContain("knowledgeBankAction === 'files'");
    expect(targetToolsView).toContain("knowledgeBankAction === 'settings'");
    expect(targetToolsView).toContain("knowledgeBankAction === 'activity'");
    expect(targetToolsView).toContain("knowledgeBankAction === 'reset'");
    expect(targetToolsView).toContain('controlPlaneApi.exportKnowledgeBank');
    expect(targetToolsView).toContain('document.body.appendChild(link)');
    expect(targetToolsView).toContain('window.setTimeout(() => URL.revokeObjectURL(url), 0)');
    expect(knowledgeBankDialog).not.toContain("view === 'activity'");
    expect(knowledgeBankDialog).not.toContain("view === 'settings'");
  });

  it('keeps Knowledge Bank file edits focused on title and Markdown body', () => {
    expect(knowledgeBankViewModel).toContain('interface FileDraft');
    expect(knowledgeBankViewModel).toContain('title: string;');
    expect(knowledgeBankViewModel).toContain('bodyMarkdown: string;');
    expect(knowledgeBankViewModel).toContain('draft.title.trim() !== entry.title');
    expect(knowledgeBankDialog).toContain("status: 'active'");
    expect(knowledgeBankDialog).toContain('const title = draft.title.trim();');
    expect(knowledgeBankDialog).toContain('title !== selectedEntry.title ? { title } : {}');
    expect(knowledgeBankDialog).toContain('draft.bodyMarkdown !== selectedEntry.bodyMarkdown ? { bodyMarkdown: draft.bodyMarkdown } : {}');
    expect(knowledgeBankDialog).not.toContain('tagsText');
    expect(knowledgeBankDialog).not.toContain('draft.confidence');
    expect(knowledgeBankDialog).not.toContain('draft.status');
  });

  it('does not expose skill-style folder creation for Knowledge Bank files', () => {
    expect(knowledgeBankDialog).not.toContain('TargetSkillFileTree');
    expect(knowledgeBankDialog).not.toContain('onFilesChange');
    expect(knowledgeBankDialog).not.toContain('newFolder');
    expect(knowledgeBankDialog).not.toContain('createFolder');
    expect(knowledgeBankSpec).toContain('Users cannot create custom folders, subfolders, or arbitrary file paths');
    expect(knowledgeBankSpec).toContain('folders are fixed system groups derived from entry status');
  });

  it('uses file actions for Knowledge Bank status transitions', () => {
    expect(knowledgeBankDialog).toContain("updateFileStatus('promote')");
    expect(knowledgeBankDialog).toContain("updateFileStatus('archive')");
    expect(knowledgeBankDialog).toContain("updateFileStatus('restore')");
    expect(knowledgeBankDialog).toContain('controlPlaneApi.promoteKnowledgeBankEntry');
    expect(knowledgeBankDialog).toContain('controlPlaneApi.archiveKnowledgeBankEntry');
    expect(enLocale).toContain("promote: 'Promote to Active'");
    expect(enLocale).toContain("restore: 'Restore'");
  });

  it('keeps Knowledge Bank settings compact but complete', () => {
    expect(knowledgeBankSettingsPanel).toContain("checked={settingsDraft.enabled}");
    expect(knowledgeBankSettingsPanel).toContain("t('tools.knowledgeBank.fields.enabled')");
    expect(knowledgeBankSettingsPanel).toContain("t('tools.knowledgeBank.fields.checkpointModel')");
    expect(knowledgeBankSettingsDialog).toContain("t('tools.knowledgeBank.fields.idleCheckpointDelay')");
    expect(knowledgeBankSettingsDialog).toContain("t('tools.knowledgeBank.fields.maxSnippets')");
    expect(knowledgeBankSettingsDialog).toContain("t('tools.knowledgeBank.fields.maxSnippetSize')");
    expect(knowledgeBankSettingsDialog).toContain("t('tools.knowledgeBank.fields.observationsBeforeGeneralization')");
    expect(knowledgeBankSettingsPanel).not.toContain("t('tools.knowledgeBank.reset')");
    expect(knowledgeBankSettingsPanel).not.toContain("t('tools.knowledgeBank.export')");
  });

  it('keeps Knowledge Bank activity and reset as separate dialogs', () => {
    expect(knowledgeBankActivityDialog).toContain('controlPlaneApi.listKnowledgeBankActivity');
    expect(knowledgeBankActivityDialog).toContain("t('tools.knowledgeBank.activityTitle')");
    expect(knowledgeBankResetDialog).toContain('controlPlaneApi.resetKnowledgeBank');
    expect(knowledgeBankResetDialog).toContain('if (!canEdit) return;');
    expect(targetToolsView).toContain('canEdit={canEditSelectedTool}');
    expect(knowledgeBankResetDialog).toContain("t('tools.knowledgeBank.resetWarningTitle')");
  });
});
