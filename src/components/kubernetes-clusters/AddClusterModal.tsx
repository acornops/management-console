import React, { useState } from 'react';
import { Check, Copy, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import { Button } from '@/components/common/Button';
import { CloseButton } from '@/components/common/ComponentVocabulary';
import { Dialog } from '@/components/common/Dialog';
import { ModalStepIndicator } from '@/components/common/ModalStepIndicator';
import { formInputClassName } from '@/components/common/formControlStyles';
import { ClusterAgentAccessModeSelector } from '@/components/kubernetes-clusters/ClusterAgentAccessModeSelector';
import { parseNamespaceList } from '@/app/useAppSupport';
import type { AgentAccessMode } from '@/services/control-plane/types';

interface AddClusterModalProps {
  isOpen: boolean;
  clusterCreationStep: 'details' | 'instructions';
  newClusterName: string;
  includeNamespaces: string;
  excludeNamespaces: string;
  clusterInstallCommand: string;
  clusterInstallWarnings: string[];
  isCreatingCluster: boolean;
  onClose: () => void;
  onClusterNameChange: (value: string) => void;
  onIncludeNamespacesChange: (value: string) => void;
  onExcludeNamespacesChange: (value: string) => void;
  onProceedToInstructions: (agentAccessMode: AgentAccessMode) => void;
  onConfirmInstalled: () => void | Promise<void>;
}

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function helmSetJson(path: string, value: string[]): string {
  return `  --set-json ${path}=${shellSingleQuote(JSON.stringify(value))}`;
}

const clusterNameInputClassName = formInputClassName('px-4 font-medium');
const namespaceInputClassName = formInputClassName('text-xs font-medium');

export function updateInstallCommandNamespaceScope(
  command: string,
  includeValue: string,
  excludeValue: string
): string {
  const include = parseNamespaceList(includeValue);
  const exclude = parseNamespaceList(excludeValue);
  const normalizedLines = command
    .split('\n')
    .map((line) => line.replace(/\s*\\$/, '').trimEnd())
    .filter((line) =>
      !line.includes('--set-json namespaceScope.include=') &&
      !line.includes('--set-json namespaceScope.exclude=') &&
      !line.includes('--set-string config.watchNamespaces=')
    );

  const namespaceLines = [
    helmSetJson('namespaceScope.include', include),
    helmSetJson('namespaceScope.exclude', exclude)
  ];
  const agentKeyIndex = normalizedLines.findIndex((line) => line.includes('--set-string config.agentKey='));
  const insertIndex = agentKeyIndex >= 0 ? agentKeyIndex + 1 : normalizedLines.length;

  return [
    ...normalizedLines.slice(0, insertIndex),
    ...namespaceLines,
    ...normalizedLines.slice(insertIndex)
  ].join(' \\\n');
}

/**
 * Modal flow for adding a cluster and showing local agent installation command.
 */
export const AddClusterModal: React.FC<AddClusterModalProps> = ({
  isOpen,
  clusterCreationStep,
  newClusterName,
  includeNamespaces,
  excludeNamespaces,
  clusterInstallCommand,
  clusterInstallWarnings,
  isCreatingCluster,
  onClose,
  onClusterNameChange,
  onIncludeNamespacesChange,
  onExcludeNamespacesChange,
  onProceedToInstructions,
  onConfirmInstalled
}) => {
  const { t } = useTranslation();
  const [hasCopiedCommand, setHasCopiedCommand] = useState(false);
  const [agentAccessMode, setAgentAccessMode] = useState<AgentAccessMode>('read_only');
  const clusterNameInputRef = React.useRef<HTMLInputElement>(null);
  const connectSteps = [
    { id: 'details', label: t('clusterSetup.stepConfigure') },
    { id: 'instructions', label: t('clusterSetup.installAgent') }
  ];
  const namespaceScopeSummary = React.useMemo(() => {
    const include = parseNamespaceList(includeNamespaces);
    const exclude = parseNamespaceList(excludeNamespaces);

    return t('clusterSetup.namespaceScopeSummary', {
      include: include.length > 0 ? include.join(', ') : t('clusterSetup.allNamespaces'),
      exclude: exclude.length > 0 ? exclude.join(', ') : t('clusterSetup.noExcludedNamespaces')
    });
  }, [excludeNamespaces, includeNamespaces, t]);
  const displayedInstallCommand = React.useMemo(
    () => clusterInstallCommand
      ? updateInstallCommandNamespaceScope(clusterInstallCommand, includeNamespaces, excludeNamespaces)
      : '',
    [clusterInstallCommand, excludeNamespaces, includeNamespaces]
  );

  React.useEffect(() => {
    if (!isOpen) {
      setAgentAccessMode('read_only');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const copyInstallCommand = async () => {
    try {
      if (!displayedInstallCommand) return;
      await navigator.clipboard.writeText(displayedInstallCommand);
      setHasCopiedCommand(true);
      window.setTimeout(() => setHasCopiedCommand(false), 2200);
    } catch {
      setHasCopiedCommand(false);
    }
  };

  return (
    <Dialog
      titleId="add-cluster-title"
      initialFocusRef={clusterNameInputRef}
      closeDisabled={isCreatingCluster}
      className="relative flex max-h-[min(92vh,50rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
      onClose={onClose}
    >
        <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-4">
          <div>
            <h3 id="add-cluster-title" className="text-sm font-extrabold tracking-tight text-ui-text">
              {t('app.connectClusterHelm')}
            </h3>
            <ModalStepIndicator steps={connectSteps} currentStepId={clusterCreationStep} className="mt-4" />
          </div>
          <CloseButton
            onClick={onClose}
            disabled={isCreatingCluster}
            aria-label={t('clusterSetup.closeAddDialog')}
          />
        </div>

        {clusterCreationStep === 'details' ? (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 custom-scrollbar">
                <section className="space-y-3">
                  <label htmlFor="add-cluster-name-input" className="block px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ui-text-muted">
                    {t('clusterSetup.clusterName')}
                  </label>
                  <input
                    id="add-cluster-name-input"
                    ref={clusterNameInputRef}
                    type="text"
                    value={newClusterName}
                    onChange={(event) => onClusterNameChange(event.target.value)}
                    placeholder={t('clusterSetup.clusterNamePlaceholder')}
                    className={clusterNameInputClassName}
                  />
                </section>

                <section className="space-y-3 rounded-lg border border-ui-border bg-ui-bg p-4">
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ui-text-muted">
                      {t('clusterSetup.namespaceScope')}
                    </div>
                    <p className="mt-1 text-[11px] font-medium leading-5 text-ui-text-muted">
                      {t('clusterSetup.includeNamespacesHelp')}
                    </p>
                  </div>
                  <div>
                    <label htmlFor="add-cluster-include-namespaces" className="mb-1.5 block px-1 text-[11px] font-extrabold uppercase tracking-widest text-ui-text-muted">{t('clusterSetup.includeNamespaces')}</label>
                    <input
                      id="add-cluster-include-namespaces"
                      type="text"
                      value={includeNamespaces}
                      onChange={(event) => onIncludeNamespacesChange(event.target.value)}
                      placeholder={t('clusterSetup.includeNamespacesPlaceholder')}
                      className={namespaceInputClassName}
                    />
                  </div>
                  <div>
                    <label htmlFor="add-cluster-exclude-namespaces" className="mb-1.5 block px-1 text-[11px] font-extrabold uppercase tracking-widest text-ui-text-muted">{t('clusterSetup.excludeNamespaces')}</label>
                    <input
                      id="add-cluster-exclude-namespaces"
                      type="text"
                      value={excludeNamespaces}
                      onChange={(event) => onExcludeNamespacesChange(event.target.value)}
                      placeholder={t('clusterSetup.excludeNamespacesPlaceholder')}
                      className={namespaceInputClassName}
                    />
                  </div>
                </section>

                <ClusterAgentAccessModeSelector
                  idPrefix="add-cluster"
                  value={agentAccessMode}
                  onChange={setAgentAccessMode}
                  disabled={isCreatingCluster}
                />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
              <Button
                onClick={onClose}
                disabled={isCreatingCluster}
                variant="secondary"
                size="sm"
                className="rounded-lg"
              >
                {t('app.cancel')}
              </Button>
              <Button
                onClick={() => onProceedToInstructions(agentAccessMode)}
                disabled={!newClusterName.trim() || isCreatingCluster}
                variant="primary"
                size="sm"
                className="rounded-lg"
              >
                <Zap className="h-4 w-4" />
                {isCreatingCluster ? t('clusterSetup.registering') : t('clusterSetup.continueToInstallAgent')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 custom-scrollbar">
              <div className="rounded-lg border border-ui-border bg-ui-bg px-4 py-4 text-sm font-medium leading-6 text-ui-text-muted">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-accent-strong">
                    <ICONS.Terminal className="h-4 w-4" />
                  </span>
                  <p>{t('clusterSetup.installBody')}</p>
                </div>
              </div>

              {displayedInstallCommand ? (
                <div className="rounded-lg border border-ui-border bg-ui-bg shadow-sm">
                  <div className="flex items-center justify-between gap-3 px-4 pt-4">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-ui-text-muted">{t('clusterSetup.installCommand')}</span>
                    <button
                      type="button"
                      onClick={() => void copyInstallCommand()}
                      className="control-target inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ui-border bg-ui-surface text-ui-text-muted shadow-sm transition-colors hover:bg-ui-bg hover:text-ui-text"
                      aria-label={hasCopiedCommand ? t('clusterSetup.copied') : t('clusterSetup.copy')}
                    >
                      {hasCopiedCommand ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="max-h-[18rem] overflow-auto px-4 pb-4 pt-3 font-mono text-xs leading-6 text-ui-text custom-scrollbar">
                    <pre className="whitespace-pre">{displayedInstallCommand}</pre>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-status-warning/25 bg-status-warning-soft p-4 text-sm font-semibold text-status-warning-text">
                  {t('clusterSetup.missingInstallCommand')}
                </div>
              )}
              {clusterInstallWarnings.length > 0 && (
                <div className="space-y-1 rounded-lg border border-status-warning/25 bg-status-warning-soft p-3 text-xs font-medium text-status-warning-text">
                  {clusterInstallWarnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              )}
              <div className="grid gap-3 rounded-lg border border-ui-border bg-ui-surface p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div>
                  <p className="type-label text-ui-text-muted">{t('clusterSetup.clusterName')}</p>
                  <p className="type-row-title mt-1 truncate" title={newClusterName}>{newClusterName}</p>
                </div>
                <div>
                  <p className="type-label text-ui-text-muted">{t('clusterSetup.namespaceScope')}</p>
                  <p className="type-caption mt-1 text-ui-text-muted">{namespaceScopeSummary}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-status-success/25 bg-status-success-soft px-4 py-3 text-xs font-extrabold text-status-success-text">
                <div className="h-2 w-2 rounded-full bg-status-success"></div>
                {t('clusterSetup.waitingForAgent')}
              </div>
            </div>
            <div className="flex items-center justify-end border-t border-ui-border bg-ui-bg px-6 py-4">
              <Button
                onClick={() => void onConfirmInstalled()}
                disabled={isCreatingCluster}
                variant="primary"
                size="sm"
                className="rounded-lg"
              >
                <Zap className="h-4 w-4" />
                {isCreatingCluster ? t('clusterSetup.checkingConnection') : t('clusterSetup.installedAgent')}
              </Button>
            </div>
          </>
        )}
    </Dialog>
  );
};
