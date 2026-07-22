import React, { useMemo, useState } from 'react';
import { SelectOption } from '@/components/common/Select';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import {
  targetScopeFromTokens,
  type AgentDefinition
} from '@/pages/agents/agentModel';
import { WorkspaceAgentsCatalog, WorkspaceAgentsRouteHeader, defaultAgentCatalogFilters, type AgentCatalogFilters } from '@/pages/WorkspaceAgentsCatalog';
import { PageShell } from '@/components/common/PageComposition';
import { AgentWorkspaceDrawer, CreateAgentDrawer, EditAgentDrawer } from '@/pages/WorkspaceAgentsDrawers';
import { agentProfileTabs, type AgentProfileTab } from '@/pages/WorkspaceAgentDetailPanel';
import { Notice, activityStateFromRecord, canManageWorkspaceAgents, createAgentEditDraft, filterVisibleAgents, getAgentEditChangeSummary, isSystemProvidedAgent, isWorkspaceCatalogAgent, mapApiAgent, mergeAgentAuditHistoryWithActivity, shouldRefreshAgentEditDraft, splitInput, withAgentAuditHistoryEntry, type AgentDraft, type AgentEditDraft, type AgentEditDraftSource, type LocalNotice, type WorkspaceAgentsPageProps } from '@/pages/WorkspaceAgentsPage.helpers';
import {
  createAgent as createWorkspaceAgent,
  createAgentVersion as createWorkspaceAgentVersion,
  deleteAgent as deleteWorkspaceAgent,
  duplicateAgent as duplicateWorkspaceAgent,
  listAgentActivity,
  listAgentVersions,
  listWorkspaceAgents,
  restoreAgentVersion,
  runAgent as runWorkspaceAgent,
  updateAgent as updateWorkspaceAgent,
  type AgentVersionSnapshotApi
} from '@/services/control-plane/agentApi';
import type { ProjectMember } from '@/types';
import { updateUrlSearch, useUrlSearchState } from '@/hooks/useUrlSearchState';
import { ControlPlaneRequestError } from '@/services/control-plane/http';
import { resolveMcpReadinessRecovery } from '@/services/control-plane/mcpReadinessRecovery';
import type { WorkflowOption } from '@/services/control-plane/workflowApi';

