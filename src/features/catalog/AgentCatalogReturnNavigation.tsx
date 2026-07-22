import React from 'react';

import { PageBackLink } from '@/components/common/PageComposition';
import { AppPaths } from '@/utils/routes';

export interface AgentCatalogReturnNavigation {
  agentId: string;
  href: string;
}

export function resolveAgentCatalogReturnNavigation(
  workspaceId: string,
  destination?: string
): AgentCatalogReturnNavigation | undefined {
  const prefix = 'agent:';
  if (!destination?.startsWith(prefix)) return undefined;

  const agentId = destination.slice(prefix.length);
  if (!agentId.trim()) return undefined;

  return {
    agentId,
    href: AppPaths.workspaceAgentMcp(workspaceId, agentId)
  };
}

interface AgentCatalogReturnLinkProps {
  navigation?: AgentCatalogReturnNavigation;
  agentName?: string;
}

export const AgentCatalogReturnLink: React.FC<AgentCatalogReturnLinkProps> = ({ navigation, agentName }) => {
  if (!navigation) return null;

  const label = agentName?.trim() || 'agent';
  return (
    <PageBackLink href={navigation.href}>
      Back to {label}
    </PageBackLink>
  );
};
