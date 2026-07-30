import type { AgentDefinition } from '@/pages/agents/agentModel';

export type CapabilityTab = 'mcp' | 'tools' | 'skills';

export interface AgentCapabilitiesPanelProps {
  agent: AgentDefinition;
  canManageAgents: boolean;
  canManageMcp: boolean;
  canManageSkills: boolean;
}
