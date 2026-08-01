import React from 'react';
import {
  CapabilityMcpServersView,
  CapabilitySkillsView,
  CapabilityToolsView
} from '@/features/capabilities/admin';
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
      <CapabilitySkillsView
        key={agent.id}
        subject={subject}
        canManageSkills={canManageSkills}
        dataSource={skillsDataSource}
      />
    );
  }

  if (section === 'tools') {
    return (
      <CapabilityToolsView
        key={agent.id}
        subject={subject}
        canManageTools={canManageAgents}
        dataSource={toolsDataSource}
      />
    );
  }

  return (
    <CapabilityMcpServersView
      key={agent.id}
      subject={subject}
      canManageMcp={canManageMcp}
      canManageTools={canManageMcp}
      dataSource={mcpDataSource}
      connectionDestination={{ kind: 'agent', id: agent.id }}
      catalogDestination={`agent:${agent.id}`}
      scheduleCount={countAgentCredentialModeScheduleImpact}
    />
  );
};
