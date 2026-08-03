import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sources = [
  'features/targets/admin/TargetCapabilityInventoryShell.tsx',
  'pages/WorkspaceMembersPage.tsx',
  'pages/workflows/WorkflowTriggerToolbar.tsx',
  'pages/workspace-members/WorkspaceInvitationsPanel.tsx'
].map((path) => readFileSync(resolve(__dirname, path), 'utf8'));

describe('collection result summary styles', () => {
  it('routes standalone result feedback through the shared quiet live region', () => {
    for (const source of sources) {
      expect(source).toContain('CollectionResultSummary');
      expect(source).not.toMatch(/type-label[^\n]*rounded-full[^\n]*border/);
    }
  });

  it('routes capability inventory feedback through the shared shell', () => {
    for (const path of [
      'features/targets/admin/McpServersInventory.tsx',
      'features/targets/admin/TargetSkillsInventory.tsx',
      'features/targets/admin/TargetToolsView.tsx'
    ]) {
      expect(readFileSync(resolve(__dirname, path), 'utf8')).toContain('<TargetCapabilityInventoryToolbar');
    }
  });
});
