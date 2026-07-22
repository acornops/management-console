import React from 'react';
import { LayoutGroup } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@/components/common/Tooltip';
import { EmptyState } from '@/components/common/EmptyState';
import { ICONS } from '@/constants';
import { useWorkspaceAiSettingsResource } from '@/hooks/useWorkspaceAiSettingsResource';
import type { ProjectMember, Workspace, WorkspaceInvitation } from '@/types';
import { WorkspaceAiSettingsPage } from '@/pages/WorkspaceAiSettingsPage';
import { WorkspaceMembersPage } from '@/pages/WorkspaceMembersPage';
import { WorkspaceSettingsPage } from '@/pages/WorkspaceSettingsPage';
import { WorkspaceWebhooksPage } from '@/pages/WorkspaceWebhooksPage';
import { ActiveTabIndicator } from '@/components/common/ActiveTabIndicator';
import { PageBackLink, PageHeader, PageShell } from '@/components/common/PageComposition';

export type SettingsTab = 'workspace' | 'members' | 'ai' | 'webhooks';

interface TabUnavailableInput {
  tab: SettingsTab;
  hasWorkspace: boolean;
  canReadWorkspaceData: boolean;
  canReadMembers: boolean;
  t: (key: string) => string;
}

function getTabUnavailableReason({
  tab,
  hasWorkspace,
  canReadWorkspaceData,
  canReadMembers,
  t
}: TabUnavailableInput): string | undefined {
  if (!hasWorkspace) return t('settingsPage.selectWorkspaceForTab');
  if (tab === 'members' && !canReadMembers) return t('settingsPage.membersAccessRequired');
  if (tab === 'ai' && !canReadWorkspaceData) return t('settingsPage.workspaceAccessRequired');
  if (tab === 'webhooks' && !canReadWorkspaceData) return t('settingsPage.webhooksReadAccessRequired');
  return undefined;
}

