import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineAlert, SettingsSection } from '@acornops/ui';
import { PlugZap } from 'lucide-react';
import { SettingsRow } from '@/components/common/SettingsRow';
import { ClusterAgentInstallModal } from '@/components/kubernetes-clusters/ClusterAgentInstallModal';
import { AgentMaintenanceRows } from '@/features/targets/agent-maintenance/AgentMaintenanceRows';
import { AgentCommandPanel } from '@/features/targets/agent-maintenance/AgentCommandPanel';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import type { KubernetesCluster } from '@/types';
import { getAgentConnectionState } from '@/utils/telemetry';

export function ClusterAgentMaintenance({ cluster, workspaceName, canManageCluster, canManageAgentKeys, onInstallAgent }: {
  cluster: KubernetesCluster;
  workspaceName?: string;
  canManageCluster: boolean;
  canManageAgentKeys: boolean;
  onInstallAgent?: () => void;
}) {
  const { t } = useTranslation();
  const [instructions, setInstructions] = React.useState<{ command: string; warnings: string[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [replacing, setReplacing] = React.useState(false);
  const pending = React.useRef(false);
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const needsInstall = getAgentConnectionState(cluster) === 'not_installed';

  const generateRepair = async () => {
    if (!canManageCluster || pending.current) return;
    pending.current = true;
    setGenerating(true);
    setError(null);
    setInstructions(null);
    try {
      const result = await controlPlaneApi.getClusterInstallInstructions(cluster.workspaceId, cluster.id);
      if (mounted.current) setInstructions(result);
    } catch (failure) {
      if (mounted.current) setError(formatControlPlaneError(failure, t('agentMaintenance.repairFailed'), { area: 'cluster' }));
    } finally {
      pending.current = false;
      if (mounted.current) setGenerating(false);
    }
  };

  return <>
    <SettingsSection title={t('agentMaintenance.title')} description={t('agentMaintenance.kubernetesBody')}>
      {needsInstall ? <SettingsRow icon={PlugZap} label={t('clusterSetup.installAgent')} description={t('clusterSetup.installAgentFirst')}
        action={<Button variant="secondary" size="sm" onClick={onInstallAgent} disabled={!canManageAgentKeys || !onInstallAgent} title={!canManageAgentKeys ? t('clusterSetup.agentKeyPermissionRequired') : undefined}>{t('clusterSetup.installAgent')}</Button>} /> :
        <AgentMaintenanceRows
          agentName="AgentK"
          repairDescription={t('agentMaintenance.kubernetesRepairBody')}
          replacementDescription={t('agentMaintenance.kubernetesReplacementWarning')}
          onRepair={canManageCluster ? generateRepair : undefined}
          onReplace={canManageAgentKeys ? () => { setInstructions(null); setError(null); setReplacing(true); } : undefined}
          repairing={generating}
          replacing={replacing}
        />}
      {error && <InlineAlert tone="danger" className="rounded-none border-x-0 border-b-0 p-4 type-body type-emphasis">{error}</InlineAlert>}
      {instructions && <div className="space-y-3 border-t border-ui-border bg-ui-bg/60 p-6"><AgentCommandPanel instructions={instructions} /></div>}
    </SettingsSection>
    {replacing && canManageAgentKeys && <ClusterAgentInstallModal mode="replace" cluster={cluster} workspaceName={workspaceName || cluster.workspaceId} onClose={() => setReplacing(false)} />}
  </>;
}
