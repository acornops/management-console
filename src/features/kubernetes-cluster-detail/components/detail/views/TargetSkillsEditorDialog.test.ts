import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import {
  createSkillFilePath,
  createSkillFolderPath,
  syncLabel,
  validateSkillFilePath,
  validateSkillFolderPath
} from './targetSkillsViewModel';
import type { ControlPlaneTargetSkillsCatalog } from '@/services/controlPlaneApi';

const targetSkillsView = readFileSync(resolve(__dirname, 'TargetSkillsView.tsx'), 'utf8');
const targetSkillEditorDialog = readFileSync(resolve(__dirname, 'TargetSkillEditorDialog.tsx'), 'utf8');
const targetSkillFileTree = readFileSync(resolve(__dirname, 'TargetSkillFileTree.tsx'), 'utf8');
const targetSkillsInventory = readFileSync(resolve(__dirname, 'TargetSkillsInventory.tsx'), 'utf8');
const targetSkillsViewModel = readFileSync(resolve(__dirname, 'targetSkillsViewModel.ts'), 'utf8');

describe('Target skills editor dialog', () => {
  it('uses a two-step create flow before submitting Markdown files', () => {
    expect(targetSkillEditorDialog).toContain("import { ModalStepIndicator } from '@/components/common/ModalStepIndicator'");
    expect(targetSkillEditorDialog).toContain("{ id: 'name', label: 'Name' }");
    expect(targetSkillEditorDialog).toContain("{ id: 'files', label: 'Edit files' }");
    expect(targetSkillsView).toContain('const handleCreateNameNext = () => {');
    expect(targetSkillsView).toContain('const normalizedName = normalizeSkillName(createName);');
    expect(targetSkillsView).toContain('content: buildSkillTemplate(normalizedName, DEFAULT_SKILL_DESCRIPTION, DEFAULT_SKILL_BODY)');
    expect(targetSkillsView).toContain('files: toRequestFiles(draftFiles)');
    expect(targetSkillsView).not.toContain('createDescription');
    expect(targetSkillsView).not.toContain('createBody');
    expect(targetSkillsView).not.toContain('Markdown-only context bundles');
  });

  it('moves skill editing into a modal instead of the page footer editor', () => {
    expect(targetSkillsView).toContain('<TargetSkillEditorDialog');
    expect(targetSkillsView).toContain('onEditSkill={openEditEditor}');
    expect(targetSkillsInventory).toContain('onEditSkill: (skillId: string) => void;');
    expect(targetSkillsInventory).not.toContain('onSelectSkill');
    expect(targetSkillsView).not.toContain('Select a skill to edit');
    expect(targetSkillsView).not.toContain('Save Bundle');
  });

  it('keeps the inventory actions and toggle aligned to the MCP server table pattern', () => {
    expect(targetSkillsInventory).toContain('data-target-skill-primary-actions="true"');
    expect(targetSkillsInventory).toContain('<MoreVertical className="h-4 w-4" aria-hidden="true" />');
    expect(targetSkillsInventory).toContain('<th scope="col" className="type-label px-4 py-5 text-right sm:px-6 lg:px-8">Actions</th>');
    expect(targetSkillsInventory).toContain('role="switch"');
    expect(targetSkillsInventory).toContain("skill.enabled ? 'translate-x-[22px]' : 'translate-x-1'");
    expect(targetSkillsInventory).not.toContain('ScopeSwitch');
    expect(targetSkillsInventory).not.toContain("{selected ? 'Selected' : 'Open'}");
  });

  it('keeps a mini IDE-style file tree with user-defined folder paths', () => {
    expect(targetSkillEditorDialog).toContain('<TargetSkillFileTree');
    expect(targetSkillFileTree).toContain('Add file');
    expect(targetSkillFileTree).toContain('Add folder');
    expect(targetSkillFileTree).toContain('buildFileTree(files, draftFolders)');
    expect(targetSkillFileTree).toContain('createSkillFolderPath');
    expect(targetSkillFileTree).toContain('validateSkillFolderPath');
    expect(targetSkillFileTree).toContain('function validateTreeItemName(value: string, type: FileAction): string | null {');
    expect(targetSkillFileTree).toContain('Create one folder at a time.');
    expect(targetSkillFileTree).toContain('const [draftFolders, setDraftFolders] = React.useState<string[]>([]);');
    expect(targetSkillFileTree).toContain('const [collapsedFolderPaths, setCollapsedFolderPaths] = React.useState<Set<string>>(() => new Set());');
    expect(targetSkillFileTree).toContain('const [renameTarget, setRenameTarget] = React.useState<RenameTarget>(null);');
    expect(targetSkillFileTree).toContain('draftFolders.forEach(ensureFolder);');
    expect(targetSkillFileTree).toContain('fileTree.folders.map((folder) => renderFolder(folder, 0))');
    expect(targetSkillFileTree).not.toContain('<span>references/</span>');
    expect(targetSkillFileTree).toContain('const toggleFolderCollapsed = (path: string) => {');
    expect(targetSkillFileTree).toContain('aria-label={collapsed ? `Expand ${folder.name}` : `Collapse ${folder.name}`}');
    expect(targetSkillFileTree).toContain("collapsed ? '-rotate-90' : ''");
    expect(targetSkillFileTree).toContain('!collapsed && folder.folders.map((childFolder) => renderFolder(childFolder, depth + 1))');
    expect(targetSkillFileTree).toContain("!collapsed && folder.files.map((file) => renderFileButton(file, '', depth + 1))");
    expect(targetSkillFileTree).toContain("const [selectedFolderPath, setSelectedFolderPath] = React.useState('');");
    expect(targetSkillFileTree).toContain('onClick={() => setSelectedFolderPath(folder.path)}');
    expect(targetSkillFileTree).toContain('const renderInlineCreateRow = (depth = 0) => {');
    expect(targetSkillFileTree).toContain('const renderRenameRow = (target: Exclude<RenameTarget, null>, depth: number) => {');
    expect(targetSkillFileTree).toContain("onDoubleClick={() => startRename({ type: 'file', path: file.path })}");
    expect(targetSkillFileTree).toContain("onDoubleClick={() => startRename({ type: 'folder', path: folder.path })}");
    expect(targetSkillFileTree).toContain('replacePathPrefix(file.path, oldFolderPath, nextPath)');
    expect(targetSkillFileTree).toContain('!selectedFolderPath && renderInlineCreateRow()');
    expect(targetSkillFileTree).toContain('Folder path');
    expect(targetSkillFileTree).toContain('File path');
    expect(targetSkillFileTree).toContain('Creates folder {createPreviewPath}.');
    expect(targetSkillFileTree).toContain('setDraftFolders((current) => current.includes(folderPath) ? current : [...current, folderPath].sort((left, right) => left.localeCompare(right)))');
    expect(targetSkillFileTree).toContain('onBlur={() => {');
    expect(targetSkillFileTree).toContain('submitRename();');
    expect(targetSkillFileTree).toContain("if (event.key === 'Escape')");
    expect(targetSkillFileTree).toContain('suppressFileActionBlurRef');
    expect(targetSkillFileTree).toContain('suppressRenameBlurRef');
    expect(targetSkillFileTree).not.toContain('Use relative Markdown paths such as runbooks/cnpg.md or notes.md.');
    expect(targetSkillFileTree).not.toContain('<Check className="h-3.5 w-3.5" />');
    expect(targetSkillFileTree).not.toContain("setFileActionValue('notes.md')");
    expect(targetSkillFileTree).not.toContain("setFileActionValue('runbook')");
    expect(targetSkillFileTree).not.toContain('placeholder={placeholder}');
    expect(targetSkillFileTree).not.toContain('border-t border-ui-border bg-ui-surface px-3 py-3');
    expect(targetSkillFileTree).not.toContain('overflow-hidden rounded-md border border-ui-border bg-ui-surface');
  });

  it('validates v1 Markdown-only skill file paths in the view model', () => {
    expect(targetSkillsViewModel).not.toContain("startsWith('references/')");
    expect(targetSkillsViewModel).toContain("if (!trimmedPath.endsWith('.md')) return 'Skill files must be Markdown files ending in .md.';");
    expect(targetSkillsViewModel).toContain('export function validateSkillFolderPath(path: string, files: SkillDraftFile[], folders: string[]): string | null {');
    expect(targetSkillsViewModel).toContain("export function createSkillFilePath(label: string): string {");
    expect(targetSkillsViewModel).toContain("export function createSkillFolderPath(label: string): string {");
    expect(targetSkillsViewModel).toContain('function ensureMarkdownExtension(path: string): string {');
    expect(targetSkillsViewModel).not.toContain("map((segment) => normalizeSkillName(segment))");
    expect(targetSkillsViewModel).not.toContain("return `${folderPath || 'runbook'}/notes.md`;");
  });

  it('preserves user-entered finder names while keeping Markdown extension defaults', () => {
    expect(createSkillFilePath('Notes')).toBe('Notes.md');
    expect(createSkillFilePath('CNPG Runbook.MD')).toBe('CNPG Runbook.md');
    expect(createSkillFilePath('runbooks/CNPG Notes')).toBe('runbooks/CNPG Notes.md');
    expect(createSkillFolderPath('CNPG Runbooks')).toBe('CNPG Runbooks');
    expect(createSkillFolderPath('Teams/Database')).toBe('Teams/Database');
    expect(validateSkillFilePath('runbooks/CNPG Notes.md', [], undefined)).toBeNull();
    expect(validateSkillFolderPath('CNPG Runbooks', [], [])).toBeNull();
  });

  it('supports resetting unsaved editor changes', () => {
    expect(targetSkillsView).toContain('const resetEditorDraft = () => {');
    expect(targetSkillsView).toContain('const [editorResetVersion, setEditorResetVersion] = React.useState(0);');
    expect(targetSkillsView).toContain('setEditorResetVersion((current) => current + 1);');
    expect(targetSkillsView).toContain('resetVersion={editorResetVersion}');
    expect(targetSkillEditorDialog).toContain('onReset: () => void;');
    expect(targetSkillEditorDialog).toContain('resetVersion: number;');
    expect(targetSkillEditorDialog).toContain("const folderStateKey = `${mode}:${detail?.id || 'new'}:${step}:${resetVersion}`;");
    expect(targetSkillEditorDialog).toContain('className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-6 py-4"');
    expect(targetSkillEditorDialog).toContain('<Button variant="secondary" size="sm" onClick={onReset} disabled={!dirty || saving || loading}>Reset changes</Button>');
    expect(targetSkillEditorDialog).not.toContain('<Button variant="secondary" size="sm" onClick={onReset} disabled={!dirty || saving}>Reset changes</Button>');
  });

  it('searches skills across row context like the MCP inventory search', () => {
    expect(targetSkillsInventory).toContain('const searchableText = [');
    expect(targetSkillsInventory).toContain("skill.validationStatus === 'valid' ? 'valid' : 'needs fixes'");
    expect(targetSkillsInventory).toContain("skill.enabled ? 'enabled' : 'disabled'");
    expect(targetSkillsInventory).toContain('sourceLabel(skill)');
    expect(targetSkillsInventory).toContain('syncLabel(skill) ||');
    expect(targetSkillsInventory).toContain('searchableText.includes(normalizedSearch)');
  });

  it('imports skills as enabled without showing an import toggle', () => {
    expect(targetSkillsView).toContain('Imported snapshot');
    expect(targetSkillsView).not.toContain('Enabled automatically');
    expect(targetSkillsView).not.toContain('Enable after import');
    expect(targetSkillsView).not.toContain('Imported bundles remain editable local snapshots.');
    expect(targetSkillsView).not.toContain('ScopeSwitch');
  });

  it('labels current Git imports as unmodified to avoid implying branch freshness', () => {
    const skill = {
      source: {
        type: 'git_import',
        syncStatus: 'current'
      }
    } as ControlPlaneTargetSkillsCatalog['items'][number];

    expect(syncLabel(skill)).toBe('Unmodified');
  });

  it('keeps destructive skill deletion out of the editor popup', () => {
    expect(targetSkillEditorDialog).not.toContain('onDelete');
    expect(targetSkillEditorDialog).not.toContain('Delete</Button>');
    expect(targetSkillsInventory).toContain('<span>Delete skill</span>');
  });

  it('does not render edit-only validation warnings during manual create', () => {
    expect(targetSkillEditorDialog).toContain("detail && detail.validationStatus !== 'valid'");
    expect(targetSkillEditorDialog).not.toContain("detail?.validationStatus !== 'valid'");
  });
});
