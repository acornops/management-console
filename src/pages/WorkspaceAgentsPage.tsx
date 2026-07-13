import React, { useMemo, useState } from 'react';
import { SelectOption } from '@/components/common/Select';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import {
  createDefaultAgentDefinitions,
  targetScopeFromTokens,
  type AgentDefinition
} from '@/pages/agents/agentModel';
import { WorkspaceAgentsCatalog, WorkspaceAgentsRouteHeader, defaultAgentCatalogFilters, type AgentCatalogFilters } from '@/pages/WorkspaceAgentsCatalog';
import { PageShell } from '@/components/common/PageComposition';
import { AgentWorkspaceDrawer, CreateAgentDrawer, EditAgentDrawer } from '@/pages/WorkspaceAgentsDrawers';
import { agentProfileTabs, type AgentProfileTab } from '@/pages/WorkspaceAgentDetailPanel';
import { Notice, activityStateFromRecord, auditHistoryFromAgentActivity, canManageWorkspaceAgents, createAgentEditDraft, createFallbackAgentCapabilityOptions, filterVisibleAgents, getAgentEditChangeSummary, isWorkspaceCatalogAgent, mapApiAgent, normalizeAgentCapabilityOptions, splitInput, withAgentAuditHistoryEntry, type AgentCapabilityOptions, type AgentDraft, type AgentEditDraft, type LocalNotice, type WorkspaceAgentsPageProps } from '@/pages/WorkspaceAgentsPage.helpers';
import {
  createAgent as createWorkspaceAgent,
  createAgentVersion as createWorkspaceAgentVersion,
  deleteAgent as deleteWorkspaceAgent,
  listAgentActivity,
  listAgentVersions,
  listWorkspaceAgents,
  restoreAgentVersion,
  runAgent as runWorkspaceAgent,
  updateAgent as updateWorkspaceAgent,
  type AgentVersionSnapshotApi
} from '@/services/control-plane/agentApi';
import { listWorkflowOptions } from '@/services/control-plane/workflowApi';
import type { ProjectMember } from '@/types';
import { updateUrlSearch, useUrlSearchState } from '@/hooks/useUrlSearchState';

