import React from 'react';
import { McpServersView } from '@/features/targets/admin/McpServersView';
import { TargetSkillsView } from '@/features/targets/admin/TargetSkillsView';
import { TargetToolsView } from '@/features/targets/admin/TargetToolsView';
import type { CapabilityCatalogCache } from '@/features/targets/admin/useCapabilityCatalogCache';
import type { TargetToolCatalog } from '@/features/targets/admin/targetMcpCatalogTypes';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import type { ControlPlaneTargetSkillsCatalog, ControlPlaneTargetToolsCatalog } from '@/services/controlPlaneApi';
import {
  countAgentCredentialModeScheduleImpact,
  createAgentMcpDataSource,
  createAgentSkillsDataSource,
  createAgentToolsDataSource,
  toAgentCapabilitySubject
} from '@/pages/agents/agentCapabilityAdminAdapters';
import {
  getAgentTargetAccessSettings,
  updateAgentTargetAccessSettings
} from '@/services/control-plane/agentApi';

interface AgentCapabilityAdminViewProps {
  agent: AgentDefinition;
  canManageAgents: boolean;
  canManageMcp: boolean;
  canManageSkills: boolean;
  section: 'mcp' | 'skills' | 'tools';
  cachedCatalogs?: CapabilityCatalogCache;
  onMcpServersCatalogChange: (catalog: TargetToolCatalog) => void;
  onSkillsCatalogChange: (catalog: ControlPlaneTargetSkillsCatalog) => void;
  onToolsCatalogChange: (catalog: ControlPlaneTargetToolsCatalog) => void;
}

export const AgentCapabilityAdminView: React.FC<AgentCapabilityAdminViewProps> = ({
  agent,
  canManageAgents,
  canManageMcp,
  canManageSkills,
  section,
  cachedCatalogs,
  onMcpServersCatalogChange,
  onSkillsCatalogChange,
  onToolsCatalogChange
}) => {
  const subject = React.useMemo(() => toAgentCapabilitySubject(agent), [agent]);
  const mcpDataSource = React.useMemo(
    () => createAgentMcpDataSource(agent, canManageMcp),
    [agent, canManageMcp]
  );
  const skillsDataSource = React.useMemo(
    () => createAgentSkillsDataSource(agent, canManageSkills),
    [agent, canManageSkills]
  );
  const toolsDataSource = React.useMemo(
    () => createAgentToolsDataSource(agent, canManageAgents),
    [agent, canManageAgents]
  );

  if (section === 'skills') {
    return (
      <TargetSkillsView
        key={agent.id}
        subject={subject}
        canManageSkills={canManageSkills}
        dataSource={skillsDataSource}
        initialCatalog={cachedCatalogs?.skills}
        onCatalogChange={onSkillsCatalogChange}
      />
    );
  }

  if (section === 'tools') {
    return (
      <TargetToolsView
        key={agent.id}
        subject={subject}
        canManageTools={canManageAgents}
        dataSource={toolsDataSource}
        initialCatalog={cachedCatalogs?.tools}
        onCatalogChange={onToolsCatalogChange}
      />
    );
  }

  return (
    <McpServersView
      key={agent.id}
      subject={subject}
      canManageMcp={canManageMcp}
      canManageTools={canManageMcp}
      dataSource={mcpDataSource}
      connectionDestination={{ kind: 'agent', id: agent.id }}
      catalogDestination={`agent:${agent.id}`}
      scheduleCount={countAgentCredentialModeScheduleImpact}
      targetAccessSettings={{
        canEdit: canManageAgents && canManageMcp,
        load: getAgentTargetAccessSettings,
        save: updateAgentTargetAccessSettings
      }}
      initialCatalog={cachedCatalogs?.mcpServers}
      onCatalogChange={onMcpServersCatalogChange}
    />
  );
};
