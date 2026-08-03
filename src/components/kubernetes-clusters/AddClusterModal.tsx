import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, CollectionState, Switch } from '@acornops/ui';
import { CloseButton } from '@acornops/ui';
import { DialogFrame } from '@acornops/ui';
import { ModalStepIndicator } from '@acornops/ui';
import { formInputClassName } from '@acornops/ui';
import { ClusterAgentAccessModeSelector } from '@/components/kubernetes-clusters/ClusterAgentAccessModeSelector';
import { parseNamespaceList } from '@/app/useAppSupport';
import type { AgentAccessMode, KubernetesRbacAdditionSummary } from '@/services/control-plane/types';
import { TextInput } from '@acornops/ui';
import { AgentInstallInstructionsStep } from '@/components/common/AgentInstallInstructionsStep';

interface AddClusterModalProps {
  isOpen: boolean;
  clusterCreationStep: 'details' | 'instructions';
  newClusterName: string;
  includeNamespaces: string;
  excludeNamespaces: string;
  clusterInstallCommand: string;
  clusterInstallWarnings: string[];
  isAgentConnected: boolean;
  isCreatingCluster: boolean;
  availableRbacAdditions: KubernetesRbacAdditionSummary[];
  selectedRbacAdditionKeys: string[];
  isLoadingRbacAdditions: boolean;
  onClose: () => void;
  onClusterNameChange: (value: string) => void;
  onIncludeNamespacesChange: (value: string) => void;
  onExcludeNamespacesChange: (value: string) => void;
  onProceedToInstructions: (agentAccessMode: AgentAccessMode) => void;
  onSelectedRbacAdditionKeysChange: (keys: string[]) => void;
  onConfirmInstalled: () => void | Promise<void>;
}

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function helmSetJson(path: string, value: string[]): string {
  return `  --set-json ${path}=${shellSingleQuote(JSON.stringify(value))}`;
}

const clusterNameInputClassName = formInputClassName('px-4 type-ui');
const namespaceInputClassName = formInputClassName('type-caption');

interface ExpandableClusterOptionProps {
  checked: boolean;
  children: React.ReactNode;
  disabled: boolean;
  id: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}

const ExpandableClusterOption: React.FC<ExpandableClusterOptionProps> = ({
  checked,
  children,
  disabled,
  id,
  label,
  onCheckedChange
}) => {
  const labelId = `${id}-label`;
  const panelId = `${id}-panel`;

  return (
    <section className="rounded-lg border border-ui-border bg-ui-bg">
      <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-2">
        <span id={labelId} className="type-ui type-emphasis text-ui-text">{label}</span>
        <Switch
          checked={checked}
          disabled={disabled}
          label={label}
          aria-expanded={checked}
          aria-controls={checked ? panelId : undefined}
          onCheckedChange={onCheckedChange}
        />
      </div>
      {checked && (
        <div id={panelId} role="region" aria-labelledby={labelId} className="space-y-3 border-t border-ui-border p-4">
          {children}
        </div>
      )}
    </section>
  );
};

