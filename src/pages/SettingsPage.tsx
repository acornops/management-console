import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@/components/common/Tooltip';
import { ICONS } from '@/constants';
import { headerMotion } from '@/lib/motion';
import type { ProjectMember, Workspace, WorkspaceInvitation } from '@/types';
import { WorkspaceAiSettingsPage } from '@/pages/WorkspaceAiSettingsPage';
import { WorkspaceMembersPage } from '@/pages/WorkspaceMembersPage';
import { WorkspaceSettingsPage } from '@/pages/WorkspaceSettingsPage';

export type SettingsTab = 'workspace' | 'members' | 'ai';

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
  currentUserRole?: ProjectMember['role'];
  onDeleteWorkspace: (workspaceId: string) => void;
  onLeaveWorkspace?: () => Promise<void>;
  onCreateInvitation?: (input: { email: string; role: ProjectMember['role'] }) => Promise<WorkspaceInvitation>;
  onRevokeInvitation?: (invitation: WorkspaceInvitation) => Promise<void> | void;
  onUpdateMemberRole?: (member: ProjectMember, role: ProjectMember['role']) => Promise<void> | void;
  onRemoveMember?: (member: ProjectMember) => Promise<void> | void;
  onSelectTab?: (tab: SettingsTab) => void;
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
  currentUserRole = 'viewer',
  onDeleteWorkspace,
  onLeaveWorkspace,
  onCreateInvitation,
  onRevokeInvitation,
  onUpdateMemberRole,
  onRemoveMember,
  onSelectTab,
  showToast
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<SettingsTab>(initialTab);
  const workspaceTabDisabled = !workspace;
  const aiTabDisabled = !workspace || !canReadWorkspaceData;
  const membersTabDisabled = !workspace || !canReadMembers;
  const hasWorkspace = Boolean(workspace);

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
    }
  }, [activeTab, aiTabDisabled, membersTabDisabled]);

  const tabs: Array<{
    id: SettingsTab;
    label: string;
    icon: React.ElementType;
  }> = [
    { id: 'workspace', label: t('settingsPage.workspaceTab'), icon: ICONS.LayoutGrid },
    { id: 'members', label: t('settingsPage.membersTab'), icon: ICONS.Users },
    { id: 'ai', label: t('settingsPage.aiTab'), icon: ICONS.Bot }
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
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <motion.header {...headerMotion} className="mb-8">
        <h1 className="type-route-title">{t('settingsPage.title')}</h1>
        <p className="type-body mt-2 max-w-2xl">{t('settingsPage.subtitle')}</p>
      </motion.header>

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
                className={`-mb-px flex min-h-11 items-center gap-2 border-b-2 px-3 py-2 text-sm font-bold transition-colors ${
                  isActive
                    ? 'border-accent text-accent-strong'
                    : unavailableReason
                      ? 'border-transparent text-ui-text-muted/60'
                      : 'border-transparent text-ui-text-muted hover:border-ui-border hover:text-ui-text'
                } ${unavailableReason ? 'cursor-not-allowed' : ''}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            </Tooltip>
          );
        })}
      </div>

      {!workspace && (
        <section className="max-w-4xl rounded-xl border border-ui-border bg-ui-surface p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong">
              <ICONS.LayoutGrid className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ui-text">{t('settingsPage.noWorkspaceTitle')}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-ui-text-muted">{t('settingsPage.noWorkspaceBody')}</p>
            </div>
          </div>
        </section>
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
          showToast={showToast}
        />
      )}
    </div>
  );
};
