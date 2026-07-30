import type { TargetToolCatalog } from '@/features/targets/admin/targetMcpCatalogTypes';
import type { TargetDescriptor, TargetMcpToolSummary } from '@/features/targets/targetDescriptor';

export interface McpServersViewProps {
  target: TargetDescriptor;
  canManageMcp?: boolean;
  canManageTools?: boolean;
  canRequestWriteRuns?: boolean;
  initialCatalog?: TargetToolCatalog | null;
  onCatalogChange?: (catalog: TargetToolCatalog) => void;
  onSyncTools?: (tools: TargetMcpToolSummary[]) => void;
}
