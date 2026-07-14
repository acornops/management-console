import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { PageHeader, PageShell } from '@/components/common/PageComposition';
import { ICONS } from '@/constants';
import { isKnownOnlyWorkspaceOwner } from '@/app/workspaceLeave';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import type { ProjectMember, Workspace } from '@/types';
import { WorkspaceMcpSettings } from '@/pages/WorkspaceMcpSettings';

interface WorkspaceSettingsPageProps {
  workspace: Workspace;
  canReadWorkspaceData: boolean;
  canReadMembers: boolean;
  canDeleteWorkspace: boolean;
  currentUserRole?: ProjectMember['role'];
  onDeleteWorkspace: (workspaceId: string) => void;
  onLeaveWorkspace?: () => Promise<void>;
  onSelectMembers: () => void;
  embedded?: boolean;
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

const DangerPanel: React.FC<{
  id: string;
  title: string;
  body: string;
  children: React.ReactNode;
}> = ({ id, title, body, children }) => (
  <section
    aria-labelledby={id}
    className="flex flex-col gap-5 rounded-xl border border-status-danger/20 bg-status-danger-soft p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8"
  >
    <div className="min-w-0">
      <h2 id={id} className="mb-1 text-sm font-bold text-status-danger-text">
        {title}
      </h2>
      <p className="max-w-2xl text-xs font-medium leading-5 text-status-danger-text">
        {body}
      </p>
    </div>
    <div className="w-full shrink-0 sm:w-auto">{children}</div>
  </section>
);

function formatQuota(value: { used: number; limit: number } | undefined, fallback: string): string {
  return value ? `${value.used} / ${value.limit}` : fallback;
}

export const WorkspaceSettingsPage: React.FC<WorkspaceSettingsPageProps> = ({
  workspace,
  canReadWorkspaceData,
  canReadMembers,
  canDeleteWorkspace,
  currentUserRole,
  onDeleteWorkspace,
  onLeaveWorkspace,
  onSelectMembers,
  embedded = false
}) => {
  const { t } = useTranslation();
  const [isConfirmingLeave, setIsConfirmingLeave] = React.useState(false);
  const [isLeaving, setIsLeaving] = React.useState(false);
  const [leaveError, setLeaveError] = React.useState('');
  const leaveBlockedByKnownOnlyOwner = isKnownOnlyWorkspaceOwner(currentUserRole, workspace.memberCount);

  const handleLeaveWorkspace = async () => {
    if (!onLeaveWorkspace) return;
    if (leaveBlockedByKnownOnlyOwner) {
      setLeaveError(t('workspaceSettings.leaveOnlyOwnerError'));
      return;
    }
    setIsLeaving(true);
    setLeaveError('');
    try {
      await onLeaveWorkspace();
    } catch (error) {
      setLeaveError(formatControlPlaneError(error, t('workspaceSettings.leaveFailed'), {
        area: 'members',
        ownerConflictMessage: t('workspaceSettings.leaveOnlyOwnerError')
      }));
      setIsLeaving(false);
    }
  };

  return (
    <PageShell embedded={embedded}>
      {!embedded && (
        <PageHeader title={t('workspaceSettings.title')} description={t('workspaceSettings.subtitle')} />
      )}

      <div className="max-w-4xl">
        {canReadWorkspaceData ? (
          <>
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

            <WorkspaceMcpSettings
              workspaceId={workspace.id}
              canManage={Boolean(workspace.permissions?.manage_mcp)}
            />

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
                action={(
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onSelectMembers}
                    disabled={!canReadMembers}
                    className="w-full sm:w-auto"
                    title={canReadMembers ? t('workspaceSettings.manageMembers') : t('settingsPage.membersAccessRequired')}
                  >
                    <ICONS.Users className="h-4 w-4" aria-hidden="true" />
                    {t('workspaceSettings.manageMembers')}
                  </Button>
                )}
              />
              <SettingRow
                icon={ICONS.Shield}
                label={t('workspaceSettings.rbac')}
                description={t('workspaceSettings.rbacBody')}
                action={(
                  <span className="type-label inline-flex min-h-9 w-full items-center justify-center rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-ui-text-muted sm:w-auto">
                    {t('workspaceSettings.inherited')}
                  </span>
                )}
              />
            </SettingSection>
          </>
        ) : (
          <section className="mb-10 rounded-xl border border-ui-border bg-ui-surface p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong">
                <ICONS.Shield className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="mb-1 text-sm font-bold text-ui-text">{t('workspaceSettings.limitedAccessTitle')}</h2>
                <p className="max-w-2xl text-sm leading-6 text-ui-text-muted">{t('workspaceSettings.limitedAccessBody')}</p>
              </div>
            </div>
          </section>
        )}

        <div className="mt-10 space-y-4">
          <DangerPanel
            id="workspace-leave-title"
            title={t('workspaceSettings.leaveTitle')}
            body={t('workspaceSettings.leaveBody')}
          >
            <div className="flex flex-col gap-3">
              {leaveBlockedByKnownOnlyOwner && (
                <p className="max-w-xs text-xs font-semibold leading-5 text-status-danger-text">
                  {t('workspaceSettings.leaveOnlyOwnerWarning')}
                </p>
              )}
              {leaveError && (
                <p className="max-w-xs text-xs font-semibold leading-5 text-status-danger-text" role="alert">
                  {leaveError}
                </p>
              )}
              {isConfirmingLeave ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="w-full text-xs uppercase tracking-widest sm:w-auto"
                    onClick={() => {
                      setIsConfirmingLeave(false);
                      setLeaveError('');
                    }}
                    disabled={isLeaving}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="md"
                    className="w-full text-xs uppercase tracking-widest sm:w-auto"
                    onClick={() => void handleLeaveWorkspace()}
                    disabled={isLeaving || leaveBlockedByKnownOnlyOwner}
                    aria-label={t('workspaceSettings.leaveNamedWorkspace', { name: workspace.name })}
                  >
                    <ICONS.LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    {isLeaving ? t('workspaceSettings.leaving') : t('workspaceSettings.confirmLeave')}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="danger"
                  size="md"
                  className="w-full text-xs uppercase tracking-widest sm:w-auto"
                  onClick={() => setIsConfirmingLeave(true)}
                  disabled={!onLeaveWorkspace || leaveBlockedByKnownOnlyOwner}
                  aria-label={t('workspaceSettings.leaveNamedWorkspace', { name: workspace.name })}
                  title={leaveBlockedByKnownOnlyOwner ? t('workspaceSettings.leaveOnlyOwnerWarning') : t('workspaceSettings.leaveNamedWorkspace', { name: workspace.name })}
                >
                  <ICONS.LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('workspaceSettings.leaveAction')}
                </Button>
              )}
            </div>
          </DangerPanel>

          <DangerPanel
            id="workspace-danger-title"
            title={t('workspaceSettings.dangerTitle')}
            body={t('workspaceSettings.dangerBody')}
          >
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
              <ICONS.Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t('app.deleteWorkspace')}
            </Button>
          </DangerPanel>
        </div>
      </div>
    </PageShell>
  );
};
