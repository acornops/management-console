import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { ICONS } from '@/constants';
import { headerMotion } from '@/lib/motion';
import { Workspace } from '@/types';

interface WorkspaceSettingsPageProps {
  workspace: Workspace;
  canDeleteWorkspace: boolean;
  onDeleteWorkspace: (workspaceId: string) => void;
}

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
  description: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, label, description, action }) => (
  <div className="flex flex-col gap-5 border-b border-ui-border p-6 transition-colors last:border-0 hover:bg-ui-bg/20 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong shadow-sm">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="mb-0.5 text-sm font-bold text-ui-text">{label}</p>
        <p className="text-xs leading-5 text-ui-text-muted">{description}</p>
      </div>
    </div>
    {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
  </div>
);

function formatQuota(value: { used: number; limit: number } | undefined, fallback: string): string {
  return value ? `${value.used} / ${value.limit}` : fallback;
}

export const WorkspaceSettingsPage: React.FC<WorkspaceSettingsPageProps> = ({
  workspace,
  canDeleteWorkspace,
  onDeleteWorkspace
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <motion.header {...headerMotion} className="mb-12">
        <h1 className="type-route-title">{t('workspaceSettings.title')}</h1>
        <p className="type-body mt-2 max-w-2xl">
          {t('workspaceSettings.subtitle')}
        </p>
      </motion.header>

      <div className="max-w-4xl">
        <SettingSection
          title={t('workspaceSettings.organizationTitle')}
          description={t('workspaceSettings.organizationBody')}
        >
          <SettingRow
            icon={ICONS.LayoutGrid}
            label={t('workspaceSettings.workspaceName')}
            description={workspace.name}
          />
          <SettingRow
            icon={ICONS.Globe}
            label={t('workspaceSettings.plan')}
            description={workspace.plan?.name || t('workspaceSettings.planUnavailable')}
          />
        </SettingSection>

        <SettingSection
          title={t('workspaceSettings.quotasTitle')}
          description={t('workspaceSettings.quotasBody')}
        >
          <SettingRow
            icon={ICONS.Users}
            label={t('workspaceSettings.workspaceMembers')}
            description={formatQuota(workspace.quota?.members, t('workspaceSettings.quotaUnavailable'))}
          />
          <SettingRow
            icon={ICONS.Activity}
            label={t('workspaceSettings.kubernetesClusters')}
            description={formatQuota(workspace.quota?.kubernetesClusters, t('workspaceSettings.quotaUnavailable'))}
          />
          <SettingRow
            icon={ICONS.Server}
            label={t('workspaceSettings.virtualMachines')}
            description={formatQuota(workspace.quota?.virtualMachines, t('workspaceSettings.quotaUnavailable'))}
          />
        </SettingSection>

        <SettingSection
          title={t('workspaceSettings.accessTitle')}
          description={t('workspaceSettings.accessBody')}
        >
          <SettingRow
            icon={ICONS.Users}
            label={t('workspaceSettings.members')}
            description={t('workspaceSettings.membersBody')}
          />
          <SettingRow
            icon={ICONS.Shield}
            label={t('workspaceSettings.rbac')}
            description={t('workspaceSettings.rbacBody')}
          />
        </SettingSection>

        <section
          aria-labelledby="workspace-danger-title"
          className="mt-10 flex flex-col gap-6 rounded-xl border border-status-danger/20 bg-status-danger-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
        >
          <div className="min-w-0">
            <h2 id="workspace-danger-title" className="mb-1 text-sm font-bold text-status-danger-text">
              {t('workspaceSettings.dangerTitle')}
            </h2>
            <p className="max-w-2xl text-xs font-medium leading-5 text-status-danger-text">
              {t('workspaceSettings.dangerBody')}
            </p>
          </div>
          <Button
            onClick={() => {
              if (!canDeleteWorkspace) return;
              onDeleteWorkspace(workspace.id);
            }}
            disabled={!canDeleteWorkspace}
            variant="danger"
            size="md"
            className="w-full text-xs uppercase tracking-widest sm:w-auto"
            aria-label={canDeleteWorkspace ? t('app.deleteNamedWorkspace', { name: workspace.name }) : t('app.ownerDeleteOnly')}
            title={canDeleteWorkspace ? t('app.deleteNamedWorkspace', { name: workspace.name }) : t('app.ownerDeleteOnly')}
          >
            <ICONS.Trash2 className="h-3.5 w-3.5" />
            {t('app.deleteWorkspace')}
          </Button>
        </section>
      </div>
    </div>
  );
};
