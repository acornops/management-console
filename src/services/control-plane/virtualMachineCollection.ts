import { requestJson } from './http';
import { pageQuery } from './query';

export type VmCollectionState = 'ok' | 'partial' | 'unavailable' | 'permission_denied' | 'timed_out' | 'unsupported' | 'unknown';
export interface VmCategoryCollection {
  status: VmCollectionState;
  omittedCount?: number;
  findingCoverage?: 'complete' | 'incomplete';
}
export type VmCollectionCategory = 'host' | 'filesystems' | 'services' | 'processes' | 'network';
export interface VmInventoryCollection {
  workspaceId: string;
  targetId: string;
  snapshotTs: string;
  categories: Record<VmCollectionCategory, VmCategoryCollection>;
}
export interface VmInventoryResponse {
  items: Record<string, unknown>[];
  collectionStatus?: VmInventoryCollection | null;
  nextCursor?: string;
}
export interface VmLogsResponse {
  entries?: Record<string, unknown>[];
  health?: { status: VmCollectionState };
  truncated?: boolean;
  returned_count?: number;
  original_count?: number;
  byte_count?: number;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function status(value: unknown): VmCollectionState {
  return typeof value === 'string' && ['ok', 'partial', 'unavailable', 'permission_denied', 'timed_out', 'unsupported'].includes(value)
    ? value as VmCollectionState : 'unknown';
}
function count(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}
/** Successful native envelopes can describe failed collection. Never render runtime messages. */
export function mapWindowsLogs(value: VmLogsResponse): VmLogsResponse {
  return { entries: value.entries || [], health: { status: status(record(value.health).status) },
    truncated: typeof value.truncated === 'boolean' ? value.truncated : undefined,
    returned_count: count(value.returned_count), original_count: count(value.original_count), byte_count: count(value.byte_count) };
}
export function mapVmInventory(value: VmInventoryResponse, workspaceId: string, targetId: string): VmInventoryResponse {
  if (!('collectionStatus' in value)) return value;
  const collection = record(value.collectionStatus);
  const snapshotTs = collection.snapshotTs;
  if (collection.workspaceId !== workspaceId || collection.targetId !== targetId || typeof snapshotTs !== 'string'
    || !Number.isFinite(Date.parse(snapshotTs)) || value.items.some((item) => item.snapshotTs !== snapshotTs)) {
    return { ...value, collectionStatus: null };
  }
  const categories = {} as VmInventoryCollection['categories'];
  for (const key of ['host', 'filesystems', 'services', 'processes', 'network'] as const) {
    const category = record(record(collection.categories)[key]);
    categories[key] = { status: status(category.status), omittedCount: count(category.omittedCount),
      findingCoverage: category.findingCoverage === 'complete' || category.findingCoverage === 'incomplete' ? category.findingCoverage : undefined };
  }
  return { ...value, collectionStatus: { workspaceId, targetId, snapshotTs, categories } };
}

export async function listVirtualMachineInventory(workspaceId: string, vmId: string): Promise<VmInventoryResponse> {
  const response = await requestJson<VmInventoryResponse>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}/resources`
  );
  return mapVmInventory(response, workspaceId, vmId);
}

export async function getVirtualMachineLogs(workspaceId: string, vmId: string, options?: { q?: string; source?: string; channel?: 'Application' | 'System' }): Promise<VmLogsResponse> {
  const response = await requestJson<VmLogsResponse>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}/logs${pageQuery({
      filters: { q: options?.q, source: options?.source, channel: options?.channel }
    })}`
  );
  return options?.channel ? mapWindowsLogs(response) : response;
}
