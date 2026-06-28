import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const appPageContent = readFileSync(resolve(root, 'src/app/AppPageContent.tsx'), 'utf8');
const appBootstrap = readFileSync(resolve(root, 'src/app/useAppBootstrap.ts'), 'utf8');

describe('AppPageContent route loading', () => {
  it('lazy imports route page bodies so initial navigation keeps the app bundle lean', () => {
    for (const page of [
      'KubernetesClustersPage',
      'KubernetesClusterDetailPage',
      'NotFoundPage',
      'UserSettingsPage',
      'SettingsPage',
      'HelpPage',
      'VirtualMachinesPage',
      'WorkspaceAgentsPage',
      'WorkspaceApprovalsPage',
      'WorkspaceInvitePage',
      'WorkspaceSchedulesPage',
      'WorkspaceOverviewPage'
    ]) {
      expect(appPageContent).toContain(`import('@/pages/${page}')`);
      expect(appPageContent).not.toContain(`import { ${page} } from '@/pages/${page}'`);
    }
  });

  it('uses one shared suspense fallback and preloads the active route chunk', () => {
    expect(appPageContent).toContain('React.lazy');
    expect(appPageContent).toContain('PageLoadingFallback');
    expect(appPageContent).toContain("<Suspense fallback={<PageLoadingFallback label={t('common.loading')} />}>");
    expect(appPageContent).toContain('export function preloadAppRoutePage(route: AppRoute): void');
    expect(appPageContent).toContain('case \'workspaceKubernetesClusterDiagnostics\':');
    expect(appPageContent).toContain('void loadKubernetesClusterDetailPage();');
    expect(appPageContent).toContain('case \'settings\':');
    expect(appPageContent).toContain('void loadSettingsPage();');
    expect(appPageContent).toContain("route.kind === 'settings'");
    expect(appPageContent).toContain("case 'workspaceMembers':");
    expect(appPageContent).toContain("case 'workspaceSettings':");
    expect(appPageContent).toContain("case 'workspaceAiSettings':");
    expect(appPageContent).toContain("route.kind === 'settings' || route.kind === 'workspaceSettings' || route.kind === 'workspaceAiSettings' || route.kind === 'workspaceMembers'");
    expect(appPageContent).toContain('<SettingsPage');
    expect(appPageContent).toContain('case \'accountSettings\':');
    expect(appPageContent).toContain('void loadUserSettingsPage();');
    expect(appPageContent).toContain("route.kind === 'accountSettings'");
    expect(appPageContent).toContain('<UserSettingsPage');
    expect(appPageContent).toContain('case \'workspaceAgents\':');
    expect(appPageContent).toContain('void loadWorkspaceAgentsPage();');
    expect(appPageContent).toContain("route.kind === 'workspaceAgents'");
    expect(appPageContent).toContain('<WorkspaceAgentsPage');
    expect(appPageContent).toContain('case \'help\':');
    expect(appPageContent).toContain('void loadHelpPage();');
    expect(appPageContent).toContain("route.kind === 'help'");
    expect(appPageContent).toContain('<HelpPage');
    expect(appPageContent).toContain('case \'workspaceSchedules\':');
    expect(appPageContent).toContain('void loadWorkspaceSchedulesPage();');
    expect(appPageContent).toContain("route.kind === 'workspaceSchedules'");
    expect(appPageContent).toContain('<WorkspaceSchedulesPage');
    expect(appPageContent).toContain('case \'workspaceApprovals\':');
    expect(appPageContent).toContain('void loadWorkspaceApprovalsPage();');
    expect(appPageContent).toContain("route.kind === 'workspaceApprovals'");
    expect(appPageContent).toContain('<WorkspaceApprovalsPage');
    expect(appBootstrap).toContain("import { preloadAppRoutePage } from '@/app/AppPageContent';");
    expect(appBootstrap).toContain('preloadAppRoutePage(route);');
    expect(appPageContent).not.toContain('routePageLoaders');
    expect(appPageContent).not.toContain('preloadRoutePages');
    expect(appPageContent).not.toContain('window.setTimeout');
  });

  it('does not key or wait on the page wrapper during route navigation', () => {
    expect(appPageContent).not.toContain('<AnimatePresence mode="wait">');
    expect(appPageContent).not.toContain('key={pageKey}');
    expect(appPageContent).not.toContain('pageKey');
  });
});
