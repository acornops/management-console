import React, { useMemo, useState } from 'react';
import { SelectOption } from '@acornops/ui';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { type AgentDefinition } from '@/pages/agents/agentModel';
import { WorkspaceAgentsCatalog, WorkspaceAgentsRouteHeader, defaultAgentCatalogFilters, type AgentCatalogFilters } from '@/pages/WorkspaceAgentsCatalog';
import { PageShell } from '@acornops/ui';
import { CreateAgentDrawer } from '@/pages/WorkspaceAgentsDrawers';
import { agentProfileTabs, type AgentProfileTab } from '@/pages/WorkspaceAgentDetailPanel';
import { WorkspaceAgentDetailPanel } from '@/pages/WorkspaceAgentDetailPanel';
import { AgentChatPanel } from '@/pages/agents/AgentChatPanel';
import { AgentQuickChatPanel } from '@/pages/agents/AgentQuickChatPanel';
import { DEFAULT_AGENT_EMOJI } from '@/pages/agents/AgentAvatar';
import { Notice, canManageWorkspaceAgents, createAgentEditDraft, filterVisibleAgents, getAgentEditChangeSummary, isWorkspaceCatalogAgent, mapApiAgent, shouldRefreshAgentEditDraft, type AgentDraft, type AgentEditDraft, type AgentEditDraftSource, type LocalNotice, type WorkspaceAgentsPageProps } from '@/pages/WorkspaceAgentsPage.helpers';
import {
  createAgent as createWorkspaceAgent,
  deleteAgent as deleteWorkspaceAgent,
  duplicateAgent as duplicateWorkspaceAgent,
  listWorkspaceAgents,
  updateAgent as updateWorkspaceAgent
} from '@/services/control-plane/agentApi';
import type { ProjectMember } from '@/types';
import { updateUrlSearch, useUrlSearchState } from '@/hooks/useUrlSearchState';
import { ControlPlaneRequestError } from '@/services/control-plane/http';
import { AppPaths } from '@/utils/routes';
import { UnsavedChangesDialog } from '@/features/capabilities/UnsavedChangesDialog';
import { useAgentDrawerDiscardGuard } from '@/pages/agents/useAgentDrawerDiscardGuard';
import { hasSessionDataCacheValue, useSessionCachedState } from '@/hooks/sessionDataCache';
import { AgentDefinitionSettingsSection } from '@/pages/agents/AgentDefinitionSettingsSection';