export const WorkspaceAgentsPage: React.FC<WorkspaceAgentsPageProps> = ({ workspace }) => {
  const urlSearch = useUrlSearchState();
  const initialUrlSearch = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const agentCatalogWorkspaceIdRef = React.useRef(workspace.id);
  const [ownerUserOptions, setOwnerUserOptions] = useState<ProjectMember[]>(workspace.members || []);
  const [targetOptions, setTargetOptions] = useState<WorkflowOption[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState(initialUrlSearch.get('agent') || '');
  const [query, setQuery] = useState(initialUrlSearch.get('q') || '');
  const initialFocus = initialUrlSearch.get('focus');
  const [catalogFilters, setCatalogFilters] = useState<AgentCatalogFilters>({
    focus: initialFocus === 'active' || initialFocus === 'draft' || initialFocus === 'disabled' ? initialFocus : 'all'
  });
  const [agentLoadError, setAgentLoadError] = useState('');
  const [agentCatalogReady, setAgentCatalogReady] = useState(false);
  const [ownerUserLoadError, setOwnerUserLoadError] = useState('');
  const [agentCatalogReloadKey, setAgentCatalogReloadKey] = useState(0);
  const [ownerUsersReloadKey, setOwnerUsersReloadKey] = useState(0);
  const [createPanelOpen, setCreatePanelOpen] = useState(initialUrlSearch.get('panel') === 'create');
  const [editPanelOpen, setEditPanelOpen] = useState(initialUrlSearch.get('panel') === 'edit');
  const [detailPanelOpen, setDetailPanelOpen] = useState(initialUrlSearch.get('panel') === 'profile' || initialUrlSearch.get('panel') === 'activity');
  const initialAgentTab = initialUrlSearch.get('panel') === 'activity' ? 'activity' : initialUrlSearch.get('agentTab');
  const [agentTab, setAgentTab] = useState<AgentProfileTab>(agentProfileTabs.includes(initialAgentTab as AgentProfileTab) ? initialAgentTab as AgentProfileTab : 'overview');
  const [editingAgentId, setEditingAgentId] = useState('');
  const [createDraft, setCreateDraft] = useState<AgentDraft>({ name: '', description: '', instructions: '', providerType: 'internal' });
  const [editDraft, setEditDraft] = useState<AgentEditDraft | null>(null);
  const editDraftSourceRef = React.useRef<AgentEditDraftSource | null>(null);
  const [localNotice, setLocalNotice] = useState<LocalNotice | null>(null);
  const [testingAgentId, setTestingAgentId] = useState('');
  const [agentRunTargetId, setAgentRunTargetId] = useState('');
  const [agentVersionHistories, setAgentVersionHistories] = useState<Record<string, AgentVersionSnapshotApi[]>>({});
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [updatingAgentId, setUpdatingAgentId] = useState('');
  const [duplicatingAgentId, setDuplicatingAgentId] = useState('');
  const [agentVersionAction, setAgentVersionAction] = useState('');
  const [agentActivityAction, setAgentActivityAction] = useState('');
  const [disableConfirmAgentId, setDisableConfirmAgentId] = useState('');
  const [deleteConfirmAgentId, setDeleteConfirmAgentId] = useState('');
  const closeAgentDetailsButtonRef = React.useRef<HTMLButtonElement>(null);
  const editAgentNameInputRef = React.useRef<HTMLInputElement>(null);
  const canManageAgents = canManageWorkspaceAgents(workspace);
  const canManageMcp = workspace.permissions?.manage_mcp === true;
  const canManageSkills = workspace.permissions?.manage_skills === true;
  React.useEffect(() => {
    const panel = urlSearch.get('panel');
    const routeAgentId = urlSearch.get('agent');
    const routeFocus = urlSearch.get('focus');
    if (routeAgentId) setSelectedAgentId(routeAgentId);
    setQuery(urlSearch.get('q') || '');
    setCatalogFilters({
      focus: routeFocus === 'active' || routeFocus === 'draft' || routeFocus === 'disabled' ? routeFocus : 'all'
    });
    setCreatePanelOpen(panel === 'create');
    setEditPanelOpen(panel === 'edit');
    setDetailPanelOpen(panel === 'profile' || panel === 'activity');
    const routeTab = panel === 'activity' ? 'activity' : urlSearch.get('agentTab');
    setAgentTab(agentProfileTabs.includes(routeTab as AgentProfileTab) ? routeTab as AgentProfileTab : 'overview');
    if (panel === 'activity' && routeAgentId) updateUrlSearch({ panel: 'profile', agent: routeAgentId, agentTab: 'activity' }, { replace: true });
    if (panel === 'profile' && routeTab && !agentProfileTabs.includes(routeTab as AgentProfileTab)) updateUrlSearch({ panel: null, agent: null, agentTab: null }, { replace: true });
    if (panel === 'edit' && routeAgentId) setEditingAgentId(routeAgentId);
  }, [urlSearch]);
  const ownerLabelsByUserId = useMemo(() => new Map(
    ownerUserOptions
      .filter((member) => member.userId)
      .map((member) => [member.userId as string, member.name || member.email])
  ), [ownerUserOptions]);
  React.useEffect(() => {
    let mounted = true;
    if (agentCatalogWorkspaceIdRef.current !== workspace.id) {
      agentCatalogWorkspaceIdRef.current = workspace.id;
      setAgents([]);
      setSelectedAgentId('');
      setAgentCatalogReady(false);
    }
    setAgentLoadError('');
    listWorkspaceAgents(workspace.id, { includeInactive: true })
      .then((items) => {
        if (!mounted) return;
        const mapped = items.map((item) => mapApiAgent(item, workspace.name, ownerLabelsByUserId));
        const firstCatalogAgent = mapped.find(isWorkspaceCatalogAgent);
        setAgents(mapped);
        setSelectedAgentId((current) => mapped.some((agent) => agent.id === current && isWorkspaceCatalogAgent(agent)) ? current : firstCatalogAgent?.id || '');
        const currentSearch = new URLSearchParams(window.location.search);
        const routeAgentId = currentSearch.get('agent');
        if (routeAgentId && !mapped.some((agent) => agent.id === routeAgentId && isWorkspaceCatalogAgent(agent)) && ['profile', 'edit', 'activity'].includes(currentSearch.get('panel') || '')) {
          updateUrlSearch({ panel: null, agent: null, agentTab: null }, { replace: true });
        }
        setAgentCatalogReady(true);
      })
      .catch((error) => {
        if (!mounted) return;
        setAgents([]);
        setSelectedAgentId('');
        setAgentLoadError(error instanceof Error ? error.message : 'Unable to load workspace agents');
        setAgentCatalogReady(true);
      });
    return () => {
      mounted = false;
    };
  }, [agentCatalogReloadKey, ownerLabelsByUserId, workspace.id, workspace.name]);
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
  }, [ownerUsersReloadKey, workspace.id, workspace.members, workspace.permissions?.read_members]);
  React.useEffect(() => {
    let mounted = true;
    controlPlaneApi.listTargetsForWorkspace(workspace.id, { limit: 200 })
      .then((page) => {
        if (mounted) setTargetOptions(page.items.map((target) => ({
          value: target.id,
          label: target.name,
          description: `${target.targetType === 'kubernetes' ? 'Kubernetes cluster' : 'Virtual machine'} · ${target.status}`
        })));
      })
      .catch(() => {
        if (mounted) setTargetOptions([]);
      });
    return () => { mounted = false; };
  }, [workspace.id]);
  const workspaceCatalogAgents = useMemo(() => agents.filter(isWorkspaceCatalogAgent), [agents]);
  const visibleAgents = useMemo(() => filterVisibleAgents(workspaceCatalogAgents, query, catalogFilters), [workspaceCatalogAgents, query, catalogFilters]);
  const selectedAgent = workspaceCatalogAgents.find((agent) => agent.id === selectedAgentId);
  React.useEffect(() => setAgentRunTargetId(''), [selectedAgentId]);
  const editingAgent = editPanelOpen ? agents.find((agent) => agent.id === editingAgentId && !isSystemProvidedAgent(agent)) : undefined;
  const editChangeSummary = editingAgent && editDraft ? getAgentEditChangeSummary(editingAgent, editDraft) : [];
  const createDirty = Boolean(createDraft.name || createDraft.description || createDraft.instructions);
  const editDirty = editChangeSummary.length > 0;
  React.useEffect(() => {
    if (!agentCatalogReady || !editPanelOpen) return;
    const requestedAgent = agents.find((agent) => agent.id === editingAgentId);
    if (requestedAgent && isSystemProvidedAgent(requestedAgent)) {
      updateUrlSearch({ panel: 'profile', agent: requestedAgent.id, agentTab });
    }
  }, [agentCatalogReady, agentTab, agents, editPanelOpen, editingAgentId]);
  React.useEffect(() => {
    if (!createDirty && !editDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const guardHistoryExit = () => {
      if (!window.confirm('Discard unsaved changes?')) window.history.forward();
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    window.addEventListener('popstate', guardHistoryExit);
    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload);
      window.removeEventListener('popstate', guardHistoryExit);
    };
  }, [createDirty, editDirty]);
  React.useEffect(() => {
    if (!agentCatalogReady || !editPanelOpen || !editingAgent) return;
    const nextDraft = createAgentEditDraft(editingAgent);
    setEditDraft((current) => {
      if (!shouldRefreshAgentEditDraft(editingAgent.id, current, editDraftSourceRef.current)) return current;
      editDraftSourceRef.current = { agentId: editingAgent.id, draft: nextDraft };
      return nextDraft;
    });
  }, [agentCatalogReady, editPanelOpen, editingAgent]);
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
  const testAgent = async (agentToTest: AgentDefinition) => {
    if (!canManageAgents) return;
    setTestingAgentId(agentToTest.id);
    setLocalNotice(null);
    try {
      const result = await runWorkspaceAgent(workspace.id, agentToTest.id, {
        prompt: `Run ${agentToTest.name} using its configured scope and return an evidence-based result.`,
        approvedContextGrants: agentToTest.contextScope,
        inputContext: { source: 'management_console' },
        clientRequestId: crypto.randomUUID(),
        ...(agentRunTargetId ? { targetId: agentRunTargetId } : {})
      });
      setLocalNotice({ tone: 'success', message: `Run ${result.runId} queued for ${agentToTest.name}.` });
      await refreshSelectedAgentActivity();
    } catch (error) {
      const recovery = resolveMcpReadinessRecovery(error, {
        workspaceId: workspace.id,
        scopeType: 'agent',
        agentId: agentToTest.id
      });
      if (recovery) {
        setDetailPanelOpen(false);
        updateUrlSearch({ panel: null, agent: null, agentTab: null }, { replace: true });
      }
      setLocalNotice(recovery
        ? { tone: 'danger', message: recovery.message, actionHref: recovery.href, actionLabel: recovery.label }
        : { tone: 'danger', message: error instanceof Error ? error.message : 'Test could not be queued.' });
    } finally {
      setTestingAgentId('');
    }
  };
  const testSelectedAgent = async () => selectedAgent && testAgent(selectedAgent);
  const resetCreateAgentDraft = () => {
    setCreateDraft({ name: '', description: '', instructions: '', providerType: 'internal' });
  };
  const confirmDiscard = (dirty: boolean) => !dirty || window.confirm('Discard unsaved changes?');
  const closeCreateAgentDrawer = () => {
    if (!confirmDiscard(createDirty)) return;
    resetCreateAgentDraft();
    updateUrlSearch({ panel: null });
  };
  const closeEditAgentDrawer = (saved = false) => {
    if (!saved && !confirmDiscard(editDirty)) return;
    updateUrlSearch({ panel: 'profile', agent: editingAgentId, agentTab });
    setEditingAgentId('');
    setEditDraft(null);
    editDraftSourceRef.current = null;
  };
  const openEditAgentDrawer = (agent: AgentDefinition) => {
    if (isSystemProvidedAgent(agent)) return;
    setEditingAgentId(agent.id);
    if (agentCatalogReady) {
      const draft = createAgentEditDraft(agent);
      editDraftSourceRef.current = { agentId: agent.id, draft };
      setEditDraft(draft);
    } else {
      editDraftSourceRef.current = null;
      setEditDraft(null);
    }
    updateUrlSearch({ agent: agent.id, panel: 'edit' });
  };
  const openAgentManagement = (agent?: AgentDefinition) => {
    if (agent) setSelectedAgentId(agent.id);
    updateUrlSearch({ agent: agent?.id || selectedAgentId, panel: 'profile', agentTab: agentTab });
  };
  const openEditAgentDrawerFromDetails = (agent: AgentDefinition) => {
    openEditAgentDrawer(agent);
  };
  const saveSelectedAgentVersion = async () => {
    if (!selectedAgent || !canManageAgents || isSystemProvidedAgent(selectedAgent)) return;
    setAgentVersionAction(selectedAgent.id);
    setLocalNotice(null);
    try {
      const version = await createWorkspaceAgentVersion(workspace.id, selectedAgent.id);
      setAgentVersionHistories((current) => ({ ...current, [selectedAgent.id]: [version, ...(current[selectedAgent.id] || []).filter((item) => item.id !== version.id)] }));
      updateSelectedAgent(selectedAgent.id, (agent) => ({
        ...agent,
        version: version.version,
        auditHistory: [{ id: version.id, summary: `Restore point saved from revision ${version.version}.`, occurredAt: version.createdAt }, ...agent.auditHistory]
      }));
      setLocalNotice({ tone: 'success', message: `Saved revision ${version.version} as a restore point.` });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not save a restore point for this agent.' });
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
      setLocalNotice({ tone: 'success', message: 'Restore points refreshed.' });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not refresh restore points.' });
    } finally {
      setAgentVersionAction('');
    }
  };
  const restoreSelectedAgentVersion = async (version: AgentVersionSnapshotApi) => {
    if (!selectedAgent || !canManageAgents || isSystemProvidedAgent(selectedAgent)) return;
    setAgentVersionAction(`${selectedAgent.id}:restore:${version.id}`);
    setLocalNotice(null);
    try {
      const restored = await restoreAgentVersion(workspace.id, selectedAgent.id, version.id);
      const mapped = mapApiAgent(restored, workspace.name, ownerLabelsByUserId);
      setAgents((current) => current.map((agent) => agent.id === mapped.id ? {
        ...mapped,
        auditHistory: [{ id: `${version.id}:restore`, summary: `Created a new current revision from saved revision ${version.version}.`, occurredAt: new Date().toISOString() }, ...agent.auditHistory]
      } : agent));
      setSelectedAgentId(mapped.id);
      setLocalNotice({ tone: 'success', message: `Restored from revision ${version.version} as the new current revision.` });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not restore that restore point.' });
    } finally {
      setAgentVersionAction('');
    }
  };
  const refreshSelectedAgentActivity = async () => {
    if (!selectedAgent) return;
    setAgentActivityAction(selectedAgent.id);
    setLocalNotice(null);
    try {
      const activity = await listAgentActivity(workspace.id, selectedAgent.id);
      updateSelectedAgent(selectedAgent.id, (agent) => ({
        ...agent,
        activity: activityStateFromRecord(agent.activity, activity[0], activity.length),
        auditHistory: mergeAgentAuditHistoryWithActivity(agent.auditHistory, activity)
      }));
      setLocalNotice({ tone: 'success', message: 'Recent activity refreshed.' });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not refresh recent activity.' });
    } finally {
      setAgentActivityAction('');
    }
  };
  const disableSelectedAgent = async () => {
    if (!selectedAgent || !canManageAgents) return;
    setUpdatingAgentId(selectedAgent.id);
    setLocalNotice(null);
    try {
      const updated = await updateWorkspaceAgent(workspace.id, selectedAgent.id, { status: 'disabled' });
      updateSelectedAgent(selectedAgent.id, () => withAgentAuditHistoryEntry(mapApiAgent(updated, workspace.name, ownerLabelsByUserId), 'Agent disabled'));
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
      updateSelectedAgent(selectedAgent.id, () => withAgentAuditHistoryEntry(mapApiAgent(updated, workspace.name, ownerLabelsByUserId), 'Agent reactivated'));
      setLocalNotice({ tone: 'success', message: 'Agent reactivated.' });
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
      const nextAgent = remainingAgents.find(isWorkspaceCatalogAgent);
      setAgents(remainingAgents);
      setSelectedAgentId(nextAgent?.id || '');
      updateUrlSearch({ panel: nextAgent ? 'profile' : null, agent: nextAgent?.id || null, agentTab: nextAgent ? agentTab : null }, { replace: true });
      setDeleteConfirmAgentId('');
      setLocalNotice({ tone: 'success', message: 'Agent deleted.' });
    } catch (error) {
      const dependentWorkflows = error instanceof ControlPlaneRequestError && Array.isArray(error.details?.workflows)
        ? error.details.workflows
          .flatMap((workflow) => workflow && typeof workflow === 'object' && typeof (workflow as { name?: unknown }).name === 'string'
            ? [(workflow as { name: string }).name]
            : [])
        : [];
      setLocalNotice({
        tone: 'danger',
        message: dependentWorkflows.length > 0
          ? `Remove this Agent from ${dependentWorkflows.join(', ')} before deleting it.`
          : error instanceof Error ? error.message : 'Could not delete this agent.'
      });
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
        contextGrants: [],
        permissionMode: 'ask_before_changes',
        trustPolicy: { level: 'restricted', allowExternalData: false }
      });
      const mapped = mapApiAgent(created, workspace.name, ownerLabelsByUserId);
      setAgents((current) => [mapped, ...current.filter((agent) => agent.id !== mapped.id)]);
      setSelectedAgentId(mapped.id);
      setLocalNotice({ tone: 'success', message: 'Agent saved with restricted trust and Ask before changes permission mode.' });
      updateUrlSearch({ panel: null });
      resetCreateAgentDraft();
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not save this agent.' });
    } finally {
      setCreatingAgent(false);
    }
  };
  const duplicateSelectedAgent = async () => {
    if (!selectedAgent || !canManageAgents) return;
    setDuplicatingAgentId(selectedAgent.id);
    setLocalNotice(null);
    try {
      const created = await duplicateWorkspaceAgent(workspace.id, selectedAgent.id);
      const mapped = mapApiAgent(created, workspace.name, ownerLabelsByUserId);
      const draft = createAgentEditDraft(mapped);
      setAgents((current) => [mapped, ...current.filter((agent) => agent.id !== mapped.id)]);
      setSelectedAgentId(mapped.id);
      setEditingAgentId(mapped.id);
      editDraftSourceRef.current = { agentId: mapped.id, draft };
      setEditDraft(draft);
      setLocalNotice({ tone: 'success', message: `Duplicated ${selectedAgent.name} as a custom draft.` });
      updateUrlSearch({ agent: mapped.id, panel: 'edit', agentTab: null });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not duplicate this built-in agent.' });
    } finally {
      setDuplicatingAgentId('');
    }
  };
  const saveAgentEdits = async () => {
    if (!editingAgent || isSystemProvidedAgent(editingAgent) || !editDraft || !editDraft.name.trim() || !editDraft.description.trim()) return;
    setUpdatingAgentId(editingAgent.id);
    setLocalNotice(null);
    try {
      const input = {
        name: editDraft.name.trim(),
        description: editDraft.description.trim(),
        instructions: editDraft.instructions.trim() || editDraft.description.trim(),
        providerType: editDraft.providerType,
        status: editDraft.status,
        ownerUserId: editDraft.ownerUserId.trim() || undefined,
        targetScope: targetScopeFromTokens(splitInput(editDraft.targetScope)),
        contextGrants: splitInput(editDraft.contextScope),
        trustPolicy: { level: 'restricted', allowExternalData: editDraft.allowExternalData }
      };
      const updated = await updateWorkspaceAgent(workspace.id, editingAgent.id, input);
      const mappedOwner = ownerUserOptions.find((member) => member.userId === editDraft.ownerUserId.trim());
      const mappedBase = mapApiAgent(updated, workspace.name, ownerLabelsByUserId);
      const mapped = withAgentAuditHistoryEntry({ ...mappedBase, owner: mappedOwner?.name || mappedOwner?.email || mappedBase.owner }, 'Agent definition updated');
      setAgents((current) => current.map((agent) => agent.id === mapped.id ? mapped : agent));
      setSelectedAgentId(mapped.id);
      setLocalNotice({ tone: 'success', message: 'Agent updated. Review affected workflows before the next run.' });
      closeEditAgentDrawer(true);
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not update this agent.' });
    } finally {
      setUpdatingAgentId('');
    }
  };
  return (
    <PageShell>
      <WorkspaceAgentsRouteHeader
        canManageAgents={canManageAgents}
        onCreateAgent={() => updateUrlSearch({ panel: 'create', agent: null, agentTab: null })}
      />

      {(agentLoadError || ownerUserLoadError) && (
        <Notice title="Some live data is unavailable" actionLabel="Retry all" onAction={() => { setAgentCatalogReloadKey((value) => value + 1); setOwnerUsersReloadKey((value) => value + 1); }}>
          <details><summary className="cursor-pointer">Fallback data keeps the catalog available. Show details</summary><ul className="mt-2 list-disc pl-5">{agentLoadError && <li>Agent definitions and activity may be stale.</li>}{ownerUserLoadError && <li>Owner choices are limited to cached members.</li>}</ul></details>
        </Notice>
      )}
      {!canManageAgents && <div className="mb-4 rounded-md border border-ui-border bg-ui-surface px-3 py-2 text-xs font-semibold text-ui-text-muted">You can inspect agents. Ask a workspace manager for manage_agents permission to create or change them.</div>}
      {localNotice && (
        <div
          role={localNotice.tone === 'danger' ? 'alert' : 'status'}
          aria-live={localNotice.tone === 'danger' ? 'assertive' : 'polite'}
          aria-atomic="true"
          className={`mb-4 rounded-md border px-3 py-2 text-xs font-semibold ${localNotice.tone === 'danger' ? 'border-status-danger/30 bg-status-danger-soft text-status-danger-text' : 'border-status-success/30 bg-status-success-soft text-status-success-text'}`}
        >
          {localNotice.message}
          {localNotice.actionHref && localNotice.actionLabel && (
            <a className="ml-2 underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-control-boundary" href={localNotice.actionHref}>
              {localNotice.actionLabel}
            </a>
          )}
        </div>
      )}

      {createPanelOpen && (
        <CreateAgentDrawer
          createDraft={createDraft}
          setCreateDraft={setCreateDraft}
          creatingAgent={creatingAgent}
          onClose={closeCreateAgentDrawer}
          onSave={() => void createControlPlaneAgent()}
        />
      )}
      {editPanelOpen && editingAgent && editDraft && (
        <EditAgentDrawer
          editingAgent={editingAgent}
          editDraft={editDraft}
          setEditDraft={setEditDraft}
          ownerSelectOptions={ownerSelectOptions}
          targetOptions={targetOptions}
          editChangeSummary={editChangeSummary}
          updatingAgentId={updatingAgentId}
          nameInputRef={editAgentNameInputRef}
          onClose={closeEditAgentDrawer}
          onSave={() => void saveAgentEdits()}
        />
      )}

      <div className="grid min-w-0 w-full max-w-full gap-6">
        <WorkspaceAgentsCatalog
          agents={workspaceCatalogAgents}
          visibleAgents={visibleAgents}
          loading={!agentCatalogReady}
          selectedAgent={selectedAgent}
          drawerOpen={detailPanelOpen}
          canManageAgents={canManageAgents}
          query={query}
          onQueryChange={(next) => { setQuery(next); updateUrlSearch({ q: next || null }, { replace: true }); }}
          catalogFilters={catalogFilters}
          onCatalogFiltersChange={(filters) => {
            setCatalogFilters(filters);
            updateUrlSearch({ focus: filters.focus === 'all' ? null : filters.focus }, { replace: true });
          }}
          onClearFilters={() => {
            setQuery('');
            setCatalogFilters(defaultAgentCatalogFilters);
            updateUrlSearch({ q: null, focus: null }, { replace: true });
          }}
          onOpenManagement={openAgentManagement}
        />
      </div>

      {selectedAgent && (
        <AgentWorkspaceDrawer
          isOpen={detailPanelOpen}
          onClose={() => updateUrlSearch({ panel: null, agent: null, agentTab: null })}
          closeButtonRef={closeAgentDetailsButtonRef}
          selectedAgent={selectedAgent}
          activeTab={agentTab}
          onTabChange={(tab) => { setAgentTab(tab); updateUrlSearch({ panel: 'profile', agent: selectedAgent.id, agentTab: tab }, { replace: true }); }}
          titleId="agent-details-title"
          canManageAgents={canManageAgents}
          canManageMcp={canManageMcp}
          canManageSkills={canManageSkills}
          testingAgentId={testingAgentId}
          targetOptions={targetOptions}
          runTargetId={agentRunTargetId}
          onRunTargetChange={setAgentRunTargetId}
          updatingAgentId={updatingAgentId}
          duplicatingAgentId={duplicatingAgentId}
          agentVersionAction={agentVersionAction}
          agentActivityAction={agentActivityAction}
          disableConfirmAgentId={disableConfirmAgentId}
          setDisableConfirmAgentId={setDisableConfirmAgentId}
          deleteConfirmAgentId={deleteConfirmAgentId}
          setDeleteConfirmAgentId={setDeleteConfirmAgentId}
          agentVersionHistories={agentVersionHistories}
          onTestSelectedAgent={() => void testSelectedAgent()}
          onOpenEditAgentDrawer={openEditAgentDrawerFromDetails}
          onDuplicateSelectedAgent={() => void duplicateSelectedAgent()}
          onSaveSelectedAgentVersion={() => void saveSelectedAgentVersion()}
          onReactivateSelectedAgent={() => void reactivateSelectedAgent()}
          onDisableSelectedAgent={() => void disableSelectedAgent()}
          onDeleteSelectedAgent={() => void deleteSelectedAgent()}
          onRefreshSelectedAgentVersions={() => void refreshSelectedAgentVersions()}
          onRestoreSelectedAgentVersion={(version) => void restoreSelectedAgentVersion(version)}
          onRefreshSelectedAgentActivity={() => void refreshSelectedAgentActivity()}
        />
      )}
    </PageShell>
  );
};