export const WorkspaceAgentsPage: React.FC<WorkspaceAgentsPageProps> = ({ workspace }) => {
  const urlSearch = useUrlSearchState();
  const initialUrlSearch = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const fallbackAgents = useMemo(() => createDefaultAgentDefinitions(workspace.id), [workspace.id]);
  const fallbackCapabilityOptions = useMemo(() => createFallbackAgentCapabilityOptions(fallbackAgents), [fallbackAgents]);
  const [agents, setAgents] = useState<AgentDefinition[]>(fallbackAgents);
  const [agentCapabilityOptions, setAgentCapabilityOptions] = useState<AgentCapabilityOptions>(fallbackCapabilityOptions);
  const [ownerUserOptions, setOwnerUserOptions] = useState<ProjectMember[]>(workspace.members || []);
  const [selectedAgentId, setSelectedAgentId] = useState(initialUrlSearch.get('agent') || fallbackAgents[0]?.id || '');
  const [query, setQuery] = useState(initialUrlSearch.get('q') || '');
  const initialFocus = initialUrlSearch.get('focus');
  const [catalogFilters, setCatalogFilters] = useState<AgentCatalogFilters>({
    focus: initialFocus === 'active' || initialFocus === 'draft' || initialFocus === 'disabled' ? initialFocus : 'all'
  });
  const [agentLoadError, setAgentLoadError] = useState('');
  const [agentCapabilityLoadError, setAgentCapabilityLoadError] = useState('');
  const [ownerUserLoadError, setOwnerUserLoadError] = useState('');
  const [agentCatalogReloadKey, setAgentCatalogReloadKey] = useState(0);
  const [capabilityOptionsReloadKey, setCapabilityOptionsReloadKey] = useState(0);
  const [ownerUsersReloadKey, setOwnerUsersReloadKey] = useState(0);
  const [createPanelOpen, setCreatePanelOpen] = useState(initialUrlSearch.get('panel') === 'create');
  const [editPanelOpen, setEditPanelOpen] = useState(initialUrlSearch.get('panel') === 'edit');
  const [detailPanelOpen, setDetailPanelOpen] = useState(initialUrlSearch.get('panel') === 'profile' || initialUrlSearch.get('panel') === 'activity');
  const initialAgentTab = initialUrlSearch.get('panel') === 'activity' ? 'activity' : initialUrlSearch.get('agentTab');
  const [agentTab, setAgentTab] = useState<AgentProfileTab>(agentProfileTabs.includes(initialAgentTab as AgentProfileTab) ? initialAgentTab as AgentProfileTab : 'overview');
  const [editingAgentId, setEditingAgentId] = useState('');
  const [createDraft, setCreateDraft] = useState<AgentDraft>({ name: '', description: '', instructions: '', providerType: 'internal' });
  const [editDraft, setEditDraft] = useState<AgentEditDraft | null>(null);
  const [draftMcpServers, setDraftMcpServers] = useState('');
  const [draftTools, setDraftTools] = useState('');
  const [draftSkills, setDraftSkills] = useState('');
  const [localNotice, setLocalNotice] = useState<LocalNotice | null>(null);
  const [testingAgentId, setTestingAgentId] = useState('');
  const [agentVersionHistories, setAgentVersionHistories] = useState<Record<string, AgentVersionSnapshotApi[]>>({});
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [updatingAgentId, setUpdatingAgentId] = useState('');
  const [agentVersionAction, setAgentVersionAction] = useState('');
  const [agentActivityAction, setAgentActivityAction] = useState('');
  const [disableConfirmAgentId, setDisableConfirmAgentId] = useState('');
  const [deleteConfirmAgentId, setDeleteConfirmAgentId] = useState('');
  const closeAgentDetailsButtonRef = React.useRef<HTMLButtonElement>(null);
  const canManageAgents = canManageWorkspaceAgents(workspace);
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
    setAgents(fallbackAgents);
    setSelectedAgentId((current) => current || fallbackAgents[0]?.id || '');
    setAgentLoadError('');
    listWorkspaceAgents(workspace.id, { includeInactive: true })
      .then((items) => {
        if (!mounted || items.length === 0) return;
        const mapped = items.map((item, index) => mapApiAgent(item, fallbackAgents[index % fallbackAgents.length], workspace.name, ownerLabelsByUserId));
        setAgents(mapped);
        setSelectedAgentId((current) => current || mapped[0].id);
        const currentSearch = new URLSearchParams(window.location.search);
        const routeAgentId = currentSearch.get('agent');
        if (routeAgentId && !mapped.some((agent) => agent.id === routeAgentId) && ['profile', 'edit', 'activity'].includes(currentSearch.get('panel') || '')) {
          updateUrlSearch({ panel: null, agent: null, agentTab: null }, { replace: true });
        }
      })
      .catch((error) => {
        if (mounted) setAgentLoadError(error instanceof Error ? error.message : 'Unable to load workspace agents');
      });
    return () => {
      mounted = false;
    };
  }, [agentCatalogReloadKey, fallbackAgents, ownerLabelsByUserId, workspace.id, workspace.name]);
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
  }, [capabilityOptionsReloadKey, fallbackCapabilityOptions, workspace.id]);
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
  const workspaceCatalogAgents = useMemo(() => agents.filter(isWorkspaceCatalogAgent), [agents]);
  const visibleAgents = useMemo(() => filterVisibleAgents(workspaceCatalogAgents, query, catalogFilters), [workspaceCatalogAgents, query, catalogFilters]);
  const selectedAgent = workspaceCatalogAgents.find((agent) => agent.id === selectedAgentId);
  const editingAgent = editPanelOpen ? agents.find((agent) => agent.id === editingAgentId) : undefined;
  const editChangeSummary = editingAgent && editDraft ? getAgentEditChangeSummary(editingAgent, editDraft) : [];
  const createDirty = Boolean(createDraft.name || createDraft.description || createDraft.instructions || draftMcpServers || draftTools || draftSkills);
  const editDirty = editChangeSummary.length > 0;
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
    if (!editPanelOpen || !editingAgent || editDraft) return;
    setEditDraft(createAgentEditDraft(editingAgent));
  }, [editDraft, editPanelOpen, editingAgent]);
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
        clientRequestId: crypto.randomUUID()
      });
      setLocalNotice({ tone: 'success', message: `Run ${result.runId} queued for ${agentToTest.name}.` });
      await refreshSelectedAgentActivity();
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Test could not be queued.' });
    } finally {
      setTestingAgentId('');
    }
  };
  const testSelectedAgent = async () => selectedAgent && testAgent(selectedAgent);
  const resetCreateAgentDraft = () => {
    setCreateDraft({ name: '', description: '', instructions: '', providerType: 'internal' });
    setDraftMcpServers('');
    setDraftTools('');
    setDraftSkills('');
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
  };
  const openEditAgentDrawer = (agent: AgentDefinition) => {
    setEditingAgentId(agent.id);
    setEditDraft(createAgentEditDraft(agent));
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
      const mapped = mapApiAgent(restored, selectedAgent, workspace.name, ownerLabelsByUserId);
      setAgents((current) => current.map((agent) => agent.id === mapped.id ? {
        ...mapped,
        auditHistory: [{ id: `${version.id}:restore`, summary: `Restored from saved v${version.version}.`, occurredAt: new Date().toISOString() }, ...agent.auditHistory]
      } : agent));
      setSelectedAgentId(mapped.id);
      setLocalNotice({ tone: 'success', message: `Restored v${version.version}.` });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not restore that version.' });
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
        auditHistory: auditHistoryFromAgentActivity(activity)
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
      updateSelectedAgent(selectedAgent.id, () => withAgentAuditHistoryEntry(mapApiAgent(updated, selectedAgent, workspace.name, ownerLabelsByUserId), 'Agent disabled'));
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
      updateSelectedAgent(selectedAgent.id, () => withAgentAuditHistoryEntry(mapApiAgent(updated, selectedAgent, workspace.name, ownerLabelsByUserId), 'Agent reactivated'));
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
      setAgents(remainingAgents);
      setSelectedAgentId(remainingAgents[0]?.id || '');
      setDeleteConfirmAgentId('');
      setLocalNotice({ tone: 'success', message: 'Agent deleted.' });
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
      const mapped = mapApiAgent(created, fallbackAgents[0], workspace.name, ownerLabelsByUserId);
      setAgents((current) => [mapped, ...current.filter((agent) => agent.id !== mapped.id)]);
      setSelectedAgentId(mapped.id);
      setLocalNotice({ tone: 'success', message: 'Agent saved with restricted trust and approval required for write tools.' });
      updateUrlSearch({ panel: null });
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
      const mappedBase = mapApiAgent(updated, editingAgent, workspace.name, ownerLabelsByUserId);
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

      {(agentLoadError || agentCapabilityLoadError || ownerUserLoadError) && (
        <Notice title="Some live data is unavailable" actionLabel="Retry all" onAction={() => { setAgentCatalogReloadKey((value) => value + 1); setCapabilityOptionsReloadKey((value) => value + 1); setOwnerUsersReloadKey((value) => value + 1); }}>
          <details><summary className="cursor-pointer">Fallback data keeps the catalog available. Show details</summary><ul className="mt-2 list-disc pl-5">{agentLoadError && <li>Agent definitions and activity may be stale.</li>}{agentCapabilityLoadError && <li>Capability picker choices may be incomplete.</li>}{ownerUserLoadError && <li>Owner choices are limited to cached members.</li>}</ul></details>
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
          onSave={() => void saveAgentEdits()}
        />
      )}

      <div className="grid min-w-0 w-full max-w-full gap-6">
        <WorkspaceAgentsCatalog
          agents={workspaceCatalogAgents}
          visibleAgents={visibleAgents}
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
          testingAgentId={testingAgentId}
          updatingAgentId={updatingAgentId}
          agentVersionAction={agentVersionAction}
          agentActivityAction={agentActivityAction}
          disableConfirmAgentId={disableConfirmAgentId}
          setDisableConfirmAgentId={setDisableConfirmAgentId}
          deleteConfirmAgentId={deleteConfirmAgentId}
          setDeleteConfirmAgentId={setDeleteConfirmAgentId}
          agentVersionHistories={agentVersionHistories}
          onTestSelectedAgent={() => void testSelectedAgent()}
          onOpenEditAgentDrawer={openEditAgentDrawerFromDetails}
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
