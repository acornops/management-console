import { useCallback, useEffect, useRef } from 'react';
import { canReadWorkspaceData } from '@/app/workspacePermissions';
import { preloadAppRoutePage } from '@/app/AppPageContent';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { AppRoute } from '@/utils/routes';
import { KubernetesCluster, User, Workspace } from '@/types';

const TELEMETRY_POLL_INTERVAL_MS = 30000;

function attachClusterIds(workspaces: Workspace[], kubernetesClusters: KubernetesCluster[]): Workspace[] {
  const clusterIdsByWorkspace = new Map<string, string[]>();
  for (const cluster of kubernetesClusters) {
    const ids = clusterIdsByWorkspace.get(cluster.workspaceId) || [];
    ids.push(cluster.id);
    clusterIdsByWorkspace.set(cluster.workspaceId, ids);
  }
  return workspaces.map((workspace) => ({
    ...workspace,
    clusterIds: Array.from(new Set([...(workspace.clusterIds || []), ...(clusterIdsByWorkspace.get(workspace.id) || [])])),
    clusterCount: workspace.clusterCount ?? clusterIdsByWorkspace.get(workspace.id)?.length ?? 0
  }));
}

export function useAppBootstrap(args: {
  route: AppRoute;
  selectedWorkspaceId: string | null;
  user: User | null;
  workspaces: Workspace[];
  skipAnonymousPreferencePersistCountRef: React.MutableRefObject<number>;
  setKubernetesClusters: React.Dispatch<React.SetStateAction<KubernetesCluster[]>>;
  setIsSessionRestoring: (value: boolean) => void;
  setSelectedWorkspaceId: (workspaceId: string | null) => void;
  setUser: (user: User | null) => void;
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>;
}): {
  bootstrapSession: () => Promise<void>;
} {
  const {
    route,
    selectedWorkspaceId,
    user,
    workspaces,
    skipAnonymousPreferencePersistCountRef,
    setKubernetesClusters,
    setIsSessionRestoring,
    setSelectedWorkspaceId,
    setUser,
    setWorkspaces
  } = args;
  const telemetryPollInFlightRef = useRef(false);
  const workspacesRef = useRef<Workspace[]>([]);
  const initialWorkspaceIdRef = useRef<string | null>(
    ('workspaceId' in route ? route.workspaceId : null) || selectedWorkspaceId || null
  );

  const bootstrapSession = useCallback(async () => {
    setIsSessionRestoring(true);
    try {
      const currentUser = await controlPlaneApi.getCurrentUser();
      let fetchedWorkspaces = await controlPlaneApi.getWorkspaces(currentUser);
      let initialWorkspaceId =
        initialWorkspaceIdRef.current ||
        fetchedWorkspaces[0]?.id ||
        null;
      if (initialWorkspaceId && !fetchedWorkspaces.some((workspace) => workspace.id === initialWorkspaceId)) {
        try {
          const routeWorkspace = await controlPlaneApi.getWorkspace(initialWorkspaceId, currentUser);
          fetchedWorkspaces = [routeWorkspace, ...fetchedWorkspaces];
        } catch (error) {
          console.error('Failed loading initial workspace route target', error);
          initialWorkspaceId = fetchedWorkspaces[0]?.id || null;
        }
      }
      const initialWorkspace = fetchedWorkspaces.find((workspace) => workspace.id === initialWorkspaceId);
      const fetchedClusters = initialWorkspaceId && canReadWorkspaceData(initialWorkspace)
        ? await controlPlaneApi.getClustersForWorkspace(initialWorkspaceId)
        : [];
      setUser(currentUser);
      setKubernetesClusters(fetchedClusters);
      setWorkspaces(attachClusterIds(fetchedWorkspaces, fetchedClusters));
    } catch (err) {
      console.error('Session restoration failed', err);
      skipAnonymousPreferencePersistCountRef.current = 2;
      setUser(null);
      setKubernetesClusters([]);
      setWorkspaces([]);
      setSelectedWorkspaceId(null);
    } finally {
      setIsSessionRestoring(false);
    }
  }, [
    setKubernetesClusters,
    setIsSessionRestoring,
    setSelectedWorkspaceId,
    setUser,
    setWorkspaces,
    skipAnonymousPreferencePersistCountRef
  ]);

  useEffect(() => {
    workspacesRef.current = workspaces;
  }, [workspaces]);

  useEffect(() => {
    preloadAppRoutePage(route);
  }, [route]);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  const refreshClusterTelemetry = useCallback(async () => {
    const currentWorkspaces = workspacesRef.current;
    if (!user || telemetryPollInFlightRef.current || currentWorkspaces.length === 0) {
      return;
    }

    let workspaceIdsToPoll: string[];
    if (route.kind === 'workspaceKubernetesClusters' || route.kind === 'workspaceKubernetesClusterDiagnostics') {
      workspaceIdsToPoll = [route.workspaceId];
    } else if (selectedWorkspaceId && currentWorkspaces.some((workspace) => workspace.id === selectedWorkspaceId)) {
      workspaceIdsToPoll = [selectedWorkspaceId];
    } else {
      workspaceIdsToPoll = selectedWorkspaceId ? [selectedWorkspaceId] : [currentWorkspaces[0].id];
    }

    workspaceIdsToPoll = Array.from(new Set(workspaceIdsToPoll)).filter((workspaceId) =>
      canReadWorkspaceData(currentWorkspaces.find((workspace) => workspace.id === workspaceId))
    );
    if (workspaceIdsToPoll.length === 0) {
      return;
    }

    telemetryPollInFlightRef.current = true;
    try {
      const kubernetesClustersByWorkspace = await Promise.all(
        workspaceIdsToPoll.map((workspaceId) => controlPlaneApi.getClustersForWorkspace(workspaceId))
      );
      const fetchedClusters = kubernetesClustersByWorkspace.flat();
      const polledWorkspaceSet = new Set(workspaceIdsToPoll);

      setKubernetesClusters((prev) => {
        const previousClusterById = new Map(prev.map((app) => [app.id, app]));
        const mergedFetchedClusters = fetchedClusters.map((fetchedCluster) => {
          const previousCluster = previousClusterById.get(fetchedCluster.id);
          if (!previousCluster) {
            return fetchedCluster;
          }
          return {
            ...fetchedCluster,
            chatSessions: previousCluster.chatSessions,
            mcpTools: fetchedCluster.mcpTools.length > 0 ? fetchedCluster.mcpTools : previousCluster.mcpTools
          };
        });
        const fetchedIds = new Set(mergedFetchedClusters.map((app) => app.id));
        return [
          ...prev.filter((app) => !(polledWorkspaceSet.has(app.workspaceId) && fetchedIds.has(app.id))),
          ...mergedFetchedClusters
        ];
      });

      setWorkspaces((prev) =>
        prev.map((workspace) => {
          if (!polledWorkspaceSet.has(workspace.id)) {
            return workspace;
          }
          const nextClusterIds = fetchedClusters
            .filter((app) => app.workspaceId === workspace.id)
            .map((app) => app.id);
          const previousClusterIds = workspace.clusterIds || [];
          const mergedClusterIds = Array.from(new Set([...previousClusterIds, ...nextClusterIds]));
          const clusterIdsUnchanged =
            previousClusterIds.length === mergedClusterIds.length &&
            previousClusterIds.every((clusterId, index) => clusterId === mergedClusterIds[index]);
          return clusterIdsUnchanged
            ? workspace
            : {
                ...workspace,
                clusterIds: mergedClusterIds,
                clusterCount: Math.max(workspace.clusterCount ?? 0, mergedClusterIds.length)
              };
        })
      );
    } catch (err) {
      console.error('Telemetry refresh failed', err);
    } finally {
      telemetryPollInFlightRef.current = false;
    }
  }, [
    route.kind,
    'workspaceId' in route ? route.workspaceId : undefined,
    selectedWorkspaceId,
    setKubernetesClusters,
    setWorkspaces,
    user
  ]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void refreshClusterTelemetry();
    const intervalId = window.setInterval(() => {
      void refreshClusterTelemetry();
    }, TELEMETRY_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshClusterTelemetry, user]);

  return { bootstrapSession };
}
