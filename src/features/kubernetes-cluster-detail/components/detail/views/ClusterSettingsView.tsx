import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/common/Button';
import { Select, SelectOption } from '@/components/common/Select';
import { ICONS } from '@/constants';
import { KubernetesCluster } from '@/types';
import { formatLastUpdated, getAgentConnectionState } from '@/utils/telemetry';

interface ClusterSettingsViewProps {
  cluster: KubernetesCluster;
  workspaceName?: string;
  canManageCluster?: boolean;
  onEditNamespaceScope?: () => void;
  onUpdateWriteConfirmationPolicy?: (overrideRequired: boolean | null) => void | Promise<void>;
}

type WriteConfirmationPolicyValue = 'required' | 'not_required';

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
  onEditNamespaceScope,
  onUpdateWriteConfirmationPolicy
}) => {
  const { t } = useTranslation();
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
            description={cluster.name}
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
      </div>
    </div>
  );
};
