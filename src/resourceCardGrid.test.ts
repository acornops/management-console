import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('resource card grid', () => {
  it('uses three desktop columns and two beside a docked assistant', () => {
    const appShell = readSource('src/app/AppShell.tsx');
    const clusterAssistant = readSource('src/app/AppClusterCopilotPanel.tsx');
    const agentAssistant = readSource('src/pages/agents/AgentQuickChatPanel.tsx');
    const styles = readSource('src/styles.css');
    const catalogs = [
      readSource('src/components/dashboard/ClusterCatalog.tsx'),
      readSource('src/pages/virtual-machines/VirtualMachinesListView.tsx'),
      readSource('src/pages/WorkspaceAgentsCatalog.tsx')
    ];

    expect(appShell).toContain('data-app-shell="true"');
    expect(clusterAssistant).toContain('data-docked-assistant="true"');
    expect(agentAssistant).toContain('data-docked-assistant="true"');

    for (const catalog of catalogs) {
      expect(catalog).toContain('data-resource-card-grid="true"');
      expect(catalog).toContain('resource-card-grid');
    }

    expect(styles).toContain('@media (min-width: 1280px)');
    expect(styles).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(styles).toContain(
      "[data-app-shell='true']:has([data-docked-assistant='true']) .resource-card-grid"
    );
    expect(styles).toContain("[data-agent-catalog-layout='docked'] .resource-card-grid");
    expect(styles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
  });

  it('animates the dock and Agent card reflow without turning the dock into an overlay', () => {
    const agentAssistant = readSource('src/pages/agents/AgentQuickChatPanel.tsx');
    const agentCatalog = readSource('src/pages/WorkspaceAgentsCatalog.tsx');
    const agentsPage = readSource('src/pages/WorkspaceAgentsPage.tsx');
    const dockLayout = readSource('src/app/dockedPanelLayout.ts');
    const catalogPrimitives = readSource('src/features/targets/catalog/TargetCatalogPrimitives.tsx');

    expect(agentAssistant).toContain('<AnimatePresence initial={false} onExitComplete={onExitComplete}>');
    expect(agentAssistant).toContain('<motion.aside');
    expect(agentAssistant).toContain('initial={shouldReduceMotion ? false : dockedPanelMotion.initial}');
    expect(agentAssistant).toContain('exit={shouldReduceMotion ? { x: 0 } : dockedPanelMotion.exit}');
    expect(agentAssistant).not.toContain('fixed inset');
    expect(dockLayout).toContain("initial: { x: '100%' }");
    expect(dockLayout).toContain("exit: { x: '100%' }");
    expect(catalogPrimitives).toContain("<motion.article");
    expect(catalogPrimitives).toContain("layout={layoutMotion ? 'position' : false}");
    expect(agentCatalog).toContain('layoutMotion={!shouldReduceMotion}');
    expect(agentCatalog).toContain("data-agent-catalog-layout={dockedQuickChatOpen ? 'docked' : 'full'}");
    expect(agentsPage).toContain('onExitComplete={() => setQuickChatLayoutReserved(false)}');
  });
});
