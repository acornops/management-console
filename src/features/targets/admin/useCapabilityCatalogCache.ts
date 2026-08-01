import React from 'react';
import type { TargetToolCatalog } from '@/features/targets/admin/targetMcpCatalogTypes';
import type {
  ControlPlaneTargetSkillsCatalog,
  ControlPlaneTargetToolsCatalog
} from '@/services/controlPlaneApi';

export interface CapabilityCatalogCache {
  mcpServers?: TargetToolCatalog;
  skills?: ControlPlaneTargetSkillsCatalog;
  tools?: ControlPlaneTargetToolsCatalog;
}

export type CapabilityCatalogsBySubject = Record<string, CapabilityCatalogCache>;

export function cacheCapabilityCatalog<K extends keyof CapabilityCatalogCache>(
  current: CapabilityCatalogsBySubject,
  subjectKey: string,
  kind: K,
  catalog: NonNullable<CapabilityCatalogCache[K]>
): CapabilityCatalogsBySubject {
  if (!subjectKey) return current;
  return {
    ...current,
    [subjectKey]: {
      ...current[subjectKey],
      [kind]: catalog
    }
  };
}

export function useCapabilityCatalogCache(subjectKey: string) {
  const [catalogsBySubject, setCatalogsBySubject] = React.useState<CapabilityCatalogsBySubject>({});
  const catalogs = subjectKey ? catalogsBySubject[subjectKey] : undefined;
  const cacheCatalog = React.useCallback(<K extends keyof CapabilityCatalogCache>(
    kind: K,
    catalog: NonNullable<CapabilityCatalogCache[K]>
  ) => {
    setCatalogsBySubject((current) => cacheCapabilityCatalog(current, subjectKey, kind, catalog));
  }, [subjectKey]);
  const cacheMcpServersCatalog = React.useCallback(
    (catalog: TargetToolCatalog) => cacheCatalog('mcpServers', catalog),
    [cacheCatalog]
  );
  const cacheSkillsCatalog = React.useCallback(
    (catalog: ControlPlaneTargetSkillsCatalog) => cacheCatalog('skills', catalog),
    [cacheCatalog]
  );
  const cacheToolsCatalog = React.useCallback(
    (catalog: ControlPlaneTargetToolsCatalog) => cacheCatalog('tools', catalog),
    [cacheCatalog]
  );

  return {
    cachedCatalogs: catalogs,
    cacheMcpServersCatalog,
    cacheSkillsCatalog,
    cacheToolsCatalog
  };
}
