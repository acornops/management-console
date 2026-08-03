import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@acornops/ui';
import { DangerZone, DangerZoneRow, SettingsSection } from '@acornops/ui';
import { IconTile } from '@acornops/ui';
import { PageHeader, PageShell } from '@acornops/ui';
import { ICONS } from '@/constants';
import { isKnownOnlyWorkspaceOwner } from '@/app/workspaceLeave';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import type { ProjectMember, Workspace } from '@/types';
import { WorkspaceCatalogSources } from '@/pages/WorkspaceCatalogSources';
import { useUrlSearchState } from '@/hooks/useUrlSearchState';
import { SettingsRow } from '@/components/common/SettingsRow';

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
  const urlSearch = useUrlSearchState();
  const [isConfirmingLeave, setIsConfirmingLeave] = React.useState(false);
  const [isLeaving, setIsLeaving] = React.useState(false);
  const [leaveError, setLeaveError] = React.useState('');
  const leaveBlockedByKnownOnlyOwner = isKnownOnlyWorkspaceOwner(currentUserRole, workspace.memberCount);

  React.useEffect(() => {
    if (urlSearch.get('section') !== 'mcp-registries') return;
    window.requestAnimationFrame(() => {
      document.getElementById('mcp-registries')?.scrollIntoView({ block: 'start' });
    });
  }, [urlSearch]);

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
      setLeaveError(
        formatControlPlaneError(error, t('workspaceSettings.leaveFailed'), {
          area: 'members',
          ownerConflictMessage: t('workspaceSettings.leaveOnlyOwnerError')
        })
      );
      setIsLeaving(false);
    }
  };

  return (
    <PageShell embedded={embedded}>
      {!embedded && <PageHeader title={t('workspaceSettings.title')} description={t('workspaceSettings.subtitle')} />}

      <div className="max-w-4xl">
        {canReadWorkspaceData ? (
          <>
            <SettingsSection title={t('workspaceSettings.organizationTitle')} description={t('workspaceSettings.organizationBody')}>
              <SettingsRow icon={ICONS.LayoutGrid} label={t('workspaceSettings.workspaceName')} description={workspace.name} />
              <SettingsRow icon={ICONS.Globe} label={t('workspaceSettings.plan')} description={workspace.plan?.name || t('workspaceSettings.planUnavailable')} />
            </SettingsSection>

            <WorkspaceCatalogSources workspaceId={workspace.id} canManage={Boolean(workspace.permissions?.manage_catalog_sources)} />

            <SettingsSection title={t('workspaceSettings.quotasTitle')} description={t('workspaceSettings.quotasBody')}>
              <SettingsRow
                icon={ICONS.Users}
                label={t('workspaceSettings.workspaceMembers')}
                description={formatQuota(workspace.quota?.members, t('workspaceSettings.quotaUnavailable'))}
              />
              <SettingsRow
                icon={ICONS.Activity}
                label={t('workspaceSettings.kubernetesClusters')}
                description={formatQuota(workspace.quota?.kubernetesClusters, t('workspaceSettings.quotaUnavailable'))}
              />
              <SettingsRow
                icon={ICONS.Server}
                label={t('workspaceSettings.virtualMachines')}
                description={formatQuota(workspace.quota?.virtualMachines, t('workspaceSettings.quotaUnavailable'))}
              />
            </SettingsSection>

            <SettingsSection title={t('workspaceSettings.accessTitle')} description={t('workspaceSettings.accessBody')}>
              <SettingsRow
                icon={ICONS.Users}
                label={t('workspaceSettings.members')}
                description={t('workspaceSettings.membersBody')}
                action={
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
                }
              />
              <SettingsRow
                icon={ICONS.Shield}
                label={t('workspaceSettings.rbac')}
                description={t('workspaceSettings.rbacBody')}
                action={
                  <span className="type-label inline-flex min-h-9 w-full items-center justify-center rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-ui-text-muted sm:w-auto">
                    {t('workspaceSettings.inherited')}
                  </span>
                }
              />
            </SettingsSection>
          </>
        ) : (
          <section className="mb-10 rounded-xl border border-ui-border bg-ui-surface p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <IconTile>
                <ICONS.Shield className="h-5 w-5" aria-hidden="true" />
              </IconTile>
              <div className="min-w-0">
                <h2 className="mb-1 type-row-title">{t('workspaceSettings.limitedAccessTitle')}</h2>
                <p className="max-w-2xl type-body leading-6 text-ui-text-muted">{t('workspaceSettings.limitedAccessBody')}</p>
              </div>
            </div>
          </section>
        )}

        <DangerZone className="mt-10">
          <DangerZoneRow
            id="workspace-leave-title"
            title={t('workspaceSettings.leaveTitle')}
            description={t('workspaceSettings.leaveBody')}
            actionClassName={isConfirmingLeave ? 'sm:w-64' : undefined}
            detail={
              <>
                {leaveBlockedByKnownOnlyOwner && (
                  <p className="mt-2 max-w-2xl type-caption type-emphasis leading-5 text-status-warning-text">{t('workspaceSettings.leaveOnlyOwnerWarning')}</p>
                )}
                {leaveError && (
                  <p className="mt-2 max-w-2xl type-caption type-emphasis leading-5 text-status-danger-text" role="alert">
                    {leaveError}
                  </p>
                )}
              </>
            }
            action={
              <div className="flex w-full justify-end">
                {isConfirmingLeave ? (
                  <div className="grid w-full grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      className="w-full"
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
                      className="w-full"
                      onClick={() => void handleLeaveWorkspace()}
                      disabled={isLeaving || leaveBlockedByKnownOnlyOwner}
                      aria-label={t('workspaceSettings.leaveNamedWorkspace', {
                        name: workspace.name
                      })}
                    >
                      <ICONS.LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      {isLeaving ? t('workspaceSettings.leaving') : t('workspaceSettings.confirmLeave')}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="w-full sm:w-auto"
                    onClick={() => setIsConfirmingLeave(true)}
                    disabled={!onLeaveWorkspace || leaveBlockedByKnownOnlyOwner}
                    aria-label={t('workspaceSettings.leaveNamedWorkspace', {
                      name: workspace.name
                    })}
                    title={
                      leaveBlockedByKnownOnlyOwner
                        ? t('workspaceSettings.leaveOnlyOwnerWarning')
                        : t('workspaceSettings.leaveNamedWorkspace', {
                            name: workspace.name
                          })
                    }
                  >
                    <ICONS.LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('workspaceSettings.leaveAction')}
                  </Button>
                )}
              </div>
            }
          />

          <DangerZoneRow
            id="workspace-danger-title"
            title={t('workspaceSettings.dangerTitle')}
            description={t('workspaceSettings.dangerBody')}
            tone="danger"
            action={
              <Button
                onClick={() => {
                  if (!canDeleteWorkspace) return;
                  onDeleteWorkspace(workspace.id);
                }}
                disabled={!canDeleteWorkspace}
                variant="danger"
                size="md"
                className="w-full sm:w-auto"
                aria-label={canDeleteWorkspace ? t('app.deleteNamedWorkspace', { name: workspace.name }) : t('app.ownerDeleteOnly')}
                title={canDeleteWorkspace ? t('app.deleteNamedWorkspace', { name: workspace.name }) : t('app.ownerDeleteOnly')}
              >
                <ICONS.Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                {t('app.deleteWorkspace')}
              </Button>
            }
          />
        </DangerZone>
      </div>
    </PageShell>
  );
};
