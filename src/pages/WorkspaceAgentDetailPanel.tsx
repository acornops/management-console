import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DangerZone,
  DangerZoneRow,
  InlineConfirmation
} from '@acornops/ui';
import { ICONS } from '@/constants';
import { AgentAvatar } from '@/pages/agents/AgentAvatar';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import { AgentCapabilityAdminView } from '@/pages/agents/AgentCapabilityAdminView';

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
  duplicatingAgentId: string;
  disableConfirmAgentId: string;
  setDisableConfirmAgentId: React.Dispatch<React.SetStateAction<string>>;
  deleteConfirmAgentId: string;
  setDeleteConfirmAgentId: React.Dispatch<React.SetStateAction<string>>;
  onOpenEditAgentDrawer: (agent: AgentDefinition) => void;
  onDuplicateSelectedAgent: () => void;
  onReactivateSelectedAgent: () => void;
  onDisableSelectedAgent: () => void;
  onDeleteSelectedAgent: () => void;
}

export const WorkspaceAgentDetailPanel: React.FC<WorkspaceAgentDetailPanelProps> = (props) => {
  const { t } = useTranslation();
  const { selectedAgent } = props;
  const disableButtonRef = React.useRef<HTMLButtonElement>(null);
  const deleteButtonRef = React.useRef<HTMLButtonElement>(null);
  const routeTitle = t(`agentChat.sections.${props.activeTab}.title`, { name: selectedAgent.name });
  const routeDescription = t(`agentChat.sections.${props.activeTab}.description`, { name: selectedAgent.name });

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col">
      {props.activeTab === 'settings' && (
        <header className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <AgentAvatar emoji={selectedAgent.avatarEmoji} size="lg" />
                <div className="min-w-0">
                  <h1 id={props.titleId} className="type-route-title break-words [overflow-wrap:anywhere]">{routeTitle}</h1>
                  <p className="type-body mt-1 max-w-3xl text-ui-text-muted">{routeDescription}</p>
                </div>
              </div>
            </div>
            {props.activeTab === 'settings' && (
              <div className="flex shrink-0 flex-wrap gap-2">
                {selectedAgent.status === 'disabled' && (
                  <Button size="sm" variant="secondary" onClick={props.onReactivateSelectedAgent} disabled={!props.canManageAgents || props.updatingAgentId === selectedAgent.id}>
                    {t('agentsWorkflows.agents.reactivate')}
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={props.onDuplicateSelectedAgent} disabled={!props.canManageAgents || props.duplicatingAgentId === selectedAgent.id}>
                  {props.duplicatingAgentId === selectedAgent.id ? t('agentsWorkflows.duplicating') : t('agentsWorkflows.duplicate')}
                </Button>
                <Button size="sm" variant="primary" onClick={() => props.onOpenEditAgentDrawer(selectedAgent)} disabled={!props.canManageAgents}>
                  <ICONS.Pencil className="h-4 w-4" aria-hidden="true" />
                  {t('agentsWorkflows.agents.edit')}
                </Button>
              </div>
            )}
          </div>
        </header>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {props.activeTab === 'chat' && props.chatContent}
        {props.activeTab === 'mcpServers' && (
          <AgentCapabilityAdminView agent={selectedAgent} canManageAgents={props.canManageAgents} canManageMcp={props.canManageMcp} canManageSkills={props.canManageSkills} section="mcp" />
        )}
        {props.activeTab === 'skills' && (
          <AgentCapabilityAdminView agent={selectedAgent} canManageAgents={props.canManageAgents} canManageMcp={props.canManageMcp} canManageSkills={props.canManageSkills} section="skills" />
        )}
        {props.activeTab === 'tools' && (
          <AgentCapabilityAdminView agent={selectedAgent} canManageAgents={props.canManageAgents} canManageMcp={props.canManageMcp} canManageSkills={props.canManageSkills} section="tools" />
        )}
        {props.activeTab === 'settings' && (
          <div className="space-y-5">
            <DangerZone>
              {selectedAgent.status !== 'disabled' && (
                <DangerZoneRow
                  id="agent-disable-title"
                  title="Disable Agent"
                  description="Stops new Agent chats and prevents workflows from assigning this Agent."
                  headingLevel="h2"
                  action={<Button ref={disableButtonRef} size="sm" variant="secondary" onClick={() => props.setDisableConfirmAgentId(selectedAgent.id)} disabled={!props.canManageAgents}>Disable</Button>}
                />
              )}
              {props.disableConfirmAgentId === selectedAgent.id && (
                <InlineConfirmation
                  id="agent-disable-confirmation"
                  title="Disable this Agent?"
                  description="New Agent chat and workflow execution will be blocked until it is reactivated."
                  tone="warning"
                  cancelLabel={t('common.cancel')}
                  confirmLabel="Disable"
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
                action={<Button ref={deleteButtonRef} size="sm" variant="danger" onClick={() => props.setDeleteConfirmAgentId(selectedAgent.id)} disabled={!props.canManageAgents}>Delete</Button>}
              />
              {props.deleteConfirmAgentId === selectedAgent.id && (
                <InlineConfirmation
                  id="agent-delete-confirmation"
                  title="Delete this Agent?"
                  description="This permanently removes the Agent and its conversation history."
                  tone="danger"
                  cancelLabel={t('common.cancel')}
                  confirmLabel="Delete"
                  returnFocusRef={deleteButtonRef}
                  onCancel={() => props.setDeleteConfirmAgentId('')}
                  onConfirm={props.onDeleteSelectedAgent}
                />
              )}
            </DangerZone>
          </div>
        )}
      </div>
    </section>
  );
};
