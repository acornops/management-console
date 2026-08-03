import React from 'react';
import { useTranslation } from 'react-i18next';
import { CircleOff } from 'lucide-react';
import {
  Button,
  DangerZone,
  DangerZoneRow,
  DestructiveConfirmationDialog,
  InlineConfirmation,
  PageHeader
} from '@acornops/ui';
import { ICONS } from '@/constants';
import { AgentAvatar } from '@/pages/agents/AgentAvatar';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import { AgentCapabilityAdminView } from '@/pages/agents/AgentCapabilityAdminView';
import { useCapabilityCatalogCache } from '@/features/targets/admin/useCapabilityCatalogCache';
import { RunPermissionSettingsSection } from '@/features/run-permissions/RunPermissionSettingsSection';

export type AgentProfileTab = 'chat' | 'mcpServers' | 'skills' | 'tools' | 'settings';
export const agentProfileTabs: AgentProfileTab[] = ['chat', 'mcpServers', 'skills', 'tools', 'settings'];

interface WorkspaceAgentDetailPanelProps {
  selectedAgent: AgentDefinition;
  activeTab: AgentProfileTab;
  titleId?: string;
  chatContent?: React.ReactNode;
  canManageAgents: boolean;
  canManageMcp: boolean;
  canManageSkills: boolean;
  updatingAgentId: string;
  disableConfirmAgentId: string;
  setDisableConfirmAgentId: React.Dispatch<React.SetStateAction<string>>;
  deleteConfirmAgentId: string;
  deleteError?: string | null;
  setDeleteConfirmAgentId: React.Dispatch<React.SetStateAction<string>>;
  onOpenEditAgentDrawer: (agent: AgentDefinition) => void;
  onUpdatePermissionMode: (permissionMode: AgentDefinition['permissionMode']) => void | Promise<void>;
  onReactivateSelectedAgent: () => void;
  onDisableSelectedAgent: () => void;
  onDeleteSelectedAgent: () => void;
}

