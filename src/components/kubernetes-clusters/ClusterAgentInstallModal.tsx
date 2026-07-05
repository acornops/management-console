import React from 'react';
import { Check, Copy, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Dialog } from '@/components/common/Dialog';
import { ClusterAgentAccessModeSelector } from '@/components/kubernetes-clusters/ClusterAgentAccessModeSelector';
import { ICONS } from '@/constants';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { AgentAccessMode } from '@/services/control-plane/types';
import { KubernetesCluster } from '@/types';

const GENERATE_COMMAND_SPINNER_DELAY_MS = 500;

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
  const [agentAccessMode, setAgentAccessMode] = React.useState<AgentAccessMode>('read_only');
  const [installCommand, setInstallCommand] = React.useState('');
  const [installWarnings, setInstallWarnings] = React.useState<string[]>([]);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [showGenerateSpinner, setShowGenerateSpinner] = React.useState(false);
  const [isCopying, setIsCopying] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const generateCommandButtonRef = React.useRef<HTMLButtonElement>(null);

  const command = React.useMemo(() => installCommand, [installCommand]);
  const generateCommandLabel = command ? t('clusterSetup.regenerateCommand') : t('clusterSetup.generateCommand');

  React.useEffect(() => {
    if (!isGenerating) {
      setShowGenerateSpinner(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowGenerateSpinner(true);
    }, GENERATE_COMMAND_SPINNER_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isGenerating]);

  const handleAccessModeChange = (nextMode: AgentAccessMode) => {
    setAgentAccessMode(nextMode);
    setAgentKey(null);
    setKeyVersion(null);
    setInstallCommand('');
    setInstallWarnings([]);
    setErrorMessage(null);
  };

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const rotated = await controlPlaneApi.rotateClusterAgentKey(cluster.workspaceId, cluster.id, { agentAccessMode });
      setAgentKey(rotated.agentKey);
      setKeyVersion(rotated.keyVersion);
      setInstallCommand(rotated.installCommand);
      setInstallWarnings(rotated.installWarnings);
    } catch (error) {
      const message = formatControlPlaneError(error, t('clusterSetup.generateFailed'), { area: 'cluster' });
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
      className="relative flex max-h-[min(92vh,56rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
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

        <div className="space-y-4 overflow-y-auto p-6">
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

          <ClusterAgentAccessModeSelector
            idPrefix="install-cluster"
            value={agentAccessMode}
            onChange={handleAccessModeChange}
            disabled={isGenerating}
          />

          {command && (
            <div className="rounded-xl border border-ui-border bg-ui-bg shadow-sm">
              <div className="flex items-center justify-between gap-3 px-4 pt-4">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-ui-text-muted">{t('clusterSetup.installCommand')}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={isCopying}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ui-border bg-ui-surface text-ui-text-muted shadow-sm transition-all hover:bg-ui-bg hover:text-ui-text disabled:cursor-wait disabled:opacity-70"
                  aria-label={isCopying ? t('clusterSetup.copied') : t('clusterSetup.copy')}
                >
                  {isCopying ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <div className="max-h-[18rem] overflow-auto px-4 pb-4 pt-3 font-mono text-xs leading-6 text-ui-text">
                <pre className="whitespace-pre">{command}</pre>
              </div>
            </div>
          )}

          {agentKey && !command && (
            <div className="rounded-lg border border-status-warning/25 bg-status-warning-soft p-4 text-sm font-semibold text-status-warning-text">
              {t('clusterSetup.missingInstallCommand')}
            </div>
          )}

          {installWarnings.length > 0 && (
            <div className="space-y-1 rounded-lg border border-status-warning/25 bg-status-warning-soft p-3 text-xs font-medium text-status-warning-text">
              {installWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}

          {!agentKey && !command && (
            <p className="text-xs font-medium text-ui-text-muted">
              {t('clusterSetup.generateCommandHelp')}
            </p>
          )}

          {command && (
            <p className="text-[11px] leading-5 text-ui-text-muted">
              {keyVersion ? t('clusterSetup.agentKeyVersion', { version: keyVersion }) : t('clusterSetup.agentKeyPending')} {t('clusterSetup.rotateHelp')}
            </p>
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
          <Button
            ref={generateCommandButtonRef}
            onClick={handleGenerate}
            variant="primary"
            size="sm"
            className={isGenerating ? 'cursor-wait' : ''}
            aria-busy={isGenerating}
            aria-disabled={isGenerating}
            aria-label={isGenerating ? t('clusterSetup.generating') : generateCommandLabel}
          >
            {showGenerateSpinner && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {generateCommandLabel}
          </Button>
        </div>
    </Dialog>
  );
};
