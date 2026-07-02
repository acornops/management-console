import type { TargetType } from './types';

interface ControlPlaneTargetScope {
  targetId: string;
  targetType: TargetType;
  clusterId?: string;
}

export type TargetSkillSourceType = 'manual' | 'git_import';
export type TargetSkillImportProvider = 'github' | 'gitlab';
export type TargetSkillValidationStatus = 'valid' | 'invalid';
export type TargetSkillSyncStatus = 'not_applicable' | 'current' | 'modified';

export interface ControlPlaneTargetSkillFile {
  path: string;
  content: string;
  sizeBytes: number;
}

export interface ControlPlaneTargetSkillSource {
  type: TargetSkillSourceType;
  provider?: TargetSkillImportProvider;
  repoUrl?: string;
  apiBaseUrl?: string;
  ref?: string;
  subpath?: string;
  commitSha?: string;
  syncStatus: TargetSkillSyncStatus;
}

export interface ControlPlaneTargetSkillSummary extends ControlPlaneTargetScope {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  enabled: boolean;
  validationStatus: TargetSkillValidationStatus;
  validationErrors: string[];
  bundleStats: {
    fileCount: number;
    totalBytes: number;
  };
  source: ControlPlaneTargetSkillSource;
  createdAt: string;
  updatedAt: string;
}

export interface ControlPlaneTargetSkillDetail extends ControlPlaneTargetSkillSummary {
  files: ControlPlaneTargetSkillFile[];
}

export interface ControlPlaneTargetSkillsCatalog extends ControlPlaneTargetScope {
  workspaceId: string;
  permissions: {
    canEdit: boolean;
    editableRoles: string[];
  };
  items: ControlPlaneTargetSkillSummary[];
  nextCursor?: string;
}

export interface CreateTargetSkillInput {
  files: Array<{
    path: string;
    content: string;
  }>;
}

export interface GitTargetSkillImportInput {
  provider: TargetSkillImportProvider;
  repoUrl: string;
  apiBaseUrl?: string;
  ref?: string;
  subpath?: string;
}

export interface GitTargetSkillImportSource {
  provider: TargetSkillImportProvider;
  repoUrl: string;
  apiBaseUrl?: string;
  ref: string;
  subpath?: string;
  commitSha?: string;
}

export interface ImportTargetSkillInput {
  files: CreateTargetSkillInput['files'];
  source: GitTargetSkillImportSource;
}

export interface ReimportTargetSkillInput extends ImportTargetSkillInput {
  force?: boolean;
}

export interface UpdateTargetSkillInput {
  enabled?: boolean;
  files?: Array<{
    path: string;
    content: string;
  }>;
}
