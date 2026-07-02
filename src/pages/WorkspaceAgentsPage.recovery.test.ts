import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const agentsPage = [
  'src/pages/WorkspaceAgentsPage.tsx',
  'src/pages/WorkspaceAgentsPage.helpers.tsx',
  'src/pages/WorkspaceAgentsCatalog.tsx'
]
  .map((filePath) => readFileSync(resolve(root, filePath), 'utf8'))
  .join('\n');

describe('WorkspaceAgentsPage recovery and triage actions', () => {
  it('keeps assignment actions visible on each catalog row', () => {
    expect(agentsPage).toContain('AgentRowActionCell');
    expect(agentsPage).toContain('CatalogCell label="Assignment action"');
    expect(agentsPage).toContain('onTestAgent');
    expect(agentsPage).toContain('onOpenManagement(agent)');
    expect(agentsPage).toContain('Review before assignment');
    expect(agentsPage).toContain('Ready for assignment');
  });

  it('removes the summary queue above the catalog', () => {
    expect(agentsPage).not.toContain('AgentReviewQueue');
    expect(agentsPage).not.toContain('AgentReadinessGuide');
    expect(agentsPage).not.toContain('Profile queue');
    expect(agentsPage).not.toContain('Assignment readiness');
    expect(agentsPage).not.toContain('profiles need review');
    expect(agentsPage).not.toContain('Jump to access review');
    expect(agentsPage).not.toContain('Jump to readiness tests');
  });

  it('turns load failures into actionable recovery states', () => {
    expect(agentsPage).toContain('agentCatalogReloadKey');
    expect(agentsPage).toContain('capabilityOptionsReloadKey');
    expect(agentsPage).toContain('ownerUsersReloadKey');
    expect(agentsPage).toContain('onAction={() => setAgentCatalogReloadKey((value) => value + 1)}');
    expect(agentsPage).toContain('onAction={() => setCapabilityOptionsReloadKey((value) => value + 1)}');
    expect(agentsPage).toContain('onAction={() => setOwnerUsersReloadKey((value) => value + 1)}');
    expect(agentsPage).toContain('actionLabel="Retry agents"');
    expect(agentsPage).toContain('actionLabel="Retry capabilities"');
    expect(agentsPage).toContain('actionLabel="Retry members"');
    expect(agentsPage).toContain('Fallback data is active');
    expect(agentsPage).toContain('Live control-plane data was last requested');
  });
});
