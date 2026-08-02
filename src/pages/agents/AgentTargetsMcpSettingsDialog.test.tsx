import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeI18n } from '@/i18n';
import {
  AgentTargetsMcpSettingsDialog,
  normalizedTargetAccessPolicy,
  targetAccessPolicyChanged
} from '@/pages/agents/AgentTargetsMcpSettingsDialog';

beforeAll(async () => {
  await initializeI18n();
});

describe('AgentTargetsMcpSettingsDialog', () => {
  it('uses the standard settings dialog and keeps the experience Agent-scoped', () => {
    const markup = renderToStaticMarkup(
      <AgentTargetsMcpSettingsDialog
        workspaceId="workspace-1"
        agentId="agent-1"
        serverId="targets-mcp"
        serverName="AcornOps Targets"
        canEdit
        load={vi.fn()}
        save={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('Target access');
    expect(markup).toContain('Control which workspace targets this Agent can use through AcornOps Targets.');
    expect(markup).not.toContain('workflow');
  });

  it('normalizes the effective policy and detects only semantic changes', () => {
    expect(normalizedTargetAccessPolicy({
      mode: 'allowlist',
      targetIds: [' target-b ', 'target-a', 'target-a']
    })).toEqual({ mode: 'allowlist', targetIds: ['target-a', 'target-b'] });
    expect(normalizedTargetAccessPolicy({ mode: 'all', targetIds: ['stale-target'] }))
      .toEqual({ mode: 'all', targetIds: [] });
    expect(targetAccessPolicyChanged(
      { mode: 'denylist', targetIds: ['target-a', 'target-b'] },
      { mode: 'denylist', targetIds: ['target-b', 'target-a', 'target-a'] }
    )).toBe(false);
    expect(targetAccessPolicyChanged(
      { mode: 'all', targetIds: [] },
      { mode: 'allowlist', targetIds: [] }
    )).toBe(true);
  });
});
