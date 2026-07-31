import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('resource card grid', () => {
  it('keeps clusters, virtual machines, and agents on one container-aware column contract', () => {
    const styles = readSource('src/styles.css');
    const catalogs = [
      readSource('src/components/dashboard/ClusterCatalog.tsx'),
      readSource('src/pages/virtual-machines/VirtualMachinesListView.tsx'),
      readSource('src/pages/WorkspaceAgentsCatalog.tsx')
    ];

    for (const catalog of catalogs) {
      expect(catalog).toContain('data-resource-card-catalog="true"');
      expect(catalog).toContain('resource-card-catalog');
      expect(catalog).toContain('data-resource-card-grid="true"');
      expect(catalog).toContain('resource-card-grid');
    }

    expect(styles).toContain('display: flex');
    expect(styles).toContain('flex-wrap: wrap');
    expect(styles).toContain('flex: 1 1 min(100%, 30rem)');
    expect(styles).toContain('max-width: 40rem');
    expect(styles).not.toContain('container-name: cluster-catalog');
  });

  it('sizes a dock from the rendered shared resource-card track', () => {
    const appShell = readSource('src/app/AppShell.tsx');
    const clusterAssistant = readSource('src/app/AppClusterCopilotPanel.tsx');
    const vmAssistant = readSource('src/app/AppVirtualMachineCopilotPanel.tsx');
    const agentAssistant = readSource('src/pages/agents/AgentQuickChatPanel.tsx');
    const assistantDockFrame = readSource('src/app/AssistantDockFrame.tsx');
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

    expect(assistantDockFrame).toContain('cardGrid.children.length');
    expect(assistantDockFrame).toContain(
      'getResourceCardPreservingDockWidth('
    );
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
