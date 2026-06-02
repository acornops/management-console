import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const mcpServerCard = readFileSync(resolve(__dirname, 'McpServerCard.tsx'), 'utf8');

describe('McpServerCard desktop density', () => {
  it('keeps management actions easy to find while quieting repeated secondary context', () => {
    expect(mcpServerCard).toContain('data-mcp-server-secondary-context="true"');
    expect(mcpServerCard).toContain('data-mcp-server-primary-actions="true"');
    expect(mcpServerCard).toContain("aria-label={t('mcpServers.manageToolsNamed', { name: server.name })}");
    expect(mcpServerCard).toContain("aria-label={t('mcpServers.healthCheckNamed', { name: server.name })}");
    expect(mcpServerCard).toContain('aria-describedby={healthCheckHelpId}');
    expect(mcpServerCard).toContain("t('mcpServers.healthCheckHelp')");
    expect(mcpServerCard).not.toContain('grid grid-cols-3 gap-x-4 gap-y-2');
    expect(mcpServerCard).not.toContain('rounded-xl');
  });
});
