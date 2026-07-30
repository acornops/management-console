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
import type { AgentVersionSnapshotApi } from '@/services/control-plane/agentApi';
import { formatAgentTimestamp } from '@/pages/WorkspaceAgentsPage.helpers';
import { AppPaths } from '@/utils/routes';

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
  agentVersionAction: string;
  disableConfirmAgentId: string;
  setDisableConfirmAgentId: React.Dispatch<React.SetStateAction<string>>;
  deleteConfirmAgentId: string;
  setDeleteConfirmAgentId: React.Dispatch<React.SetStateAction<string>>;
  agentVersionHistories: Record<string, AgentVersionSnapshotApi[]>;
  onOpenEditAgentDrawer: (agent: AgentDefinition) => void;
  onDuplicateSelectedAgent: () => void;
  onSaveSelectedAgentVersion: () => void;
  onReactivateSelectedAgent: () => void;
  onDisableSelectedAgent: () => void;
  onDeleteSelectedAgent: () => void;
  onRefreshSelectedAgentVersions: () => void;
  onRestoreSelectedAgentVersion: (version: AgentVersionSnapshotApi) => void;
}

const workflowHref = (agent: AgentDefinition, workflow: string) =>
  `${AppPaths.workspaceWorkflows(agent.workspaceId)}?${new URLSearchParams({ workflow }).toString()}`;

export const WorkspaceAgentDetailPanel: React.FC<WorkspaceAgentDetailPanelProps> = (props) => {
  const { t, i18n } = useTranslation();
  const { selectedAgent } = props;
  const versions = props.agentVersionHistories[selectedAgent.id] || [];
  const locale = i18n.resolvedLanguage || i18n.language;
  const [restoreVersionId, setRestoreVersionId] = React.useState('');
  const disableButtonRef = React.useRef<HTMLButtonElement>(null);
  const deleteButtonRef = React.useRef<HTMLButtonElement>(null);
  const routeTitle = t(`agentChat.sections.${props.activeTab}.title`, { name: selectedAgent.name });
  const routeDescription = t(`agentChat.sections.${props.activeTab}.description`, { name: selectedAgent.name });

  React.useEffect(() => setRestoreVersionId(''), [props.activeTab, selectedAgent.id]);

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
            <section className="rounded-lg border border-ui-border bg-ui-surface p-5">
              <h2 className="type-panel-title">{t('agentChat.workflowUsage')}</h2>
              <p className="type-caption mt-1 text-ui-text-muted">
                {t('agentChat.workflowUsageCount', { count: selectedAgent.workflowsUsingAgent.length })}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {selectedAgent.workflowsUsingAgent.length
                  ? selectedAgent.workflowsUsingAgent.map((workflow) => (
                    <a key={workflow} href={workflowHref(selectedAgent, workflow)} className="type-body type-emphasis text-accent-strong underline-offset-4 hover:underline">{workflow}</a>
                  ))
                  : <span className="type-caption text-ui-text-muted">{t('agentChat.noWorkflowUsage')}</span>}
              </div>
            </section>

            <section className="rounded-lg border border-ui-border bg-ui-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="type-panel-title">Configuration versions</h2>
                  <p className="type-caption mt-1 text-ui-text-muted">Save or restore configuration without creating another navigation page.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={props.onRefreshSelectedAgentVersions} disabled={props.agentVersionAction === `${selectedAgent.id}:history`}>
                    <ICONS.RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
                  </Button>
                  <Button size="sm" variant="secondary" onClick={props.onSaveSelectedAgentVersion} disabled={!props.canManageAgents || props.agentVersionAction === selectedAgent.id}>
                    <ICONS.Save className="h-4 w-4" aria-hidden="true" /> Save version
                  </Button>
                </div>
              </div>
              <div className="mt-4 divide-y divide-ui-border border-y border-ui-border">
                {versions.length ? versions.map((version) => (
                  <div key={version.id}>
                    <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2">
                      <span className="type-body type-emphasis text-ui-text">
                        Revision {version.version}
                        <span className="type-caption ml-3 text-ui-text-muted">{formatAgentTimestamp(version.createdAt, version.createdAt, locale)}</span>
                      </span>
                      <Button size="sm" variant="tertiary" onClick={() => setRestoreVersionId(version.id)} disabled={!props.canManageAgents}>Restore</Button>
                    </div>
                    {restoreVersionId === version.id && (
                      <InlineConfirmation
                        id={`agent-restore-${version.id}`}
                        title={`Restore revision ${version.version}?`}
                        description="The restored snapshot becomes the current configuration as a new revision."
                        tone="warning"
                        cancelLabel={t('common.cancel')}
                        confirmLabel="Restore"
                        onCancel={() => setRestoreVersionId('')}
                        onConfirm={() => { setRestoreVersionId(''); props.onRestoreSelectedAgentVersion(version); }}
                      />
                    )}
                  </div>
                )) : <p className="type-body py-4 text-ui-text-muted">No saved versions.</p>}
              </div>
            </section>

            <DangerZone>
              {selectedAgent.status !== 'disabled' && (
                <DangerZoneRow
                  id="agent-disable-title"
                  title="Disable Agent"
                  description={`Stops new execution. ${selectedAgent.workflowsUsingAgent.length} workflow assignment${selectedAgent.workflowsUsingAgent.length === 1 ? '' : 's'} remain visible.`}
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
                action={<Button ref={deleteButtonRef} size="sm" variant="danger" onClick={() => props.setDeleteConfirmAgentId(selectedAgent.id)} disabled={!props.canManageAgents || selectedAgent.workflowsUsingAgent.length > 0}>Delete</Button>}
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
