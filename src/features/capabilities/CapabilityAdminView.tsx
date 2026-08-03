import React from 'react';

import type { CapabilitySubject } from '@/features/capabilities/admin';
import { McpServersView } from '@/features/targets/admin/McpServersView';
import { TargetSkillsView } from '@/features/targets/admin/TargetSkillsView';
import { TargetToolsView } from '@/features/targets/admin/TargetToolsView';

export type CapabilityAdminSection = 'mcpServers' | 'skills' | 'tools';

type McpConfiguration = Omit<React.ComponentProps<typeof McpServersView>, 'subject'>;
type SkillsConfiguration = Omit<React.ComponentProps<typeof TargetSkillsView>, 'subject'>;
type ToolsConfiguration = Omit<React.ComponentProps<typeof TargetToolsView>, 'subject'>;

interface CapabilityAdminViewProps {
  cacheKey: string;
  section: CapabilityAdminSection;
  subject: CapabilitySubject;
  mcp: McpConfiguration;
  skills: SkillsConfiguration;
  tools: ToolsConfiguration;
}

/**
 * Shared capability-section router. Callers adapt target- or agent-specific
 * permissions and data sources before crossing this presentation boundary.
 */
export const CapabilityAdminView: React.FC<CapabilityAdminViewProps> = ({
  cacheKey,
  section,
  subject,
  mcp,
  skills,
  tools
}) => {
  if (section === 'skills') {
    return <TargetSkillsView key={cacheKey} subject={subject} {...skills} />;
  }

  if (section === 'tools') {
    return <TargetToolsView key={cacheKey} subject={subject} {...tools} />;
  }

  return <McpServersView key={cacheKey} subject={subject} {...mcp} />;
};
