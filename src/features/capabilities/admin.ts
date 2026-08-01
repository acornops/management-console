export interface CapabilitySubject {
  id: string;
  workspaceId: string;
  name: string;
  targetType?: 'kubernetes' | 'virtual_machine';
}

export { McpServersView as CapabilityMcpServersView } from '@/features/targets/admin/McpServersView';
export type { McpServersDataSource as CapabilityMcpDataSource } from '@/features/targets/admin/McpServersView';
export { TargetSkillsView as CapabilitySkillsView } from '@/features/targets/admin/TargetSkillsView';
export type { TargetSkillsDataSource as CapabilitySkillsDataSource } from '@/features/targets/admin/TargetSkillsView';
export { TargetToolsView as CapabilityToolsView } from '@/features/targets/admin/TargetToolsView';
export type { TargetToolsDataSource as CapabilityToolsDataSource } from '@/features/targets/admin/TargetToolsView';

export type {
  CreateTargetMcpServerInput as CreateMcpServerInput,
  TargetMcpServer as McpServerRecord,
  TargetMcpServerTestConnectionResult as McpServerTestConnectionResult,
  UpdateTargetMcpServerInput as UpdateMcpServerInput
} from '@/services/controlPlaneApi';
export type {
  ControlPlaneTargetToolItem as CapabilityToolItem,
  ControlPlaneTargetToolsCatalog as CapabilityToolsCatalog
} from '@/services/controlPlaneApi';
export type {
  SkillDetail as CapabilitySkillDetail,
  SkillsCatalog as CapabilitySkillsCatalog
} from '@/services/control-plane/skillTypes';
export type {
  TargetToolCatalog as McpToolCatalog,
  TargetToolCatalogItem as McpToolCatalogItem,
  TargetToolCatalogServer as McpToolCatalogServer
} from '@/features/targets/admin/targetMcpCatalogTypes';
