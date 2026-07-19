import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  AgentCatalogReturnLink,
  resolveAgentCatalogReturnNavigation
} from './AgentCatalogReturnNavigation';

describe('Agent catalog return navigation', () => {
  it('builds the deterministic Capabilities MCP route and encodes special IDs', () => {
    expect(resolveAgentCatalogReturnNavigation('team alpha/ops', 'agent:agent/a & β')).toEqual({
      agentId: 'agent/a & β',
      href: '/workspaces/team%20alpha%2Fops/agents?agent=agent%2Fa+%26+%CE%B2&panel=profile&agentTab=capabilities&capabilityTab=mcp'
    });
  });

  it('does not resolve direct visits or malformed and unsupported destinations', () => {
    expect(resolveAgentCatalogReturnNavigation('workspace-a')).toBeUndefined();
    expect(resolveAgentCatalogReturnNavigation('workspace-a', '')).toBeUndefined();
    expect(resolveAgentCatalogReturnNavigation('workspace-a', 'agent:')).toBeUndefined();
    expect(resolveAgentCatalogReturnNavigation('workspace-a', 'agent:   ')).toBeUndefined();
    expect(resolveAgentCatalogReturnNavigation('workspace-a', 'target:cluster-a')).toBeUndefined();
    expect(resolveAgentCatalogReturnNavigation('workspace-a', 'manager:manager-a')).toBeUndefined();
  });

  it('renders an immediate generic return link while destination metadata is pending or failed', () => {
    const navigation = resolveAgentCatalogReturnNavigation('workspace-a', 'agent:agent-a');
    const markup = renderToStaticMarkup(<AgentCatalogReturnLink navigation={navigation} />);

    expect(markup).toContain('href="/workspaces/workspace-a/agents?agent=agent-a&amp;panel=profile&amp;agentTab=capabilities&amp;capabilityTab=mcp"');
    expect(markup).toContain('page-back-link');
    expect(markup).toContain('Back to agent');
  });

  it('adds the resolved Agent name without changing the return route', () => {
    const navigation = resolveAgentCatalogReturnNavigation('workspace-a', 'agent:agent-a');
    const markup = renderToStaticMarkup(
      <AgentCatalogReturnLink navigation={navigation} agentName="SRE <Primary>" />
    );

    expect(markup).toContain('Back to SRE &lt;Primary&gt;');
    expect(markup).not.toContain('destination=');
  });

  it('renders no link without an Agent return destination', () => {
    expect(renderToStaticMarkup(<AgentCatalogReturnLink />)).toBe('');
  });

  it('places the Agent return link before the catalog header and keeps the header action target-only', () => {
    const page = readFileSync(
      resolve(import.meta.dirname, '../../pages/WorkspaceCatalogPage.tsx'),
      'utf8'
    );
    const linkIndex = page.indexOf('<AgentCatalogReturnLink navigation={agentReturnNavigation}');
    const headerIndex = page.indexOf('<PageHeader', linkIndex);

    expect(linkIndex).toBeGreaterThan(-1);
    expect(headerIndex).toBeGreaterThan(linkIndex);
    expect(page).toContain("import { AgentCatalogReturnLink, resolveAgentCatalogReturnNavigation } from '@/features/catalog/AgentCatalogReturnNavigation'");
    expect(page).toContain("const selectedDestinationHref = selectedDestination?.scopeType === 'target'");
  });
});
