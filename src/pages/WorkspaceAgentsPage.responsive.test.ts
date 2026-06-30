import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const agentsPage = [
  'src/pages/WorkspaceAgentsPage.tsx',
  'src/pages/WorkspaceAgentsPage.helpers.tsx',
  'src/pages/WorkspaceAgentsCatalog.tsx',
  'src/pages/WorkspaceAgentsDrawers.tsx',
  'src/pages/WorkspaceAgentActivityDrawer.tsx',
  'src/pages/WorkspaceAgentDetailPanel.tsx'
]
  .map((filePath) => readFileSync(resolve(root, filePath), 'utf8'))
  .join('\n');
const agentsCatalog = readFileSync(resolve(root, 'src/pages/WorkspaceAgentsCatalog.tsx'), 'utf8');

describe('WorkspaceAgentsPage responsive polish', () => {
  it('uses the same uncluttered library and detail chrome as workflows', () => {
    expect(agentsPage).toContain('placeholder="Search agents, workflows, tools"');
    expect(agentsPage).not.toContain('placeholder="Search agents, workflows, tools, scope"');
    expect(agentsPage).toContain('{visibleAgents.length} of {agents.length} agents');
    expect(agentsPage).toContain('className="grid min-w-0 gap-6"');
    expect(agentsPage).toContain('titleId="agent-details-title"');
    expect(agentsPage).toContain('<RightSidePanel');
    expect(agentsPage).toContain('className="block w-full max-w-[min(100vw,64rem)] overflow-y-auto bg-ui-surface p-0"');
    expect(agentsPage).toContain('chrome="drawer"');
    expect(agentsPage).toContain('role="list"');
    expect(agentsPage).toContain('aria-hidden="true"');
    expect(agentsPage).toContain('xl:grid-cols-[minmax(0,1.45fr)_minmax(9rem,0.58fr)_minmax(10rem,0.68fr)_2rem]');
    expect(agentsPage).not.toContain('overflow-x-auto custom-scrollbar');
    expect(agentsPage).not.toContain('min-w-[66rem]');
    expect(agentsPage).not.toContain('table-fixed');
    expect(agentsPage).toContain('grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]');
    expect(agentsPage).not.toContain('Workflow controls');
    expect(agentsPage).not.toContain('<section className="rounded-lg border border-ui-border bg-ui-surface p-4">');
    expect(agentsPage).not.toContain('className="mt-3 space-y-3"');
  });

  it('separates expanded rows and keeps capability details out of collapsed rows', () => {
    expect(agentsPage).not.toContain('CapabilityPreviewGroup');
    expect(agentsCatalog).not.toContain('label="MCP"');
    expect(agentsCatalog).not.toContain('label="Tools"');
    expect(agentsCatalog).not.toContain('label="Skills"');
    expect(agentsPage).toContain('Capabilities');
    expect(agentsPage).toContain('Policy snapshot');
    expect(agentsPage).toContain("expanded ? 'border-ui-border bg-ui-surface shadow-sm xl:mb-3'");
    expect(agentsPage).toContain("selected ? 'bg-ui-bg/65 outline outline-1 -outline-offset-1 outline-ui-border'");
    expect(agentsPage).toContain('border-t border-ui-border bg-ui-surface px-4 py-4 sm:px-5');
  });

  it('formats enum badges as polished labels instead of raw lowercase values', () => {
    expect(agentsPage).toContain('formatAgentDisplayValue');
    expect(agentsPage).toContain('formatPolicyValue');
    expect(agentsPage).toContain('formatPolicyValue(selectedAgent.approvalPolicy.writeActions)');
    expect(agentsPage).not.toContain("formatAgentDisplayValue(trigger.enabled ? 'enabled' : 'disabled')");
    expect(agentsPage).toContain('const formatPolicyValue = (value: string): string => formatAgentDisplayValue(value);');
    expect(agentsPage).toContain("formatPolicyValue(selectedAgent.approvalPolicy.writeActions)");
    expect(agentsPage).not.toContain('>{selectedAgent.status}</StatusBadge>');
    expect(agentsPage).not.toContain('>{selectedAgent.providerType}</StatusBadge>');
    expect(agentsPage).not.toContain('>{selectedAgent.health.status}</StatusBadge>');
  });
});