interface SettingsPageProps {
  workspace?: Workspace;
  initialTab?: SettingsTab;
  canReadWorkspaceData: boolean;
  canReadMembers: boolean;
  canDeleteWorkspace: boolean;
  canManageMembers: boolean;
  canManageAiSettings: boolean;
  canManageWebhooks: boolean;
  currentUserRole?: ProjectMember['role'];
  onDeleteWorkspace: (workspaceId: string) => void;
  onLeaveWorkspace?: () => Promise<void>;
  onCreateInvitation?: (input: { email: string; role: ProjectMember['role'] }) => Promise<WorkspaceInvitation>;
  onRevokeInvitation?: (invitation: WorkspaceInvitation) => Promise<void> | void;
  onUpdateMemberRole?: (member: ProjectMember, role: ProjectMember['role']) => Promise<void> | void;
  onRemoveMember?: (member: ProjectMember) => Promise<void> | void;
  onSelectTab?: (tab: SettingsTab) => void;
  returnTo?: string;
  onReturnToAssistant?: (returnTo: string) => void;
  showToast: (message: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  workspace,
  initialTab = 'workspace',
  canReadWorkspaceData,
  canReadMembers,
  canDeleteWorkspace,
  canManageMembers,
  canManageAiSettings,
  canManageWebhooks,
  currentUserRole = 'viewer',
  onDeleteWorkspace,
  onLeaveWorkspace,
  onCreateInvitation,
  onRevokeInvitation,
  onUpdateMemberRole,
  onRemoveMember,
  onSelectTab,
  returnTo,
  onReturnToAssistant,
  showToast
}) => {
  const { t } = useTranslation();
  const settingsTabsLayoutGroupId = React.useId();
  const [activeTab, setActiveTab] = React.useState<SettingsTab>(initialTab);
  const workspaceTabDisabled = !workspace;
  const aiTabDisabled = !workspace || !canReadWorkspaceData;
  const membersTabDisabled = !workspace || !canReadMembers;
  const webhooksTabDisabled = !workspace || !canReadWorkspaceData;
  const hasWorkspace = Boolean(workspace);
  const aiSettingsResource = useWorkspaceAiSettingsResource(
    workspace?.id,
    activeTab === 'ai' && !aiTabDisabled
  );

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  React.useEffect(() => {
    if (activeTab === 'members' && membersTabDisabled) {
      setActiveTab('workspace');
      return;
    }
    if (activeTab === 'ai' && aiTabDisabled) {
      setActiveTab('workspace');
      return;
    }
    if (activeTab === 'webhooks' && webhooksTabDisabled) {
      setActiveTab('workspace');
    }
  }, [activeTab, aiTabDisabled, membersTabDisabled, webhooksTabDisabled]);

  const tabs: Array<{
    id: SettingsTab;
    label: string;
    icon: React.ElementType;
  }> = [
    { id: 'workspace', label: t('settingsPage.workspaceTab'), icon: ICONS.LayoutGrid },
    { id: 'members', label: t('settingsPage.membersTab'), icon: ICONS.Users },
    { id: 'ai', label: t('settingsPage.aiTab'), icon: ICONS.Bot },
    { id: 'webhooks', label: t('settingsPage.webhooksTab'), icon: ICONS.Send }
  ];

  const handleSelectTab = (tab: SettingsTab) => {
    const unavailableReason = getTabUnavailableReason({
      tab,
      hasWorkspace,
      canReadWorkspaceData,
      canReadMembers,
      t
    });
    if (unavailableReason) return;
    setActiveTab(tab);
    onSelectTab?.(tab);
  };

  return (
    <PageShell>
      {returnTo && (
        <PageBackLink
          href={returnTo}
          onClick={(event) => {
            event.preventDefault();
            onReturnToAssistant?.(returnTo);
          }}
        >
          {t('workspaceAiSettings.backToAssistant')}
        </PageBackLink>
      )}
      <PageHeader title={t('settingsPage.title')} description={t('settingsPage.subtitle')} />

      <LayoutGroup id={settingsTabsLayoutGroupId}>
        <div className="mb-8 flex max-w-4xl flex-wrap gap-2 border-b border-ui-border">
          {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          const unavailableReason = getTabUnavailableReason({
            tab: id,
            hasWorkspace,
            canReadWorkspaceData,
            canReadMembers,
            t
          });
          return (
            <Tooltip key={id} content={unavailableReason || label} disabled={!unavailableReason}>
              <button
                type="button"
                onClick={() => handleSelectTab(id)}
                aria-disabled={Boolean(unavailableReason)}
                aria-pressed={isActive}
                className={`relative -mb-px flex min-h-11 items-center gap-2 border-b-2 px-3 py-2 text-sm font-bold transition-colors ${
                  isActive
                    ? 'border-transparent text-accent-strong'
                    : unavailableReason
                      ? 'border-transparent text-ui-text-muted/60'
                      : 'border-transparent text-ui-text-muted hover:border-ui-border hover:text-ui-text'
                } ${unavailableReason ? 'cursor-not-allowed' : ''}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
                {isActive && <ActiveTabIndicator />}
              </button>
            </Tooltip>
          );
          })}
        </div>
      </LayoutGroup>

      {!workspace && (
        <EmptyState
          className="max-w-4xl"
          icon={<ICONS.LayoutGrid />}
          title={t('settingsPage.noWorkspaceTitle')}
          description={t('settingsPage.noWorkspaceBody')}
        />
      )}

      {activeTab === 'workspace' && workspace && !workspaceTabDisabled && (
        <WorkspaceSettingsPage
          embedded
          workspace={workspace}
          canReadWorkspaceData={canReadWorkspaceData}
          canReadMembers={canReadMembers}
          canDeleteWorkspace={canDeleteWorkspace}
          currentUserRole={currentUserRole}
          onDeleteWorkspace={onDeleteWorkspace}
          onLeaveWorkspace={onLeaveWorkspace}
          onSelectMembers={() => handleSelectTab('members')}
        />
      )}

      {activeTab === 'members' && workspace && !membersTabDisabled && (
        <WorkspaceMembersPage
          embedded
          workspace={workspace}
          currentUserRole={currentUserRole}
          canManageMembers={canManageMembers}
          onCreateInvitation={onCreateInvitation}
          onRevokeInvitation={onRevokeInvitation}
          onUpdateMemberRole={onUpdateMemberRole}
          onRemoveMember={onRemoveMember}
        />
      )}

      {activeTab === 'ai' && workspace && !aiTabDisabled && (
        <WorkspaceAiSettingsPage
          embedded
          workspace={workspace}
          canManageAiSettings={canManageAiSettings}
          aiSettingsResource={aiSettingsResource}
          returnTo={returnTo}
          onReturnToAssistant={onReturnToAssistant}
          showToast={showToast}
        />
      )}

      {activeTab === 'webhooks' && workspace && !webhooksTabDisabled && (
        <WorkspaceWebhooksPage
          workspace={workspace}
          canManageWebhooks={canManageWebhooks}
          showToast={showToast}
        />
      )}
    </PageShell>
  );
};
