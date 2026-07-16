import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const appPageContent = readFileSync(resolve(root, 'src/app/AppPageContent.tsx'), 'utf8');
const appBootstrap = readFileSync(resolve(root, 'src/app/useAppBootstrap.ts'), 'utf8');
const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
const kubernetesClusterDetailPage = readFileSync(resolve(root, 'src/pages/KubernetesClusterDetailPage.tsx'), 'utf8');

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
    expect(appPageContent).not.toContain('case \'settings\':');
    expect(appPageContent).toContain("case 'workspaceMembers':");
    expect(appPageContent).toContain("case 'workspaceSettings':");
    expect(appPageContent).toContain("case 'workspaceAiSettings':");
    expect(appPageContent).toContain("case 'workspaceWebhooks':");
    expect(appPageContent).toContain("route.kind === 'workspaceSettings' || route.kind === 'workspaceAiSettings' || route.kind === 'workspaceMembers' || route.kind === 'workspaceWebhooks'");
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

  it('preserves the upstream setup-required cluster installation path', () => {
    expect(kubernetesClusterDetailPage).toContain('onOpenInstallModal: (clusterId: string) => void;');
    expect(kubernetesClusterDetailPage).toContain("t('diagnostics.installAgentTitle')");
    expect(kubernetesClusterDetailPage).toContain("t('diagnostics.openInstallCommand')");
    expect(appPageContent).toContain('onOpenInstallModal={onInstallAgent}');
  });

  it('treats the top-level settings route as redirect-only legacy input', () => {
    expect(app).toContain("route.kind !== 'settings'");
    expect(app).toContain('legacySettingsRedirectPath({ selectedWorkspaceId, workspaceById, workspaces })');
    expect(appPageContent).not.toContain("route.kind === 'settings' ||");
  });

  it('lets the current user leave a workspace without member-management permissions', () => {
    expect(appPageContent).toContain('const leaveWorkspace = async () => {');
    expect(appPageContent).toContain('isKnownOnlyWorkspaceOwner(currentUserRole, workspaceContext.memberCount)');
    expect(appPageContent).toContain('shouldPreflightWorkspaceOwnerLeave(currentUserRole)');
    expect(appPageContent).toContain("getWorkspacePermission(workspaceContext.id, 'read_members')");
    expect(appPageContent).toContain("controlPlaneApi.listWorkspaceMembers(workspaceContext.id, { limit: 2, role: 'owner' })");
    expect(appPageContent).toContain('hasAnotherWorkspaceOwner(ownersPage.items)');
    expect(appPageContent).toContain('controlPlaneApi.deleteWorkspaceMember(workspaceContext.id, user.id)');
    expect(appPageContent).toContain('formatMemberMutationError(');
    expect(appPageContent).toContain("t('workspaceSettings.leaveOnlyOwnerError')");
    expect(appPageContent).toContain('workspacesAfterLeave(workspaces, workspaceContext.id)');
    expect(appPageContent).toContain('onLeaveWorkspaceSuccess(workspaceContext.id)');
    expect(appPageContent).toContain('navigate(nextWorkspace ? workspaceLandingPath(nextWorkspace) : AppPaths.workspaces(), { replace: true })');
    expect(appPageContent).toContain("showToast(t('workspaceSettings.leaveSuccess'");
    expect(appPageContent).toContain('onLeaveWorkspace={workspaceContext ? leaveWorkspace : undefined}');
  });

  it('presents the no-workspace state as a guided setup path instead of a sparse blank page', () => {
    expect(appPageContent).toContain('aria-labelledby="create-first-workspace-title"');
    expect(appPageContent).toContain("route.kind === 'workspaces' || route.kind === 'home' || route.kind === 'settings'");
    expect(appPageContent).toContain("t('app.createFirstWorkspaceKicker')");
    expect(appPageContent).toContain("t('app.createFirstWorkspaceStepWorkspace')");
    expect(appPageContent).toContain("t('app.createFirstWorkspaceStepMembers')");
    expect(appPageContent).toContain("t('app.createFirstWorkspaceStepChat')");
    expect(appPageContent).toContain('ICONS.BotMessageSquare');
    expect(appPageContent).not.toContain("t('app.createFirstWorkspaceStepTargets')");
    expect(appPageContent).toContain("t('app.createFirstWorkspaceInviteHint')");
    expect(appPageContent).toContain("t('app.createWorkspaceAction')");
    expect(appPageContent).toContain('sm:grid-cols-3');
    expect(appPageContent).not.toContain("t('app.newWorkspace')}</Button>");
  });
});
