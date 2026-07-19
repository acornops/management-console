import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const source = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/KubernetesClusterDetail.tsx'), 'utf8');
const mcpServersView = readFileSync(resolve(root, 'src/features/targets/admin/McpServersView.tsx'), 'utf8');
const targetSkillsView = readFileSync(resolve(root, 'src/features/targets/admin/TargetSkillsView.tsx'), 'utf8');
const targetToolsView = readFileSync(resolve(root, 'src/features/targets/admin/TargetToolsView.tsx'), 'utf8');

describe('KubernetesClusterDetail capability ownership', () => {
  it('keeps MCP servers, skills, and tools on the cluster target', () => {
    expect(source).toContain('<McpServersView');
    expect(source).toContain('<TargetSkillsView');
    expect(source).toContain('<TargetToolsView');
    expect(source).toContain('target={target}');
    expect(source).not.toContain('<TargetAgentCapabilitiesNotice');
  });

  it('retains capability catalogs while navigating between cluster views', () => {
    expect(source).toContain('capabilityCatalogsByTarget');
    expect(source).toContain('initialCatalog={cachedCapabilityCatalogs?.mcpServers}');
    expect(source).toContain('onCatalogChange={cacheMcpServersCatalog}');
    expect(source).toContain('initialCatalog={cachedCapabilityCatalogs?.skills}');
    expect(source).toContain('onCatalogChange={cacheSkillsCatalog}');
    expect(source).toContain('initialCatalog={cachedCapabilityCatalogs?.tools}');
    expect(source).toContain('onCatalogChange={cacheToolsCatalog}');
  });

  it('shows retained catalogs while their control-plane refresh runs', () => {
    expect(mcpServersView).toContain('useState<TargetToolCatalog | null>(() => initialCatalog)');
    expect(targetSkillsView).toContain('useState<ControlPlaneTargetSkillsCatalog | null>(() => initialCatalog)');
    expect(targetToolsView).toContain('useState<ControlPlaneTargetToolsCatalog | null>(() => initialCatalog)');

    for (const view of [mcpServersView, targetSkillsView, targetToolsView]) {
      expect(view).toContain('onCatalogChange?.(catalog)');
      expect(view).not.toContain('setCatalog(null)');
    }
  });
});
