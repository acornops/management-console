import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('resource card grid', () => {
  it('keeps clusters, virtual machines, and agents on one container-aware column contract', () => {
    const styles = readSource('src/styles.css');
    const designCheck = readSource('scripts/check-design-system.mjs');
    const designStandard = readSource('docs/design-docs/design-system-standardization.md');
    const agentCatalog = readSource('src/pages/WorkspaceAgentsCatalog.tsx');
    const catalogs = [
      readSource('src/components/dashboard/ClusterCatalog.tsx'),
      readSource('src/pages/virtual-machines/VirtualMachinesListView.tsx'),
      agentCatalog
    ];

    for (const catalog of catalogs) {
      expect(catalog).toContain('data-resource-card-catalog="true"');
      expect(catalog).toContain('resource-card-catalog');
      expect(catalog).toContain('data-resource-card-grid="true"');
      expect(catalog).toContain('resource-card-grid');
    }

    expect(styles).toContain('display: grid');
    expect(styles).toContain('grid-template-columns: repeat(auto-fill, minmax(min(100%, 27rem), 1fr))');
    expect(styles).toMatch(/\.resource-card-grid > \* \{[\s\S]*?width: 100%;[\s\S]*?min-width: 0;/);
    expect(styles).not.toMatch(/\.resource-card-grid > \* \{[^}]*max-width:/);
    expect(styles).toContain('container-name: resource-card-catalog');
    expect(agentCatalog.match(/data-agent-card-grid="true"/g)).toHaveLength(2);
    expect(styles).not.toContain("[data-agent-catalog-layout='docked'] .resource-card-grid");
    expect(styles).not.toContain('container-name: cluster-catalog');
    expect(designCheck).toContain("'display: grid'");
    expect(designCheck).toContain("'grid-template-columns: repeat(auto-fill, minmax(min(100%, 27rem), 1fr))'");
    expect(designCheck).not.toContain("'display: flex'");
    expect(designStandard).toContain('Cards fill their tracks without a fixed maximum');
    expect(designStandard).not.toContain('stop growing at `40rem`');
  });

  it('keeps route shells and catalog sections full width while bounding wide-layout cards', () => {
    const dashboard = readSource('src/components/dashboard/Dashboard.tsx');
    const virtualMachines = readSource('src/pages/virtual-machines/VirtualMachinesListView.tsx');
    const agents = readSource('src/pages/WorkspaceAgentsPage.tsx');
    const styles = readSource('src/styles.css');

    const catalogRule = styles.match(/\.resource-card-catalog \{([^}]*)\}/)?.[1] ?? '';
    expect(catalogRule).not.toContain('max-width');
    expect(catalogRule).not.toContain('margin-inline');
    for (const route of [dashboard, virtualMachines, agents]) {
      expect(route).toContain('<PageShell>');
      expect(route).not.toContain('contentClassName="resource-catalog-rack"');
    }
  });

  it('keeps screen-reader telemetry tables from widening their containing cards', () => {
    const telemetrySummary = readSource('src/features/targets/catalog/TelemetryTrendSummary.tsx');
    const metricChart = readSource('src/components/common/MetricChart.tsx');

    for (const chart of [telemetrySummary, metricChart]) {
      expect(chart).toContain('<div className="sr-only">');
      expect(chart).toContain('className="min-w-0"');
      expect(chart).not.toContain('className="sr-only min-w-0"');
    }
  });

  it('sizes a dock from the rendered shared resource-card track', () => {
    const appShell = readSource('src/app/AppShell.tsx');
    const clusterAssistant = readSource('src/app/AppClusterCopilotPanel.tsx');
    const vmAssistant = readSource('src/app/AppVirtualMachineCopilotPanel.tsx');
    const agentAssistant = readSource('src/pages/agents/AgentQuickChatPanel.tsx');
    const assistantDockFrame = readSource('src/app/AssistantDockFrame.tsx');
    const dockLayout = readSource('src/app/dockedPanelLayout.ts');
    const catalogs = [
      readSource('src/components/dashboard/ClusterCatalog.tsx'),
      readSource('src/pages/virtual-machines/VirtualMachinesListView.tsx'),
      readSource('src/pages/WorkspaceAgentsCatalog.tsx')
    ];

    expect(appShell).toContain('data-app-shell="true"');
    expect(clusterAssistant).toContain('<AssistantDockFrame');
    expect(vmAssistant).toContain('<AssistantDockFrame');
    expect(agentAssistant).toContain('<AssistantDockFrame');
    expect(assistantDockFrame).toContain('data-docked-assistant="true"');

    for (const catalog of catalogs) {
      expect(catalog).toContain('data-resource-card-grid="true"');
      expect(catalog).toContain('resource-card-grid');
    }

    expect(assistantDockFrame).not.toContain('cardGrid.children.length');
    expect(assistantDockFrame).toContain(
      'getResourceCardPreservingDockWidth('
    );
    expect(dockLayout).toContain('availableColumnCount');
  });

  it('animates the dock without flying Agent cards across grid rows', () => {
    const assistantDockFrame = readSource('src/app/AssistantDockFrame.tsx');
    const agentAssistant = readSource('src/pages/agents/AgentQuickChatPanel.tsx');
    const agentCatalog = readSource('src/pages/WorkspaceAgentsCatalog.tsx');
    const agentsPage = readSource('src/pages/WorkspaceAgentsPage.tsx');
    const dockLayout = readSource('src/app/dockedPanelLayout.ts');

    expect(assistantDockFrame).toContain('<AnimatePresence onExitComplete={onExitComplete}>');
    expect(assistantDockFrame).toContain('<motion.aside');
    expect(assistantDockFrame).toContain('initial={shouldReduceMotion ? false : dockedPanelMotion.initial}');
    expect(assistantDockFrame).toContain('exit={shouldReduceMotion ? { x: 0 } : dockedPanelMotion.exit}');
    expect(assistantDockFrame).not.toContain('fixed inset');
    expect(assistantDockFrame).toContain('window.dispatchEvent(new CustomEvent(dockOpenEvent');
    expect(assistantDockFrame).toContain("(event as CustomEvent<string>).detail === dockId");
    expect(dockLayout).toContain("initial: { x: '100%' }");
    expect(dockLayout).toContain("exit: { x: '100%' }");
    expect(agentCatalog).not.toContain('layoutMotion=');
    expect(agentCatalog).not.toContain('layoutTransition=');
    expect(agentCatalog).toContain("data-agent-catalog-layout={dockedQuickChatOpen ? 'docked' : 'full'}");
    expect(agentsPage).toContain('onExitComplete={() => setQuickChatLayoutReserved(false)}');
    expect(agentAssistant).not.toContain('getResourceCardPreservingDockWidth');
    expect(assistantDockFrame).toContain('getResourceCardPreservingDockWidth');
    expect(assistantDockFrame).toContain(
      "document.querySelectorAll<HTMLElement>('[data-resource-card-grid=\"true\"]')"
    );
    expect(assistantDockFrame).toContain(
      "document.querySelectorAll<HTMLElement>('.page-shell > div')"
    );
  });
});
