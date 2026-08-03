import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, SettingsSection } from '@acornops/ui';
import { PageShell } from '@acornops/ui';
import { formInputClassName } from '@acornops/ui';
import { SettingsRow } from '@/components/common/SettingsRow';
import { ICONS } from '@/constants';
import { TargetDeleteZone } from '@/features/targets/TargetDeleteZone';
import { TargetAutoTriageSettingsSection } from '@/features/targets/auto-triage/TargetAutoTriageSettingsSection';
import { RunPermissionSettingsSection } from '@/features/run-permissions/RunPermissionSettingsSection';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { KubernetesCluster } from '@/types';
import { formatLastUpdated, getAgentConnectionState } from '@/utils/telemetry';
import { TextInput } from '@acornops/ui';
import type { RunPermissionMode } from '@/services/control-plane/runPermissionTypes';
import { resolveClusterPermissionMode } from '@/services/control-plane/runPermissionPolicy';

interface ClusterSettingsViewProps {
  cluster: KubernetesCluster;
  workspaceName?: string;
  canManageCluster?: boolean;
  canManageAgentKeys?: boolean;
  canCreateReadWriteRuns?: boolean;
  onUpdateName?: (name: string) => void | Promise<void>;
  onEditNamespaceScope?: () => void;
  onUpdatePermissionMode?: (permissionMode: RunPermissionMode) => void | Promise<void>;
  onReinstallAgent?: () => void;
  onDeleteCluster?: () => void | Promise<void>;
}

const clusterSettingsInputClassName = formInputClassName('min-h-10');

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
    return t('clusterSettings.namespaceScopeIncludeOnly', {
      include: include.join(', ')
    });
  }
  return t('clusterSettings.namespaceScopeExcludeOnly', {
    exclude: exclude.join(', ')
  });
}

export const ClusterSettingsView: React.FC<ClusterSettingsViewProps> = ({
  cluster,
  workspaceName,
  canManageCluster = false,
  canManageAgentKeys = false,
  canCreateReadWriteRuns = false,
  onUpdateName,
  onEditNamespaceScope,
  onUpdatePermissionMode,
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
  const permissionMode = resolveClusterPermissionMode(cluster);
  const canEditNamespaceScope = canManageCluster && Boolean(onEditNamespaceScope);
  const canEditPermissionMode = canManageCluster && Boolean(onUpdatePermissionMode);
  const canEditClusterName = canManageCluster && Boolean(onUpdateName);
  const canReinstallAgent = agentConnectionState === 'disconnected' && canManageAgentKeys && Boolean(onReinstallAgent);
  const trimmedDraftName = draftName.trim();
  const clusterNameValidationError = isEditingName && trimmedDraftName.length === 0 ? t('clusterSettings.clusterNameRequired') : null;
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
    <PageShell>
      <header className="mb-8">
        <h1 className="type-route-title">{t('clusterSettings.title')}</h1>
        <p className="type-body mt-2">{t('clusterSettings.subtitle', { name: cluster.name })}</p>
      </header>

      <div className="max-w-4xl">
        <SettingsSection title={t('clusterSettings.clusterTitle')} description={t('clusterSettings.clusterBody')}>
          <SettingsRow
            icon={ICONS.Server}
            label={t('clusterSettings.clusterName')}
            description={
              isEditingName ? (
                <div className="grid max-w-md gap-3" data-cluster-settings-name-editor="true">
                  <TextInput
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
                    <Button data-cluster-settings-action="save-name" onClick={handleSaveClusterName} disabled={!canSaveClusterName} variant="primary" size="sm">
                      {isSavingName ? t('common.saving') : t('common.saveChanges')}
                    </Button>
                    <Button data-cluster-settings-action="cancel-name" onClick={cancelClusterNameEdit} disabled={isSavingName} variant="secondary" size="sm">
                      {t('common.cancel')}
                    </Button>
                  </div>
                  {(clusterNameValidationError || nameError) && (
                    <p id="cluster-name-edit-error" className="type-caption type-emphasis text-status-danger-text">
                      {clusterNameValidationError || nameError}
                    </p>
                  )}
                </div>
              ) : (
                cluster.name
              )
            }
            action={
              canEditClusterName && !isEditingName ? (
                <Button data-cluster-settings-action="edit-name" onClick={() => setIsEditingName(true)} variant="secondary" size="sm" className="w-full sm:w-auto">
                  <ICONS.Pencil className="h-4 w-4" />
                  {t('clusterSettings.editClusterName')}
                </Button>
              ) : undefined
            }
          />
          <SettingsRow icon={ICONS.LayoutGrid} label={t('clusterSettings.workspace')} description={workspaceName || cluster.workspaceId} />
          <SettingsRow
            icon={ICONS.Activity}
            label={t('clusterSettings.connectionState')}
            description={t(`clusterSettings.connection.${agentConnectionState}`)}
            action={
              canReinstallAgent ? (
                <Button data-cluster-settings-action="reinstall-agent" onClick={onReinstallAgent} variant="secondary" size="sm" className="w-full sm:w-auto">
                  <ICONS.Wrench className="h-4 w-4" />
                  {t('clusterSettings.reinstallAgent')}
                </Button>
              ) : undefined
            }
          />
          <SettingsRow icon={ICONS.Clock} label={t('clusterSettings.lastTelemetry')} description={formatLastUpdated(cluster.lastUpdate)} />
        </SettingsSection>

        <SettingsSection title={t('clusterSettings.collectionTitle')} description={t('clusterSettings.collectionBody')}>
          <SettingsRow
            icon={ICONS.Layers}
            label={t('clusterSetup.namespaceScope')}
            description={namespaceScope}
            action={
              canEditNamespaceScope ? (
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
              ) : undefined
            }
          />
        </SettingsSection>

        <RunPermissionSettingsSection
          title={t('clusterSettings.permissionModeTitle')}
          description={t('clusterSettings.permissionModeBody')}
          permissionMode={permissionMode}
          disabled={!canEditPermissionMode}
          onChange={onUpdatePermissionMode}
        />

        <TargetAutoTriageSettingsSection
          workspaceId={cluster.workspaceId}
          targetId={cluster.id}
          targetType="kubernetes"
          canManageTargets={canManageCluster}
          canCreateReadWriteRuns={canCreateReadWriteRuns}
        />

        {canManageCluster && onDeleteCluster && (
          <TargetDeleteZone
            targetName={cluster.name}
            title={t('dashboard.deleteCluster')}
            subtitle={t('dashboard.deleteClusterSubtitle')}
            description={t('dashboard.deleteClusterBody', {
              name: cluster.name
            })}
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
    </PageShell>
  );
};
