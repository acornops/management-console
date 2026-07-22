import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { SegmentedTabs, type CompactControlItem } from '@/components/common/ComponentVocabulary';
import { InlineConfirmation } from '@/components/common/InlineConfirmation';
import { Select } from '@/components/common/Select';
import { StatusBadge } from '@/components/common/StatusBadge';
import { McpCredentialDialog } from '@/features/catalog/McpCredentialDialog';
import { AddMcpServerAction } from '@/features/catalog/AddMcpServerAction';
import { McpCredentialOwnershipSelector } from '@/features/catalog/McpCredentialOwnershipSelector';
import { enabledScheduleImpactForAgent } from '@/features/catalog/mcpCredentialModeImpact';
import { useMcpConnections } from '@/features/catalog/useMcpConnections';
import { updateUrlSearch, useUrlSearchState } from '@/hooks/useUrlSearchState';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import {
  createAgentMcpServer,
  createAgentSkill,
  deleteAgentMcpServer,
  deleteAgentSkill,
  importAgentSkill,
  listAgentMcpServers,
  listAgentSkills,
  listWorkspaceNativeTools,
  reimportAgentSkill,
  testAgentMcpServer,
  updateAgentMcpServer,
  updateAgentSkill,
  type AgentMcpServerApi,
  type AgentSkillApi,
  type WorkspaceNativeToolApi
} from '@/services/control-plane/agentApi';
import { catalogApi } from '@/services/control-plane/catalogApi';
import { AppPaths } from '@/utils/routes';
import {
  listWorkspaceWorkflowSchedules,
  listWorkspaceWorkflows,
  type WorkflowOption
} from '@/services/control-plane/workflowApi';
import { listTargetsForWorkspace } from '@/services/control-plane/targetApi';
import { AgentToolsPanel } from '@/pages/agents/AgentToolsPanel';
type CapabilityTab = 'mcp' | 'tools' | 'skills';
interface AgentCapabilitiesPanelProps {
  agent: AgentDefinition;
  canManageAgents: boolean;
  canManageMcp: boolean;
  canManageSkills: boolean;
}
const inputClass = 'min-h-11 w-full rounded-md border border-ui-border bg-ui-surface px-3 text-sm text-ui-text focus-visible:ring-2 focus-visible:ring-accent';
export const AgentCapabilitiesPanel: React.FC<AgentCapabilitiesPanelProps> = ({
  agent,
  canManageAgents,
  canManageMcp,
  canManageSkills
}) => {
  const { t } = useTranslation();
  const search = useUrlSearchState();
  const routeTab = search.get('capabilityTab');
  const activeTab: CapabilityTab = routeTab === 'tools' || routeTab === 'skills' ? routeTab : 'mcp';
  const [servers, setServers] = React.useState<AgentMcpServerApi[]>(agent.mcpInstallations || []);
  const [skills, setSkills] = React.useState<AgentSkillApi[]>(agent.skillInstallations || []);
  const [nativeTools, setNativeTools] = React.useState<WorkspaceNativeToolApi[]>([]);
  const [assignedNativeToolIds, setAssignedNativeToolIds] = React.useState<string[]>(agent.tools || []);
  const [toolRefreshErrors, setToolRefreshErrors] = React.useState<Record<string, string>>({});
  const [credentialDialogServer, setCredentialDialogServer] = React.useState<AgentMcpServerApi | null>(null);
  const [busy, setBusy] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [error, setError] = React.useState('');
  const [manualServer, setManualServer] = React.useState<{ name: string; url: string; authType: 'none' | 'bearer_token' | 'custom_header'; credentialMode: 'none' | 'workspace' | 'individual'; authHeaderName: string }>({ name: '', url: '', authType: 'none', credentialMode: 'none', authHeaderName: '' });
  const [manualServerOpen, setManualServerOpen] = React.useState(false);
  const [manualSkill, setManualSkill] = React.useState({ name: '', description: '', content: '' });
  const [targetOptions, setTargetOptions] = React.useState<WorkflowOption[]>([]);
  const [constraintEditor, setConstraintEditor] = React.useState<{
    serverId: string; targetTypes: string[]; targetIds: string[];
  } | null>(null);
  const [renameEditor, setRenameEditor] = React.useState<{ serverId: string; name: string } | null>(null);
  const [removeServerId, setRemoveServerId] = React.useState('');
  const [credentialModeChange, setCredentialModeChange] = React.useState<{
    server: AgentMcpServerApi;
    credentialMode: 'workspace' | 'individual';
    affectedScheduleCount: number;
  } | null>(null);
  const [skillEditor, setSkillEditor] = React.useState<{ skillId: string; name: string; description: string; content: string } | null>(null);
  const [removeSkillId, setRemoveSkillId] = React.useState('');
  const [gitSkill, setGitSkill] = React.useState({ url: '', ref: 'main', path: '', commit: '', content: '' });
  const recoveryServerId = search.get('mcpServer');
  const recoveryAction = search.get('mcpAction');
  const serverRows = React.useRef(new Map<string, HTMLElement>());
  const recoveryControls = React.useRef(new Map<string, HTMLButtonElement>());
  const managedConnectionMessages = React.useRef(new Map<string, HTMLParagraphElement>());
  const focusedRecoveryKey = React.useRef<string | null>(null);
  const renameTriggers = React.useRef(new Map<string, HTMLButtonElement>());
  const credentialModeTriggers = React.useRef(new Map<string, HTMLButtonElement>());
  const removeServerTriggers = React.useRef(new Map<string, HTMLButtonElement>());
  const editSkillTriggers = React.useRef(new Map<string, HTMLButtonElement>());
  const removeSkillTriggers = React.useRef(new Map<string, HTMLButtonElement>());
  const tabs = React.useMemo<Array<CompactControlItem<CapabilityTab>>>(() => [
    { value: 'mcp', label: 'MCP' },
    { value: 'tools', label: t('agentsWorkflows.agents.details.capabilities.tabs.tools') },
    { value: 'skills', label: t('agentsWorkflows.agents.details.capabilities.tabs.skills') }
  ], [t]);
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
    let mounted = true;
    listTargetsForWorkspace(agent.workspaceId, { limit: 200 })
      .then((page) => mounted && setTargetOptions(page.items.map((target) => ({
        value: target.id,
        label: target.name,
        description: `${target.targetType === 'kubernetes' ? 'Kubernetes cluster' : 'Virtual machine'} · ${target.status}`
      }))))
      .catch(() => mounted && setTargetOptions([]));
    return () => { mounted = false; };
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
    verify,
    disconnect,
    retry,
    retryAfterSecondsFor
  } = useMcpConnections({
    workspaceId: agent.workspaceId,
    destination: { kind: 'agent', id: agent.id },
    installations: servers,
    onConnectionReady: refreshAfterCredentialConnection,
    onRefreshError: (_server, message) => setError(message),
    onError: (message) => setError(message || '')
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
      const focusTarget = recoveryControls.current.get(recoveryServerId)
        || managedConnectionMessages.current.get(recoveryServerId);
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
        credentialMode: manualServer.authType === 'none' ? 'none' : manualServer.credentialMode,
        authHeaderName: manualServer.authType === 'custom_header' ? manualServer.authHeaderName.trim() : undefined
      });
      setManualServer({ name: '', url: '', authType: 'none', credentialMode: 'none', authHeaderName: '' });
      setManualServerOpen(false);
      if (created.credentialMode !== 'none') {
        setServers((current) => [...current.filter((server) => server.id !== created.id), created]);
        setCredentialDialogServer(created);
        setNotice(created.credentialMode === 'workspace'
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
        const [workflowItems, schedulePage] = await Promise.all([
          listWorkspaceWorkflows(agent.workspaceId),
          listWorkspaceWorkflowSchedules(agent.workspaceId)
        ]);
        affectedScheduleCount = enabledScheduleImpactForAgent(workflowItems, schedulePage.items, agent.id).length;
      }
      setCredentialModeChange({ server, credentialMode, affectedScheduleCount });
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
      const updated = await updateAgentMcpServer(agent.workspaceId, agent.id, server.id, { credentialMode, expectedRevision: server.revision });
      await reload();
      setCredentialModeChange(null);
      setCredentialDialogServer(updated);
      setNotice(affectedScheduleCount > 0
        ? t('mcpServers.credentialModeChangedSchedulesPaused', { count: affectedScheduleCount })
        : t('mcpServers.credentialModeChanged'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Credential ownership could not be changed.');
    } finally {
      setBusy('');
    }
  };

  const tools = servers.flatMap((server) => server.tools.map((tool) => ({ server, tool })));
  const mcpWritable = canManageAgents && canManageMcp;
  const skillsWritable = canManageAgents && canManageSkills;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          activeValue={activeTab}
          allPanelsMounted={false}
          ariaLabel={t('agentsWorkflows.agents.details.capabilities.sectionsLabel')}
          idBase="agent-capability"
          items={tabs}
          onValueChange={(capabilityTab) => updateUrlSearch({ capabilityTab }, { replace: true })}
        />
        {activeTab === 'mcp' && (
          <AddMcpServerAction
            browseHref={AppPaths.workspaceCatalog(agent.workspaceId, { destination: `agent:${agent.id}` })}
            onConnectByUrl={() => setManualServerOpen(true)}
            size="sm"
          />
        )}
      </div>

      {error && <div role="alert" className="rounded-md border border-status-danger/30 bg-status-danger-soft px-3 py-2 text-sm text-status-danger-text">{error}</div>}
      {notice && <div role="status" className="rounded-md border border-status-success/30 bg-status-success-soft px-3 py-2 text-sm text-status-success-text">{notice}</div>}

      {activeTab === 'mcp' && (
        <div id="agent-capability-mcp-panel" role="tabpanel" className="space-y-4">
          {!mcpWritable && <p className="type-caption text-ui-text-muted">{t('agentsWorkflows.agents.details.capabilities.permissions.mcp')}</p>}
          {manualServerOpen && <section aria-labelledby="connect-agent-mcp-title" className="rounded-md border border-ui-border bg-ui-bg p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 id="connect-agent-mcp-title" className="text-sm font-semibold">Connect by URL</h3><p className="type-caption mt-1 text-ui-text-muted">Enter the actual remote Streamable HTTP endpoint. Registry, package, container, and stdio locations are not supported.</p></div>
              <Button size="sm" variant="tertiary" onClick={() => setManualServerOpen(false)}>Close</Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">Name<input value={manualServer.name} onChange={(event) => setManualServer((value) => ({ ...value, name: event.target.value }))} className={`mt-2 ${inputClass}`} /></label>
              <label className="text-sm font-semibold">HTTPS endpoint<input type="url" pattern="https://.*" value={manualServer.url} onChange={(event) => setManualServer((value) => ({ ...value, url: event.target.value }))} className={`mt-2 ${inputClass}`} /></label>
              <label className="text-sm font-semibold">Authentication<Select ariaLabel="Authentication" className="mt-2" value={manualServer.authType} options={[{ value: 'none' as const, label: 'None' }, { value: 'bearer_token' as const, label: 'Bearer token' }, { value: 'custom_header' as const, label: 'Custom header' }]} onChange={(authType) => setManualServer((value) => ({ ...value, authType, credentialMode: authType === 'none' ? 'none' : value.credentialMode === 'none' ? 'individual' : value.credentialMode }))} /></label>
              {manualServer.authType !== 'none' && <div className="sm:col-span-2">
                <McpCredentialOwnershipSelector
                  name="agent-mcp-credential-mode"
                  value={manualServer.credentialMode === 'workspace' ? 'workspace' : 'individual'}
                  onChange={(credentialMode) => setManualServer((value) => ({ ...value, credentialMode }))}
                />
              </div>}
              {manualServer.authType === 'custom_header' && <label className="text-sm font-semibold">Header name<input value={manualServer.authHeaderName} onChange={(event) => setManualServer((value) => ({ ...value, authHeaderName: event.target.value }))} className={`mt-2 ${inputClass}`} /></label>}
              <Button
                disabled={!mcpWritable || !manualServer.name.trim() || !manualServer.url.trim().startsWith('https://') || (manualServer.authType === 'custom_header' && !manualServer.authHeaderName.trim()) || Boolean(busy)}
                onClick={() => void addManualServer()}
              >
                Add server
              </Button>
            </div>
          </section>}

          <div className="divide-y divide-ui-border border-y border-ui-border">
            {servers.length ? servers.map((server) => {
              const connection = connections[server.id];
              const connectionLoadError = connectionLoadErrors[server.id];
              const connectionLoading = Boolean(connectionLoadingByServerId[server.id]);
              const retryAfterSeconds = retryAfterSecondsFor(server.id);
              const recoveryHighlighted = recoveryServerId === server.id;
              return (
                <article
                  key={server.id}
                  ref={(node) => { if (node) serverRows.current.set(server.id, node); else serverRows.current.delete(server.id); }}
                  data-mcp-server-id={server.id}
                  className={`py-4 ${recoveryHighlighted ? 'bg-accent-soft px-3 ring-2 ring-inset ring-accent/45' : ''}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm">{server.name}</strong>
                        <StatusBadge tone={server.enabled ? 'success' : 'neutral'}>{server.enabled ? 'Enabled' : 'Disabled'}</StatusBadge>
                        {server.provenance && <StatusBadge tone="neutral">Catalog v{server.provenance.version}</StatusBadge>}
                      </div>
                      <p className="type-code mt-1 break-all text-ui-text-muted">{server.url}</p>
                      <p className="type-caption mt-2 text-ui-text-muted">{server.tools.length} discovered tools · credential {server.credentialMode === 'workspace' ? 'workspace-managed' : server.credentialMode === 'individual' ? 'individual' : 'not required'} · connection {connectionLoading ? 'loading' : connection?.status || server.connectionStatus || 'not required'} · revision {server.revision}</p>
                      {connectionLoadError && <p role="alert" className="type-caption mt-1 text-status-danger-text">Credential connection status could not be loaded. Retry before making changes.</p>}
                      {server.credentialMode === 'workspace' && connection && !connection.canManage && <p ref={(node) => { if (node) managedConnectionMessages.current.set(server.id, node); else managedConnectionMessages.current.delete(server.id); }} tabIndex={recoveryServerId === server.id ? -1 : undefined} className="type-caption mt-1 text-ui-text-muted focus:outline-none">{recoveryServerId === server.id ? 'Ask a workspace administrator to connect this server.' : 'Managed by your workspace'}</p>}
                      {toolRefreshErrors[server.id] && <p role="alert" className="type-caption mt-1 text-status-warning-text">{toolRefreshErrors[server.id]}</p>}
                      {retryAfterSeconds > 0 && <p role="status" className="type-caption mt-1 text-status-warning-text">Connection controls unlock in {retryAfterSeconds}s.</p>}
                      {(server.targetConstraints.targetTypes.length > 0 || server.targetConstraints.targetIds.length > 0) && (
                        <p className="type-caption mt-1 text-ui-text-muted">Constraints: {[...server.targetConstraints.targetTypes, ...server.targetConstraints.targetIds].join(', ')}</p>
                      )}
                      {server.lastDiscoveryError && <p className="type-caption mt-1 text-status-warning-text">{server.lastDiscoveryError}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button ref={(node) => { if (node) renameTriggers.current.set(server.id, node); else renameTriggers.current.delete(server.id); }} size="sm" variant="secondary" disabled={!mcpWritable || Boolean(busy)} onClick={() => setRenameEditor({ serverId: server.id, name: server.name })}>{t('agentsWorkflows.agents.details.capabilities.actions.rename')}</Button>
                      <Button size="sm" variant="secondary" disabled={!mcpWritable || Boolean(busy)} onClick={() => {
                        setConstraintEditor({
                          serverId: server.id,
                          targetTypes: [...server.targetConstraints.targetTypes],
                          targetIds: [...server.targetConstraints.targetIds]
                        });
                      }}>Constraints</Button>
                      <Button size="sm" variant="secondary" disabled={!mcpWritable || Boolean(busy)} onClick={() => void run(`toggle:${server.id}`, () => updateAgentMcpServer(agent.workspaceId, agent.id, server.id, { enabled: !server.enabled, expectedRevision: server.revision }), `MCP server ${server.enabled ? 'disabled' : 'enabled'}.`)}>{server.enabled ? 'Disable' : 'Enable'}</Button>
                      {server.credentialMode !== 'none' && <Button ref={(node) => { if (node) credentialModeTriggers.current.set(server.id, node); else credentialModeTriggers.current.delete(server.id); }} size="sm" variant="secondary" disabled={!mcpWritable || Boolean(busy)} onClick={() => void prepareCredentialModeChange(server)}>{server.credentialMode === 'workspace' ? 'Use individual credentials' : 'Use workspace credential'}</Button>}
                      {server.authType === 'none' && <Button size="sm" variant="secondary" disabled={!mcpWritable || Boolean(busy)} onClick={() => void run(`test:${server.id}`, () => testAgentMcpServer(agent.workspaceId, agent.id, server.id), 'Connection tested and tools rediscovered.')}>Test / discover</Button>}
                      {server.provenance && <Button size="sm" variant="secondary" disabled={!mcpWritable || Boolean(busy)} onClick={() => void run(`reimport:${server.id}`, () => catalogApi.reimportAgentMcpServer(agent.workspaceId, agent.id, server.id, {
                        artifact: { sourceId: server.provenance?.sourceId, artifactName: server.provenance?.artifactName },
                        version: server.provenance?.version || '', remoteEndpoint: server.url, serverName: server.name,
                        enabled: server.enabled, expectedRevision: server.revision
                      }), 'Catalog server re-imported.')}>Re-import</Button>}
                      {server.credentialMode !== 'none' && connectionLoading && <Button size="sm" variant="secondary" disabled>Loading credential status…</Button>}
                      {server.credentialMode !== 'none' && connectionLoadError && <Button size="sm" variant="secondary" disabled={Boolean(busy)} onClick={() => void retry(server)}>Retry connection status</Button>}
                      {server.credentialMode !== 'none' && !connectionLoading && !connectionLoadError && connection?.canManage && connection.status === 'error' && <Button ref={(node) => { if (recoveryAction !== 'verify_mcp_server') return; if (node) recoveryControls.current.set(server.id, node); else recoveryControls.current.delete(server.id); }} data-mcp-action="verify_mcp_server" size="sm" variant="secondary" disabled={pendingConnectionServerId === server.id || retryAfterSeconds > 0} onClick={() => void verify(server).then((result) => { if (result?.status === 'connected') { setNotice('Credential verified and tools rediscovered.'); clearSuccessfulRecovery(server.id); } })}>{retryAfterSeconds > 0 ? `Try again in ${retryAfterSeconds}s` : 'Verify credential'}</Button>}
                      {server.credentialMode !== 'none' && !connectionLoading && !connectionLoadError && connection?.canManage && <Button ref={(node) => { if (recoveryAction !== 'connect_mcp_server') return; if (node) recoveryControls.current.set(server.id, node); else recoveryControls.current.delete(server.id); }} data-mcp-action="connect_mcp_server" size="sm" variant="secondary" disabled={pendingConnectionServerId === server.id || retryAfterSeconds > 0} onClick={() => setCredentialDialogServer(server)}>{retryAfterSeconds > 0 ? `Try again in ${retryAfterSeconds}s` : connection.status === 'missing' ? server.credentialMode === 'workspace' ? 'Connect workspace credential' : 'Connect your credential' : 'Replace credential'}</Button>}
                      {server.credentialMode !== 'none' && !connectionLoading && !connectionLoadError && connection?.canManage && (connection.status === 'connected' || connection.status === 'error') && <Button size="sm" variant="secondary" disabled={pendingConnectionServerId === server.id || retryAfterSeconds > 0} onClick={() => void disconnect(server).then((removed) => { if (removed) setNotice('Credential disconnected. You can reconnect immediately.'); })}>Disconnect</Button>}
                      {toolRefreshErrors[server.id] && <Button size="sm" variant="secondary" disabled={Boolean(busy)} onClick={() => void refreshAfterCredentialConnection(server)}>Retry tool refresh</Button>}
                      <Button ref={(node) => { if (node) removeServerTriggers.current.set(server.id, node); else removeServerTriggers.current.delete(server.id); }} size="sm" variant="danger" disabled={!canManageAgents || Boolean(busy)} onClick={() => setRemoveServerId(server.id)}>{t('agentsWorkflows.agents.details.capabilities.actions.remove')}</Button>
                    </div>
                  </div>
                  {renameEditor?.serverId === server.id && (
                    <section className="mt-4 rounded-md border border-ui-border bg-ui-bg p-3" aria-labelledby={`rename-mcp-${server.id}-title`}>
                      <h4 id={`rename-mcp-${server.id}-title`} className="type-micro-label">{t('agentsWorkflows.agents.details.capabilities.renameServer.title')}</h4>
                      <label className="type-label mt-3 block text-ui-text">
                        {t('agentsWorkflows.agents.details.capabilities.renameServer.name')}
                        <input autoFocus value={renameEditor.name} onChange={(event) => setRenameEditor((current) => current && ({ ...current, name: event.target.value }))} className={`mt-2 ${inputClass}`} />
                      </label>
                      <div className="mt-3 flex justify-end gap-2">
                        <Button size="sm" variant="tertiary" onClick={() => { setRenameEditor(null); window.requestAnimationFrame(() => renameTriggers.current.get(server.id)?.focus()); }}>{t('common.cancel')}</Button>
                        <Button size="sm" disabled={!renameEditor.name.trim() || renameEditor.name.trim() === server.name || Boolean(busy)} onClick={() => void run(`rename:${server.id}`, () => updateAgentMcpServer(agent.workspaceId, agent.id, server.id, { name: renameEditor.name.trim(), expectedRevision: server.revision }), t('agentsWorkflows.agents.details.capabilities.renameServer.success')).then(() => setRenameEditor(null))}>{t('agentsWorkflows.agents.details.capabilities.actions.save')}</Button>
                      </div>
                    </section>
                  )}
                  {credentialModeChange?.server.id === server.id && (
                    <InlineConfirmation
                      id={`credential-mode-${server.id}`}
                      title={t('mcpServers.credentialModeChangeTitle', { name: server.name })}
                      description={credentialModeChange.credentialMode === 'individual'
                        ? credentialModeChange.affectedScheduleCount > 0
                          ? t('mcpServers.confirmWorkspaceToIndividualWithSchedules', { count: credentialModeChange.affectedScheduleCount })
                          : t('mcpServers.confirmWorkspaceToIndividual')
                        : t('mcpServers.confirmIndividualToWorkspace')}
                      tone="warning"
                      confirmLabel={t('mcpServers.credentialModeChangeConfirm')}
                      confirmDisabled={Boolean(busy)}
                      cancelLabel={t('common.cancel')}
                      className="mt-4 rounded-md"
                      onCancel={() => {
                        setCredentialModeChange(null);
                        window.requestAnimationFrame(() => credentialModeTriggers.current.get(server.id)?.focus());
                      }}
                      onConfirm={() => void confirmCredentialModeChange()}
                    />
                  )}
                  {removeServerId === server.id && (
                    <InlineConfirmation
                      id={`remove-mcp-${server.id}`}
                      title={t('agentsWorkflows.agents.details.capabilities.removeServer.title', { name: server.name })}
                      description={t('agentsWorkflows.agents.details.capabilities.removeServer.description')}
                      tone="danger"
                      confirmVariant="danger"
                      confirmLabel={t('agentsWorkflows.agents.details.capabilities.removeServer.confirm')}
                      confirmDisabled={Boolean(busy)}
                      cancelLabel={t('common.cancel')}
                      className="mt-4 rounded-md"
                      onCancel={() => { setRemoveServerId(''); window.requestAnimationFrame(() => removeServerTriggers.current.get(server.id)?.focus()); }}
                      onConfirm={() => void run(`remove:${server.id}`, () => deleteAgentMcpServer(agent.workspaceId, agent.id, server.id), t('agentsWorkflows.agents.details.capabilities.removeServer.success')).then(() => setRemoveServerId(''))}
                    />
                  )}
                  {constraintEditor?.serverId === server.id && (
                    <section className="mt-4 rounded-md border border-ui-border bg-ui-bg p-3" aria-label={`Target constraints for ${server.name}`}>
                      <h4 className="type-micro-label">Target constraints</h4>
                      <p className="type-caption mt-1 text-ui-text-muted">Leave exact targets empty to allow every target of the selected types.</p>
                      <div className="mt-3 flex flex-wrap gap-4">
                        {([['kubernetes', 'Kubernetes'], ['virtual_machine', 'Virtual machines']] as const).map(([value, label]) => (
                          <label key={value} className="flex items-center gap-2 text-sm font-semibold">
                            <Checkbox checked={constraintEditor.targetTypes.includes(value)} onChange={(event) => setConstraintEditor((current) => current && ({
                              ...current,
                              targetTypes: event.target.checked
                                ? [...new Set([...current.targetTypes, value])]
                                : current.targetTypes.filter((type) => type !== value)
                            }))} />
                            {label}
                          </label>
                        ))}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {targetOptions.length ? targetOptions.map((target) => (
                          <label key={target.value} className="flex items-start gap-2 rounded-md border border-ui-border px-3 py-2 text-sm font-semibold">
                            <Checkbox className="mt-0.5" checked={constraintEditor.targetIds.includes(target.value)} disabled={target.disabled} onChange={(event) => setConstraintEditor((current) => current && ({
                              ...current,
                              targetIds: event.target.checked
                                ? [...new Set([...current.targetIds, target.value])]
                                : current.targetIds.filter((id) => id !== target.value)
                            }))} />
                            <span>{target.label}{target.description && <span className="type-caption mt-0.5 block text-ui-text-muted">{target.description}</span>}</span>
                          </label>
                        )) : <p className="type-caption text-ui-text-muted">No targets are registered.</p>}
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <Button size="sm" variant="tertiary" onClick={() => setConstraintEditor(null)}>Cancel</Button>
                        <Button size="sm" disabled={Boolean(busy)} onClick={() => void run(
                          `constraints:${server.id}`,
                          () => updateAgentMcpServer(agent.workspaceId, agent.id, server.id, {
                            targetConstraints: {
                              targetTypes: constraintEditor.targetTypes,
                              targetIds: constraintEditor.targetIds
                            },
                            expectedRevision: server.revision
                          }),
                          'Target constraints updated.'
                        ).then(() => setConstraintEditor(null))}>Save constraints</Button>
                      </div>
                    </section>
                  )}
                </article>
              );
            }) : <p className="py-5 text-sm text-ui-text-muted">No MCP servers installed.</p>}
          </div>
        </div>
      )}

      {activeTab === 'tools' && (
        <AgentToolsPanel
          agent={agent}
          nativeTools={nativeTools}
          assignedNativeToolIds={assignedNativeToolIds}
          tools={tools}
          busy={busy}
          canManageAgents={canManageAgents}
          mcpWritable={mcpWritable}
          setBusy={setBusy}
          setError={setError}
          setNotice={setNotice}
          setAssignedNativeToolIds={setAssignedNativeToolIds}
          run={run}
        />
      )}

      {activeTab === 'skills' && (
        <div id="agent-capability-skills-panel" role="tabpanel" className="space-y-4">
          {!skillsWritable && <p className="type-caption text-ui-text-muted">{t('agentsWorkflows.agents.details.capabilities.permissions.skills')}</p>}
          <div className="grid gap-4 lg:grid-cols-2">
            <details className="rounded-md border border-ui-border bg-ui-bg p-4">
              <summary className="cursor-pointer text-sm font-semibold">{t('agentsWorkflows.agents.details.capabilities.skills.createTitle')}</summary>
              <div className="mt-4 grid gap-3">
                <input aria-label={t('agentsWorkflows.agents.details.capabilities.skills.name')} placeholder={t('agentsWorkflows.agents.details.capabilities.skills.name')} value={manualSkill.name} onChange={(event) => setManualSkill((value) => ({ ...value, name: event.target.value }))} className={inputClass} />
                <input aria-label={t('agentsWorkflows.agents.details.capabilities.skills.description')} placeholder={t('agentsWorkflows.agents.details.capabilities.skills.description')} value={manualSkill.description} onChange={(event) => setManualSkill((value) => ({ ...value, description: event.target.value }))} className={inputClass} />
                <textarea aria-label="SKILL.md content" placeholder="SKILL.md content" value={manualSkill.content} onChange={(event) => setManualSkill((value) => ({ ...value, content: event.target.value }))} className={`${inputClass} min-h-32 p-3 font-mono text-xs`} />
                <Button disabled={!skillsWritable || !manualSkill.name.trim() || !manualSkill.content.trim() || Boolean(busy)} onClick={() => void run('create-skill', async () => {
                  await createAgentSkill(agent.workspaceId, agent.id, { name: manualSkill.name.trim(), description: manualSkill.description.trim(), files: [{ path: 'SKILL.md', content: manualSkill.content }] });
                  setManualSkill({ name: '', description: '', content: '' });
                }, 'Manual skill created.')}>{t('agentsWorkflows.agents.details.capabilities.skills.create')}</Button>
              </div>
            </details>
            <details className="rounded-md border border-ui-border bg-ui-bg p-4">
              <summary className="cursor-pointer text-sm font-semibold">{t('agentsWorkflows.agents.details.capabilities.skills.importTitle')}</summary>
              <div className="mt-4 grid gap-3">
                <input aria-label="Git URL" placeholder="https://github.com/org/repo" value={gitSkill.url} onChange={(event) => setGitSkill((value) => ({ ...value, url: event.target.value }))} className={inputClass} />
                <div className="grid grid-cols-2 gap-2"><input aria-label="Git ref" placeholder="Ref" value={gitSkill.ref} onChange={(event) => setGitSkill((value) => ({ ...value, ref: event.target.value }))} className={inputClass} /><input aria-label="Pinned commit" placeholder="Pinned commit" value={gitSkill.commit} onChange={(event) => setGitSkill((value) => ({ ...value, commit: event.target.value }))} className={inputClass} /></div>
                <input aria-label="Git path" placeholder="Path (optional)" value={gitSkill.path} onChange={(event) => setGitSkill((value) => ({ ...value, path: event.target.value }))} className={inputClass} />
                <textarea aria-label="Imported SKILL.md content" placeholder="Reviewed SKILL.md content" value={gitSkill.content} onChange={(event) => setGitSkill((value) => ({ ...value, content: event.target.value }))} className={`${inputClass} min-h-28 p-3 font-mono text-xs`} />
                <Button disabled={!skillsWritable || !gitSkill.url.trim() || !gitSkill.commit.trim() || !gitSkill.content.trim() || Boolean(busy)} onClick={() => void run('import-skill', async () => {
                  await importAgentSkill(agent.workspaceId, agent.id, { files: [{ path: 'SKILL.md', content: gitSkill.content }], source: { type: 'git', provider: gitSkill.url.includes('gitlab') ? 'gitlab' : 'github', url: gitSkill.url, ref: gitSkill.ref, path: gitSkill.path || undefined, pinnedCommit: gitSkill.commit } });
                  setGitSkill({ url: '', ref: 'main', path: '', commit: '', content: '' });
                }, 'Git skill imported.')}>{t('agentsWorkflows.agents.details.capabilities.skills.import')}</Button>
              </div>
            </details>
          </div>
          <div className="divide-y divide-ui-border border-y border-ui-border">
            {skills.length ? skills.map((skill) => (
              <article key={skill.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div>
                  <div className="flex flex-wrap gap-2"><strong className="text-sm">{skill.name}</strong><StatusBadge tone={skill.enabled ? 'success' : 'neutral'}>{skill.enabled ? t('agentsWorkflows.agents.details.capabilities.skills.enabled') : t('agentsWorkflows.agents.details.capabilities.skills.disabled')}</StatusBadge><StatusBadge tone="neutral">{skill.source.type}</StatusBadge></div>
                  <p className="type-caption mt-1 text-ui-text-muted">{t('agentsWorkflows.agents.details.capabilities.skills.revision', { revision: skill.revision, digest: skill.contentDigest })}</p>
                  <p role="status" className="type-caption mt-1 text-ui-text-muted">{t('agentsWorkflows.agents.details.capabilities.skills.validation')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button ref={(node) => { if (node) editSkillTriggers.current.set(skill.id, node); else editSkillTriggers.current.delete(skill.id); }} size="sm" variant="secondary" disabled={!skillsWritable || Boolean(busy)} onClick={() => setSkillEditor({ skillId: skill.id, name: skill.name, description: skill.description, content: skill.files.find((file) => file.path === 'SKILL.md')?.content || '' })}>{t('agentsWorkflows.agents.details.capabilities.actions.edit')}</Button>
                  <Button size="sm" variant="secondary" disabled={!skillsWritable || Boolean(busy)} onClick={() => void run(`skill:${skill.id}`, () => updateAgentSkill(agent.workspaceId, agent.id, skill.id, { enabled: !skill.enabled, expectedRevision: skill.revision }), `Skill ${skill.enabled ? 'disabled' : 'enabled'}.`)}>{skill.enabled ? 'Disable' : 'Enable'}</Button>
                  {skill.source.type === 'git' && skill.source.url && skill.source.ref && skill.source.pinnedCommit && <Button size="sm" variant="secondary" disabled={!skillsWritable || Boolean(busy)} onClick={() => void run(`reimport-skill:${skill.id}`, () => reimportAgentSkill(agent.workspaceId, agent.id, skill.id, {
                    files: skill.files.map((file) => ({ path: file.path, content: file.content })),
                    source: { type: 'git', provider: skill.source.provider || 'github', url: skill.source.url as string, ref: skill.source.ref as string, path: skill.source.path, pinnedCommit: skill.source.pinnedCommit as string },
                    expectedRevision: skill.revision
                  }), 'Git skill re-imported.')}>Re-import</Button>}
                  <Button ref={(node) => { if (node) removeSkillTriggers.current.set(skill.id, node); else removeSkillTriggers.current.delete(skill.id); }} size="sm" variant="danger" disabled={!canManageAgents || Boolean(busy)} onClick={() => setRemoveSkillId(skill.id)}>{t('agentsWorkflows.agents.details.capabilities.actions.remove')}</Button>
                </div>
                {skillEditor?.skillId === skill.id && (
                  <section className="basis-full rounded-md border border-ui-border bg-ui-bg p-3" aria-labelledby={`edit-skill-${skill.id}-title`}>
                    <h4 id={`edit-skill-${skill.id}-title`} className="type-micro-label">{t('agentsWorkflows.agents.details.capabilities.editSkill.title')}</h4>
                    <div className="mt-3 grid gap-3">
                      <input autoFocus aria-label={t('agentsWorkflows.agents.details.capabilities.editSkill.name')} value={skillEditor.name} onChange={(event) => setSkillEditor((current) => current && ({ ...current, name: event.target.value }))} className={inputClass} />
                      <input aria-label={t('agentsWorkflows.agents.details.capabilities.editSkill.description')} value={skillEditor.description} onChange={(event) => setSkillEditor((current) => current && ({ ...current, description: event.target.value }))} className={inputClass} />
                      <textarea aria-label={t('agentsWorkflows.agents.details.capabilities.editSkill.content')} value={skillEditor.content} onChange={(event) => setSkillEditor((current) => current && ({ ...current, content: event.target.value }))} className={`${inputClass} min-h-32 p-3 font-mono text-xs`} />
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button size="sm" variant="tertiary" onClick={() => { setSkillEditor(null); window.requestAnimationFrame(() => editSkillTriggers.current.get(skill.id)?.focus()); }}>{t('common.cancel')}</Button>
                      <Button size="sm" disabled={!skillEditor.name.trim() || !skillEditor.content.trim() || Boolean(busy)} onClick={() => void run(`edit-skill:${skill.id}`, () => updateAgentSkill(agent.workspaceId, agent.id, skill.id, { name: skillEditor.name.trim(), description: skillEditor.description.trim(), files: [{ path: 'SKILL.md', content: skillEditor.content }], expectedRevision: skill.revision }), t('agentsWorkflows.agents.details.capabilities.editSkill.success')).then(() => setSkillEditor(null))}>{t('agentsWorkflows.agents.details.capabilities.actions.save')}</Button>
                    </div>
                  </section>
                )}
                {removeSkillId === skill.id && (
                  <InlineConfirmation
                    id={`remove-skill-${skill.id}`}
                    title={t('agentsWorkflows.agents.details.capabilities.removeSkill.title', { name: skill.name })}
                    description={t('agentsWorkflows.agents.details.capabilities.removeSkill.description')}
                    tone="danger"
                    confirmVariant="danger"
                    confirmLabel={t('agentsWorkflows.agents.details.capabilities.removeSkill.confirm')}
                    confirmDisabled={Boolean(busy)}
                    cancelLabel={t('common.cancel')}
                    className="mt-4 basis-full rounded-md"
                    onCancel={() => { setRemoveSkillId(''); window.requestAnimationFrame(() => removeSkillTriggers.current.get(skill.id)?.focus()); }}
                    onConfirm={() => void run(`remove-skill:${skill.id}`, () => deleteAgentSkill(agent.workspaceId, agent.id, skill.id), t('agentsWorkflows.agents.details.capabilities.removeSkill.success')).then(() => setRemoveSkillId(''))}
                  />
                )}
              </article>
            )) : <p className="py-5 text-sm text-ui-text-muted">{t('agentsWorkflows.agents.details.capabilities.skills.empty')}</p>}
          </div>
        </div>
      )}
      {credentialDialogServer && (
        <McpCredentialDialog
          serverName={credentialDialogServer.name}
          serverUrl={credentialDialogServer.url}
          authType={connections[credentialDialogServer.id]?.authType || credentialDialogServer.authType}
          authHeaderName={credentialDialogServer.authHeaderName}
          credentialMode={credentialDialogServer.credentialMode === 'workspace' ? 'workspace' : 'individual'}
          mode={connections[credentialDialogServer.id]?.status === 'missing' ? 'connect' : 'replace'}
          retryAfterSeconds={retryAfterSecondsFor(credentialDialogServer.id)}
          onClose={() => setCredentialDialogServer(null)}
          onSubmit={async (credential) => {
            const connection = await connect(credentialDialogServer, credential);
            if (connection?.status === 'connected') {
              setNotice('Credential verified and tools discovered.');
              clearSuccessfulRecovery(credentialDialogServer.id);
              setCredentialDialogServer(null);
            }
          }}
        />
      )}
    </div>
  );
};
