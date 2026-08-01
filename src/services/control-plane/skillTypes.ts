export type SkillSourceType = 'manual' | 'git_import';
export type SkillImportProvider = 'github' | 'gitlab';
export type SkillValidationStatus = 'valid' | 'invalid';
export type SkillSyncStatus = 'not_applicable' | 'current' | 'modified';

export interface SkillFile {
  path: string;
  content: string;
  sizeBytes: number;
}

export interface SkillSource {
  type: SkillSourceType;
  provider?: SkillImportProvider;
  repoUrl?: string;
  apiBaseUrl?: string;
  ref?: string;
  subpath?: string;
  commitSha?: string;
  syncStatus: SkillSyncStatus;
}

export interface SkillSummary {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  enabled: boolean;
  validationStatus: SkillValidationStatus;
  validationErrors: string[];
  bundleStats: { fileCount: number; totalBytes: number };
  source: SkillSource;
  createdAt: string;
  updatedAt: string;
  inherited?: boolean;
}

export interface SkillDetail extends SkillSummary {
  files: SkillFile[];
}

export interface SkillsCatalog {
  workspaceId: string;
  permissions: { canEdit: boolean; editableRoles: string[] };
  items: SkillSummary[];
  nextCursor?: string;
}

export interface CreateSkillInput {
  files: Array<{ path: string; content: string }>;
}

export interface ResolveGitSkillInput {
  repoUrl: string;
  ref?: string;
  subpath?: string;
}

export interface GitSkillImportSource {
  provider: SkillImportProvider;
  repoUrl: string;
  ref: string;
  subpath?: string;
  commitSha?: string;
}

export interface ImportSkillInput {
  files: CreateSkillInput['files'];
  source: GitSkillImportSource;
}

export interface ReimportSkillInput extends ImportSkillInput {
  force?: boolean;
}

export interface UpdateSkillInput {
  enabled?: boolean;
  files?: Array<{ path: string; content: string }>;
}
