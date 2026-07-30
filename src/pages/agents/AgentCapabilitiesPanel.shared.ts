import type { AgentDefinition } from '@/pages/agents/agentModel';

export interface AgentCapabilitiesPanelProps {
  agent: AgentDefinition;
  canManageAgents: boolean;
  canManageMcp: boolean;
  canManageSkills: boolean;
  section?: 'mcp' | 'skills' | 'tools';
  hideSectionNavigation?: boolean;
}

export const agentCapabilityInputClassName =
  'min-h-11 w-full rounded-md border border-ui-border bg-ui-surface px-3 type-body text-ui-text focus-visible:ring-2 focus-visible:ring-accent';
