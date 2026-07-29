import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DangerZone,
  DangerZoneRow,
  InlineConfirmation,
  SegmentedTabs,
  StatusBadge,
  type CompactControlItem
} from '@acornops/ui';
import { ICONS } from '@/constants';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import { AgentCapabilitiesPanel } from '@/pages/agents/AgentCapabilitiesPanel';
import type { AgentVersionSnapshotApi } from '@/services/control-plane/agentApi';
import { formatAgentTimestamp, statusTone } from '@/pages/WorkspaceAgentsPage.helpers';
import { AppPaths } from '@/utils/routes';

export type AgentProfileTab = 'chat' | 'mcpServers' | 'skills' | 'tools' | 'settings';
export const agentProfileTabs: AgentProfileTab[] = ['chat', 'mcpServers', 'skills', 'tools', 'settings'];

interface WorkspaceAgentDetailPanelProps {
  selectedAgent: AgentDefinition;
  activeTab: AgentProfileTab;
  onTabChange: (tab: AgentProfileTab) => void;
  titleId?: string;
  chatContent?: React.ReactNode;
  onBack?: () => void;
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
  const tabItems = React.useMemo<Array<CompactControlItem<AgentProfileTab>>>(() => [
    { value: 'chat', label: t('agentChat.tabs.chat') },
    { value: 'mcpServers', label: t('agentChat.tabs.mcpServers') },
    { value: 'skills', label: t('agentChat.tabs.skills') },
    { value: 'tools', label: t('agentChat.tabs.tools') },
    { value: 'settings', label: t('agentChat.tabs.settings') }
  ], [t]);

  React.useEffect(() => setRestoreVersionId(''), [props.activeTab, selectedAgent.id]);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <a
        href={AppPaths.workspaceAgents(selectedAgent.workspaceId)}
        onClick={(event) => {
          if (!props.onBack) return;
          event.preventDefault();
          props.onBack();
        }}
        className="mb-4 inline-flex min-h-11 w-fit items-center gap-2 rounded-md text-sm font-semibold text-ui-text-muted hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-control-boundary"
      >
        <ICONS.ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {t('agentChat.backToAgents')}
      </a>

      <header className="rounded-t-lg border border-ui-border bg-ui-surface px-5 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={statusTone(selectedAgent.status)}>{t(`agentsWorkflows.agents.status.${selectedAgent.status}`)}</StatusBadge>
              <span className="type-caption font-semibold text-ui-text-muted">
                {selectedAgent.readiness.status === 'ready' ? t('agentChat.ready') : selectedAgent.readiness.reasons[0] || t('agentChat.needsSetup')}
              </span>
            </div>
            <h1 id={props.titleId} className="mt-2 type-section-title break-words [overflow-wrap:anywhere]">{selectedAgent.name}</h1>
            <p className="type-caption mt-1 max-w-3xl text-ui-text-muted">{selectedAgent.description}</p>
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

      <div className="border-x border-b border-ui-border bg-ui-surface">
        <SegmentedTabs
          activeValue={props.activeTab}
          allPanelsMounted={false}
          ariaLabel="Agent sections"
          className="px-3"
          idBase="agent-detail"
          items={tabItems}
          onValueChange={props.onTabChange}
        />
      </div>

      <div
        id={`agent-detail-${props.activeTab}-panel`}
        role="tabpanel"
        aria-labelledby={`agent-detail-${props.activeTab}-tab`}
        className="min-h-0 flex-1 py-5"
      >
        {props.activeTab === 'chat' && props.chatContent}
        {props.activeTab === 'mcpServers' && (
          <section className="rounded-lg border border-ui-border bg-ui-surface p-5">
            <AgentCapabilitiesPanel agent={selectedAgent} canManageAgents={props.canManageAgents} canManageMcp={props.canManageMcp} canManageSkills={props.canManageSkills} section="mcp" hideSectionNavigation />
          </section>
        )}
        {props.activeTab === 'skills' && (
          <section className="rounded-lg border border-ui-border bg-ui-surface p-5">
            <AgentCapabilitiesPanel agent={selectedAgent} canManageAgents={props.canManageAgents} canManageMcp={props.canManageMcp} canManageSkills={props.canManageSkills} section="skills" hideSectionNavigation />
          </section>
        )}
        {props.activeTab === 'tools' && (
          <section className="rounded-lg border border-ui-border bg-ui-surface p-5">
            <AgentCapabilitiesPanel agent={selectedAgent} canManageAgents={props.canManageAgents} canManageMcp={props.canManageMcp} canManageSkills={props.canManageSkills} section="tools" hideSectionNavigation />
          </section>
        )}
        {props.activeTab === 'settings' && (
          <div className="space-y-5">
            <section className="rounded-lg border border-ui-border bg-ui-surface p-5">
              <h2 className="type-panel-title">Workflow usage</h2>
              <p className="type-caption mt-1 text-ui-text-muted">
                This Agent is assigned to {selectedAgent.workflowsUsingAgent.length} workflow{selectedAgent.workflowsUsingAgent.length === 1 ? '' : 's'}.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {selectedAgent.workflowsUsingAgent.length
                  ? selectedAgent.workflowsUsingAgent.map((workflow) => (
                    <a key={workflow} href={workflowHref(selectedAgent, workflow)} className="text-sm font-semibold text-accent-strong underline-offset-4 hover:underline">{workflow}</a>
                  ))
                  : <span className="type-caption text-ui-text-muted">No workflows currently use this Agent.</span>}
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
                      <span className="text-sm font-semibold text-ui-text">
                        Revision {version.version}
                        <span className="type-caption ml-3 font-normal text-ui-text-muted">{formatAgentTimestamp(version.createdAt, version.createdAt, locale)}</span>
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
                )) : <p className="py-4 text-sm text-ui-text-muted">No saved versions.</p>}
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
