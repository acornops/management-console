import React from 'react';
import { Button } from '@acornops/ui';
import { Checkbox } from '@acornops/ui';
import { SegmentedTabs } from '@acornops/ui';
import { InlineConfirmation } from '@acornops/ui';
import { Select } from '@acornops/ui';
import { StatusBadge } from '@acornops/ui';
import { McpCredentialDialog } from '@/features/catalog/McpCredentialDialog';
import { AddMcpServerAction } from '@/features/catalog/AddMcpServerAction';
import { McpCredentialOwnershipSelector } from '@/features/catalog/McpCredentialOwnershipSelector';
import { updateUrlSearch } from '@/hooks/useUrlSearchState';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import { deleteAgentMcpServer, testAgentMcpServer, updateAgentMcpServer } from '@/services/control-plane/agentApi';
import { catalogApi } from '@/services/control-plane/catalogApi';
import { AppPaths } from '@/utils/routes';
import { AgentSkillsPanel } from '@/pages/agents/AgentSkillsPanel';
import { AgentToolsPanel } from '@/pages/agents/AgentToolsPanel';
import { useAgentCapabilities } from '@/pages/agents/useAgentCapabilities';
import { TextInput } from '@acornops/ui';
interface AgentCapabilitiesPanelProps {
  agent: AgentDefinition;
  canManageAgents: boolean;
  canManageMcp: boolean;
  canManageSkills: boolean;
}
const inputClass = 'min-h-11 w-full rounded-md border border-ui-border bg-ui-surface px-3 text-sm text-ui-text focus-visible:ring-2 focus-visible:ring-accent';
export const AgentCapabilitiesPanel: React.FC<AgentCapabilitiesPanelProps> = ({ agent, canManageAgents, canManageMcp, canManageSkills }) => {
  const capabilityState = useAgentCapabilities({ agent, canManageAgents, canManageMcp, canManageSkills });
  const { t, activeTab, tabs, servers, toolRefreshErrors, nativeTools, assignedNativeToolIds, setAssignedNativeToolIds, nativeToolConfigs, setNativeToolConfigs, tools } = capabilityState;
  const { credentialDialogServer, setCredentialDialogServer, busy, setBusy, notice, setNotice, error, setError } = capabilityState;
  const { manualServer, setManualServer, manualServerOpen, setManualServerOpen, targetOptions } = capabilityState;
  const { constraintEditor, setConstraintEditor, renameEditor, setRenameEditor, removeServerId, setRemoveServerId, credentialModeChange, setCredentialModeChange } = capabilityState;
  const { recoveryServerId, recoveryAction, serverRows, recoveryControls, managedConnectionMessages, renameTriggers, credentialModeTriggers, removeServerTriggers } = capabilityState;
  const { connections, connectionLoadErrors, connectionLoadingByServerId, pendingConnectionServerId, connect, verify, disconnect, retry, retryAfterSecondsFor } = capabilityState;
  const { clearSuccessfulRecovery, refreshAfterCredentialConnection, run, addManualServer, prepareCredentialModeChange, confirmCredentialModeChange, mcpWritable } = capabilityState;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs activeValue={activeTab} allPanelsMounted={false} ariaLabel={t('agentsWorkflows.agents.details.capabilities.sectionsLabel')} idBase="agent-capability" items={tabs} onValueChange={(capabilityTab) => updateUrlSearch({ capabilityTab }, { replace: true })} />
        {activeTab === 'mcp' && (
          <AddMcpServerAction
            browseHref={AppPaths.workspaceCatalog(agent.workspaceId, {
              destination: `agent:${agent.id}`
            })}
            onConnectByUrl={() => setManualServerOpen(true)}
            size="sm"
          />
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-status-danger/30 bg-status-danger-soft px-3 py-2 text-sm text-status-danger-text">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-md border border-status-success/30 bg-status-success-soft px-3 py-2 text-sm text-status-success-text">
          {notice}
        </div>
      )}

      {activeTab === 'mcp' && (
        <div id="agent-capability-mcp-panel" role="tabpanel" className="space-y-4">
          {!mcpWritable && <p className="type-caption text-ui-text-muted">{t('agentsWorkflows.agents.details.capabilities.permissions.mcp')}</p>}
          {manualServerOpen && (
            <section aria-labelledby="connect-agent-mcp-title" className="rounded-md border border-ui-border bg-ui-bg p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 id="connect-agent-mcp-title" className="type-row-title ">
                    Connect by URL
                  </h3>
                  <p className="type-caption mt-1 text-ui-text-muted">Enter the actual remote Streamable HTTP endpoint. Registry, package, container, and stdio locations are not supported.</p>
                </div>
                <Button size="sm" variant="tertiary" onClick={() => setManualServerOpen(false)}>
                  Close
                </Button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  Name
                  <TextInput
                    value={manualServer.name}
                    onChange={(event) =>
                      setManualServer((value) => ({
                        ...value,
                        name: event.target.value
                      }))
                    }
                    className={`mt-2 ${inputClass}`}
                  />
                </label>
                <label className="text-sm font-semibold">
                  HTTPS endpoint
                  <TextInput
                    type="url"
                    pattern="https://.*"
                    value={manualServer.url}
                    onChange={(event) =>
                      setManualServer((value) => ({
                        ...value,
                        url: event.target.value
                      }))
                    }
                    className={`mt-2 ${inputClass}`}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Authentication
                  <Select
                    ariaLabel="Authentication"
                    className="mt-2"
                    value={manualServer.authType}
                    options={[
                      { value: 'none' as const, label: 'None' },
                      { value: 'bearer_token' as const, label: 'Bearer token' },
                      {
                        value: 'custom_header' as const,
                        label: 'Custom header'
                      }
                    ]}
                    onChange={(authType) =>
                      setManualServer((value) => ({
                        ...value,
                        authType,
                        credentialMode: authType === 'none' ? 'none' : value.credentialMode === 'none' ? 'individual' : value.credentialMode
                      }))
                    }
                  />
                </label>
                {manualServer.authType !== 'none' && (
                  <div className="sm:col-span-2">
                    <McpCredentialOwnershipSelector
                      name="agent-mcp-credential-mode"
                      value={manualServer.credentialMode === 'workspace' ? 'workspace' : 'individual'}
                      onChange={(credentialMode) =>
                        setManualServer((value) => ({
                          ...value,
                          credentialMode
                        }))
                      }
                    />
                  </div>
                )}
                {manualServer.authType === 'custom_header' && (
                  <label className="text-sm font-semibold">
                    Header name
                    <TextInput
                      value={manualServer.authHeaderName}
                      onChange={(event) =>
                        setManualServer((value) => ({
                          ...value,
                          authHeaderName: event.target.value
                        }))
                      }
                      className={`mt-2 ${inputClass}`}
                    />
                  </label>
                )}
                <Button disabled={!mcpWritable || !manualServer.name.trim() || !manualServer.url.trim().startsWith('https://') || (manualServer.authType === 'custom_header' && !manualServer.authHeaderName.trim()) || Boolean(busy)} onClick={() => void addManualServer()}>
                  Add server
                </Button>
              </div>
            </section>
          )}

          <div className="divide-y divide-ui-border border-y border-ui-border">
            {servers.length ? (
              servers.map((server) => {
                const connection = connections[server.id];
                const connectionLoadError = connectionLoadErrors[server.id];
                const connectionLoading = Boolean(connectionLoadingByServerId[server.id]);
                const retryAfterSeconds = retryAfterSecondsFor(server.id);
                const recoveryHighlighted = recoveryServerId === server.id;
                return (
                  <article
                    key={server.id}
                    ref={(node) => {
                      if (node) serverRows.current.set(server.id, node);
                      else serverRows.current.delete(server.id);
                    }}
                    data-mcp-server-id={server.id}
                    className={`py-4 ${recoveryHighlighted ? 'bg-accent-soft px-3 ring-2 ring-inset ring-accent/45' : ''}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm">{server.name}</strong>
                          <StatusBadge tone={server.enabled ? 'success' : 'neutral'}>{server.enabled ? 'Enabled' : 'Disabled'}</StatusBadge>
                          {server.inherited && <StatusBadge tone="neutral">Platform default</StatusBadge>}
                          {server.provenance && <StatusBadge tone="neutral">Catalog v{server.provenance.version}</StatusBadge>}
                        </div>
                        <p className="type-code mt-1 break-all text-ui-text-muted">{server.url}</p>
                        <p className="type-caption mt-2 text-ui-text-muted">
                          {server.tools.length} discovered tools · credential {server.credentialMode === 'workspace' ? 'workspace-managed' : server.credentialMode === 'individual' ? 'individual' : 'not required'} · connection {connectionLoading ? 'loading' : connection?.status || server.connectionStatus || 'not required'} · revision {server.revision}
                        </p>
                        {connectionLoadError && (
                          <p role="alert" className="type-caption mt-1 text-status-danger-text">
                            Credential connection status could not be loaded. Retry before making changes.
                          </p>
                        )}
                        {server.credentialMode === 'workspace' && connection && !connection.canManage && (
                          <p
                            ref={(node) => {
                              if (node) managedConnectionMessages.current.set(server.id, node);
                              else managedConnectionMessages.current.delete(server.id);
                            }}
                            tabIndex={recoveryServerId === server.id ? -1 : undefined}
                            className="type-caption mt-1 text-ui-text-muted focus:outline-none"
                          >
                            {recoveryServerId === server.id ? 'Ask a workspace administrator to connect this server.' : 'Managed by your workspace'}
                          </p>
                        )}
                        {toolRefreshErrors[server.id] && (
                          <p role="alert" className="type-caption mt-1 text-status-warning-text">
                            {toolRefreshErrors[server.id]}
                          </p>
                        )}
                        {retryAfterSeconds > 0 && (
                          <p role="status" className="type-caption mt-1 text-status-warning-text">
                            Connection controls unlock in {retryAfterSeconds}s.
                          </p>
                        )}
                        {(server.targetConstraints.targetTypes.length > 0 || server.targetConstraints.targetIds.length > 0) && <p className="type-caption mt-1 text-ui-text-muted">Constraints: {[...server.targetConstraints.targetTypes, ...server.targetConstraints.targetIds].join(', ')}</p>}
                        {server.lastDiscoveryError && <p className="type-caption mt-1 text-status-warning-text">{server.lastDiscoveryError}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          ref={(node) => {
                            if (node) renameTriggers.current.set(server.id, node);
                            else renameTriggers.current.delete(server.id);
                          }}
                          size="sm"
                          variant="secondary"
                          disabled={!mcpWritable || server.inherited || Boolean(busy)}
                          onClick={() =>
                            setRenameEditor({
                              serverId: server.id,
                              name: server.name
                            })
                          }
                        >
                          {t('agentsWorkflows.agents.details.capabilities.actions.rename')}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!mcpWritable || server.inherited || Boolean(busy)}
                          onClick={() => {
                            setConstraintEditor({
                              serverId: server.id,
                              targetTypes: [...server.targetConstraints.targetTypes],
                              targetIds: [...server.targetConstraints.targetIds]
                            });
                          }}
                        >
                          Constraints
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!mcpWritable || Boolean(busy)}
                          onClick={() =>
                            void run(
                              `toggle:${server.id}`,
                              () => updateAgentMcpServer(agent.workspaceId, agent.id, server.id, {
                                enabled: !server.enabled,
                                expectedRevision: server.revision
                              }),
                              `MCP server ${server.enabled ? 'disabled' : 'enabled'}.`
                            )
                          }
                        >
                          {server.enabled ? 'Disable' : 'Enable'}
                        </Button>
                        {server.credentialMode !== 'none' && !server.inherited && (
                          <Button
                            ref={(node) => {
                              if (node) credentialModeTriggers.current.set(server.id, node);
                              else credentialModeTriggers.current.delete(server.id);
                            }}
                            size="sm"
                            variant="secondary"
                            disabled={!mcpWritable || Boolean(busy)}
                            onClick={() => void prepareCredentialModeChange(server)}
                          >
                            {server.credentialMode === 'workspace' ? 'Use individual credentials' : 'Use workspace credential'}
                          </Button>
                        )}
                        {server.authType === 'none' && !server.inherited && (
                          <Button size="sm" variant="secondary" disabled={!mcpWritable || Boolean(busy)} onClick={() => void run(`test:${server.id}`, () => testAgentMcpServer(agent.workspaceId, agent.id, server.id), 'Connection tested and tools rediscovered.')}>
                            Test / discover
                          </Button>
                        )}
                        {server.provenance && !server.inherited && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!mcpWritable || Boolean(busy)}
                            onClick={() =>
                              void run(
                                `reimport:${server.id}`,
                                () =>
                                  catalogApi.reimportAgentMcpServer(agent.workspaceId, agent.id, server.id, {
                                    artifact: {
                                      sourceId: server.provenance?.sourceId,
                                      artifactName: server.provenance?.artifactName
                                    },
                                    version: server.provenance?.version || '',
                                    remoteEndpoint: server.url,
                                    serverName: server.name,
                                    enabled: server.enabled,
                                    expectedRevision: server.revision
                                  }),
                                'Catalog server re-imported.'
                              )
                            }
                          >
                            Re-import
                          </Button>
                        )}
                        {server.credentialMode !== 'none' && !server.inherited && connectionLoading && (
                          <Button size="sm" variant="secondary" disabled>
                            Loading credential status…
                          </Button>
                        )}
                        {server.credentialMode !== 'none' && !server.inherited && connectionLoadError && (
                          <Button size="sm" variant="secondary" disabled={Boolean(busy)} onClick={() => void retry(server)}>
                            Retry connection status
                          </Button>
                        )}
                        {server.credentialMode !== 'none' && !server.inherited && !connectionLoading && !connectionLoadError && connection?.canManage && connection.status === 'error' && (
                          <Button
                            ref={(node) => {
                              if (recoveryAction !== 'verify_mcp_server') return;
                              if (node) recoveryControls.current.set(server.id, node);
                              else recoveryControls.current.delete(server.id);
                            }}
                            data-mcp-action="verify_mcp_server"
                            size="sm"
                            variant="secondary"
                            disabled={pendingConnectionServerId === server.id || retryAfterSeconds > 0}
                            onClick={() =>
                              void verify(server).then((result) => {
                                if (result?.status === 'connected') {
                                  setNotice('Credential verified and tools rediscovered.');
                                  clearSuccessfulRecovery(server.id);
                                }
                              })
                            }
                          >
                            {retryAfterSeconds > 0 ? `Try again in ${retryAfterSeconds}s` : 'Verify credential'}
                          </Button>
                        )}
                        {server.credentialMode !== 'none' && !server.inherited && !connectionLoading && !connectionLoadError && connection?.canManage && (
                          <Button
                            ref={(node) => {
                              if (recoveryAction !== 'connect_mcp_server') return;
                              if (node) recoveryControls.current.set(server.id, node);
                              else recoveryControls.current.delete(server.id);
                            }}
                            data-mcp-action="connect_mcp_server"
                            size="sm"
                            variant="secondary"
                            disabled={pendingConnectionServerId === server.id || retryAfterSeconds > 0}
                            onClick={() => setCredentialDialogServer(server)}
                          >
                            {retryAfterSeconds > 0 ? `Try again in ${retryAfterSeconds}s` : connection.status === 'missing' ? (server.credentialMode === 'workspace' ? 'Connect workspace credential' : 'Connect your credential') : 'Replace credential'}
                          </Button>
                        )}
                        {server.credentialMode !== 'none' && !server.inherited && !connectionLoading && !connectionLoadError && connection?.canManage && (connection.status === 'connected' || connection.status === 'error') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={pendingConnectionServerId === server.id || retryAfterSeconds > 0}
                            onClick={() =>
                              void disconnect(server).then((removed) => {
                                if (removed) setNotice('Credential disconnected. You can reconnect immediately.');
                              })
                            }
                          >
                            Disconnect
                          </Button>
                        )}
                        {toolRefreshErrors[server.id] && (
                          <Button size="sm" variant="secondary" disabled={Boolean(busy)} onClick={() => void refreshAfterCredentialConnection(server)}>
                            Retry tool refresh
                          </Button>
                        )}
                        <Button
                          ref={(node) => {
                            if (node) removeServerTriggers.current.set(server.id, node);
                            else removeServerTriggers.current.delete(server.id);
                          }}
                          size="sm"
                          variant="danger"
                          disabled={!canManageAgents || server.inherited || Boolean(busy)}
                          onClick={() => setRemoveServerId(server.id)}
                        >
                          {t('agentsWorkflows.agents.details.capabilities.actions.remove')}
                        </Button>
                      </div>
                    </div>
                    {renameEditor?.serverId === server.id && (
                      <section className="mt-4 rounded-md border border-ui-border bg-ui-bg p-3" aria-labelledby={`rename-mcp-${server.id}-title`}>
                        <h4 id={`rename-mcp-${server.id}-title`} className="type-row-title ">
                          {t('agentsWorkflows.agents.details.capabilities.renameServer.title')}
                        </h4>
                        <label className="type-label mt-3 block text-ui-text">
                          {t('agentsWorkflows.agents.details.capabilities.renameServer.name')}
                          <TextInput
                            autoFocus
                            value={renameEditor.name}
                            onChange={(event) =>
                              setRenameEditor(
                                (current) =>
                                  current && {
                                    ...current,
                                    name: event.target.value
                                  }
                              )
                            }
                            className={`mt-2 ${inputClass}`}
                          />
                        </label>
                        <div className="mt-3 flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="tertiary"
                            onClick={() => {
                              setRenameEditor(null);
                              window.requestAnimationFrame(() => renameTriggers.current.get(server.id)?.focus());
                            }}
                          >
                            {t('common.cancel')}
                          </Button>
                          <Button
                            size="sm"
                            disabled={!renameEditor.name.trim() || renameEditor.name.trim() === server.name || Boolean(busy)}
                            onClick={() =>
                              void run(
                                `rename:${server.id}`,
                                () =>
                                  updateAgentMcpServer(agent.workspaceId, agent.id, server.id, {
                                    name: renameEditor.name.trim(),
                                    expectedRevision: server.revision
                                  }),
                                t('agentsWorkflows.agents.details.capabilities.renameServer.success')
                              ).then(() => setRenameEditor(null))
                            }
                          >
                            {t('agentsWorkflows.agents.details.capabilities.actions.save')}
                          </Button>
                        </div>
                      </section>
                    )}
                    {credentialModeChange?.server.id === server.id && (
                      <InlineConfirmation
                        id={`credential-mode-${server.id}`}
                        title={t('mcpServers.credentialModeChangeTitle', {
                          name: server.name
                        })}
                        description={
                          credentialModeChange.credentialMode === 'individual'
                            ? credentialModeChange.affectedScheduleCount > 0
                              ? t('mcpServers.confirmWorkspaceToIndividualWithSchedules', {
                                  count: credentialModeChange.affectedScheduleCount
                                })
                              : t('mcpServers.confirmWorkspaceToIndividual')
                            : t('mcpServers.confirmIndividualToWorkspace')
                        }
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
                        onCancel={() => {
                          setRemoveServerId('');
                          window.requestAnimationFrame(() => removeServerTriggers.current.get(server.id)?.focus());
                        }}
                        onConfirm={() => void run(`remove:${server.id}`, () => deleteAgentMcpServer(agent.workspaceId, agent.id, server.id), t('agentsWorkflows.agents.details.capabilities.removeServer.success')).then(() => setRemoveServerId(''))}
                      />
                    )}
                    {constraintEditor?.serverId === server.id && (
                      <section className="mt-4 rounded-md border border-ui-border bg-ui-bg p-3" aria-label={`Target constraints for ${server.name}`}>
                        <h4 className="type-row-title ">Target constraints</h4>
                        <p className="type-caption mt-1 text-ui-text-muted">Leave exact targets empty to allow every target of the selected types.</p>
                        <div className="mt-3 flex flex-wrap gap-4">
                          {(
                            [
                              ['kubernetes', 'Kubernetes'],
                              ['virtual_machine', 'Virtual machines']
                            ] as const
                          ).map(([value, label]) => (
                            <label key={value} className="flex items-center gap-2 text-sm font-semibold">
                              <Checkbox
                                checked={constraintEditor.targetTypes.includes(value)}
                                onChange={(event) =>
                                  setConstraintEditor(
                                    (current) =>
                                      current && {
                                        ...current,
                                        targetTypes: event.target.checked ? [...new Set([...current.targetTypes, value])] : current.targetTypes.filter((type) => type !== value)
                                      }
                                  )
                                }
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {targetOptions.length ? (
                            targetOptions.map((target) => (
                              <label key={target.value} className="flex items-start gap-2 rounded-md border border-ui-border px-3 py-2 text-sm font-semibold">
                                <Checkbox
                                  className="mt-0.5"
                                  checked={constraintEditor.targetIds.includes(target.value)}
                                  disabled={target.disabled}
                                  onChange={(event) =>
                                    setConstraintEditor(
                                      (current) =>
                                        current && {
                                          ...current,
                                          targetIds: event.target.checked ? [...new Set([...current.targetIds, target.value])] : current.targetIds.filter((id) => id !== target.value)
                                        }
                                    )
                                  }
                                />
                                <span>
                                  {target.label}
                                  {target.description && <span className="type-caption mt-0.5 block text-ui-text-muted">{target.description}</span>}
                                </span>
                              </label>
                            ))
                          ) : (
                            <p className="type-caption text-ui-text-muted">No targets are registered.</p>
                          )}
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <Button size="sm" variant="tertiary" onClick={() => setConstraintEditor(null)}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            disabled={Boolean(busy)}
                            onClick={() =>
                              void run(
                                `constraints:${server.id}`,
                                () =>
                                  updateAgentMcpServer(agent.workspaceId, agent.id, server.id, {
                                    targetConstraints: {
                                      targetTypes: constraintEditor.targetTypes,
                                      targetIds: constraintEditor.targetIds
                                    },
                                    expectedRevision: server.revision
                                  }),
                                'Target constraints updated.'
                              ).then(() => setConstraintEditor(null))
                            }
                          >
                            Save constraints
                          </Button>
                        </div>
                      </section>
                    )}
                  </article>
                );
              })
            ) : (
              <p className="py-5 text-sm text-ui-text-muted">No MCP servers installed.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tools' && <AgentToolsPanel agent={agent} nativeTools={nativeTools} assignedNativeToolIds={assignedNativeToolIds} nativeToolConfigs={nativeToolConfigs} tools={tools} busy={busy} canManageAgents={canManageAgents} mcpWritable={mcpWritable} setBusy={setBusy} setError={setError} setNotice={setNotice} setAssignedNativeToolIds={setAssignedNativeToolIds} setNativeToolConfigs={setNativeToolConfigs} run={run} />}

      <AgentSkillsPanel agent={agent} canManageAgents={canManageAgents} state={capabilityState} />
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
