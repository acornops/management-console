import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/common/Button';
import { Select, SelectOption } from '@/components/common/Select';
import { formInputClassName } from '@/components/common/formControlStyles';
import { ICONS } from '@/constants';
import { TargetDeleteZone } from '@/features/targets/TargetDeleteZone';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { KubernetesCluster } from '@/types';
import { formatLastUpdated, getAgentConnectionState } from '@/utils/telemetry';

interface ClusterSettingsViewProps {
  cluster: KubernetesCluster;
  workspaceName?: string;
  canManageCluster?: boolean;
  canManageAgentKeys?: boolean;
  onUpdateName?: (name: string) => void | Promise<void>;
  onEditNamespaceScope?: () => void;
  onUpdateWriteConfirmationPolicy?: (overrideRequired: boolean | null) => void | Promise<void>;
  onReinstallAgent?: () => void;
  onDeleteCluster?: () => void | Promise<void>;
}

type WriteConfirmationPolicyValue = 'required' | 'not_required';

const clusterSettingsInputClassName = formInputClassName('min-h-10');

const SettingSection: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <section className="mb-10 last:mb-0">
    <div className="mb-6 px-1">
      <h2 className="mb-1 text-xl font-bold tracking-tight text-ui-text">{title}</h2>
      <p className="max-w-3xl text-sm leading-6 text-ui-text-muted">{description}</p>
    </div>
    <div className="overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">{children}</div>
  </section>
);

