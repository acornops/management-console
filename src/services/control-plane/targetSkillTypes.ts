import type { TargetType } from './types';
import type {
  CreateSkillInput,
  GitSkillImportSource,
  ImportSkillInput,
  ReimportSkillInput,
  ResolveGitSkillInput,
  SkillDetail,
  SkillFile,
  SkillImportProvider,
  SkillsCatalog,
  SkillSource,
  SkillSourceType,
  SkillSummary,
  SkillSyncStatus,
  SkillValidationStatus,
  UpdateSkillInput
} from './skillTypes';

interface ControlPlaneTargetScope {
  targetId?: string;
  targetType?: TargetType;
  clusterId?: string;
}

export type TargetSkillSourceType = SkillSourceType;
export type TargetSkillImportProvider = SkillImportProvider;
export type TargetSkillValidationStatus = SkillValidationStatus;
export type TargetSkillSyncStatus = SkillSyncStatus;
export type ControlPlaneTargetSkillFile = SkillFile;
export type ControlPlaneTargetSkillSource = SkillSource;
export type ControlPlaneTargetSkillSummary = SkillSummary & ControlPlaneTargetScope;
export type ControlPlaneTargetSkillDetail = SkillDetail & ControlPlaneTargetScope;
export type ControlPlaneTargetSkillsCatalog = SkillsCatalog & ControlPlaneTargetScope;
export type CreateTargetSkillInput = CreateSkillInput;
export type ResolveGitTargetSkillInput = ResolveGitSkillInput;
export type GitTargetSkillImportSource = GitSkillImportSource;
export type ImportTargetSkillInput = ImportSkillInput;
export type ReimportTargetSkillInput = ReimportSkillInput;
export type UpdateTargetSkillInput = UpdateSkillInput;
