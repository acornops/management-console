import type {
  ClusterToolCatalog,
  ClusterToolCatalogItem,
  ClusterToolCatalogServer
} from '@/types';

// The API/global model still uses the original cluster catalog names; target admin code uses neutral aliases.
export type TargetToolCatalog = ClusterToolCatalog;
export type TargetToolCatalogItem = ClusterToolCatalogItem;
export type TargetToolCatalogServer = ClusterToolCatalogServer;