const SettingRow: React.FC<{
  icon: React.ElementType;
  label: string;
  description: React.ReactNode;
  action?: React.ReactNode;
}> = ({ icon: Icon, label, description, action }) => (
  <div className="flex flex-col gap-5 border-b border-ui-border p-6 transition-colors last:border-0 hover:bg-ui-bg/20 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong shadow-sm">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="mb-0.5 text-sm font-bold text-ui-text">{label}</p>
        <div className="break-words text-xs leading-5 text-ui-text-muted">{description}</div>
      </div>
    </div>
    {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
  </div>
);

function getWriteConfirmationPolicyValue(cluster: KubernetesCluster): WriteConfirmationPolicyValue {
  return cluster.writeConfirmationPolicy?.effectiveRequired ?? true ? 'required' : 'not_required';
}

function formatNamespaceScope(cluster: KubernetesCluster, t: (key: string, options?: Record<string, unknown>) => string): string {
  const include = cluster.namespaceScope?.include || [];
  const exclude = cluster.namespaceScope?.exclude || [];
  if (include.length === 0 && exclude.length === 0) {
    return t('clusterSettings.allNamespaces');
  }
  if (include.length > 0 && exclude.length > 0) {
    return t('clusterSettings.namespaceScopeIncludeExclude', {
      include: include.join(', '),
      exclude: exclude.join(', ')
    });
  }
  if (include.length > 0) {
    return t('clusterSettings.namespaceScopeIncludeOnly', { include: include.join(', ') });
  }
  return t('clusterSettings.namespaceScopeExcludeOnly', { exclude: exclude.join(', ') });
}

export const ClusterSettingsView: React.FC<ClusterSettingsViewProps> = ({
  cluster,
  workspaceName,
  canManageCluster = false,
  canManageAgentKeys = false,
  onUpdateName,
  onEditNamespaceScope,
  onUpdateWriteConfirmationPolicy,
  onReinstallAgent,
  onDeleteCluster
}) => {
  const { t } = useTranslation();
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(cluster.name);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const clusterNameInputRef = useRef<HTMLInputElement>(null);
  const agentConnectionState = getAgentConnectionState(cluster);
  const namespaceScope = formatNamespaceScope(cluster, t);
  const writeConfirmationPolicyValue = getWriteConfirmationPolicyValue(cluster);
  const writeConfirmationPolicyOptions: Array<SelectOption<WriteConfirmationPolicyValue>> = [
    { value: 'required', label: t('clusterSetup.writeConfirmationsRequired') },
    { value: 'not_required', label: t('clusterSetup.writeConfirmationsNotRequired') }
  ];
  const effectivePolicy = cluster.writeConfirmationPolicy?.effectiveRequired ?? true
    ? t('clusterSettings.writeConfirmationsEffectiveRequired')
    : t('clusterSettings.writeConfirmationsEffectiveNotRequired');
  const policySource = cluster.writeConfirmationPolicy?.source === 'cluster_override'
    ? t('clusterSettings.writeConfirmationsSourceCluster')
    : t('clusterSettings.writeConfirmationsSourceDefault');
  const canEditNamespaceScope = canManageCluster && Boolean(onEditNamespaceScope);
  const canEditWriteConfirmations = canManageCluster && Boolean(onUpdateWriteConfirmationPolicy);
  const canEditClusterName = canManageCluster && Boolean(onUpdateName);
  const canReinstallAgent = agentConnectionState === 'disconnected' && canManageAgentKeys && Boolean(onReinstallAgent);
  const trimmedDraftName = draftName.trim();
  const clusterNameValidationError = isEditingName && trimmedDraftName.length === 0
    ? t('clusterSettings.clusterNameRequired')
    : null;
  const canSaveClusterName = trimmedDraftName.length > 0 && trimmedDraftName !== cluster.name && !isSavingName;

  useEffect(() => {
    setDraftName(cluster.name);
    setIsEditingName(false);
    setNameError(null);
  }, [cluster.id, cluster.name]);

  useEffect(() => {
    if (!isEditingName) return;
    clusterNameInputRef.current?.focus();
    clusterNameInputRef.current?.select();
  }, [isEditingName]);

  const handleSaveClusterName = async () => {
    if (!canSaveClusterName) return;
    setIsSavingName(true);
    setNameError(null);
    try {
      await onUpdateName?.(trimmedDraftName);
      setIsEditingName(false);
    } catch (error) {
      setNameError(formatControlPlaneError(error, t('clusterSettings.clusterNameUpdateFailed'), { area: 'cluster' }));
    } finally {
      setIsSavingName(false);
    }
  };

  const cancelClusterNameEdit = () => {
    setDraftName(cluster.name);
    setIsEditingName(false);
    setNameError(null);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8">
        <h1 className="type-route-title">{t('clusterSettings.title')}</h1>
        <p className="type-body mt-2">
          {t('clusterSettings.subtitle', { name: cluster.name })}
        </p>
      </header>

      <div className="max-w-4xl">
        <SettingSection
          title={t('clusterSettings.clusterTitle')}
          description={t('clusterSettings.clusterBody')}
        >
          <SettingRow
            icon={ICONS.Server}
            label={t('clusterSettings.clusterName')}
            description={isEditingName ? (
              <div className="grid max-w-md gap-3" data-cluster-settings-name-editor="true">
                <input
                  ref={clusterNameInputRef}
                  value={draftName}
                  onChange={(event) => {
                    setDraftName(event.target.value);
                    setNameError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleSaveClusterName();
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      cancelClusterNameEdit();
                    }
                  }}
                  className={clusterSettingsInputClassName}
                  aria-label={t('clusterSettings.clusterName')}
                  aria-invalid={Boolean(clusterNameValidationError)}
                  aria-describedby={clusterNameValidationError || nameError ? 'cluster-name-edit-error' : undefined}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    data-cluster-settings-action="save-name"
                    onClick={handleSaveClusterName}
                    disabled={!canSaveClusterName}
                    variant="primary"
                    size="sm"
                  >
                    {isSavingName ? t('common.saving') : t('common.saveChanges')}
                  </Button>
                  <Button
                    data-cluster-settings-action="cancel-name"
                    onClick={cancelClusterNameEdit}
                    disabled={isSavingName}
                    variant="secondary"
                    size="sm"
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
                {(clusterNameValidationError || nameError) && (
                  <p id="cluster-name-edit-error" className="text-xs font-semibold text-status-danger-text">
                    {clusterNameValidationError || nameError}
                  </p>
                )}
              </div>
            ) : cluster.name}
            action={canEditClusterName && !isEditingName ? (
              <Button
                data-cluster-settings-action="edit-name"
                onClick={() => setIsEditingName(true)}
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
              >
                <ICONS.Pencil className="h-4 w-4" />
                {t('clusterSettings.editClusterName')}
              </Button>
            ) : undefined}
          />
          <SettingRow
            icon={ICONS.LayoutGrid}
            label={t('clusterSettings.workspace')}
            description={workspaceName || cluster.workspaceId}
          />
          <SettingRow
            icon={ICONS.Activity}
            label={t('clusterSettings.connectionState')}
            description={t(`clusterSettings.connection.${agentConnectionState}`)}
            action={canReinstallAgent ? (
              <Button
                data-cluster-settings-action="reinstall-agent"
                onClick={onReinstallAgent}
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
              >
                <ICONS.Wrench className="h-4 w-4" />
                {t('clusterSettings.reinstallAgent')}
              </Button>
            ) : undefined}
          />
          <SettingRow
            icon={ICONS.Clock}
            label={t('clusterSettings.lastTelemetry')}
            description={formatLastUpdated(cluster.lastUpdate)}
          />
        </SettingSection>

        <SettingSection
          title={t('clusterSettings.collectionTitle')}
          description={t('clusterSettings.collectionBody')}
        >
          <SettingRow
            icon={ICONS.Layers}
            label={t('clusterSetup.namespaceScope')}
            description={namespaceScope}
            action={canEditNamespaceScope ? (
              <Button
                data-cluster-settings-action="namespace-scope"
                onClick={onEditNamespaceScope}
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                aria-label={t('clusterSetup.editNamespaceScope')}
              >
                <ICONS.Settings className="h-4 w-4" />
                {t('clusterSetup.editNamespaceScope')}
              </Button>
            ) : undefined}
          />
        </SettingSection>

        <SettingSection
          title={t('clusterSettings.writeSafetyTitle')}
          description={t('clusterSettings.writeSafetyBody')}
        >
          <SettingRow
            icon={ICONS.Shield}
            label={t('clusterSetup.writeConfirmations')}
            description={(
              <span>
                {effectivePolicy} · {policySource}
              </span>
            )}
            action={canEditWriteConfirmations ? (
              <Select<WriteConfirmationPolicyValue>
                value={writeConfirmationPolicyValue}
                options={writeConfirmationPolicyOptions}
                onChange={(value) => {
                  void onUpdateWriteConfirmationPolicy?.(value === 'required');
                }}
                size="sm"
                className="w-full sm:w-56"
                ariaLabel={t('clusterSetup.writeConfirmations')}
              />
            ) : undefined}
          />
        </SettingSection>

        {canManageCluster && onDeleteCluster && (
          <TargetDeleteZone
            targetName={cluster.name}
            title={t('dashboard.deleteCluster')}
            subtitle={t('dashboard.deleteClusterSubtitle')}
            description={t('dashboard.deleteClusterBody', { name: cluster.name })}
            agentWarning={t('dashboard.deleteClusterAgentWarning')}
            confirmationI18nKey="dashboard.deleteClusterConfirmationLabel"
            closeLabel={t('dashboard.closeDeleteCluster')}
            cancelLabel={t('app.cancel')}
            deleteLabel={t('dashboard.delete')}
            deletingLabel={t('dashboard.deleting')}
            errorFallback={t('dashboard.deleteClusterFailed')}
            errorArea="cluster"
            idBase="cluster-settings"
            onDelete={onDeleteCluster}
          />
        )}
      </div>
    </div>
  );
};
