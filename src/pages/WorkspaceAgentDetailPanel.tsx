import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { SegmentedTabs, type CompactControlItem } from '@/components/common/ComponentVocabulary';
import { DangerZone, DangerZoneRow } from '@/components/common/DangerZone';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import type { AgentVersionSnapshotApi } from '@/services/control-plane/agentApi';
import { formatAgentTimestamp, isSystemProvidedAgent, statusTone } from '@/pages/WorkspaceAgentsPage.helpers';
import { AppPaths } from '@/utils/routes';
import { AgentCapabilitiesPanel } from '@/pages/agents/AgentCapabilitiesPanel';
import { Select } from '@/components/common/Select';
import { InlineConfirmation } from '@/components/common/InlineConfirmation';
import type { WorkflowOption } from '@/services/control-plane/workflowApi';

export type AgentProfileTab = 'overview' | 'capabilities' | 'activity' | 'versions' | 'settings';

export const agentProfileTabs: AgentProfileTab[] = ['overview', 'capabilities', 'activity', 'versions', 'settings'];

interface WorkspaceAgentDetailPanelProps {
  selectedAgent: AgentDefinition;
  activeTab: AgentProfileTab;
  onTabChange: (tab: AgentProfileTab) => void;
  titleId?: string;
  canManageAgents: boolean;
  canManageMcp: boolean;
  canManageSkills: boolean;
  testingAgentId: string;
  updatingAgentId: string;
  duplicatingAgentId: string;
  agentVersionAction: string;
  agentActivityAction: string;
  disableConfirmAgentId: string;
  setDisableConfirmAgentId: React.Dispatch<React.SetStateAction<string>>;
  deleteConfirmAgentId: string;
  setDeleteConfirmAgentId: React.Dispatch<React.SetStateAction<string>>;
  agentVersionHistories: Record<string, AgentVersionSnapshotApi[]>;
  targetOptions: WorkflowOption[];
  runTargetId: string;
  onRunTargetChange: (targetId: string) => void;
  onTestSelectedAgent: () => void;
  onOpenEditAgentDrawer: (agent: AgentDefinition) => void;
  onDuplicateSelectedAgent: () => void;
  onSaveSelectedAgentVersion: () => void;
  onReactivateSelectedAgent: () => void;
  onDisableSelectedAgent: () => void;
  onDeleteSelectedAgent: () => void;
  onRefreshSelectedAgentVersions: () => void;
  onRestoreSelectedAgentVersion: (version: AgentVersionSnapshotApi) => void;
  onRefreshSelectedAgentActivity: () => void;
}

const workflowHref = (agent: AgentDefinition, workflow: string) => `${AppPaths.workspaceWorkflows(agent.workspaceId)}?${new URLSearchParams({ workflow }).toString()}`;

const Fact: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0 py-3">
    <dt className="type-micro-label text-ui-text-muted">{label}</dt>
    <dd className="mt-1 min-w-0 break-words text-sm font-semibold text-ui-text">{value}</dd>
  </div>
);

