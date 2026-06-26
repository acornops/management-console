import type {
  ControlPlaneTargetSkillDetail,
  ControlPlaneTargetSkillsCatalog,
  CreateTargetSkillInput,
  TargetType
} from '@/services/controlPlaneApi';
import type { KubernetesCluster } from '@/types';

export interface TargetSkillsViewProps {
  cluster: KubernetesCluster;
  targetContext?: {
    workspaceId: string;
    targetId: string;
    targetType: TargetType;
  };
  canManageSkills?: boolean;
}

export interface SkillDraftFile {
  path: string;
  content: string;
}

export type SkillEditorMode = 'create' | 'edit';
export type SkillEditorStep = 'name' | 'files';

export const DEFAULT_SKILL_NAME = 'New skill';
export const DEFAULT_SKILL_DESCRIPTION = 'Describe when this troubleshooting skill should be applied.';
export const DEFAULT_SKILL_BODY = `## Purpose

Describe the target troubleshooting workflow this skill supports.

## Guidance

- Add the primary investigation steps.
- Capture target-specific assumptions and guardrails.
- Use supporting Markdown files for longer runbooks or background context.`;

export function normalizeSkillName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 64)
    .replace(/-+$/g, '');
  return normalized || 'new-skill';
}

export function buildSkillTemplate(
  name = DEFAULT_SKILL_NAME,
  description = DEFAULT_SKILL_DESCRIPTION,
  body = DEFAULT_SKILL_BODY
): string {
  return `---
name: ${name}
description: ${description}
---

${body.trim()}
`;
}

export function formatError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function sortDraftFiles(files: SkillDraftFile[]): SkillDraftFile[] {
  return [...files].sort((left, right) => {
    if (left.path === 'SKILL.md' && right.path !== 'SKILL.md') return -1;
    if (left.path !== 'SKILL.md' && right.path === 'SKILL.md') return 1;
    return left.path.localeCompare(right.path);
  });
}

export function validateSkillFilePath(path: string, files: SkillDraftFile[], currentPath?: string): string | null {
  const trimmedPath = path.trim();
  if (!trimmedPath) return 'Enter a file path.';
  if (trimmedPath === 'SKILL.md') {
    return currentPath === 'SKILL.md' ? null : 'SKILL.md already exists.';
  }
  if (!trimmedPath.endsWith('.md')) return 'Skill files must be Markdown files ending in .md.';
  if (trimmedPath.startsWith('/') || trimmedPath.endsWith('/') || trimmedPath.includes('//')) {
    return 'Enter a valid Markdown file path.';
  }
  const pathSegments = trimmedPath.split('/');
  if (pathSegments.some((segment) => !segment || segment === '.' || segment === '..')) return 'Enter a valid Markdown file path.';
  return files.some((file) => file.path === trimmedPath && file.path !== currentPath)
    ? 'A file with this path already exists.'
    : null;
}

export function validateSkillFolderPath(path: string, files: SkillDraftFile[], folders: string[]): string | null {
  const trimmedPath = path.trim();
  if (!trimmedPath) return 'Enter a folder path.';
  if (trimmedPath === 'SKILL.md' || trimmedPath.endsWith('.md')) return 'Folders cannot use Markdown file names.';
  if (trimmedPath.startsWith('/') || trimmedPath.endsWith('/') || trimmedPath.includes('//')) {
    return 'Enter a valid folder path.';
  }
  const pathSegments = trimmedPath.split('/');
  if (pathSegments.some((segment) => !segment || segment === '.' || segment === '..')) return 'Enter a valid folder path.';
  const existingFolderPaths = new Set(folders);
  files.forEach((file) => {
    const parts = file.path.split('/');
    parts.slice(0, -1).forEach((_, index) => {
      existingFolderPaths.add(parts.slice(0, index + 1).join('/'));
    });
  });
  return existingFolderPaths.has(trimmedPath) ? 'A folder with this path already exists.' : null;
}

function cleanSkillPathInput(label: string): string {
  return label
    .trim()
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/');
}

function ensureMarkdownExtension(path: string): string {
  if (/\.md$/i.test(path)) {
    return path.replace(/\.md$/i, '.md');
  }
  return `${path}.md`;
}

export function createSkillFilePath(label: string): string {
  const trimmedLabel = cleanSkillPathInput(label);
  if (!trimmedLabel) return '';
  return ensureMarkdownExtension(trimmedLabel);
}

export function createSkillFolderPath(label: string): string {
  const trimmedLabel = cleanSkillPathInput(label).replace(/\/+$/g, '');
  if (!trimmedLabel) return '';
  return trimmedLabel;
}

export function toDraftFiles(files: ControlPlaneTargetSkillDetail['files']): SkillDraftFile[] {
  return sortDraftFiles(files.map((file) => ({ path: file.path, content: file.content })));
}

export function toRequestFiles(files: SkillDraftFile[]): CreateTargetSkillInput['files'] {
  return sortDraftFiles(files).map((file) => ({ path: file.path, content: file.content }));
}

export function summarizeBytes(totalBytes: number): string {
  if (totalBytes < 1024) return `${totalBytes} B`;
  return `${(totalBytes / 1024).toFixed(1)} KiB`;
}

export function sourceLabel(skill: ControlPlaneTargetSkillsCatalog['items'][number]): string | null {
  return skill.source.type === 'git_import' ? 'Git import' : null;
}

export function syncLabel(skill: ControlPlaneTargetSkillsCatalog['items'][number]): string | null {
  if (skill.source.type !== 'git_import') return null;
  if (skill.source.syncStatus === 'modified') return 'Locally modified';
  if (skill.source.syncStatus === 'current') return 'Unmodified';
  return null;
}
