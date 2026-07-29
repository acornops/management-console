import React from 'react';
import { McpServersView } from '@/features/targets/admin/McpServersView';
import { TargetSkillsView } from '@/features/targets/admin/TargetSkillsView';
import { TargetToolsView } from '@/features/targets/admin/TargetToolsView';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import {
  countAgentCredentialModeScheduleImpact,
  createAgentMcpDataSource,
  createAgentSkillsDataSource,
  createAgentToolsDataSource,
  toAgentCapabilitySubject
} from '@/pages/agents/agentCapabilityAdminAdapters';

interface AgentCapabilityAdminViewProps {
  agent: AgentDefinition;
  canManageAgents: boolean;
  canManageMcp: boolean;
  canManageSkills: boolean;
  section: 'mcp' | 'skills' | 'tools';
}

export const AgentCapabilityAdminView: React.FC<AgentCapabilityAdminViewProps> = ({
  agent,
  canManageAgents,
  canManageMcp,
  canManageSkills,
  section
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
        target={subject}
        canManageSkills={canManageSkills}
        dataSource={skillsDataSource}
      />
    );
  }

  if (section === 'tools') {
    return (
      <TargetToolsView
        key={agent.id}
        target={subject}
        canManageTools={canManageAgents}
        dataSource={toolsDataSource}
      />
    );
  }

  return (
    <McpServersView
      key={agent.id}
      target={subject}
      canManageMcp={canManageMcp}
      canManageTools={canManageMcp}
      dataSource={mcpDataSource}
      connectionDestination={{ kind: 'agent', id: agent.id }}
      catalogDestination={`agent:${agent.id}`}
      scheduleCount={countAgentCredentialModeScheduleImpact}
    />
  );
};