export const WorkspaceAgentDetailPanel: React.FC<WorkspaceAgentDetailPanelProps> = (props) => {
  const { t, i18n } = useTranslation();
  const { selectedAgent } = props;
  const systemProvided = isSystemProvidedAgent(selectedAgent);
  const requiresRunTarget = selectedAgent.semanticCapabilityIds.includes('target.diagnostics.read');
  const exactTargetIds = new Set(selectedAgent.targetScope.filter((token) => token.startsWith('target:')).map((token) => token.slice(7)));
  const targetTypes = new Set(selectedAgent.targetScope.filter((token) => token.startsWith('target-type:')).map((token) => token.slice(12)));
  const runTargetOptions = props.targetOptions.filter((target) => (
    (!exactTargetIds.size || exactTargetIds.has(target.value))
    && (!targetTypes.size || Boolean(target.provenance?.targetType && targetTypes.has(target.provenance.targetType)))
  ));
  const locale = i18n.resolvedLanguage || i18n.language;
  const disabledAction = !props.canManageAgents ? t('agentsWorkflows.agents.details.managePermission') : '';
  const versions = props.agentVersionHistories[selectedAgent.id] || [];
  const tabItems = React.useMemo<Array<CompactControlItem<AgentProfileTab>>>(() => agentProfileTabs.map((value) => ({
    value,
    label: t(`agentsWorkflows.agents.details.tabs.${value}`)
  })), [t]);
  const [restoreConfirmVersionId, setRestoreConfirmVersionId] = React.useState('');
  const disableTriggerRef = React.useRef<HTMLButtonElement>(null);
  const deleteTriggerRef = React.useRef<HTMLButtonElement>(null);
  const restoreTriggerRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const versionsHeadingRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => {
    setRestoreConfirmVersionId('');
  }, [props.activeTab, selectedAgent.id]);

  const closeConfirmation = (
    close: () => void,
    trigger: React.RefObject<HTMLButtonElement | null> | HTMLButtonElement | undefined
  ) => {
    close();
    window.requestAnimationFrame(() => {
      const target = trigger && 'current' in trigger
        ? trigger.current
        : trigger as HTMLButtonElement | undefined;
      target?.focus({ preventScroll: true });
    });
  };

  const permissionModeLabel = t(`agentsWorkflows.agents.details.permissionMode.${selectedAgent.permissionMode}`);
  const approvalGateLabel = t(`agentsWorkflows.agents.details.approvalGate.${selectedAgent.permissionMode}`);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-ui-surface">
      <header className={`border-b border-ui-border px-5 py-5 pr-16 ${selectedAgent.status === 'disabled' ? 'bg-status-danger-soft/35' : selectedAgent.status === 'draft' ? 'bg-status-warning-soft/30' : 'bg-ui-surface'}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={statusTone(selectedAgent.status)}>{t(`agentsWorkflows.agents.status.${selectedAgent.status}`)}</StatusBadge>
              {systemProvided && (
                <span className="type-micro-label shrink-0 rounded-full bg-accent-soft/45 px-2 py-0.5 text-accent-readable">
                  {t('common.providedByAcornOps')}
                </span>
              )}
              {!systemProvided && <span className="type-caption font-semibold text-ui-text-muted">{selectedAgent.owner}</span>}
            </div>
            <h2 id={props.titleId} className="mt-2 type-section-title">{selectedAgent.name}</h2>
            <p className="type-caption mt-1 max-w-3xl text-ui-text-muted">{selectedAgent.description}</p>
            {selectedAgent.status === 'disabled' && <p className="type-caption mt-2 font-semibold text-status-danger-text">{t('agentsWorkflows.agents.details.disabledStatus')}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {selectedAgent.status === 'disabled' && <Button type="button" variant="secondary" size="sm" onClick={props.onReactivateSelectedAgent} disabled={!props.canManageAgents || props.updatingAgentId === selectedAgent.id}>{t('agentsWorkflows.agents.reactivate')}</Button>}
            {systemProvided ? (
              <Button type="button" variant="primary" size="sm" onClick={props.onDuplicateSelectedAgent} disabled={!props.canManageAgents || props.duplicatingAgentId === selectedAgent.id}>{props.duplicatingAgentId === selectedAgent.id ? t('agentsWorkflows.duplicating') : t('agentsWorkflows.duplicate')}</Button>
            ) : (
              <Button type="button" variant="primary" size="sm" onClick={() => props.onOpenEditAgentDrawer(selectedAgent)} disabled={!props.canManageAgents || props.updatingAgentId === selectedAgent.id}><ICONS.Pencil className="h-4 w-4" />{t('agentsWorkflows.agents.edit')}</Button>
            )}
          </div>
        </div>
        {systemProvided && <p className="type-caption mt-3 max-w-3xl text-ui-text-muted">{t('agentsWorkflows.duplicateToEdit')}</p>}
        {disabledAction && <p className="type-caption mt-3 text-ui-text-muted">{disabledAction}</p>}
      </header>

      <SegmentedTabs
        activeValue={props.activeTab}
        allPanelsMounted={false}
        ariaLabel={t('agentsWorkflows.agents.details.profileSections')}
        className="px-3"
        idBase="agent-profile"
        items={tabItems}
        onValueChange={props.onTabChange}
      />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {props.activeTab === 'overview' && (
          <div id="agent-profile-overview-panel" role="tabpanel" tabIndex={0} aria-labelledby="agent-profile-overview-tab" className="space-y-7 focus:outline-none">
            <section>
              <h3 className="type-panel-title">{t('agentsWorkflows.agents.details.identityAssignment')}</h3>
              <dl className="mt-2 grid divide-y divide-ui-border sm:grid-cols-2 sm:gap-x-8 sm:[&>*]:border-b sm:[&>*]:border-ui-border">
                <Fact label={t('agentsWorkflows.agents.details.owner')} value={selectedAgent.owner} />
                <Fact label={t('agentsWorkflows.agents.details.source')} value={systemProvided ? t('agentsWorkflows.systemProvided') : t('agentsWorkflows.definitionSource.user')} />
                <Fact label={t('agentsWorkflows.agents.details.kind')} value={t(`agentsWorkflows.agents.details.kindValue.${selectedAgent.kind}`)} />
                <Fact label={t('agentsWorkflows.agents.details.status')} value={t(`agentsWorkflows.agents.status.${selectedAgent.status}`)} />
                <Fact label={t('agentsWorkflows.agents.details.provider')} value={t(`agentsWorkflows.agents.details.providerValue.${selectedAgent.providerType}`)} />
                <Fact label={t('agentsWorkflows.agents.details.lastActivity')} value={formatAgentTimestamp(selectedAgent.activity.lastRunAt, t('agentsWorkflows.agents.details.noActivity'), locale)} />
              </dl>
            </section>
            <section className="border-t border-ui-border pt-6">
              <h3 className="type-panel-title">{t('agentsWorkflows.agents.details.assignedWorkflows')}</h3>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {selectedAgent.workflowsUsingAgent.length ? selectedAgent.workflowsUsingAgent.map((workflow) => <a key={workflow} href={workflowHref(selectedAgent, workflow)} className="text-sm font-semibold text-accent-strong underline-offset-4 hover:underline">{workflow}</a>) : <span className="type-caption text-ui-text-muted">{t('agentsWorkflows.agents.details.noAssignedWorkflows')}</span>}
              </div>
            </section>
            <section className="border-t border-ui-border pt-6">
              <h3 className="type-panel-title">{t('agentsWorkflows.agents.details.scopePolicy')}</h3>
              <dl className="mt-2 grid divide-y divide-ui-border sm:grid-cols-2 sm:gap-x-8 sm:[&>*]:border-b sm:[&>*]:border-ui-border">
                <Fact label={t('agentsWorkflows.agents.details.targetScope')} value={selectedAgent.targetScope.join(', ') || t('agentsWorkflows.agents.details.noTargetScope')} />
                <Fact label={t('agentsWorkflows.agents.details.contextScope')} value={selectedAgent.contextScope.join(', ') || t('agentsWorkflows.agents.details.noContextScope')} />
                <Fact label={t('agentsWorkflows.agents.details.permissionModeLabel')} value={permissionModeLabel} />
                <Fact label={t('agentsWorkflows.agents.details.approvalGateLabel')} value={approvalGateLabel} />
                <Fact label={t('agentsWorkflows.agents.details.trustBoundary')} value={selectedAgent.trustPolicy.boundary} />
                <Fact label={t('agentsWorkflows.agents.details.dataAccess')} value={selectedAgent.trustPolicy.dataEgress} />
              </dl>
            </section>
          </div>
        )}

        {props.activeTab === 'capabilities' && (
          <div id="agent-profile-capabilities-panel" role="tabpanel" tabIndex={0} aria-labelledby="agent-profile-capabilities-tab" className="space-y-7 focus:outline-none">
            <AgentCapabilitiesPanel
              agent={selectedAgent}
              canManageAgents={props.canManageAgents}
              canManageMcp={props.canManageMcp}
              canManageSkills={props.canManageSkills}
            />
          </div>
        )}

        {props.activeTab === 'activity' && (
          <section id="agent-profile-activity-panel" role="tabpanel" tabIndex={0} aria-labelledby="agent-profile-activity-tab" className="focus:outline-none">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="type-panel-title">{t('agentsWorkflows.agents.details.activityHistory')}</h3><p className="type-caption mt-1 text-ui-text-muted">{t('agentsWorkflows.agents.details.activityDescription')}</p></div>
              <div className="flex flex-wrap items-end gap-2">
                {requiresRunTarget && <label className="min-w-56"><span className="type-micro-label">{t('agentsWorkflows.agents.details.runTarget')}</span><Select<string> ariaLabel={t('agentsWorkflows.agents.details.agentRunTarget')} className="mt-1" value={props.runTargetId} options={[{ value: '', label: t('agentsWorkflows.agents.details.selectTarget') }, ...runTargetOptions.map((target) => ({ value: target.value, label: target.label, disabled: target.disabled }))]} onChange={props.onRunTargetChange} /></label>}
                <Button type="button" variant="secondary" size="sm" onClick={props.onRefreshSelectedAgentActivity} disabled={props.agentActivityAction === selectedAgent.id}>
                  <ICONS.RefreshCw className={`h-4 w-4 ${props.agentActivityAction === selectedAgent.id ? 'animate-spin' : ''}`} aria-hidden="true" />
                  {props.agentActivityAction === selectedAgent.id ? t('agentsWorkflows.agents.details.refreshing') : t('common.refresh')}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={props.onTestSelectedAgent} disabled={!props.canManageAgents || props.testingAgentId === selectedAgent.id || (requiresRunTarget && !props.runTargetId)}><ICONS.Activity className="h-4 w-4" aria-hidden="true" />{props.testingAgentId === selectedAgent.id ? t('agentsWorkflows.agents.details.queuing') : t('agentsWorkflows.agents.details.runAgent')}</Button>
              </div>
            </div>
            <ol className="mt-4 divide-y divide-ui-border border-y border-ui-border">
              {selectedAgent.auditHistory.length ? selectedAgent.auditHistory.map((entry) => <li key={entry.id} className="grid gap-1 py-3 sm:grid-cols-[11rem_minmax(0,1fr)]"><time className="type-caption font-semibold text-ui-text-muted">{formatAgentTimestamp(entry.occurredAt, entry.occurredAt, locale)}</time><span className="text-sm font-semibold text-ui-text">{entry.summary}</span></li>) : <li className="py-5 text-sm text-ui-text-muted">{t('agentsWorkflows.agents.details.noActivityRecords')}</li>}
            </ol>
          </section>
        )}

        {props.activeTab === 'versions' && (
          <section id="agent-profile-versions-panel" role="tabpanel" tabIndex={0} aria-labelledby="agent-profile-versions-tab" className="focus:outline-none">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 ref={versionsHeadingRef} tabIndex={-1} className="type-panel-title outline-none">{t('agentsWorkflows.agents.details.restorePoints')}</h3>
                <p className="type-caption mt-1 text-ui-text-muted">{t(systemProvided ? 'agentsWorkflows.agents.details.systemRestorePointsDescription' : 'agentsWorkflows.agents.details.customRestorePointsDescription')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={props.onRefreshSelectedAgentVersions} disabled={props.agentVersionAction === `${selectedAgent.id}:history`}><ICONS.RefreshCw className={`h-4 w-4 ${props.agentVersionAction === `${selectedAgent.id}:history` ? 'animate-spin' : ''}`} aria-hidden="true" />{t('common.refresh')}</Button>
                {!systemProvided && <Button type="button" variant="secondary" size="sm" onClick={props.onSaveSelectedAgentVersion} disabled={!props.canManageAgents || props.agentVersionAction === selectedAgent.id}><ICONS.Save className="h-4 w-4" aria-hidden="true" />{props.agentVersionAction === selectedAgent.id ? t('agentsWorkflows.agents.details.saving') : t('agentsWorkflows.agents.details.saveRestorePoint')}</Button>}
              </div>
            </div>
            <div className="mt-4 divide-y divide-ui-border border-y border-ui-border">
              {versions.length ? versions.map((version) => (
                <div key={version.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span><strong className="text-sm text-ui-text">{t('agentsWorkflows.agents.details.revisionLabel', { version: version.version })}</strong><span className="type-caption ml-3 text-ui-text-muted">{formatAgentTimestamp(version.createdAt, version.createdAt, locale)}</span></span>
                    {!systemProvided && (
                      <Button
                        ref={(node) => { if (node) restoreTriggerRefs.current.set(version.id, node); else restoreTriggerRefs.current.delete(version.id); }}
                        type="button"
                        variant="tertiary"
                        size="sm"
                        onClick={() => setRestoreConfirmVersionId(version.id)}
                        disabled={!props.canManageAgents || props.agentVersionAction === `${selectedAgent.id}:restore:${version.id}`}
                      >
                        {t('agentsWorkflows.agents.details.restore')}
                      </Button>
                    )}
                  </div>
                  {restoreConfirmVersionId === version.id && (
                    <InlineConfirmation
                      id={`agent-restore-${version.id}`}
                      title={t('agentsWorkflows.agents.details.restoreConfirmationTitle', { version: version.version })}
                      description={t('agentsWorkflows.agents.details.restoreConfirmationDescription')}
                      tone="warning"
                      cancelLabel={t('common.cancel')}
                      confirmLabel={t('agentsWorkflows.agents.details.confirmRestore')}
                      confirmDisabled={props.agentVersionAction === `${selectedAgent.id}:restore:${version.id}`}
                      onCancel={() => closeConfirmation(() => setRestoreConfirmVersionId(''), restoreTriggerRefs.current.get(version.id))}
                      onConfirm={() => {
                        props.onRestoreSelectedAgentVersion(version);
                        setRestoreConfirmVersionId('');
                        window.requestAnimationFrame(() => versionsHeadingRef.current?.focus({ preventScroll: true }));
                      }}
                    />
                  )}
                </div>
              )) : <p className="py-5 text-sm text-ui-text-muted">{t('agentsWorkflows.agents.details.noRestorePoints')}</p>}
            </div>
          </section>
        )}

        {props.activeTab === 'settings' && (
          <section id="agent-profile-settings-panel" role="tabpanel" tabIndex={0} aria-labelledby="agent-profile-settings-tab" className="focus:outline-none">
            <div>
              <h3 className="type-panel-title">{t('agentsWorkflows.agents.details.agentLifecycle')}</h3>
              <p className="type-caption mt-1 text-ui-text-muted">{t('agentsWorkflows.agents.details.lifecycleDescription')}</p>
            </div>
            <DangerZone className="mt-4">
              {selectedAgent.status !== 'disabled' && (
                <DangerZoneRow
                  id="agent-disable-title"
                  title={t('agentsWorkflows.agents.details.disableAgent')}
                  description={t('agentsWorkflows.agents.details.disableDescription')}
                  headingLevel="h3"
                  actionClassName="sm:w-44"
                  action={(
                    <Button
                      ref={disableTriggerRef}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => props.setDisableConfirmAgentId(selectedAgent.id)}
                      disabled={!props.canManageAgents || props.updatingAgentId === selectedAgent.id}
                    >
                      {t('agentsWorkflows.agents.details.disableAgent')}
                    </Button>
                  )}
                />
              )}
              {props.disableConfirmAgentId === selectedAgent.id && (
                <InlineConfirmation
                  id="agent-disable-confirmation"
                  title={t('agentsWorkflows.agents.details.confirmDisableTitle')}
                  description={t('agentsWorkflows.agents.details.disableImpact', { count: selectedAgent.workflowsUsingAgent.length })}
                  tone="warning"
                  cancelLabel={t('common.cancel')}
                  confirmLabel={t('agentsWorkflows.agents.details.confirmDisable')}
                  confirmDisabled={props.updatingAgentId === selectedAgent.id}
                  onCancel={() => closeConfirmation(() => props.setDisableConfirmAgentId(''), disableTriggerRef)}
                  onConfirm={props.onDisableSelectedAgent}
                />
              )}
              <DangerZoneRow
                id="agent-delete-title"
                title={t('agentsWorkflows.agents.details.deleteAgent')}
                description={systemProvided
                  ? t('agentsWorkflows.agents.details.deleteSystemDescription')
                  : t('agentsWorkflows.agents.details.deleteCustomDescription')}
                headingLevel="h3"
                tone="danger"
                actionClassName="sm:w-44"
                detail={selectedAgent.workflowsUsingAgent.length > 0 ? (
                  <p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-status-danger-text">
                    {t('agentsWorkflows.agents.details.deleteBlocked', { count: selectedAgent.workflowsUsingAgent.length })}
                  </p>
                ) : undefined}
                action={(
                  <Button
                    ref={deleteTriggerRef}
                    type="button"
                    variant="danger"
                    size="sm"
                    className="w-full"
                    onClick={() => props.setDeleteConfirmAgentId(selectedAgent.id)}
                    disabled={!props.canManageAgents || props.updatingAgentId === selectedAgent.id || selectedAgent.workflowsUsingAgent.length > 0}
                  >
                    {t('agentsWorkflows.agents.details.deleteAgent')}
                  </Button>
                )}
              />
              {props.deleteConfirmAgentId === selectedAgent.id && (
                <InlineConfirmation
                  id="agent-delete-confirmation"
                  title={t('agentsWorkflows.agents.details.confirmDeleteTitle')}
                  description={t(systemProvided ? 'agentsWorkflows.agents.details.confirmDeleteSystem' : 'agentsWorkflows.agents.details.confirmDeleteCustom')}
                  tone="danger"
                  cancelLabel={t('common.cancel')}
                  confirmLabel={t('agentsWorkflows.agents.details.deleteAgent')}
                  confirmVariant="danger"
                  confirmDisabled={props.updatingAgentId === selectedAgent.id}
                  onCancel={() => closeConfirmation(() => props.setDeleteConfirmAgentId(''), deleteTriggerRef)}
                  onConfirm={props.onDeleteSelectedAgent}
                />
              )}
            </DangerZone>
          </section>
        )}
      </div>
    </section>
  );
};
