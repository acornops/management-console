import { useCallback, useMemo, useState } from 'react';
import { KubernetesCluster, Workspace } from '@/types';

export function useClusterCopilotState(
  kubernetesClusterById: Map<string, KubernetesCluster>,
  workspaceById: Map<string, Workspace>
) {
  const [isClusterCopilotOpen, setIsClusterCopilotOpen] = useState(false);
  const [clusterCopilotClusterId, setClusterCopilotClusterId] = useState<string | null>(null);
  const [clusterCopilotWidth, setClusterCopilotWidth] = useState(640);
  const [clusterCopilotInitialPrompt, setClusterCopilotInitialPrompt] = useState<{ id: number; text: string } | null>(null);
  const clusterCopilotCluster = useMemo(
    () => (clusterCopilotClusterId ? kubernetesClusterById.get(clusterCopilotClusterId) || null : null),
    [clusterCopilotClusterId, kubernetesClusterById]
  );
  const clusterCopilotWorkspace = clusterCopilotCluster ? workspaceById.get(clusterCopilotCluster.workspaceId) : undefined;
  const openClusterCopilot = useCallback((cluster: KubernetesCluster, prompt?: string) => {
    setClusterCopilotClusterId(cluster.id);
    setClusterCopilotInitialPrompt(prompt && prompt.trim() ? { id: Date.now(), text: prompt.trim() } : null);
    setIsClusterCopilotOpen(true);
  }, []);

  return {
    clusterCopilotCluster,
    clusterCopilotInitialPrompt,
    clusterCopilotWidth,
    clusterCopilotWorkspace,
    isClusterCopilotOpen,
    openClusterCopilot,
    setClusterCopilotInitialPrompt,
    setClusterCopilotWidth,
    setIsClusterCopilotOpen
  };
}