export const WorkspaceAgentDetailPanel: React.FC<WorkspaceAgentDetailPanelProps> = (props) => {
  const { t } = useTranslation();
  const { selectedAgent } = props;
  const disableButtonRef = React.useRef<HTMLButtonElement>(null);
  const {
    cachedCatalogs: cachedCapabilityCatalogs,
    cacheMcpServersCatalog,
    cacheSkillsCatalog,
    cacheToolsCatalog
  } = useCapabilityCatalogCache(`${selectedAgent.workspaceId}:${selectedAgent.id}`);
  const permissionModeSaving = props.updatingAgentId === selectedAgent.id;
  const routeTitle = t(`agentChat.sections.${props.activeTab}.title`, { name: selectedAgent.name });
  const routeDescription = t(`agentChat.sections.${props.activeTab}.description`, { name: selectedAgent.name });
  const capabilityCatalogProps = {
    cachedCatalogs: cachedCapabilityCatalogs,
    onMcpServersCatalogChange: cacheMcpServersCatalog,
    onSkillsCatalogChange: cacheSkillsCatalog,
    onToolsCatalogChange: cacheToolsCatalog
  };

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col">
      {props.activeTab === 'settings' && (
        <PageHeader
          title={(
            <span id={props.titleId} className="inline-flex min-w-0 items-start gap-3">
              <AgentAvatar emoji={selectedAgent.avatarEmoji} size="lg" />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{routeTitle}</span>
            </span>
          )}
          description={routeDescription}
          descriptionClassName="pl-14"
          actions={(
            <>
              {selectedAgent.status === 'disabled' && (
                <Button size="md" variant="secondary" onClick={props.onReactivateSelectedAgent} disabled={!props.canManageAgents || props.updatingAgentId === selectedAgent.id}>
                  {t('agentsWorkflows.agents.reactivate')}
                </Button>
              )}
              <Button size="md" variant="primary" onClick={() => props.onOpenEditAgentDrawer(selectedAgent)} disabled={!props.canManageAgents}>
                <ICONS.Pencil className="h-4 w-4" aria-hidden="true" />
                {t('agentsWorkflows.agents.edit')}
              </Button>
            </>
          )}
        />
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {props.activeTab === 'chat' && props.chatContent}
        {props.activeTab === 'mcpServers' && (
          <AgentCapabilityAdminView agent={selectedAgent} canManageAgents={props.canManageAgents} canManageMcp={props.canManageMcp} canManageSkills={props.canManageSkills} section="mcp" {...capabilityCatalogProps} />
        )}
        {props.activeTab === 'skills' && (
          <AgentCapabilityAdminView agent={selectedAgent} canManageAgents={props.canManageAgents} canManageMcp={props.canManageMcp} canManageSkills={props.canManageSkills} section="skills" {...capabilityCatalogProps} />
        )}
        {props.activeTab === 'tools' && (
          <AgentCapabilityAdminView agent={selectedAgent} canManageAgents={props.canManageAgents} canManageMcp={props.canManageMcp} canManageSkills={props.canManageSkills} section="tools" {...capabilityCatalogProps} />
        )}
        {props.activeTab === 'settings' && (
          <div className="max-w-4xl space-y-5" data-agent-settings-content="true">
            <RunPermissionSettingsSection
              titleId="agent-permission-settings-title"
              title={t('agentChat.permissionSettings.title')}
              description={t('agentChat.permissionSettings.description')}
              permissionMode={selectedAgent.permissionMode}
              disabled={!props.canManageAgents}
              disabledReason={!props.canManageAgents ? t('agentChat.permissionSettings.manageRequired') : undefined}
              busy={permissionModeSaving}
              onChange={props.onUpdatePermissionMode}
            />
            <DangerZone>
              {selectedAgent.status !== 'disabled' && (
                <DangerZoneRow
                  id="agent-disable-title"
                  title="Disable Agent"
                  description="Stops new Agent chats and prevents workflows from assigning this Agent."
                  headingLevel="h2"
                  action={(
                    <Button ref={disableButtonRef} size="md" variant="secondary" className="w-full sm:w-auto" onClick={() => props.setDisableConfirmAgentId(selectedAgent.id)} disabled={!props.canManageAgents}>
                      <CircleOff className="h-4 w-4" aria-hidden="true" />
                      {t('agentsWorkflows.agents.details.disableAgent')}
                    </Button>
                  )}
                />
              )}
              {props.disableConfirmAgentId === selectedAgent.id && (
                <InlineConfirmation
                  id="agent-disable-confirmation"
                  title="Disable this Agent?"
                  description="New Agent chat and workflow execution will be blocked until it is reactivated."
                  tone="warning"
                  cancelLabel={t('common.cancel')}
                  confirmLabel={t('agentsWorkflows.agents.details.confirmDisable')}
                  returnFocusRef={disableButtonRef}
                  onCancel={() => props.setDisableConfirmAgentId('')}
                  onConfirm={props.onDisableSelectedAgent}
                />
              )}
              <DangerZoneRow
                id="agent-delete-title"
                title="Delete Agent"
                description="Deletes this Agent and its manual conversations. Assigned workflows must be updated first."
                headingLevel="h2"
                tone="danger"
                action={(
                  <Button size="md" variant="danger" className="w-full sm:w-auto" onClick={() => props.setDeleteConfirmAgentId(selectedAgent.id)} disabled={!props.canManageAgents}>
                    <ICONS.Trash2 className="h-4 w-4" aria-hidden="true" />
                    {t('agentsWorkflows.agents.details.deleteAgent')}
                  </Button>
                )}
              />
            </DangerZone>
          </div>
        )}
      </div>
      <DestructiveConfirmationDialog
        open={props.deleteConfirmAgentId === selectedAgent.id}
        titleId="agent-delete-confirmation-title"
        title="Delete this Agent?"
        subtitle={t('common.irreversibleAction')}
        description="This permanently removes the Agent and its conversation history."
        error={props.deleteError}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('agentsWorkflows.agents.details.deleteAgent')}
        loadingLabel={t('app.deleting')}
        pending={props.updatingAgentId === selectedAgent.id}
        onCancel={() => props.setDeleteConfirmAgentId('')}
        onConfirm={props.onDeleteSelectedAgent}
      />
    </section>
  );
};
