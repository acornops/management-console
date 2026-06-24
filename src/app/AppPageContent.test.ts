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
      'VirtualMachinesPage',
      'WorkspaceInvitePage',
      'WorkspaceMembersPage',
      'WorkspaceAiSettingsPage',
      'WorkspaceOverviewPage',
      'WorkspaceSettingsPage'
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
