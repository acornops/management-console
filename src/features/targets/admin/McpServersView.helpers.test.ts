import { describe, expect, it } from 'vitest';
import {
  applyToolCountsDelta,
  getOptimisticToolEffectiveState
} from './McpServersView.helpers';
import type { TargetToolCatalogItem, TargetToolCatalogServer } from './targetMcpCatalogTypes';

const tool = (overrides: Partial<TargetToolCatalogItem> = {}): TargetToolCatalogItem => ({
  name: 'records.lookup',
  description: 'Look up records',
  capability: 'write',
  version: 'v1',
  source: 'mcp',
  enabledConfigured: true,
  enabledEffective: true,
  effectiveDisabledReason: null,
  ...overrides
});

const counts: TargetToolCatalogServer['toolCounts'] = {
  total: 1,
  readOnly: 0,
  writeCapable: 1,
  enabledConfigured: 1,
  enabledEffective: 1,
  writeConfigured: 1,
  writeEffective: 1
};

describe('target MCP tool capability updates', () => {
  it('removes enabled write counts when a tool is reviewed as read-only', () => {
    const previous = tool();
    const next = tool({ capability: 'read' });

    expect(applyToolCountsDelta(counts, previous, next)).toEqual({
      total: 1,
      readOnly: 1,
      writeCapable: 0,
      enabledConfigured: 1,
      enabledEffective: 1,
      writeConfigured: 0,
      writeEffective: 0
    });
  });

  it('makes an enabled read tool effective when only write mode was blocked', () => {
    expect(getOptimisticToolEffectiveState(
      { enabled: true },
      tool({ capability: 'read', enabledEffective: false, effectiveDisabledReason: 'agent_write_disabled' }),
      true
    )).toEqual({
      enabledEffective: true,
      effectiveDisabledReason: null
    });
  });
});
