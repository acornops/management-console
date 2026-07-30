import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CompactControlItem } from '@acornops/ui';
import { enabledScheduleImpactForAgent } from '@/features/catalog/mcpCredentialModeImpact';
import { useMcpConnections } from '@/features/catalog/useMcpConnections';
import { updateUrlSearch, useUrlSearchState } from '@/hooks/useUrlSearchState';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import { useAgentMcpOAuthFeedback } from '@/pages/agents/useAgentMcpOAuthFeedback';
import {
  createAgentMcpServer,
  listAgentMcpServers,
  listAgentSkills,
  listWorkspaceNativeTools,
  updateAgentMcpServer,
  type AgentMcpServerApi,
  type AgentSkillApi,
  type WorkspaceNativeToolApi
} from '@/services/control-plane/agentApi';
import { listTargetsForWorkspace } from '@/services/control-plane/targetApi';
import { listWorkspaceWorkflowSchedules, listWorkspaceWorkflows, type WorkflowOption } from '@/services/control-plane/workflowApi';

export type CapabilityTab = 'mcp' | 'tools' | 'skills';

interface UseAgentCapabilitiesOptions {
  agent: AgentDefinition;
  canManageAgents: boolean;
  canManageMcp: boolean;
  canManageSkills: boolean;
}

export function useAgentCapabilities({ agent, canManageAgents, canManageMcp, canManageSkills }: UseAgentCapabilitiesOptions) {
  const { t } = useTranslation();
  const search = useUrlSearchState();
  const routeTab = search.get('capabilityTab');
  const activeTab: CapabilityTab = routeTab === 'tools' || routeTab === 'skills' ? routeTab : 'mcp';
  const [servers, setServers] = React.useState<AgentMcpServerApi[]>(agent.mcpInstallations || []);
  const [skills, setSkills] = React.useState<AgentSkillApi[]>(agent.skillInstallations || []);
  const [nativeTools, setNativeTools] = React.useState<WorkspaceNativeToolApi[]>([]);
  const [assignedNativeToolIds, setAssignedNativeToolIds] = React.useState<string[]>(agent.tools || []);
  const [nativeToolConfigs, setNativeToolConfigs] = React.useState<Record<string, Record<string, unknown>>>(agent.nativeToolConfigs || {});
  const [toolRefreshErrors, setToolRefreshErrors] = React.useState<Record<string, string>>({});
  const [credentialDialogServer, setCredentialDialogServer] = React.useState<AgentMcpServerApi | null>(null);
  const [busy, setBusy] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [error, setError] = React.useState('');
  const [manualServer, setManualServer] = React.useState<{
    name: string;
    url: string;
    authType: 'none' | 'bearer_token' | 'custom_header' | 'oauth';
    credentialMode: 'none' | 'workspace' | 'individual';
    authHeaderName: string;
  }>({
    name: '',
    url: '',
    authType: 'none',
    credentialMode: 'none',
    authHeaderName: ''
  });
  const [manualServerOpen, setManualServerOpen] = React.useState(false);
  const [manualSkill, setManualSkill] = React.useState({
    name: '',
    description: '',
    content: ''
  });
  const [targetOptions, setTargetOptions] = React.useState<WorkflowOption[]>([]);
  const [constraintEditor, setConstraintEditor] = React.useState<{
    serverId: string;
    targetTypes: string[];
    targetIds: string[];
  } | null>(null);
  const [renameEditor, setRenameEditor] = React.useState<{
    serverId: string;
    name: string;
  } | null>(null);
  const [removeServerId, setRemoveServerId] = React.useState('');
  const [credentialModeChange, setCredentialModeChange] = React.useState<{
    server: AgentMcpServerApi;
    credentialMode: 'workspace' | 'individual';
    affectedScheduleCount: number;
  } | null>(null);
  const [skillEditor, setSkillEditor] = React.useState<{
    skillId: string;
    name: string;
    description: string;
    content: string;
  } | null>(null);
  const [removeSkillId, setRemoveSkillId] = React.useState('');
  const [gitSkill, setGitSkill] = React.useState({
    url: '',
    ref: 'main',
    path: '',
    commit: '',
    content: ''
  });
  const recoveryServerId = search.get('mcpServer');
  const recoveryAction = search.get('mcpAction');
  const oauthResult = search.get('mcpOAuthResult');
  const serverRows = React.useRef(new Map<string, HTMLElement>());
  const recoveryControls = React.useRef(new Map<string, HTMLButtonElement>());
  const managedConnectionMessages = React.useRef(new Map<string, HTMLParagraphElement>());
  const focusedRecoveryKey = React.useRef<string | null>(null);
  const renameTriggers = React.useRef(new Map<string, HTMLButtonElement>());
  const credentialModeTriggers = React.useRef(new Map<string, HTMLButtonElement>());
  const removeServerTriggers = React.useRef(new Map<string, HTMLButtonElement>());
  const editSkillTriggers = React.useRef(new Map<string, HTMLButtonElement>());
  const removeSkillTriggers = React.useRef(new Map<string, HTMLButtonElement>());
  const tabs = React.useMemo<Array<CompactControlItem<CapabilityTab>>>(
    () => [
      { value: 'mcp', label: 'MCP' },
      {
        value: 'tools',
        label: t('agentsWorkflows.agents.details.capabilities.tabs.tools')
      },
      {
        value: 'skills',
        label: t('agentsWorkflows.agents.details.capabilities.tabs.skills')
      }
    ],
    [t]
  );
  const reload = React.useCallback(async () => {
    const [loadedServers, loadedSkills, loadedNativeTools] = await Promise.all([
      listAgentMcpServers(agent.workspaceId, agent.id),
      listAgentSkills(agent.workspaceId, agent.id),
      listWorkspaceNativeTools(agent.workspaceId).catch(() => [])
    ]);
    setServers(loadedServers);
    setSkills(loadedSkills);
    setNativeTools(loadedNativeTools);
  }, [agent.id, agent.workspaceId]);

  React.useEffect(() => {
    void reload().catch(() => undefined);
  }, [reload]);

  React.useEffect(() => {
    setAssignedNativeToolIds(agent.tools || []);
    setNativeToolConfigs(agent.nativeToolConfigs || {});
  }, [agent.id, agent.nativeToolConfigs, agent.tools]);

  React.useEffect(() => {
    let mounted = true;
    listTargetsForWorkspace(agent.workspaceId, { limit: 200 })
      .then(
        (page) =>
          mounted &&
          setTargetOptions(
            page.items.map((target) => ({
              value: target.id,
              label: target.name,
              description: `${target.targetType === 'kubernetes' ? 'Kubernetes cluster' : 'Virtual machine'} · ${target.status}`
            }))
          )
      )
      .catch(() => mounted && setTargetOptions([]));
    return () => {
      mounted = false;
    };
  }, [agent.workspaceId]);

  React.useEffect(() => {
    if (recoveryAction !== 'connect_by_url') return;
    setManualServerOpen(true);
    updateUrlSearch({ mcpAction: null }, { replace: true });
  }, [recoveryAction]);

  const clearSuccessfulRecovery = (serverId: string) => {
    if (recoveryServerId !== serverId) return;
    updateUrlSearch({ mcpServer: null, mcpAction: null }, { replace: true });
  };

  const refreshAfterCredentialConnection = async (server: AgentMcpServerApi): Promise<void> => {
    try {
      await reload();
      setToolRefreshErrors((current) => {
        const next = { ...current };
        delete next[server.id];
        return next;
      });
    } catch (cause) {
      setToolRefreshErrors((current) => ({
        ...current,
        [server.id]: 'The credential is connected, but tools may be stale. Retry the installation refresh.'
      }));
      throw cause;
    }
  };

  const {
    connections,
    connectionErrors: connectionLoadErrors,
    loadingByServerId: connectionLoadingByServerId,
    pendingServerId: pendingConnectionServerId,
    connect,
    prepareOAuth,
    startOAuth,
    verify,
    disconnect,
    retry,
    reloadConnections,
    retryAfterSecondsFor
  } = useMcpConnections({
    workspaceId: agent.workspaceId,
    destination: { kind: 'agent', id: agent.id },
    installations: servers,
    onConnectionReady: refreshAfterCredentialConnection,
    onRefreshError: (_server, message) => setError(message),
    onError: (message) => setError(message || '')
  });
  const oauthReturnPath = useAgentMcpOAuthFeedback({
    result: oauthResult,
    reload,
    reloadConnections,
    setNotice,
    setError
  });

  React.useEffect(() => {
    if (!recoveryServerId || !recoveryAction) {
      focusedRecoveryKey.current = null;
      return;
    }
    const recoveryKey = `${recoveryServerId}:${recoveryAction}`;
    if (focusedRecoveryKey.current === recoveryKey) return;
    const row = serverRows.current.get(recoveryServerId);
    if (!row) return;
    row.scrollIntoView({ block: 'center' });
    const frame = window.requestAnimationFrame(() => {
      const focusTarget = recoveryControls.current.get(recoveryServerId) || managedConnectionMessages.current.get(recoveryServerId);
      if (!focusTarget) return;
      focusTarget.focus();
      focusedRecoveryKey.current = recoveryKey;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [connectionLoadErrors, connectionLoadingByServerId, connections, recoveryAction, recoveryServerId, servers]);

  const run = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusy(key);
    setError('');
    setNotice('');
    try {
      await action();
      await reload();
      setNotice(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The capability change failed.');
    } finally {
      setBusy('');
    }
  };

  const addManualServer = async () => {
    setBusy('create-server');
    setError('');
    setNotice('');
    try {
      const created = await createAgentMcpServer(agent.workspaceId, agent.id, {
        name: manualServer.name.trim(),
        url: manualServer.url.trim(),
        authType: manualServer.authType,
        credentialMode: manualServer.authType === 'none'
          ? 'none'
          : manualServer.authType === 'oauth'
            ? 'individual'
            : manualServer.credentialMode,
        authHeaderName: manualServer.authType === 'custom_header' ? manualServer.authHeaderName.trim() : undefined
      });
      setManualServer({
        name: '',
        url: '',
        authType: 'none',
        credentialMode: 'none',
        authHeaderName: ''
      });
      setManualServerOpen(false);
      if (created.credentialMode !== 'none') {
        setServers((current) => [...current.filter((server) => server.id !== created.id), created]);
        setCredentialDialogServer(created);
        setNotice(created.authType === 'oauth'
          ? 'Installation created. Authorize your account to discover tools.'
          : created.credentialMode === 'workspace'
            ? 'Installation created. Connect a workspace credential to discover tools.'
            : 'Installation created. Connect your credential to discover tools.');
      } else {
        await reload();
        setNotice('MCP server added. Discovered tools are pending review.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The MCP server could not be added.');
    } finally {
      setBusy('');
    }
  };

  const prepareCredentialModeChange = async (server: AgentMcpServerApi) => {
    const credentialMode = server.credentialMode === 'workspace' ? 'individual' : 'workspace';
    setBusy(`credential-mode:${server.id}`);
    setError('');
    setNotice('');
    try {
      let affectedScheduleCount = 0;
      if (credentialMode === 'individual') {
        const [workflowItems, schedulePage] = await Promise.all([listWorkspaceWorkflows(agent.workspaceId), listWorkspaceWorkflowSchedules(agent.workspaceId)]);
        affectedScheduleCount = enabledScheduleImpactForAgent(workflowItems, schedulePage.items, agent.id).length;
      }
      setCredentialModeChange({
        server,
        credentialMode,
        affectedScheduleCount
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Credential ownership impact could not be loaded.');
    } finally {
      setBusy('');
    }
  };

  const confirmCredentialModeChange = async () => {
    if (!credentialModeChange) return;
    const { server, credentialMode, affectedScheduleCount } = credentialModeChange;
    setBusy(`credential-mode:${server.id}`);
    setError('');
    setNotice('');
    try {
      const updated = await updateAgentMcpServer(agent.workspaceId, agent.id, server.id, {
        credentialMode,
        expectedRevision: server.revision
      });
      await reload();
      setCredentialModeChange(null);
      setCredentialDialogServer(updated);
      setNotice(
        affectedScheduleCount > 0
          ? t('mcpServers.credentialModeChangedSchedulesPaused', {
              count: affectedScheduleCount
            })
          : t('mcpServers.credentialModeChanged')
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Credential ownership could not be changed.');
    } finally {
      setBusy('');
    }
  };

  return {
    t,
    activeTab,
    tabs,
    servers,
    skills,
    nativeTools,
    assignedNativeToolIds,
    setAssignedNativeToolIds,
    nativeToolConfigs,
    setNativeToolConfigs,
    toolRefreshErrors,
    credentialDialogServer,
    setCredentialDialogServer,
    busy,
    setBusy,
    notice,
    setNotice,
    error,
    setError,
    manualServer,
    setManualServer,
    manualServerOpen,
    setManualServerOpen,
    manualSkill,
    setManualSkill,
    targetOptions,
    constraintEditor,
    setConstraintEditor,
    renameEditor,
    setRenameEditor,
    removeServerId,
    setRemoveServerId,
    credentialModeChange,
    setCredentialModeChange,
    skillEditor,
    setSkillEditor,
    removeSkillId,
    setRemoveSkillId,
    gitSkill,
    setGitSkill,
    recoveryServerId,
    recoveryAction,
    serverRows,
    recoveryControls,
    managedConnectionMessages,
    renameTriggers,
    credentialModeTriggers,
    removeServerTriggers,
    editSkillTriggers,
    removeSkillTriggers,
    connections,
    connectionLoadErrors,
    connectionLoadingByServerId,
    pendingConnectionServerId,
    connect,
    prepareOAuth,
    startOAuth,
    verify,
    disconnect,
    retry,
    retryAfterSecondsFor,
    oauthReturnPath,
    clearSuccessfulRecovery,
    refreshAfterCredentialConnection,
    run,
    addManualServer,
    prepareCredentialModeChange,
    confirmCredentialModeChange,
    tools: servers.flatMap((server) => server.tools.map((tool) => ({ server, tool }))),
    mcpWritable: canManageAgents && canManageMcp,
    skillsWritable: canManageAgents && canManageSkills
  };
}

export type AgentCapabilitiesState = ReturnType<typeof useAgentCapabilities>;
