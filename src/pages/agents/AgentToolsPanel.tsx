import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { Select } from '@/components/common/Select';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import {
  grantAgentNativeTool,
  revokeAgentNativeTool,
  reviewAgentMcpTool,
  type AgentMcpServerApi,
  type WorkspaceNativeToolApi
} from '@/services/control-plane/agentApi';

interface AgentToolsPanelProps {
  agent: AgentDefinition;
  nativeTools: WorkspaceNativeToolApi[];
  assignedNativeToolIds: string[];
  tools: Array<{ server: AgentMcpServerApi; tool: AgentMcpServerApi['tools'][number] }>;
  busy: string;
  canManageAgents: boolean;
  mcpWritable: boolean;
  setBusy: React.Dispatch<React.SetStateAction<string>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setNotice: React.Dispatch<React.SetStateAction<string>>;
  setAssignedNativeToolIds: React.Dispatch<React.SetStateAction<string[]>>;
  run: (key: string, action: () => Promise<unknown>, message: string) => Promise<void>;
}

export const AgentToolsPanel: React.FC<AgentToolsPanelProps> = ({
  agent,
  nativeTools,
  assignedNativeToolIds,
  tools,
  busy,
  canManageAgents,
  mcpWritable,
  setBusy,
  setError,
  setNotice,
  setAssignedNativeToolIds,
  run
}) => {
  const { t } = useTranslation();

  const toggleNativeTool = async (tool: WorkspaceNativeToolApi, assigned: boolean) => {
    const key = `native:${tool.id}`;
    setBusy(key);
    setError('');
    setNotice('');
    try {
      const updated = assigned
        ? await revokeAgentNativeTool(agent.workspaceId, agent.id, tool.id)
        : await grantAgentNativeTool(agent.workspaceId, agent.id, tool.id);
      setAssignedNativeToolIds(updated.tools || []);
      setNotice(`${tool.title} ${assigned ? 'revoked' : 'granted'}. Dependent workflow readiness was recomputed.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The native tool assignment failed.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div id="agent-capability-tools-panel" role="tabpanel" className="space-y-6">
      <section aria-labelledby="native-tools-title">
        <div><h3 id="native-tools-title" className="type-panel-title">{t('agentsWorkflows.agents.details.capabilities.nativeTools.title')}</h3><p className="type-caption mt-1 text-ui-text-muted">{t('agentsWorkflows.agents.details.capabilities.nativeTools.description')}</p></div>
        <div className="mt-3 divide-y divide-ui-border border-y border-ui-border">
          {nativeTools.length ? nativeTools.map((tool) => {
            const assigned = assignedNativeToolIds.includes(tool.id);
            return <div key={tool.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{tool.title}</strong><StatusBadge tone={assigned ? 'success' : 'neutral'}>{assigned ? t('agentsWorkflows.agents.details.capabilities.nativeTools.granted') : t('agentsWorkflows.agents.details.capabilities.nativeTools.notGranted')}</StatusBadge><StatusBadge tone="neutral">{t('agentsWorkflows.agents.details.capabilities.nativeTools.workflowOnly')}</StatusBadge></div><p className="type-caption mt-1 max-w-[70ch] text-ui-text-muted">{tool.description}</p><p className="type-code mt-1 text-ui-text-muted">{tool.id}</p></div>
              <Button size="sm" variant={assigned ? 'secondary' : 'primary'} disabled={!canManageAgents || Boolean(busy)} onClick={() => void toggleNativeTool(tool, assigned)}>{busy === `native:${tool.id}` ? 'Saving…' : assigned ? 'Revoke' : 'Grant'}</Button>
            </div>;
          }) : <p className="py-5 text-sm text-ui-text-muted">{t('agentsWorkflows.agents.details.capabilities.nativeTools.empty')}</p>}
        </div>
      </section>
      <section aria-labelledby="mcp-discovered-tools-title">
        <h3 id="mcp-discovered-tools-title" className="type-panel-title">{t('agentsWorkflows.agents.details.capabilities.discoveredTools.title')}</h3>
        <p className="type-caption mb-3 mt-1 text-ui-text-muted">{t('agentsWorkflows.agents.details.capabilities.discoveredTools.description')}</p>
        <div className="divide-y divide-ui-border border-y border-ui-border">
          {tools.length ? tools.map(({ server, tool }) => (
            <div key={`${server.id}:${tool.name}`} className="grid gap-3 py-4 lg:grid-cols-[minmax(14rem,1fr)_8rem_9rem_9rem_auto]">
              <div className="min-w-0"><strong className="text-sm">{tool.alias || tool.name}</strong><p className="type-caption text-ui-text-muted">{server.name} · {tool.name}</p></div>
              <Select ariaLabel={`Capability for ${tool.name}`} value={tool.capability} disabled={!mcpWritable || Boolean(busy)} options={[{ value: 'read' as const, label: 'Read' }, { value: 'write' as const, label: 'Write' }]} onChange={(capability) => void run(`tool:${server.id}:${tool.name}`, () => reviewAgentMcpTool(agent.workspaceId, agent.id, server.id, tool.name, { capability }), 'Tool review updated.')} />
              <Select ariaLabel={`Risk for ${tool.name}`} value={tool.riskLevel} disabled={!mcpWritable || Boolean(busy)} options={[{ value: 'read_only' as const, label: 'Read only' }, { value: 'non_destructive_write' as const, label: 'Non-destructive' }, { value: 'high_risk' as const, label: 'High risk' }, { value: 'destructive' as const, label: 'Destructive' }]} onChange={(riskLevel) => void run(`tool:${server.id}:${tool.name}`, () => reviewAgentMcpTool(agent.workspaceId, agent.id, server.id, tool.name, { riskLevel }), 'Tool risk updated.')} />
              <Select ariaLabel={`Review for ${tool.name}`} value={tool.reviewState} disabled={!mcpWritable || Boolean(busy)} options={[{ value: 'pending' as const, label: 'Pending' }, { value: 'approved' as const, label: 'Approved' }, { value: 'rejected' as const, label: 'Rejected' }]} onChange={(reviewState) => void run(`tool:${server.id}:${tool.name}`, () => reviewAgentMcpTool(agent.workspaceId, agent.id, server.id, tool.name, { reviewState }), 'Tool review state updated.')} />
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={tool.enabled} disabled={!mcpWritable || Boolean(busy)} onChange={(event) => void run(`tool:${server.id}:${tool.name}`, () => reviewAgentMcpTool(agent.workspaceId, agent.id, server.id, tool.name, { enabled: event.target.checked, reviewState: event.target.checked ? 'approved' : tool.reviewState }), 'Tool enablement updated.')} />{t('agentsWorkflows.agents.details.capabilities.discoveredTools.enabled')}</label>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={tool.autoAllowed} disabled={!mcpWritable || tool.riskLevel !== 'non_destructive_write' || Boolean(busy)} onChange={(event) => void run(`tool:${server.id}:${tool.name}`, () => reviewAgentMcpTool(agent.workspaceId, agent.id, server.id, tool.name, { autoAllowed: event.target.checked }), 'Tool auto-allow updated.')} />{t('agentsWorkflows.agents.details.capabilities.discoveredTools.autoAllow')}</label>
              </div>
            </div>
          )) : <p className="py-5 text-sm text-ui-text-muted">{t('agentsWorkflows.agents.details.capabilities.discoveredTools.empty')}</p>}
        </div>
      </section>
    </div>
  );
};
