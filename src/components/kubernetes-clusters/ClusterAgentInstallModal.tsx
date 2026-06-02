import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Dialog } from '@/components/common/Dialog';
import { ICONS } from '@/constants';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { KubernetesCluster } from '@/types';

interface ClusterAgentInstallModalProps {
  cluster: KubernetesCluster;
  workspaceName: string;
  onClose: () => void;
}

export const ClusterAgentInstallModal: React.FC<ClusterAgentInstallModalProps> = ({
  cluster,
  workspaceName,
  onClose
}) => {
  const { t } = useTranslation();
  const [agentKey, setAgentKey] = React.useState<string | null>(null);
  const [keyVersion, setKeyVersion] = React.useState<number | null>(null);
  const [installCommand, setInstallCommand] = React.useState('');
  const [installWarnings, setInstallWarnings] = React.useState<string[]>([]);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isCopying, setIsCopying] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const generateCommandButtonRef = React.useRef<HTMLButtonElement>(null);

  const command = React.useMemo(() => {
    if (installCommand) return installCommand;
    if (!agentKey) return '';
    return [
      'helm upgrade --install acornops-agent acornops/acornops-agent',
      `  --set clusterName='${cluster.name.replace(/'/g, `'\\''`)}'`,
      `  --set apiKey='${agentKey.replace(/'/g, `'\\''`)}'`
    ].join(' \\\n');
  }, [agentKey, cluster.name, installCommand]);

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const rotated = await controlPlaneApi.rotateClusterAgentKey(cluster.workspaceId, cluster.id);
      setAgentKey(rotated.agentKey);
      setKeyVersion(rotated.keyVersion);
      setInstallCommand(rotated.installCommand);
      setInstallWarnings(rotated.installWarnings);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('clusterSetup.generateFailed');
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!command || isCopying) return;
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(command);
    } finally {
      setTimeout(() => setIsCopying(false), 1200);
    }
  };

  return (
    <Dialog
      titleId="install-agent-title"
      initialFocusRef={generateCommandButtonRef}
      className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
      onClose={onClose}
    >
        <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-6 py-4">
          <div>
            <h3 id="install-agent-title" className="font-bold tracking-tight text-ui-text">{t('clusterSetup.installAgent')}</h3>
            <p className="mt-1 text-xs font-medium text-ui-text-muted">{workspaceName} / {cluster.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-accent-strong"
            aria-label={t('clusterSetup.closeInstallAgentDialog')}
          >
            <ICONS.X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-accent/20 bg-accent-soft/60 p-4">
            <p className="text-sm font-medium text-ui-text">
              {t('clusterSetup.installAgentFirst')}
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-status-danger/25 bg-status-danger-soft p-3 text-xs font-medium text-status-danger-text">
              {errorMessage}
            </div>
          )}

          {command && (
            <div className="overflow-x-auto rounded-xl bg-code-bg p-4 font-mono text-xs text-slate-100 shadow-xl">
              <pre className="whitespace-pre">{command}</pre>
            </div>
          )}

          {installWarnings.length > 0 && (
            <div className="space-y-1 rounded-lg border border-status-warning/25 bg-status-warning-soft p-3 text-xs font-medium text-status-warning-text">
              {installWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}

          {!command && (
            <p className="text-xs font-medium text-ui-text-muted">
              {t('clusterSetup.generateCommandHelp')}
            </p>
          )}

          {command && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-ui-text-muted">
                {keyVersion ? t('clusterSetup.agentKeyVersion', { version: keyVersion }) : t('clusterSetup.agentKeyPending')} {t('clusterSetup.rotateHelp')}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg border border-ui-border bg-ui-surface px-3 py-1.5 text-xs font-bold text-ui-text-muted transition-all hover:bg-ui-bg hover:text-ui-text"
              >
                {isCopying ? t('clusterSetup.copied') : t('clusterSetup.copyCommand')}
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-ui-border bg-ui-surface px-4 py-2 text-sm font-bold text-ui-text-muted transition-all hover:bg-ui-bg"
          >
            {t('app.close')}
          </button>
          <Button ref={generateCommandButtonRef} onClick={handleGenerate} disabled={isGenerating} variant="primary" size="sm">
            {isGenerating ? t('clusterSetup.generating') : command ? t('clusterSetup.regenerateCommand') : t('clusterSetup.generateCommand')}
          </Button>
        </div>
    </Dialog>
  );
};
