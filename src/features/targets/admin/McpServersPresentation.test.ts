import { describe, expect, it } from 'vitest';

import {
  mcpServersInventory,
  mcpServersView,
  mcpServersViewHeader,
  targetSkillsInventory,
  targetSkillsView,
  targetCapabilityInventoryShell,
  targetToolsView
} from '@/stylesTestSupport';

describe('MCP server route presentation', () => {
  it('keeps the canonical inventory shell around a zero-server catalog', () => {
    expect(mcpServersInventory).toContain('icon={hasActiveFilters ? <Search /> : <Server />}');
    expect(mcpServersInventory).not.toContain('<DataTableStateRow');
    expect(mcpServersView).toContain('const inventory = (');
    expect(mcpServersView).toContain('empty={inventory}');
    expect(mcpServersView).toContain('{inventory}');
    expect(mcpServersView).not.toContain("empty={<EmptyState");
  });

  it('uses the shared route header and permission-aware add action', () => {
    expect(mcpServersViewHeader).toContain('<PageHeader');
    expect(mcpServersViewHeader).toContain('disabled={!canEditServers}');
    expect(mcpServersViewHeader).toContain("t('mcpServers.manageNoAccess')");
  });

  it('keeps target capability route and table composition aligned', () => {
    [mcpServersViewHeader, targetSkillsView, targetToolsView].forEach((source) => {
      expect(source).toContain('<PageHeader');
    });
    [mcpServersInventory, targetSkillsInventory, targetToolsView].forEach((source) => {
      expect(source).toContain('<TargetCapabilityInventoryTable');
    });
    expect(targetCapabilityInventoryShell).toContain('<DataTableFrame');
    expect(targetCapabilityInventoryShell).toContain('data-target-capability-table-frame="true"');
    expect(targetSkillsInventory).toContain("t('targetSkills.filterAll')");
    expect(targetSkillsInventory).not.toContain("label: 'All skills'");
  });
});
