import React, { useMemo, useState } from 'react';
import { Button } from '@/components/common/Button';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { SelectOption } from '@/components/common/Select';
import { ICONS } from '@/constants';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import {
  createDefaultAgentDefinitions,
  filterAgentDefinitions,
  getAgentReadinessLabel,
  getAgentReviewSignals,
  targetScopeFromTokens,
  type AgentDefinition
} from '@/pages/agents/agentModel';
import { AgentReviewQueue, WorkspaceAgentsCatalog, type ReviewFilter } from '@/pages/WorkspaceAgentsCatalog';
import { WorkspaceAgentDetailPanel } from '@/pages/WorkspaceAgentDetailPanel';
import { CreateAgentDrawer, EditAgentDrawer } from '@/pages/WorkspaceAgentsDrawers';
import {
  canManageWorkspaceAgents,
  createAgentEditDraft,
  createFallbackAgentCapabilityOptions,
  getAgentEditChangeSummary,
  mapApiAgent,
  normalizeAgentCapabilityOptions,
  Notice,
  splitInput,
  type AgentCapabilityOptions,
  type AgentDraft,
  type AgentEditDraft,
  type EventTriggerType,
  type LocalNotice,
  type WorkspaceAgentsPageProps
} from '@/pages/WorkspaceAgentsPage.helpers';
import {
  createAgent as createWorkspaceAgent,
  createAgentTrigger,
  createAgentVersion as createWorkspaceAgentVersion,
  deleteAgent as deleteWorkspaceAgent,
  deleteAgentTrigger,
  listAgentActivity,
  listAgentVersions,
  listWorkspaceAgents,
  restoreAgentVersion,
  testAgent as testWorkspaceAgent,
  updateAgent as updateWorkspaceAgent,
  updateAgentTrigger,
  type AgentActivityRecordApi,
  type AgentTriggerDefinitionApi,
  type AgentVersionSnapshotApi
} from '@/services/control-plane/agentApi';
import { listWorkflowOptions } from '@/services/control-plane/workflowApi';
import type { ProjectMember } from '@/types';