export const WorkspaceAgentsPage: React.FC<WorkspaceAgentsPageProps> = ({ workspace, currentUserId, isDark, routeState, navigate }) => {
  const urlSearch = useUrlSearchState();
  const initialUrlSearch = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const agentCatalogCacheKey = `workspace:${workspace.id}:agents`;
  const ownerCatalogCacheKey = `workspace:${workspace.id}:agent-owner-options`;
  const [agents, setAgents] = useSessionCachedState<AgentDefinition[]>(agentCatalogCacheKey, []);
  const agentCatalogWorkspaceIdRef = React.useRef(workspace.id);
  const [ownerUserOptions, setOwnerUserOptions] = useSessionCachedState<ProjectMember[]>(ownerCatalogCacheKey, workspace.members || []);
  const [selectedAgentId, setSelectedAgentId] = useState(routeState?.agentId || initialUrlSearch.get('agent') || '');
  const [query, setQuery] = useState(initialUrlSearch.get('q') || '');
  const initialFocus = initialUrlSearch.get('focus');
  const [catalogFilters, setCatalogFilters] = useState<AgentCatalogFilters>({
    focus: initialFocus === 'active' || initialFocus === 'draft' || initialFocus === 'disabled' ? initialFocus : 'all'
  });
  const [agentLoadError, setAgentLoadError] = useState('');
  const [agentCatalogReady, setAgentCatalogReady] = useState(() => hasSessionDataCacheValue(agentCatalogCacheKey));
  const [ownerUserLoadError, setOwnerUserLoadError] = useState('');
  const [agentCatalogReloadKey, setAgentCatalogReloadKey] = useState(0);
  const [ownerUsersReloadKey, setOwnerUsersReloadKey] = useState(0);
  const [createPanelOpen, setCreatePanelOpen] = useState(initialUrlSearch.get('panel') === 'create');
  const initialAgentTab = initialUrlSearch.get('agentTab');
  const [agentTab, setAgentTab] = useState<AgentProfileTab>(routeState?.tab || (agentProfileTabs.includes(initialAgentTab as AgentProfileTab) ? initialAgentTab as AgentProfileTab : 'chat'));
  const [createDraft, setCreateDraft] = useState<AgentDraft>({ name: '', avatarEmoji: DEFAULT_AGENT_EMOJI, description: '', instructions: '', providerType: 'internal' });
  const [editDraft, setEditDraft] = useState<AgentEditDraft | null>(null);
  const editDraftSourceRef = React.useRef<AgentEditDraftSource | null>(null);
  const [localNotice, setLocalNotice] = useState<LocalNotice | null>(null);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [updatingAgentId, setUpdatingAgentId] = useState('');
  const [duplicatingAgentId, setDuplicatingAgentId] = useState('');
  const [disableConfirmAgentId, setDisableConfirmAgentId] = useState('');
  const [deleteConfirmAgentId, setDeleteConfirmAgentId] = useState('');
  const canManageAgents = canManageWorkspaceAgents(workspace);
  const canManageMcp = workspace.permissions?.manage_mcp === true;
  const canManageSkills = workspace.permissions?.manage_skills === true;
  React.useEffect(() => {
    if (routeState) {
      setSelectedAgentId(routeState.agentId);
    }
  }, [routeState]);
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
    const routeTab = urlSearch.get('agentTab');
    if (!routeState) setAgentTab(agentProfileTabs.includes(routeTab as AgentProfileTab) ? routeTab as AgentProfileTab : 'chat');
    if (panel === 'profile' && routeTab && !agentProfileTabs.includes(routeTab as AgentProfileTab)) {
      updateUrlSearch({ panel: 'profile', agent: routeAgentId, agentTab: 'chat' }, { replace: true });
    }
    if (!routeState && panel === 'edit' && routeAgentId) {
      navigate(AppPaths.workspaceAgentDetail(workspace.id, routeAgentId, 'settings'), { replace: true });
    }
  }, [navigate, routeState, urlSearch, workspace.id]);
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
        if (routeAgentId && !mapped.some((agent) => agent.id === routeAgentId && isWorkspaceCatalogAgent(agent)) && ['chat', 'profile', 'edit'].includes(currentSearch.get('panel') || '')) {
          updateUrlSearch({ panel: null, agent: null, agentTab: null }, { replace: true });
        }
        if (routeState && !mapped.some((agent) => agent.id === routeState.agentId && isWorkspaceCatalogAgent(agent))) {
          navigate(AppPaths.workspaceAgents(workspace.id), { replace: true });
        }
        setAgentCatalogReady(true);
      })
      .catch((error) => {
        if (!mounted) return;
        setAgentLoadError(error instanceof Error ? error.message : 'Unable to load workspace agents');
        setAgentCatalogReady(true);
      });
    return () => {
      mounted = false;
    };
  }, [agentCatalogReloadKey, navigate, ownerLabelsByUserId, routeState, workspace.id, workspace.name]);
  React.useEffect(() => {
    let mounted = true;
    setOwnerUserOptions((current) => current.length > 0 ? current : workspace.members || []);
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
  const activeAgentTab = routeState?.tab || agentTab;
  const quickChatOpen = !routeState && urlSearch.get('panel') === 'chat';
  const [quickChatLayoutReserved, setQuickChatLayoutReserved] = useState(quickChatOpen);
  const editingAgent = activeAgentTab === 'settings' ? selectedAgent : undefined;
  const editChangeSummary = editingAgent && editDraft ? getAgentEditChangeSummary(editingAgent, editDraft) : [];
  const createDirty = Boolean(createDraft.name || createDraft.description || createDraft.instructions || createDraft.avatarEmoji !== DEFAULT_AGENT_EMOJI);
  const editDirty = editChangeSummary.length > 0;
  const resetCreateAgentDraft = () => {
    setCreateDraft({ name: '', avatarEmoji: DEFAULT_AGENT_EMOJI, description: '', instructions: '', providerType: 'internal' });
  };
  const clearEditAgentDraft = () => {
    setEditDraft(null);
    editDraftSourceRef.current = null;
  };
  const closeCreateAgentDrawerImmediately = () => {
    resetCreateAgentDraft();
    updateUrlSearch({ panel: null });
  };
  const resetEditAgentDraft = () => {
    if (!editingAgent) return;
    const nextDraft = createAgentEditDraft(editingAgent);
    editDraftSourceRef.current = { agentId: editingAgent.id, draft: nextDraft };
    setEditDraft(nextDraft);
  };
  const {
    cancelDiscard,
    discardChanges,
    discardRequest,
    requestCloseCreate,
    requestCloseEdit
  } = useAgentDrawerDiscardGuard({
    createDirty,
    createPanelOpen,
    editDirty,
    editPanelOpen: Boolean(routeState && activeAgentTab === 'settings'),
    onCloseCreate: closeCreateAgentDrawerImmediately,
    onCloseEdit: resetEditAgentDraft,
    onDiscardCreateHistory: resetCreateAgentDraft,
    onDiscardEditHistory: clearEditAgentDraft
  });
  React.useEffect(() => {
    if (quickChatOpen) setQuickChatLayoutReserved(true);
  }, [quickChatOpen]);
  React.useEffect(() => {
    if (!agentCatalogReady || !routeState || activeAgentTab !== 'settings' || !editingAgent) return;
    const nextDraft = createAgentEditDraft(editingAgent);
    setEditDraft((current) => {
      if (!shouldRefreshAgentEditDraft(editingAgent.id, current, editDraftSourceRef.current)) return current;
      editDraftSourceRef.current = { agentId: editingAgent.id, draft: nextDraft };
      return nextDraft;
    });
  }, [activeAgentTab, agentCatalogReady, editingAgent, routeState]);
  const ownerSelectOptions = useMemo<Array<SelectOption<string>>>(() => [
    { value: '', label: 'Keep current owner' },
    ...ownerUserOptions
      .filter((member) => Boolean(member.userId))
      .map((member) => ({ value: member.userId as string, label: `${member.name || member.email} (${member.role})` }))
  ], [ownerUserOptions]);
  const updateSelectedAgent = (agentId: string, updater: (agent: AgentDefinition) => AgentDefinition) => {
    setAgents((current) => current.map((agent) => agent.id === agentId ? updater(agent) : agent));
  };
  const openAgentManagement = (agent?: AgentDefinition) => {
    if (agent) setSelectedAgentId(agent.id);
    const agentId = agent?.id || selectedAgentId;
    if (agentId) navigate(AppPaths.workspaceAgentDetail(workspace.id, agentId, 'chat'));
  };
  const openQuickChat = (agent: AgentDefinition) => {
    setQuickChatLayoutReserved(true);
    setSelectedAgentId(agent.id);
    updateUrlSearch({ panel: 'chat', agent: agent.id, agentTab: null });
  };
  const closeQuickChat = () => {
    updateUrlSearch({ panel: null, agent: null, agentTab: null });
  };
  const disableSelectedAgent = async () => {
    if (!selectedAgent || !canManageAgents) return;
    setUpdatingAgentId(selectedAgent.id);
    setLocalNotice(null);
    try {
      const updated = await updateWorkspaceAgent(workspace.id, selectedAgent.id, { status: 'disabled' });
      updateSelectedAgent(selectedAgent.id, () => mapApiAgent(updated, workspace.name, ownerLabelsByUserId));
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
      updateSelectedAgent(selectedAgent.id, () => mapApiAgent(updated, workspace.name, ownerLabelsByUserId));
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
      navigate(AppPaths.workspaceAgents(workspace.id), { replace: true });
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
        avatarEmoji: createDraft.avatarEmoji,
        description: createDraft.description.trim(),
        instructions: createDraft.instructions.trim() || createDraft.description.trim(),
        providerType: createDraft.providerType,
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
  const duplicateAgent = async (agent: AgentDefinition) => {
    if (!canManageAgents || duplicatingAgentId) return;
    setDuplicatingAgentId(agent.id);
    setLocalNotice(null);
    try {
      const created = await duplicateWorkspaceAgent(workspace.id, agent.id);
      const mapped = mapApiAgent(created, workspace.name, ownerLabelsByUserId);
      const draft = createAgentEditDraft(mapped);
      setAgents((current) => [mapped, ...current.filter((agent) => agent.id !== mapped.id)]);
      setSelectedAgentId(mapped.id);
      editDraftSourceRef.current = { agentId: mapped.id, draft };
      setEditDraft(draft);
      setLocalNotice({ tone: 'success', message: `Duplicated ${agent.name} as a draft.` });
      navigate(AppPaths.workspaceAgentDetail(workspace.id, mapped.id, 'settings'));
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not duplicate this agent.' });
    } finally {
      setDuplicatingAgentId('');
    }
  };
  const saveAgentEdits = async () => {
    if (!editingAgent || !editDraft || !editDraft.name.trim() || !editDraft.description.trim()) return;
    setUpdatingAgentId(editingAgent.id);
    setLocalNotice(null);
    try {
      const input = {
        name: editDraft.name.trim(),
        avatarEmoji: editDraft.avatarEmoji,
        description: editDraft.description.trim(),
        instructions: editDraft.instructions.trim() || editDraft.description.trim(),
        providerType: editDraft.providerType,
        status: editDraft.status,
        ownerUserId: editDraft.ownerUserId.trim() || undefined,
        trustPolicy: { level: 'restricted', allowExternalData: editDraft.allowExternalData }
      };
      const updated = await updateWorkspaceAgent(workspace.id, editingAgent.id, input);
      const mappedOwner = ownerUserOptions.find((member) => member.userId === editDraft.ownerUserId.trim());
      const mappedBase = mapApiAgent(updated, workspace.name, ownerLabelsByUserId);
      const mapped = { ...mappedBase, owner: mappedOwner?.name || mappedOwner?.email || mappedBase.owner };
      setAgents((current) => current.map((agent) => agent.id === mapped.id ? mapped : agent));
      setSelectedAgentId(mapped.id);
      const savedDraft = createAgentEditDraft(mapped);
      editDraftSourceRef.current = { agentId: mapped.id, draft: savedDraft };
      setEditDraft(savedDraft);
      setLocalNotice({ tone: 'success', message: 'Agent updated. Review affected workflows before the next run.' });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not update this agent.' });
    } finally {
      setUpdatingAgentId('');
    }
  };
  const updateSelectedAgentPermissionMode = async (permissionMode: AgentDefinition['permissionMode']) => {
    if (!selectedAgent || !canManageAgents || permissionMode === selectedAgent.permissionMode) return;
    setUpdatingAgentId(selectedAgent.id);
    setLocalNotice(null);
    try {
      const updated = await updateWorkspaceAgent(workspace.id, selectedAgent.id, { permissionMode });
      const mapped = mapApiAgent(updated, workspace.name, ownerLabelsByUserId);
      setAgents((current) => current.map((agent) => agent.id === mapped.id ? mapped : agent));
      setLocalNotice({ tone: 'success', message: 'Agent permission mode updated.' });
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Could not update the Agent permission mode.' });
    } finally {
      setUpdatingAgentId('');
    }
  };
  const feedback = (
    <>
      {(agentLoadError || ownerUserLoadError) && (
        <Notice title="Some live data is unavailable" actionLabel="Retry all" onAction={() => { setAgentCatalogReloadKey((value) => value + 1); setOwnerUsersReloadKey((value) => value + 1); }}>
          <details><summary className="cursor-pointer">Fallback data keeps the catalog available. Show details</summary><ul className="mt-2 list-disc pl-5">{agentLoadError && <li>Agent definitions may be stale.</li>}{ownerUserLoadError && <li>Owner choices are limited to cached members.</li>}</ul></details>
        </Notice>
      )}
      {!canManageAgents && (
        <div className="mb-4 rounded-md border border-ui-border bg-ui-surface px-3 py-2 type-caption type-emphasis text-ui-text-muted">
          You can inspect agents. Ask a workspace manager for manage_agents permission to create or change them.
        </div>
      )}
      {localNotice && (
        <div
          role={localNotice.tone === 'danger' ? 'alert' : 'status'}
          aria-live={localNotice.tone === 'danger' ? 'assertive' : 'polite'}
          aria-atomic="true"
          className={`mb-4 rounded-md border px-3 py-2 type-caption type-emphasis ${localNotice.tone === 'danger' ? 'border-status-danger/30 bg-status-danger-soft text-status-danger-text' : 'border-status-success/30 bg-status-success-soft text-status-success-text'}`}
        >
          {localNotice.message}
        </div>
      )}
    </>
  );

  const drawers = (
    <>
      {(createPanelOpen || discardRequest?.panel === 'create') && (
        <CreateAgentDrawer createDraft={createDraft} setCreateDraft={setCreateDraft} creatingAgent={creatingAgent} onClose={requestCloseCreate} onSave={() => void createControlPlaneAgent()} />
      )}
      {discardRequest && (
        <UnsavedChangesDialog
          title="Discard unsaved agent changes?"
          body={discardRequest.panel === 'create'
            ? 'The agent name, emoji, assignment purpose, and instructions will be lost.'
            : `Your unsaved changes to ${editingAgent?.name || 'this agent'} will be lost.`}
          cancelLabel="Keep editing"
          discardLabel="Discard changes"
          closeLabel="Close discard confirmation"
          onCancel={cancelDiscard}
          onDiscard={discardChanges}
        />
      )}
    </>
  );

  const detail = selectedAgent ? (
    <WorkspaceAgentDetailPanel
      selectedAgent={selectedAgent}
      activeTab={activeAgentTab}
      titleId="agent-details-title"
      chatContent={
        <AgentChatPanel
          agent={selectedAgent}
          currentUserId={currentUserId}
          isDark={isDark}
          permissions={workspace.permissions}
          onOpenAiSettings={() => navigate(AppPaths.workspaceAiSettings(workspace.id))}
        />
      }
      canManageAgents={canManageAgents}
      canManageMcp={canManageMcp}
      canManageSkills={canManageSkills}
      updatingAgentId={updatingAgentId}
      disableConfirmAgentId={disableConfirmAgentId}
      setDisableConfirmAgentId={setDisableConfirmAgentId}
      deleteConfirmAgentId={deleteConfirmAgentId}
      deleteError={deleteConfirmAgentId && localNotice?.tone === 'danger' ? localNotice.message : null}
      setDeleteConfirmAgentId={setDeleteConfirmAgentId}
      definitionSettings={activeAgentTab === 'settings' && editingAgent && editDraft ? (
        <AgentDefinitionSettingsSection
          key={editingAgent.id}
          agent={editingAgent}
          canManageAgents={canManageAgents}
          draft={editDraft}
          setDraft={setEditDraft}
          ownerSelectOptions={ownerSelectOptions}
          changeSummary={editChangeSummary}
          saving={updatingAgentId === editingAgent.id}
          onReset={requestCloseEdit}
          onSave={() => void saveAgentEdits()}
        />
      ) : undefined}
      onUpdatePermissionMode={updateSelectedAgentPermissionMode}
      onReactivateSelectedAgent={() => void reactivateSelectedAgent()}
      onDisableSelectedAgent={() => void disableSelectedAgent()}
      onDeleteSelectedAgent={() => void deleteSelectedAgent()}
    />
  ) : (
    <div role="status" className="type-body type-emphasis flex h-full items-center justify-center bg-ui-bg text-ui-text-muted">
      {agentCatalogReady ? 'Agent not found.' : 'Loading Agent...'}
    </div>
  );

  if (routeState) {
    return (
      <>
        {drawers}
        {activeAgentTab === 'settings' ? <PageShell>{feedback}{detail}</PageShell> : detail}
      </>
    );
  }

  return (
    <PageShell>
      <WorkspaceAgentsRouteHeader
        canManageAgents={canManageAgents}
        onCreateAgent={() => updateUrlSearch({ panel: 'create', agent: null, agentTab: null })}
      />
      {feedback}
      {drawers}
      <WorkspaceAgentsCatalog
        agents={workspaceCatalogAgents}
        visibleAgents={visibleAgents}
        loading={!agentCatalogReady}
        canManageAgents={canManageAgents}
        query={query}
        onQueryChange={(next) => { setQuery(next); updateUrlSearch({ q: next || null }, { replace: true }); }}
        catalogFilters={catalogFilters}
        dockedQuickChatOpen={quickChatLayoutReserved}
        duplicatingAgentId={duplicatingAgentId}
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
        onQuickChat={openQuickChat}
        onDuplicate={(agent) => void duplicateAgent(agent)}
        onOpenSettings={(agent) => navigate(AppPaths.workspaceAgentDetail(workspace.id, agent.id, 'settings'))}
      />
      <AgentQuickChatPanel
        agent={selectedAgent}
        currentUserId={currentUserId}
        isDark={isDark}
        isOpen={quickChatOpen}
        permissions={workspace.permissions}
        onClose={closeQuickChat}
        onExitComplete={() => setQuickChatLayoutReserved(false)}
        onMaximize={() => {
          if (!selectedAgent) return;
          navigate(AppPaths.workspaceAgentDetail(workspace.id, selectedAgent.id, 'chat'));
        }}
        onOpenAiSettings={() => {
          if (!selectedAgent) return;
          closeQuickChat();
          navigate(AppPaths.workspaceAiSettings(
            workspace.id,
            AppPaths.workspaceAgentDetail(workspace.id, selectedAgent.id, 'chat')
          ));
        }}
      />
    </PageShell>
  );
};
