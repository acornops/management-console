import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const appPageContent = readFileSync(resolve(root, 'src/app/AppPageContent.tsx'), 'utf8');

describe('AppPageContent route loading', () => {
  it('lazy imports route page bodies so initial navigation keeps the app bundle lean', () => {
    for (const page of [
      'AgentRunbooksPage',
      'KubernetesClustersPage',
      'KubernetesClusterDetailPage',
      'NotFoundPage',
      'UserSettingsPage',
      'VirtualMachinesPage',
      'WorkspaceInvestigationsPage',
      'WorkspaceInvitePage',
      'WorkspaceMembersPage',
      'WorkspaceOverviewPage',
      'WorkspaceSettingsPage'
    ]) {
      expect(appPageContent).toContain(`import('@/pages/${page}')`);
      expect(appPageContent).not.toContain(`import { ${page} } from '@/pages/${page}'`);
    }
  });

  it('uses one shared suspense fallback for lazy route pages', () => {
    expect(appPageContent).toContain('React.lazy');
    expect(appPageContent).toContain('PageLoadingFallback');
    expect(appPageContent).toContain("<Suspense fallback={<PageLoadingFallback label={t('common.loading')} />}>");
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
