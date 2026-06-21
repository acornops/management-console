import React, { useState } from 'react';
import { Check, Copy, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import { Button } from '@/components/common/Button';
import { Dialog } from '@/components/common/Dialog';
import { parseNamespaceList } from '@/app/useAppSupport';

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
  onProceedToInstructions: () => void;
  onConfirmInstalled: () => void | Promise<void>;
}

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function helmSetJson(path: string, value: string[]): string {
  return `  --set-json ${path}=${shellSingleQuote(JSON.stringify(value))}`;
}

function helmSetString(path: string, value: string): string {
  return `  --set-string ${path}=${shellSingleQuote(value)}`;
}

function updateInstallCommandNamespaceScope(command: string, includeValue: string, excludeValue: string): string {
  const include = parseNamespaceList(includeValue);
  const exclude = parseNamespaceList(excludeValue);
  const excluded = new Set(exclude);
  const watchNamespaces = include.filter((namespace) => !excluded.has(namespace));
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
    helmSetJson('namespaceScope.exclude', exclude),
    ...(watchNamespaces.length > 0 ? [helmSetString('config.watchNamespaces', watchNamespaces.join(','))] : [])
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
  const clusterNameInputRef = React.useRef<HTMLInputElement>(null);
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
      className="relative flex max-h-[min(92vh,56rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
      onClose={onClose}
    >
        <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-6 py-4">
          <h3 id="add-cluster-title" className="text-sm font-extrabold tracking-tight text-ui-text">
            {t('app.connectClusterHelm')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isCreatingCluster}
            className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t('clusterSetup.closeAddDialog')}
          >
            <ICONS.X className="h-4 w-4" />
          </button>
        </div>

        {clusterCreationStep === 'details' ? (
          <>
            <div className="space-y-5 overflow-y-auto p-6">
              <div className="rounded-xl border border-ui-border bg-ui-bg px-4 py-4 text-sm font-medium leading-6 text-ui-text-muted">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-accent-strong">
                    <ICONS.Terminal className="h-4 w-4" />
                  </span>
                  <p>{t('app.connectClusterHelmBody')}</p>
                </div>
              </div>

              <section className="space-y-3">
                <label htmlFor="add-cluster-name-input" className="block px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ui-text-muted">
                  1. {t('clusterSetup.clusterName')}
                </label>
                <input
                  id="add-cluster-name-input"
                  ref={clusterNameInputRef}
                  type="text"
                  value={newClusterName}
                  onChange={(event) => onClusterNameChange(event.target.value)}
                  placeholder={t('clusterSetup.clusterNamePlaceholder')}
                  className="w-full rounded-lg border border-ui-border bg-ui-bg px-4 py-3 text-sm font-medium text-ui-text outline-none transition-all placeholder:text-ui-text-muted focus:border-accent/30 focus:ring-2 focus:ring-accent/10"
                />
              </section>

              <section className="space-y-3 rounded-xl border border-ui-border bg-ui-bg p-4">
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ui-text-muted">
                    2. {t('clusterSetup.namespaceScope')}
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
                    className="w-full rounded-lg border border-ui-border bg-ui-surface px-3 py-2.5 text-xs font-medium text-ui-text outline-none transition-all placeholder:text-ui-text-muted focus:border-accent/30 focus:ring-2 focus:ring-accent/10"
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
                    className="w-full rounded-lg border border-ui-border bg-ui-surface px-3 py-2.5 text-xs font-medium text-ui-text outline-none transition-all placeholder:text-ui-text-muted focus:border-accent/30 focus:ring-2 focus:ring-accent/10"
                  />
                </div>
              </section>
            </div>
            <div className="space-y-3 border-t border-ui-border bg-ui-bg px-6 py-4">
              <Button
                onClick={onClose}
                disabled={isCreatingCluster}
                variant="secondary"
                size="sm"
                className="w-full rounded-lg uppercase tracking-widest"
              >
                {t('app.cancel')}
              </Button>
              <Button
                onClick={onProceedToInstructions}
                disabled={!newClusterName.trim() || isCreatingCluster}
                variant="accent"
                size="lg"
                className="w-full rounded-lg text-xs uppercase tracking-widest"
              >
                <Zap className="h-4 w-4" />
                {isCreatingCluster ? t('clusterSetup.registering') : t('clusterSetup.registerAndGenerate')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4 overflow-y-auto p-6">
              <div className="rounded-xl border border-ui-border bg-ui-bg px-4 py-4 text-sm font-medium leading-6 text-ui-text-muted">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-accent-strong">
                    <ICONS.Terminal className="h-4 w-4" />
                  </span>
                  <p>{t('clusterSetup.installBody')}</p>
                </div>
              </div>

              <div className="rounded-lg border border-ui-border bg-ui-bg px-4 py-3">
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-ui-text-muted">
                  2. {t('clusterSetup.namespaceScope')}
                </div>
                <p className="mt-1 text-xs font-medium leading-5 text-ui-text-muted">
                  {namespaceScopeSummary}
                </p>
              </div>

              {displayedInstallCommand ? (
                <div className="rounded-xl border border-ui-border bg-ui-bg shadow-sm">
                  <div className="flex items-center justify-between gap-3 px-4 pt-4">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-ui-text-muted">3. {t('clusterSetup.installCommand')}</span>
                    <button
                      type="button"
                      onClick={() => void copyInstallCommand()}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ui-border bg-ui-surface text-ui-text-muted shadow-sm transition-all hover:bg-ui-bg hover:text-ui-text"
                      aria-label={hasCopiedCommand ? t('clusterSetup.copied') : t('clusterSetup.copy')}
                    >
                      {hasCopiedCommand ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="max-h-[18rem] overflow-auto px-4 pb-4 pt-3 font-mono text-xs leading-6 text-ui-text">
                    <pre className="whitespace-pre">{displayedInstallCommand}</pre>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-status-warning/25 bg-status-warning-soft p-4 text-sm font-semibold text-status-warning-text">
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
              <div className="flex items-center gap-3 rounded-lg border border-status-success/25 bg-status-success-soft px-4 py-3 text-xs font-extrabold text-status-success-text">
                <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                {t('clusterSetup.waitingForAgent')}
              </div>
              <p className="text-[11px] text-ui-text-muted">
                {t('clusterSetup.reopenHelp')}
              </p>
            </div>
            <div className="space-y-3 border-t border-ui-border bg-ui-bg px-6 py-4">
              <Button
                onClick={() => void onConfirmInstalled()}
                variant="accent"
                size="lg"
                className="w-full rounded-lg text-xs uppercase tracking-widest"
              >
                <Zap className="h-4 w-4" />
                {t('clusterSetup.installedAgent')}
              </Button>
            </div>
          </>
        )}
    </Dialog>
  );
};