export const WorkspaceAgentsPage: React.FC<WorkspaceAgentsPageProps> = ({ workspace }) => {
  const fallbackAgents = useMemo(() => createDefaultAgentDefinitions(workspace.id), [workspace.id]);
  const fallbackCapabilityOptions = useMemo(() => createFallbackAgentCapabilityOptions(fallbackAgents), [fallbackAgents]);
  const [agents, setAgents] = useState<AgentDefinition[]>(fallbackAgents);
  const [agentCapabilityOptions, setAgentCapabilityOptions] = useState<AgentCapabilityOptions>(fallbackCapabilityOptions);
  const [ownerUserOptions, setOwnerUserOptions] = useState<ProjectMember[]>(workspace.members || []);
  const [selectedAgentId, setSelectedAgentId] = useState(fallbackAgents[0]?.id || '');
  const [query, setQuery] = useState('');
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [agentLoadError, setAgentLoadError] = useState('');
  const [agentCapabilityLoadError, setAgentCapabilityLoadError] = useState('');
  const [ownerUserLoadError, setOwnerUserLoadError] = useState('');
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState('');
  const [createDraft, setCreateDraft] = useState<AgentDraft>({ name: '', description: '', instructions: '', providerType: 'internal' });
  const [editDraft, setEditDraft] = useState<AgentEditDraft | null>(null);
  const [draftMcpServers, setDraftMcpServers] = useState('');
  const [draftTools, setDraftTools] = useState('');
  const [draftSkills, setDraftSkills] = useState('');
  const [localNotice, setLocalNotice] = useState<LocalNotice | null>(null);
  const [testingAgentId, setTestingAgentId] = useState('');
  const [agentCompiledScopePreviews, setAgentCompiledScopePreviews] = useState<Record<string, Record<string, unknown>>>({});
  const [agentVersionHistories, setAgentVersionHistories] = useState<Record<string, AgentVersionSnapshotApi[]>>({});
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [updatingAgentId, setUpdatingAgentId] = useState('');
  const [agentVersionAction, setAgentVersionAction] = useState('');
  const [agentActivityAction, setAgentActivityAction] = useState('');
  const [agentTriggerAction, setAgentTriggerAction] = useState('');
  const [disableConfirmAgentId, setDisableConfirmAgentId] = useState('');
  const [deleteConfirmAgentId, setDeleteConfirmAgentId] = useState('');
  const [newManualTriggerName, setNewManualTriggerName] = useState('');
  const [newScheduleTriggerName, setNewScheduleTriggerName] = useState('');
  const [newScheduleTriggerCron, setNewScheduleTriggerCron] = useState('');
  const [newScheduleTriggerTimezone, setNewScheduleTriggerTimezone] = useState('UTC');
  const [newEventTriggerName, setNewEventTriggerName] = useState('');
  const [newEventTriggerType, setNewEventTriggerType] = useState<EventTriggerType>('webhook');
  const [newEventTriggerFilter, setNewEventTriggerFilter] = useState('');
  const canManageAgents = canManageWorkspaceAgents(workspace);
  React.useEffect(() => {
    let mounted = true;
    setAgents(fallbackAgents);
    setSelectedAgentId((current) => current || fallbackAgents[0]?.id || '');
    setAgentLoadError('');
    listWorkspaceAgents(workspace.id, { includeInactive: true })
      .then((items) => {
        if (!mounted || items.length === 0) return;
        const mapped = items.map((item, index) => mapApiAgent(item, fallbackAgents[index % fallbackAgents.length], workspace.name));
        setAgents(mapped);
        setSelectedAgentId((current) => mapped.some((agent) => agent.id === current) ? current : mapped[0].id);
      })
      .catch((error) => {
        if (mounted) setAgentLoadError(error instanceof Error ? error.message : 'Unable to load workspace agents');
      });
    return () => {
      mounted = false;
    };
  }, [fallbackAgents, workspace.id, workspace.name]);
  React.useEffect(() => {
    let mounted = true;
    setAgentCapabilityOptions(fallbackCapabilityOptions);
    setAgentCapabilityLoadError('');
    listWorkflowOptions(workspace.id)
      .then((catalog) => {
        if (mounted) setAgentCapabilityOptions(normalizeAgentCapabilityOptions(catalog, fallbackCapabilityOptions));
      })
      .catch((error) => {
        if (mounted) setAgentCapabilityLoadError(error instanceof Error ? error.message : 'Unable to load capability options');
      });
    return () => {
      mounted = false;
    };
  }, [fallbackCapabilityOptions, workspace.id]);
  React.useEffect(() => {
    let mounted = true;
    setOwnerUserOptions(workspace.members || []);
    setOwnerUserLoadError('');
    if (workspace.permissions?.read_members !== true) {
      return () => {
        mounted = false;
      };
    }
    controlPlaneApi.listWorkspaceMembers(workspace.id, { limit: 50 })
      .then((page) => {
        if (mounted) setOwnerUserOptions(page.items);
      })
      .catch((error) => {
        if (mounted) setOwnerUserLoadError(error instanceof Error ? error.message : 'Unable to load workspace members');
      });
    return () => {
      mounted = false;
    };
  }, [workspace.id, workspace.members, workspace.permissions?.read_members]);
  const visibleAgents = useMemo(() => {
    const queriedAgents = filterAgentDefinitions(agents, query);
    if (reviewFilter === 'all') return queriedAgents;
    return queriedAgents.filter((agent) => {
      if (reviewFilter === 'attention') return getAgentReadinessLabel(agent) !== 'Ready';
      if (reviewFilter === 'production') return getAgentReviewSignals(agent).includes('Broad target scope');
      if (reviewFilter === 'write_gated') return agent.approvalPolicy.writeActions === 'approval_required';
      return agent.workflowsUsingAgent.length === 0;
    });
  }, [agents, query, reviewFilter]);
  const selectedAgent = visibleAgents.find((agent) => agent.id === selectedAgentId) || visibleAgents[0] || agents[0];
  const reviewQueue = useMemo(() => {
    const agentsNeedingAttention = agents.filter((agent) => getAgentReadinessLabel(agent) !== 'Ready').length;
    const broadTargetScope = agents.filter((agent) => getAgentReviewSignals(agent).includes('Broad target scope')).length;
    const staleReadiness = agents.filter((agent) => getAgentReviewSignals(agent).includes('No recent readiness test')).length;
    const disabledReferenced = agents.filter((agent) => agent.status === 'disabled' && agent.workflowsUsingAgent.length > 0).length;
    return { agentsNeedingAttention, broadTargetScope, staleReadiness, disabledReferenced };
  }, [agents]);
  const selectedCompiledScopePreview = selectedAgent ? agentCompiledScopePreviews[selectedAgent.id] : undefined;
  const editingAgent = editPanelOpen ? agents.find((agent) => agent.id === editingAgentId) : undefined;
  const editChangeSummary = editingAgent && editDraft ? getAgentEditChangeSummary(editingAgent, editDraft) : [];
  const ownerSelectOptions = useMemo<Array<SelectOption<string>>>(() => [
    { value: '', label: 'Keep current owner' },
    ...ownerUserOptions
      .filter((member) => Boolean(member.userId))
      .map((member) => ({ value: member.userId as string, label: `${member.name || member.email} (${member.role})` }))
  ], [ownerUserOptions]);
  React.useEffect(() => {
    if (!selectedAgent) return;
    let mounted = true;
    listAgentVersions(workspace.id, selectedAgent.id)
      .then((versions) => {
        if (mounted) setAgentVersionHistories((current) => ({ ...current, [selectedAgent.id]: versions }));
      })
      .catch(() => {
        if (mounted) setAgentVersionHistories((current) => ({ ...current, [selectedAgent.id]: current[selectedAgent.id] || [] }));
      });
    return () => {
      mounted = false;
    };
  }, [selectedAgent?.id, workspace.id]);
  const updateSelectedAgent = (agentId: string, updater: (agent: AgentDefinition) => AgentDefinition) => {
    setAgents((current) => current.map((agent) => agent.id === agentId ? updater(agent) : agent));
  };
  const testSelectedAgent = async () => {
    if (!selectedAgent || !canManageAgents) return;
    setTestingAgentId(selectedAgent.id);
    setLocalNotice(null);
    try {
      const result = await testWorkspaceAgent(workspace.id, selectedAgent.id, {
        approvedContextGrants: selectedAgent.contextScope,
        inputContext: { source: 'management_console' }
      });
      setAgentCompiledScopePreviews((current) => ({ ...current, [selectedAgent.id]: result.compiledScope }));
      setLocalNotice({ tone: 'success', message: `Readiness test queued for ${selectedAgent.name}. Check recent activity for ${result.activity.id}.` });
      updateSelectedAgent(selectedAgent.id, (agent) => ({
        ...agent,
        auditHistory: [{ id: result.activity.id, summary: `Test run ${result.activity.status}`, occurredAt: result.activity.createdAt }, ...agent.auditHistory],
        health: { status: 'healthy', summary: `Test queued ${result.activity.createdAt}` }
      }));
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Readiness test could not be queued.' });
    } finally {
      setTestingAgentId('');
    }
  };
  const resetCreateAgentDraft = () => {
    setCreateDraft({ name: '', description: '', instructions: '', providerType: 'internal' });
    setDraftMcpServers('');
    setDraftTools('');
    setDraftSkills('');
  };
  const closeCreateAgentDrawer = () => setCreatePanelOpen(false);
  const handleCreateAgentDrawerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') closeCreateAgentDrawer();
  };
  const closeEditAgentDrawer = () => {
    setEditPanelOpen(false);
    setEditingAgentId('');
    setEditDraft(null);
  };
  const handleEditAgentDrawerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') closeEditAgentDrawer();
  };
  const openEditAgentDrawer = (agent: AgentDefinition) => {
    setEditingAgentId(agent.id);
    setEditDraft(createAgentEditDraft(agent));
    setEditPanelOpen(true);
  };
  const reviewSelectedAgentAccess = () => {
    document.getElementById('agent-access-policy')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  const saveSelectedAgentVersion = async () => {
    if (!selectedAgent || !canManageAgents) return;
    setAgentVersionAction(selectedAgent.id);
    setLocalNotice(null);
    try {
      const version = await createWorkspaceAgentVersion(workspace.id, selectedAgent.id);
      setAgentVersionHistories((current) => ({ ...current, [selectedAgent.id]: [version, ...(current[selectedAgent.id] || []).filter((item) => item.id !== version.id)] }));
      updateSelectedAgent(selectedAgent.id, (agent) => ({
        ...agent,
        version: version.version,
        auditHistory: [{ id: version.id, summary: `Version snapshot saved as v${version.version}.`, occurredAt: version.createdAt }, ...agent.auditHistory]
      }));
      setLocalNotice({ tone: 'success', message: `Saved v${version.version} as the current rollback point.` });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not save a version snapshot for this agent.' });
    } finally {
      setAgentVersionAction('');
    }
  };
  const refreshSelectedAgentVersions = async () => {
    if (!selectedAgent) return;
    setAgentVersionAction(`${selectedAgent.id}:history`);
    setLocalNotice(null);
    try {
      const versions = await listAgentVersions(workspace.id, selectedAgent.id);
      setAgentVersionHistories((current) => ({ ...current, [selectedAgent.id]: versions }));
      setLocalNotice({ tone: 'success', message: 'Version history refreshed.' });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not refresh version history.' });
    } finally {
      setAgentVersionAction('');
    }
  };
  const restoreSelectedAgentVersion = async (version: AgentVersionSnapshotApi) => {
    if (!selectedAgent || !canManageAgents) return;
    setAgentVersionAction(`${selectedAgent.id}:restore:${version.id}`);
    setLocalNotice(null);
    try {
      const restored = await restoreAgentVersion(workspace.id, selectedAgent.id, version.id);
      const mapped = mapApiAgent(restored, selectedAgent, workspace.name);
      setAgents((current) => current.map((agent) => agent.id === mapped.id ? {
        ...mapped,
        auditHistory: [{ id: `${version.id}:restore`, summary: `Restored from saved v${version.version}.`, occurredAt: new Date().toISOString() }, ...agent.auditHistory]
      } : agent));
      setSelectedAgentId(mapped.id);
      setLocalNotice({ tone: 'success', message: `Restored v${version.version}. Run readiness before assigning this agent to workflows.` });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not restore that version.' });
    } finally {
      setAgentVersionAction('');
    }
  };
  const activitySummary = (activity: AgentActivityRecordApi): string => `Activity ${activity.status} on v${activity.agentVersion}`;
  const refreshSelectedAgentActivity = async () => {
    if (!selectedAgent) return;
    setAgentActivityAction(selectedAgent.id);
    setLocalNotice(null);
    try {
      const activity = await listAgentActivity(workspace.id, selectedAgent.id);
      updateSelectedAgent(selectedAgent.id, (agent) => ({
        ...agent,
        auditHistory: activity.map((record) => ({ id: record.id, summary: activitySummary(record), occurredAt: record.updatedAt || record.createdAt }))
      }));
      setLocalNotice({ tone: 'success', message: 'Recent activity refreshed.' });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not refresh recent activity.' });
    } finally {
      setAgentActivityAction('');
    }
  };
  const createManualTrigger = async () => {
    if (!selectedAgent || !canManageAgents) return;
    setAgentTriggerAction(`${selectedAgent.id}:create`);
    setLocalNotice(null);
    try {
      const trigger = await createAgentTrigger(workspace.id, selectedAgent.id, { type: 'manual', enabled: true, name: newManualTriggerName.trim() || 'Manual run' });
      updateSelectedAgent(selectedAgent.id, (agent) => ({ ...agent, triggers: [trigger, ...agent.triggers] }));
      setNewManualTriggerName('');
      setLocalNotice({ tone: 'success', message: 'Manual trigger added and enabled.' });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not add the manual trigger.' });
    } finally {
      setAgentTriggerAction('');
    }
  };
  const createScheduleTrigger = async () => {
    if (!selectedAgent || !canManageAgents || !newScheduleTriggerCron.trim()) return;
    setAgentTriggerAction(`${selectedAgent.id}:schedule`);
    setLocalNotice(null);
    try {
      const trigger = await createAgentTrigger(workspace.id, selectedAgent.id, {
        type: 'schedule',
        enabled: true,
        name: newScheduleTriggerName.trim() || 'Scheduled run',
        schedule: { cron: newScheduleTriggerCron.trim(), timezone: newScheduleTriggerTimezone.trim() || 'UTC' }
      });
      updateSelectedAgent(selectedAgent.id, (agent) => ({ ...agent, triggers: [trigger, ...agent.triggers] }));
      setNewScheduleTriggerName('');
      setNewScheduleTriggerCron('');
      setNewScheduleTriggerTimezone('UTC');
      setLocalNotice({ tone: 'success', message: 'Scheduled trigger added and enabled.' });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not add the scheduled trigger.' });
    } finally {
      setAgentTriggerAction('');
    }
  };
  const createEventTrigger = async () => {
    if (!selectedAgent || !canManageAgents) return;
    let eventFilter: Record<string, unknown> | undefined;
    if (newEventTriggerFilter.trim()) {
      try {
        const parsed = JSON.parse(newEventTriggerFilter);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid');
        eventFilter = parsed as Record<string, unknown>;
      } catch {
        setLocalNotice({ tone: 'danger', message: 'Event filter must be a JSON object, for example {"eventType":"deployment.completed"}.' });
        return;
      }
    }
    setAgentTriggerAction(`${selectedAgent.id}:event`);
    setLocalNotice(null);
    try {
      const trigger = await createAgentTrigger(workspace.id, selectedAgent.id, {
        type: newEventTriggerType,
        enabled: true,
        name: newEventTriggerName.trim() || newEventTriggerType.replaceAll('_', ' '),
        eventFilter
      });
      updateSelectedAgent(selectedAgent.id, (agent) => ({ ...agent, triggers: [trigger, ...agent.triggers] }));
      setNewEventTriggerName('');
      setNewEventTriggerFilter('');
      setLocalNotice({ tone: 'success', message: 'Event trigger added and enabled.' });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not add the event trigger.' });
    } finally {
      setAgentTriggerAction('');
    }
  };
  const replaceAgentTrigger = (agent: AgentDefinition, trigger: AgentTriggerDefinitionApi): AgentDefinition => ({
    ...agent,
    triggers: agent.triggers.map((item) => item.id === trigger.id ? trigger : item)
  });
  const toggleAgentTrigger = async (trigger: AgentTriggerDefinitionApi) => {
    if (!selectedAgent || !canManageAgents) return;
    setAgentTriggerAction(`${selectedAgent.id}:${trigger.id}`);
    setLocalNotice(null);
    try {
      const updated = await updateAgentTrigger(workspace.id, selectedAgent.id, trigger.id, { enabled: !trigger.enabled });
      updateSelectedAgent(selectedAgent.id, (agent) => replaceAgentTrigger(agent, updated));
      setLocalNotice({ tone: 'success', message: updated.enabled ? 'Trigger enabled for this agent.' : 'Trigger disabled for this agent.' });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not update that trigger.' });
    } finally {
      setAgentTriggerAction('');
    }
  };
  const deleteAgentTriggerForSelectedAgent = async (trigger: AgentTriggerDefinitionApi) => {
    if (!selectedAgent || !canManageAgents) return;
    setAgentTriggerAction(`${selectedAgent.id}:${trigger.id}`);
    setLocalNotice(null);
    try {
      await deleteAgentTrigger(workspace.id, selectedAgent.id, trigger.id);
      updateSelectedAgent(selectedAgent.id, (agent) => ({ ...agent, triggers: agent.triggers.filter((item) => item.id !== trigger.id) }));
      setLocalNotice({ tone: 'success', message: 'Trigger deleted. Workflow assignments were not changed.' });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not delete that trigger.' });
    } finally {
      setAgentTriggerAction('');
    }
  };
  const disableSelectedAgent = async () => {
    if (!selectedAgent || !canManageAgents) return;
    setUpdatingAgentId(selectedAgent.id);
    setLocalNotice(null);
    try {
      const updated = await updateWorkspaceAgent(workspace.id, selectedAgent.id, { status: 'disabled' });
      updateSelectedAgent(selectedAgent.id, () => mapApiAgent(updated, selectedAgent, workspace.name));
      setDisableConfirmAgentId('');
      setLocalNotice({ tone: 'success', message: 'Agent disabled. Existing workflow assignments still reference it until you update them.' });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not disable this agent.' });
    } finally {
      setUpdatingAgentId('');
    }
  };
  const reactivateSelectedAgent = async () => {
    if (!selectedAgent || !canManageAgents) return;
    setUpdatingAgentId(selectedAgent.id);
    setLocalNotice(null);
    try {
      const updated = await updateWorkspaceAgent(workspace.id, selectedAgent.id, { status: 'active' });
      updateSelectedAgent(selectedAgent.id, () => mapApiAgent(updated, selectedAgent, workspace.name));
      setLocalNotice({ tone: 'success', message: 'Agent reactivated. Run readiness before assigning it to new workflows.' });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not reactivate this agent.' });
    } finally {
      setUpdatingAgentId('');
    }
  };
  const deleteSelectedAgent = async () => {
    if (!selectedAgent || !canManageAgents) return;
    setUpdatingAgentId(selectedAgent.id);
    setLocalNotice(null);
    try {
      await deleteWorkspaceAgent(workspace.id, selectedAgent.id);
      const remainingAgents = agents.filter((agent) => agent.id !== selectedAgent.id);
      setAgents(remainingAgents);
      setSelectedAgentId(remainingAgents[0]?.id || '');
      setDeleteConfirmAgentId('');
      setLocalNotice({ tone: 'success', message: 'Agent deleted. Workflow assignments were not changed.' });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not delete this agent.' });
    } finally {
      setUpdatingAgentId('');
    }
  };
  const createControlPlaneAgent = async () => {
    if (!createDraft.name.trim() || !createDraft.description.trim()) return;
    setCreatingAgent(true);
    setLocalNotice(null);
    try {
      const created = await createWorkspaceAgent(workspace.id, {
        name: createDraft.name.trim(),
        description: createDraft.description.trim(),
        instructions: createDraft.instructions.trim() || createDraft.description.trim(),
        providerType: createDraft.providerType,
        mcpServers: splitInput(draftMcpServers),
        tools: splitInput(draftTools),
        skills: splitInput(draftSkills),
        contextGrants: ['workspace_metadata'],
        approvalPolicy: { mode: 'before_write', writeToolsRequireApproval: true },
        trustPolicy: { level: 'restricted', allowExternalData: false }
      });
      const mapped = mapApiAgent(created, fallbackAgents[0], workspace.name);
      setAgents((current) => [mapped, ...current.filter((agent) => agent.id !== mapped.id)]);
      setSelectedAgentId(mapped.id);
      setLocalNotice({ tone: 'success', message: 'Agent saved with restricted trust and approval required for write tools.' });
      setCreatePanelOpen(false);
      resetCreateAgentDraft();
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not save this agent.' });
    } finally {
      setCreatingAgent(false);
    }
  };
  const saveAgentEdits = async () => {
    if (!editingAgent || !editDraft || !editDraft.name.trim() || !editDraft.description.trim()) return;
    setUpdatingAgentId(editingAgent.id);
    setLocalNotice(null);
    try {
      const updated = await updateWorkspaceAgent(workspace.id, editingAgent.id, {
        name: editDraft.name.trim(),
        description: editDraft.description.trim(),
        instructions: editDraft.instructions.trim() || editDraft.description.trim(),
        providerType: editDraft.providerType,
        status: editDraft.status,
        ownerUserId: editDraft.ownerUserId.trim() || undefined,
        mcpServers: splitInput(editDraft.mcpServers),
        tools: splitInput(editDraft.tools),
        skills: splitInput(editDraft.skills),
        targetScope: targetScopeFromTokens(splitInput(editDraft.targetScope)),
        contextGrants: splitInput(editDraft.contextScope),
        approvalPolicy: { mode: 'before_write', writeToolsRequireApproval: editDraft.writeToolsRequireApproval },
        trustPolicy: { level: 'restricted', allowExternalData: editDraft.allowExternalData }
      });
      const mappedOwner = ownerUserOptions.find((member) => member.userId === editDraft.ownerUserId.trim());
      const mapped = { ...mapApiAgent(updated, editingAgent, workspace.name), owner: mappedOwner?.name || mappedOwner?.email || updated.ownerUserId || editingAgent.owner };
      setAgents((current) => current.map((agent) => agent.id === mapped.id ? mapped : agent));
      setSelectedAgentId(mapped.id);
      setLocalNotice({ tone: 'success', message: 'Agent updated. Review affected workflows before the next run.' });
      closeEditAgentDrawer();
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not update this agent.' });
    } finally {
      setUpdatingAgentId('');
    }
  };

  return (
    <div className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="type-route-title">Agents</h1>
          <p className="type-body mt-3 max-w-2xl break-words text-ui-text-muted">Compare each agent's capability sources, target scope, and workflow impact before changing automation access.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PageSearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by agent, tool, skill, scope, provider" aria-label="Search agents" className="lg:w-80" />
          <Button type="button" variant="secondary" size="md" className="whitespace-nowrap" onClick={() => setCreatePanelOpen(true)} disabled={!canManageAgents}>
            <ICONS.Plus className="h-4 w-4" />
            Create agent
          </Button>
        </div>
      </header>

      {agentLoadError && <Notice>Control-plane agents did not load, so this page is showing the local catalog. Retry after control-plane access is restored.</Notice>}
      {agentCapabilityLoadError && <Notice>Capability catalog did not load; fields show IDs already attached to these agents.</Notice>}
      {ownerUserLoadError && <Notice>Workspace member list did not load; owner choices are limited to members already in this workspace view.</Notice>}
      {!canManageAgents && <div className="mb-4 rounded-md border border-ui-border bg-ui-surface px-3 py-2 text-xs font-semibold text-ui-text-muted">You can inspect agents, but need manage_agents permission to create or change them.</div>}
      {localNotice && (
        <div className={`mb-4 rounded-md border px-3 py-2 text-xs font-semibold ${localNotice.tone === 'danger' ? 'border-status-danger/30 bg-status-danger-soft text-status-danger-text' : 'border-status-success/30 bg-status-success-soft text-status-success-text'}`}>
          {localNotice.message}
        </div>
      )}

      {createPanelOpen && (
        <CreateAgentDrawer
          createDraft={createDraft}
          setCreateDraft={setCreateDraft}
          draftMcpServers={draftMcpServers}
          setDraftMcpServers={setDraftMcpServers}
          draftTools={draftTools}
          setDraftTools={setDraftTools}
          draftSkills={draftSkills}
          setDraftSkills={setDraftSkills}
          agentCapabilityOptions={agentCapabilityOptions}
          creatingAgent={creatingAgent}
          onClose={closeCreateAgentDrawer}
          onKeyDown={handleCreateAgentDrawerKeyDown}
          onReset={resetCreateAgentDraft}
          onSave={() => void createControlPlaneAgent()}
        />
      )}
      {editPanelOpen && editingAgent && editDraft && (
        <EditAgentDrawer
          editingAgent={editingAgent}
          editDraft={editDraft}
          setEditDraft={setEditDraft}
          ownerSelectOptions={ownerSelectOptions}
          agentCapabilityOptions={agentCapabilityOptions}
          editChangeSummary={editChangeSummary}
          updatingAgentId={updatingAgentId}
          onClose={closeEditAgentDrawer}
          onKeyDown={handleEditAgentDrawerKeyDown}
          onSave={() => void saveAgentEdits()}
        />
      )}

      <AgentReviewQueue reviewQueue={reviewQueue} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <WorkspaceAgentsCatalog
          agents={agents}
          visibleAgents={visibleAgents}
          selectedAgent={selectedAgent}
          reviewFilter={reviewFilter}
          onReviewFilterChange={setReviewFilter}
          onSelectedAgentChange={setSelectedAgentId}
        />

        {selectedAgent && (
          <WorkspaceAgentDetailPanel
            selectedAgent={selectedAgent}
            canManageAgents={canManageAgents}
            testingAgentId={testingAgentId}
            updatingAgentId={updatingAgentId}
            agentVersionAction={agentVersionAction}
            agentActivityAction={agentActivityAction}
            agentTriggerAction={agentTriggerAction}
            disableConfirmAgentId={disableConfirmAgentId}
            setDisableConfirmAgentId={setDisableConfirmAgentId}
            deleteConfirmAgentId={deleteConfirmAgentId}
            setDeleteConfirmAgentId={setDeleteConfirmAgentId}
            selectedCompiledScopePreview={selectedCompiledScopePreview}
            agentVersionHistories={agentVersionHistories}
            newManualTriggerName={newManualTriggerName}
            setNewManualTriggerName={setNewManualTriggerName}
            newScheduleTriggerName={newScheduleTriggerName}
            setNewScheduleTriggerName={setNewScheduleTriggerName}
            newScheduleTriggerCron={newScheduleTriggerCron}
            setNewScheduleTriggerCron={setNewScheduleTriggerCron}
            newScheduleTriggerTimezone={newScheduleTriggerTimezone}
            setNewScheduleTriggerTimezone={setNewScheduleTriggerTimezone}
            newEventTriggerName={newEventTriggerName}
            setNewEventTriggerName={setNewEventTriggerName}
            newEventTriggerType={newEventTriggerType}
            setNewEventTriggerType={setNewEventTriggerType}
            newEventTriggerFilter={newEventTriggerFilter}
            setNewEventTriggerFilter={setNewEventTriggerFilter}
            onTestSelectedAgent={() => void testSelectedAgent()}
            onReviewSelectedAgentAccess={reviewSelectedAgentAccess}
            onOpenEditAgentDrawer={openEditAgentDrawer}
            onSaveSelectedAgentVersion={() => void saveSelectedAgentVersion()}
            onReactivateSelectedAgent={() => void reactivateSelectedAgent()}
            onDisableSelectedAgent={() => void disableSelectedAgent()}
            onDeleteSelectedAgent={() => void deleteSelectedAgent()}
            onCreateManualTrigger={() => void createManualTrigger()}
            onCreateScheduleTrigger={() => void createScheduleTrigger()}
            onCreateEventTrigger={() => void createEventTrigger()}
            onToggleAgentTrigger={(trigger) => void toggleAgentTrigger(trigger)}
            onDeleteAgentTrigger={(trigger) => void deleteAgentTriggerForSelectedAgent(trigger)}
            onRefreshSelectedAgentVersions={() => void refreshSelectedAgentVersions()}
            onRestoreSelectedAgentVersion={(version) => void restoreSelectedAgentVersion(version)}
            onRefreshSelectedAgentActivity={() => void refreshSelectedAgentActivity()}
          />
        )}
      </div>
    </div>
  );
};