export function updateInstallCommandNamespaceScope(command: string, includeValue: string, excludeValue: string): string {
  const include = parseNamespaceList(includeValue);
  const exclude = parseNamespaceList(excludeValue);
  const normalizedLines = command
    .split('\n')
    .map((line) => line.replace(/\s*\\$/, '').trimEnd())
    .filter(
      (line) =>
        !line.includes('--set-json namespaceScope.include=') && !line.includes('--set-json namespaceScope.exclude=') && !line.includes('--set-string config.watchNamespaces=')
    );

  const namespaceLines = [helmSetJson('namespaceScope.include', include), helmSetJson('namespaceScope.exclude', exclude)];
  const agentKeyIndex = normalizedLines.findIndex((line) => line.includes('--set-string config.agentKey='));
  const insertIndex = agentKeyIndex >= 0 ? agentKeyIndex + 1 : normalizedLines.length;

  return [...normalizedLines.slice(0, insertIndex), ...namespaceLines, ...normalizedLines.slice(insertIndex)].join(' \\\n');
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
  isAgentConnected,
  isCreatingCluster,
  availableRbacAdditions,
  selectedRbacAdditionKeys,
  isLoadingRbacAdditions,
  onClose,
  onClusterNameChange,
  onIncludeNamespacesChange,
  onExcludeNamespacesChange,
  onProceedToInstructions,
  onSelectedRbacAdditionKeysChange,
  onConfirmInstalled
}) => {
  const { t } = useTranslation();
  const [agentAccessMode, setAgentAccessMode] = useState<AgentAccessMode>('read_only');
  const [isNamespaceScopeRequired, setIsNamespaceScopeRequired] = useState(
    () => parseNamespaceList(includeNamespaces).length > 0 || parseNamespaceList(excludeNamespaces).length > 0
  );
  const [areAdditionalResourcesRequired, setAreAdditionalResourcesRequired] = useState(
    () => selectedRbacAdditionKeys.length > 0
  );
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
    () => (clusterInstallCommand ? updateInstallCommandNamespaceScope(clusterInstallCommand, includeNamespaces, excludeNamespaces) : ''),
    [clusterInstallCommand, excludeNamespaces, includeNamespaces]
  );

  React.useEffect(() => {
    if (!isOpen) {
      setAgentAccessMode('read_only');
      setIsNamespaceScopeRequired(false);
      setAreAdditionalResourcesRequired(false);
      return;
    }
    if (parseNamespaceList(includeNamespaces).length > 0 || parseNamespaceList(excludeNamespaces).length > 0) {
      setIsNamespaceScopeRequired(true);
    }
    if (selectedRbacAdditionKeys.length > 0) {
      setAreAdditionalResourcesRequired(true);
    }
  }, [excludeNamespaces, includeNamespaces, isOpen, selectedRbacAdditionKeys]);

  if (!isOpen) {
    return null;
  }

  const handleNamespaceScopeRequiredChange = (required: boolean) => {
    setIsNamespaceScopeRequired(required);
    if (!required) {
      onIncludeNamespacesChange('');
      onExcludeNamespacesChange('');
    }
  };

  const handleAdditionalResourcesRequiredChange = (required: boolean) => {
    setAreAdditionalResourcesRequired(required);
    if (!required) {
      onSelectedRbacAdditionKeysChange([]);
    }
  };

  return (
    <DialogFrame unframed
      titleId="add-cluster-title"
      initialFocusRef={clusterNameInputRef}
      closeDisabled={isCreatingCluster}
      className="relative flex max-h-[min(92vh,50rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
      onClose={onClose}
    >
      <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-4">
        <div>
          <h3 id="add-cluster-title" className="type-panel-title">
            {t('app.connectClusterHelm')}
          </h3>
          <ModalStepIndicator steps={connectSteps} currentStepId={clusterCreationStep} className="mt-4" />
        </div>
        <CloseButton onClick={onClose} disabled={isCreatingCluster} aria-label={t('clusterSetup.closeAddDialog')} />
      </div>

      {clusterCreationStep === 'details' ? (
        <>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 custom-scrollbar">
            <section className="space-y-3">
              <label htmlFor="add-cluster-name-input" className="block px-1 type-micro-label">
                {t('clusterSetup.clusterName')}
              </label>
              <TextInput
                id="add-cluster-name-input"
                ref={clusterNameInputRef}
                type="text"
                value={newClusterName}
                onChange={(event) => onClusterNameChange(event.target.value)}
                placeholder={t('clusterSetup.clusterNamePlaceholder')}
                className={clusterNameInputClassName}
              />
            </section>

            <ExpandableClusterOption
              id="add-cluster-namespace-scope"
              label={t('clusterSetup.requireNamespaceScope')}
              checked={isNamespaceScopeRequired}
              disabled={isCreatingCluster}
              onCheckedChange={handleNamespaceScopeRequiredChange}
            >
              <p className="type-caption leading-5 text-ui-text-muted">{t('clusterSetup.includeNamespacesHelp')}</p>
              <div>
                <label htmlFor="add-cluster-include-namespaces" className="mb-1.5 block px-1 type-micro-label">
                  {t('clusterSetup.includeNamespaces')}
                </label>
                <TextInput
                  id="add-cluster-include-namespaces"
                  type="text"
                  value={includeNamespaces}
                  onChange={(event) => onIncludeNamespacesChange(event.target.value)}
                  placeholder={t('clusterSetup.includeNamespacesPlaceholder')}
                  className={namespaceInputClassName}
                />
              </div>
              <div>
                <label htmlFor="add-cluster-exclude-namespaces" className="mb-1.5 block px-1 type-micro-label">
                  {t('clusterSetup.excludeNamespaces')}
                </label>
                <TextInput
                  id="add-cluster-exclude-namespaces"
                  type="text"
                  value={excludeNamespaces}
                  onChange={(event) => onExcludeNamespacesChange(event.target.value)}
                  placeholder={t('clusterSetup.excludeNamespacesPlaceholder')}
                  className={namespaceInputClassName}
                />
              </div>
            </ExpandableClusterOption>

            <ExpandableClusterOption
              id="add-cluster-additional-resources"
              label={t('clusterSetup.requireRbacAdditions')}
              checked={areAdditionalResourcesRequired}
              disabled={isCreatingCluster}
              onCheckedChange={handleAdditionalResourcesRequiredChange}
            >
              <p className="type-caption leading-5 text-ui-text-muted">{t('clusterSetup.rbacAdditionsHelp')}</p>
              <CollectionState
                phase={isLoadingRbacAdditions ? 'loading' : 'ready'}
                itemCount={availableRbacAdditions.length}
                loading={<p className="type-caption text-ui-text-muted">{t('clusterSetup.rbacAdditionsLoading')}</p>}
                empty={<p className="type-caption text-ui-text-muted">{t('clusterSetup.rbacAdditionsEmpty')}</p>}
                error={null}
              >
                <div className="space-y-3">
                  {availableRbacAdditions.map((addition) => {
                    const checked = selectedRbacAdditionKeys.includes(addition.key);
                    return <label key={addition.key} className="flex items-start gap-3">
                      <Checkbox
                        checked={checked}
                        disabled={isCreatingCluster}
                        onChange={() => onSelectedRbacAdditionKeysChange(checked
                          ? selectedRbacAdditionKeys.filter((key) => key !== addition.key)
                          : [...selectedRbacAdditionKeys, addition.key])}
                      />
                      <span>
                        <strong className="block type-ui text-ui-text">{addition.name}</strong>
                        {addition.description && <small className="block type-caption leading-5 text-ui-text-muted">{addition.description}</small>}
                      </span>
                    </label>;
                  })}
                </div>
              </CollectionState>
            </ExpandableClusterOption>

            <ClusterAgentAccessModeSelector idPrefix="add-cluster" value={agentAccessMode} onChange={setAgentAccessMode} disabled={isCreatingCluster} />
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
            <Button onClick={onClose} disabled={isCreatingCluster} variant="secondary" size="sm" className="rounded-lg">
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
        <AgentInstallInstructionsStep
          introduction={t('clusterSetup.installBody')}
          command={displayedInstallCommand}
          commandLabel={t('clusterSetup.installCommand')}
          copyLabel={t('clusterSetup.copy')}
          copiedLabel={t('clusterSetup.copied')}
          missingCommandMessage={t('clusterSetup.missingInstallCommand')}
          isConnected={isAgentConnected}
          waitingLabel={t('clusterSetup.waitingForAgent')}
          connectedLabel={t('clusterSetup.agentConnected')}
          isSubmitting={isCreatingCluster}
          submittingLabel={t('clusterSetup.checkingConnection')}
          connectedActionLabel={t('clusterSetup.done')}
          pendingActionLabel={t('clusterSetup.installedAgent')}
          onConfirmInstalled={onConfirmInstalled}
          notices={clusterInstallWarnings.length > 0 ? (
            <div className="space-y-1 rounded-lg border border-status-warning/25 bg-status-warning-soft p-3 type-caption text-status-warning-text">
              {clusterInstallWarnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          ) : undefined}
          summary={(
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
          )}
        />
      )}
    </DialogFrame>
  );
};
