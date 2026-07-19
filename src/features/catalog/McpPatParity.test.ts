import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const agentPanel = readFileSync(resolve(root, 'pages/agents/AgentCapabilitiesPanel.tsx'), 'utf8');
const catalogPage = readFileSync(resolve(root, 'pages/WorkspaceCatalogPage.tsx'), 'utf8');
const targetConnections = readFileSync(resolve(root, 'features/targets/admin/useTargetMcpPersonalConnections.ts'), 'utf8');

describe('MCP PAT parity surfaces', () => {
  it('does not offer Agent PAT replacement before connection status resolves', () => {
    expect(agentPanel).toContain('connectionLoadingByServerId');
    expect(agentPanel).toContain('Loading PAT status…');
    expect(agentPanel).toContain("!connectionLoading && !connectionLoadError && connection &&");
  });

  it('creates authenticated Agent installations before opening the PAT dialog', () => {
    expect(agentPanel).toContain("if (created.authScope === 'personal') {");
    expect(agentPanel).toContain("status: 'missing'");
    expect(agentPanel).toContain('setPatDialogServer(created);');
    expect(agentPanel).toContain("await reload();\n        setNotice('MCP server added. Discovered tools are pending review.');");
  });

  it('preserves connected state when Agent or catalog tool refresh fails', () => {
    expect(agentPanel).toContain('The PAT is connected, but tools may be stale. Retry the installation refresh.');
    expect(agentPanel).toContain('Retry tool refresh');
    expect(catalogPage).toContain('The PAT is connected, but tools may be stale. Retry the installation refresh.');
    expect(catalogPage).toContain('Retry tool refresh');
  });

  it('represents disconnects as immediately reconnectable missing states', () => {
    expect(agentPanel).toContain("status: 'missing'");
    expect(targetConnections).toContain("status: 'missing'");
    expect(catalogPage).toContain("status: 'missing'");
    expect(agentPanel).toContain("connection.status === 'missing' ? 'Connect PAT' : 'Replace PAT'");
  });

  it('focuses exact recovery controls without invoking them', () => {
    expect(agentPanel).toContain('recoveryControls.current.get(recoveryServerId)?.focus()');
    expect(agentPanel).not.toContain('recoveryControls.current.get(recoveryServerId)?.click()');
    expect(agentPanel).toContain("data-mcp-action=\"verify_mcp_server\"");
    expect(agentPanel).toContain("data-mcp-action=\"connect_mcp_server\"");
  });
});
