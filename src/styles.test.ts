import { describe, expect, it } from 'vitest';
import {
  addClusterModal,
  appDialogs,
  appPageContent,
  appShell,
  buttonComponent,
  chatView,
  clusterOverviewView,
  clusterSettingsView,
  contrastRatio,
  darkTheme,
  dashboardPage,
  designSystemCheck,
  designSystemHtml,
  designDocsIndex,
  desktopSidebar,
  enLocale,
  fonts,
  indexHtml,
  lightTheme,
  loginAuthPanel,
  loginPage,
  loginPreview,
  markdownComponents,
  mcpServerCard,
  mcpServerToolsDialog,
  mcpServersDialogs,
  mcpServersInventory,
  mcpServersView,
  membersPage,
  mobileNavigation,
  nginxConfig,
  overviewPage,
  pageComposition,
  resourceCategoryTabs,
  resourceExplorerControls,
  resourceExplorerLayout,
  rgbVariableValue,
  styles,
  tailwindConfig,
  themeInit,
  traceFooter,
  typographyDoc,
  userSettingsPage,
  workloadExplorerParts,
  workloadsExplorer,
  workloadsExplorerSurface,
  workspaceSettingsPage,
  zhLocale
} from './stylesTestSupport';

describe('theme color contract', () => {
  it('exposes the v2 neutral surfaces with a restrained orange accent', () => {
    expect(styles).toContain('color-scheme: light');
    expect(styles).toContain('color-scheme: dark');

    expect(lightTheme).toContain('--brand-orange: oklch(0.712 0.187 39.7)');
    expect(lightTheme).toContain('--brand-orange-rgb: 255 112 59');
    expect(lightTheme).toContain('--brand-orange-strong-rgb: 230 95 47');
    expect(lightTheme).toContain('--brand-orange-soft-rgb: 255 236 221');
    expect(lightTheme).toContain('--bg: oklch(0.985 0.006 85)');
    expect(lightTheme).toContain('--surface: oklch(0.996 0.004 85)');
    expect(lightTheme).toContain('--surface-strong: oklch(0.962 0.012 74)');
    expect(lightTheme).toContain('--border: oklch(0.925 0.012 74)');
    expect(lightTheme).toContain('--text: oklch(0.3 0.008 72)');
    expect(lightTheme).toContain('--text-muted: oklch(0.54 0.025 54)');
    expect(lightTheme).toContain('--bg-rgb: 252 250 246');
    expect(lightTheme).toContain('--surface-rgb: 255 254 251');
    expect(lightTheme).toContain('--surface-strong-rgb: 247 241 234');
    expect(lightTheme).toContain('--border-rgb: 235 229 222');
    expect(lightTheme).toContain('--text-rgb: 48 45 41');
    expect(lightTheme).toContain('--text-muted-rgb: 123 107 97');
    expect(lightTheme).toContain('--code-text: oklch(0.94 0.008 80)');
    expect(lightTheme).toContain('--code-text-rgb: 238 235 229');

    expect(darkTheme).toContain('--bg: oklch(0.178407 0.002613 67.659)');
    expect(darkTheme).toContain('--surface: oklch(0.221666 0.007407 48.368)');
    expect(darkTheme).toContain('--surface-strong: oklch(0.281925 0.00766 31.115)');
    expect(darkTheme).toContain('--border: oklch(0.379934 0.00707 31.086)');
    expect(darkTheme).toContain('--text: oklch(0.960674 0.00508 48.686)');
    expect(darkTheme).toContain('--text-muted: oklch(0.712881 0.005998 31.059)');
    expect(darkTheme).toContain('--bg-rgb: 18 17 16');
    expect(darkTheme).toContain('--surface-rgb: 30 26 24');
    expect(darkTheme).toContain('--surface-strong-rgb: 45 40 39');
    expect(darkTheme).toContain('--border-rgb: 70 65 64');
    expect(darkTheme).toContain('--text-rgb: 245 241 239');
    expect(darkTheme).toContain('--text-muted-rgb: 166 161 160');
    expect(darkTheme).toContain('--code-text: oklch(0.94 0.008 80)');
    expect(darkTheme).toContain('--code-text-rgb: 238 235 229');

    expect(styles).not.toContain('--bg-rgb: 246 248 251');
    expect(styles).not.toContain('--surface-rgb: 252 253 255');
    expect(styles).not.toContain('--border-rgb: 216 225 235');
    expect(styles).not.toContain('--surface: #FFFFFF');

    expect(styles).toContain('--status-success-text-rgb:');
    expect(styles).toContain('--status-warning-text-rgb:');
    expect(styles).toContain('--status-danger-text-rgb:');
    expect(styles).toContain('--status-warning-soft: oklch(0.955 0.035 108)');
    expect(styles).toContain('--metric-blue: oklch(0.52 0.085 244)');

    expect(tailwindConfig).toContain("'accent-strong'");
    expect(tailwindConfig).toContain("'status-success-text'");
    expect(tailwindConfig).toContain("'status-warning-text'");
    expect(tailwindConfig).toContain("'status-danger-text'");
    expect(tailwindConfig).toContain("'control-primary-fg'");
    expect(tailwindConfig).toContain("'control-activation-fg'");
    expect(tailwindConfig).toContain("'control-danger-fg'");
    expect(tailwindConfig).toContain("'control-boundary'");
    expect(tailwindConfig).toContain("'code-text': 'rgb(var(--code-text-rgb) / <alpha-value>)'");
  });

  it('keeps muted and status-soft text contrast readable', () => {
    expect(contrastRatio(rgbVariableValue(lightTheme, '--text-muted-rgb'), rgbVariableValue(lightTheme, '--bg-rgb')))
      .toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(rgbVariableValue(lightTheme, '--text-muted-rgb'), rgbVariableValue(lightTheme, '--surface-rgb')))
      .toBeGreaterThanOrEqual(4.5);

    [
      ['--status-success-text-rgb', '--status-success-soft-rgb'],
      ['--status-warning-text-rgb', '--status-warning-soft-rgb'],
      ['--status-danger-text-rgb', '--status-danger-soft-rgb']
    ].forEach(([textVariable, backgroundVariable]) => {
      expect(contrastRatio(rgbVariableValue(lightTheme, textVariable), rgbVariableValue(lightTheme, backgroundVariable)))
        .toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(rgbVariableValue(darkTheme, textVariable), rgbVariableValue(darkTheme, backgroundVariable)))
        .toBeGreaterThanOrEqual(4.5);
    });
  });

  it('keeps code text readable against both code surfaces', () => {
    for (const theme of [lightTheme, darkTheme]) {
      expect(contrastRatio(
        rgbVariableValue(theme, '--code-text-rgb'),
        rgbVariableValue(theme, '--code-bg-rgb')
      )).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('enforces token palettes, no-glass surfaces, and tested raw-button targets', () => {
    [
      'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow',
      'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet',
      'purple', 'fuchsia', 'pink', 'rose'
    ].forEach((palette) => expect(designSystemCheck).toContain(palette));
    expect(designSystemCheck).toContain("report(path, 'named-tailwind-palette'");
    expect(designSystemCheck).toContain("report(path, 'no-glass'");
    expect(designSystemCheck).toContain("report(path, 'raw-button-target'");
    expect(designSystemCheck).toContain('approvedButtonSizingHelpers');
    expect(designSystemCheck).toContain('canonicalButtonTarget');
    expect(designSystemCheck).toContain("repoPath === 'src/app/AppDesktopSidebarParts.tsx'");
    expect(designSystemCheck).toContain('navButtonClass');
  });

  it('keeps browser chrome and status colors on the token system', () => {
    expect(indexHtml).toContain('<meta name="theme-color" content="#fcfaf6" />');
    expect(indexHtml).toContain('<script src="/theme-init.js"></script>');
    expect(themeInit).toContain("window.localStorage.getItem('app_theme')");
    expect(themeInit).toContain("window.matchMedia('(prefers-color-scheme: dark)')");
    expect(themeInit).toContain("resolvedTheme === 'dark' ? '#121110' : '#fcfaf6'");
    expect(clusterOverviewView).not.toContain('#FF5800');
    expect(clusterOverviewView).toContain('text-accent-strong');
  });

  it('exposes semantic typography roles on Outfit and Ubuntu Mono', () => {
    const expectedRoles = [
      'type-route-title',
      'type-section-title',
      'type-panel-title',
      'type-row-title',
      'type-body',
      'type-ui',
      'type-caption',
      'type-label',
      'type-micro-label',
      'type-data',
      'type-code'
    ];

    for (const weight of [400, 500, 600, 700, 800]) {
      expect(fonts).toContain(`@fontsource/outfit/latin-${weight}.css`);
    }
    for (const weight of [400, 700]) {
      expect(fonts).toContain(`@fontsource/ubuntu-mono/latin-${weight}.css`);
    }
    for (const source of [indexHtml, designSystemHtml, nginxConfig]) {
      expect(source).not.toContain('fonts.googleapis.com');
      expect(source).not.toContain('fonts.gstatic.com');
    }
    expect(nginxConfig).toContain("font-src 'self' data:");
    expect(styles).toContain("font-family: 'Outfit', ui-sans-serif");
    expect(styles).toContain("font-family: 'Ubuntu Mono', ui-monospace");
    expect(styles).toContain('font-kerning: normal');
    expect(styles).toContain('font-optical-sizing: auto');
    expectedRoles.forEach((role) => {
      expect(styles).toContain(`.${role}`);
      expect(typographyDoc).toContain(`\`${role}\``);
    });
    expect(designDocsIndex).toContain('[Typography](/docs/design-docs/typography.md)');
    expect(buttonComponent).toContain("'type-ui inline-flex");
    expect(resourceExplorerControls).toContain("'type-label flex h-11");
    expect(resourceExplorerLayout).toContain('className="type-micro-label');
    expect(markdownComponents).toContain('type-code');
  });

  it('keeps login anchored to triage instead of decorative SaaS motion', () => {
    expect(loginPage).toContain('LoginPreview');
    // Theme toggles recolour in place and play a decorative ripple; the illustration
    // is never paused or snapshotted, so it keeps bounding through the switch.
    expect(styles).toContain('.theme-reveal-ripple {');
    expect(styles).toContain('@keyframes theme-reveal-ripple');
    expect(styles).not.toContain('animation-play-state: paused');
    expect(styles).not.toContain('::view-transition');
    // The right sidebar is a full-bleed gradient (no card border); the illustration
    // sits directly on it.
    expect(loginPage).toContain('login-hunt-panel');
    // The right-sidebar illustration is the "Squirrel Chasing Acorns" chase: a
    // squirrel bounding after acorns past three ops triage step cards.
    [
      'data-login-visual-variant="hunt-chase"', 'collecting ', 'for everything ops',
      'Turn operational knowledge into AI-powered workflows.',
      "order: '01'", "order: '02'", "order: '03'", 'OBSERVE', 'CORRELATE', 'RESOLVE',
      'Pod events', 'CrashLoopBackOff spike', 'Deploy diff', 'Memory limit reduced',
      'Endpoints', 'Service path clear', 'Restart surge', 'Limit change', 'Probe healthy',
      '<svg', 'viewBox="0 0 920 700"', 'preserveAspectRatio', 'foreignObject',
      'login-hunt-scene', 'login-hunt-squirrel', 'login-hunt-tail',
      'login-hunt-leg-front', 'login-hunt-leg-hind', 'login-hunt-shadow', 'login-hunt-streak',
      'login-hunt-trail', 'login-hunt-dust', 'login-hunt-acorn', 'login-hunt-card',
      'login-hunt-bloom'
    ].forEach((needle) => expect(loginPreview).toContain(needle));
    // Colours must resolve through theme tokens (works in light + dark), never hardcoded.
    expect(loginPreview).toContain('rgb(var(--brand-orange');
    expect(loginPreview).toContain('status-warning');
    expect(loginPreview).toContain('status-success');
    // The earlier alert-debug / evidence-run treatments must stay gone.
    [
      'data-login-visual-variant="alert-debug"', 'An alert is only the beginning.', 'Live incident triage',
      'DebugSquirrel', 'AcornEvidence', 'useAnimate', 'useReducedMotion', 'ResizeObserver',
      'data-login-visual-variant="evidence-run"', 'SquirrelRunner', 'AcornToken',
      'login-debug-squirrel', 'login-incident-panel', 'login-squirrel-tail', 'login-acorn-runner',
      'Payments API', 'Payment restart loop', 'Triage focus'
    ].forEach((needle) => expect(loginPreview).not.toContain(needle));
    [
      'login-hunt-panel', 'login-hunt-scene', 'login-hunt-squirrel', 'login-hunt-tail',
      'login-hunt-leg-front', 'login-hunt-leg-hind', 'login-hunt-shadow', 'login-hunt-streak',
      'login-hunt-trail', 'login-hunt-dust', 'login-hunt-acorn', 'login-hunt-card', 'login-hunt-dot',
      'login-hunt-bloom', 'login-hunt-bound', 'login-hunt-tail-wave', 'login-hunt-front-reach',
      'login-hunt-hind-kick', 'login-hunt-hop', 'login-hunt-card-float', 'login-hunt-puff'
    ].forEach((needle) => expect(styles).toContain(needle));
    [
      'login-debug-glow', 'login-debug-glow-breathe', 'login-debug-scene', 'login-incident-panel',
      'login-debug-squirrel', 'login-squirrel-tail', 'login-squirrel-body', 'login-squirrel-head',
      'login-squirrel-paws', 'login-squirrel-mouth', 'login-squirrel-eye', 'login-squirrel-blink',
      'login-debug-acorn', 'login-acorn-runner', 'login-evidence-node', 'login-signal-travel'
    ].forEach((needle) => expect(styles).not.toContain(needle));
    expect(styles).not.toContain('steps(1, end)');
    expect(loginPreview.match(/#[0-9a-f]{3,8}\b/i)).toBeNull();
    expect(styles).toContain('rgb(var(--surface-strong-rgb))');
    expect(styles).not.toContain('login-ambient-float');
    expect(styles).not.toContain('.login-visual-slide:not(:first-child)');
    expect(loginPage).toContain('min-h-[100dvh] w-full overflow-x-hidden overflow-y-auto');
    expect(loginPage).toContain('px-4 py-6 sm:p-8');
    expect(loginPage).toContain('w-full max-w-[26rem]');
    expect(loginPage).toContain('lg:pl-16 lg:pr-8 xl:pl-20 xl:pr-10');
    expect(loginAuthPanel).toContain('p-5 sm:p-8');
    expect(loginPage).not.toContain('bg-gradient-to-r from-accent-bright to-accent');
    expect(loginPage).not.toContain('blur-[120px]');
    expect(loginPage).not.toContain('shadow-accent-bright/30');
    expect(loginPreview).not.toContain('bg-gradient-to-r from-accent-bright to-accent');
    expect(loginPreview).not.toContain('blur-[120px]');
    expect(loginPreview).not.toContain('shadow-accent-bright/30');
  });

  it('makes the workspace homepage triage workflow inspectable from summary to target issue boards', () => {
    expect(overviewPage).toContain('loadAllWorkspaceIssues');
    expect(overviewPage).toContain('listWorkspaceIssues');
    expect(overviewPage).toContain('data-overview-quick-actions="true"');
    expect(overviewPage).toContain('data-connected-targets="true"');
    expect(overviewPage).toContain('data-attention-board="true"');
    expect(overviewPage).toContain("data-primary-issue-card={isPrimary ? 'true' : undefined}");
    expect(overviewPage).toContain('buildWorkspaceOverviewCards');
    expect(overviewPage).toContain('attentionItems.map');
    expect(overviewPage).toContain('onSelectCluster(card.targetId)');
    expect(overviewPage).toContain('onSelectVirtualMachine(card.targetId)');
    expect(overviewPage).toContain('readRecentInvestigation(workspace.id, currentUserId)');
    expect(traceFooter).toContain('Show run details');
    expect(traceFooter).toMatch(/const activitySummary = trace\.status === 'connecting'[\s\S]*'Waiting for progress'/);
  });

  it('keeps triage history from resizing the primary navigation shell', () => {
    expect(desktopSidebar).toContain('w-64 shrink-0');
    expect(chatView).toContain('setIsHistoryOpen(true)');
    expect(chatView).toContain('setIsHistoryOpen(false)');
    expect(chatView).toContain('lg:flex');
    expect(chatView).toContain('absolute inset-0 z-[110] lg:hidden');
    expect(chatView).not.toContain('xl:w-80');
  });

  it('keeps the app shell viewport-bound while route pages own their scroll', () => {
    expect(styles).toContain('html,\nbody,\n#root');
    expect(appShell).toContain('h-[100dvh] min-h-0');
    expect(desktopSidebar).toContain('h-full min-h-0 w-64 shrink-0');
    expect(desktopSidebar).toContain('min-h-0 flex-1 overflow-y-auto');
    expect(pageComposition).toContain('min-h-0 flex-1 overflow-x-hidden overflow-y-auto');
    expect(userSettingsPage).toContain('<PageShell');
    expect(workspaceSettingsPage).toContain('<PageShell');
    expect(clusterSettingsView).toContain('min-h-0 flex-1 overflow-y-auto');
  });
  it('renders quota visibility only in settings surfaces', () => {
    ["t('settings.workspacesJoined')", 'user.quota?.workspaceMemberships', "t('settings.quotaUnavailable')"].forEach((needle) => expect(userSettingsPage).toContain(needle));
    ["t('workspaceSettings.plan')", 'workspace.plan?.name', "t('workspaceSettings.planUnavailable')"].forEach((needle) => expect(workspaceSettingsPage).toContain(needle));
    ["t('workspaceSettings.quotasTitle')", "t('workspaceSettings.workspaceMembers')", 'workspace.quota?.members', 'workspace.quota?.kubernetesClusters', 'workspace.quota?.virtualMachines', "t('workspaceSettings.quotaUnavailable')"].forEach((needle) => expect(workspaceSettingsPage).toContain(needle));
    ["workspacesJoined: 'Workspaces joined'", "workspaceMembers: 'Workspace members'", "kubernetesClusters: 'Kubernetes clusters'", "virtualMachines: 'Virtual machines'"].forEach((needle) => expect(enLocale).toContain(needle));
    [dashboardPage, overviewPage].forEach((surface) => expect(surface).not.toContain('workspaceMemberships'));
    expect(addClusterModal).not.toContain('kubernetesClusters');
  });

  it('keeps workspace settings copy action-oriented and specific', () => {
    [
      "subtitle: 'Review workspace details, quota usage, member access, and deletion controls.'",
      "organizationTitle: 'Workspace details'",
      "organizationBody: 'Confirm the workspace name and plan used for quota and access decisions.'",
      "workspaceName: 'Workspace name'",
      "accessTitle: 'Members and roles'",
      "membersBody: 'Open Members to invite users, remove access, or change roles.'",
      "rbac: 'Role permissions'",
      "rbacBody: 'Workspace role permissions come from control-plane role templates. Change a user\\'s role on the Members page.'",
      "inherited: 'Set by role'",
      "dangerTitle: 'Delete workspace'",
      "dangerBody: 'Permanently removes this workspace, member access, saved settings, cluster registrations, VM registrations, diagnostics context, and chat history. Agents and in-cluster resources are not removed.'"
    ].forEach((needle) => expect(enLocale).toContain(needle));

    [
      "organizationTitle: '工作区详情'",
      "accessTitle: '成员和角色'",
      "rbac: '角色权限'",
      "inherited: '由角色决定'",
      "dangerTitle: '删除工作区'"
    ].forEach((needle) => expect(zhLocale).toContain(needle));
  });

  it('keeps workload filter controls compact and aligned', () => {
    expect(resourceExplorerControls).toContain('data-resource-search-filter-bar="true"');
    expect(resourceExplorerControls).toContain('id="resource-search"');
    expect(resourceCategoryTabs).toContain('role="tablist"');
    expect(resourceCategoryTabs).toContain('role="tab"');
    expect(resourceCategoryTabs).toContain('aria-selected={tab.isActive}');
    expect(resourceCategoryTabs).not.toContain('aria-pressed');
    expect(resourceCategoryTabs).not.toContain('attentionCounts');
    expect(resourceCategoryTabs).not.toContain('reservesAttentionSlot');
    expect(resourceCategoryTabs).not.toContain('min-w-[4.5rem]');
    expect(resourceCategoryTabs).toContain('tabIndex={tab.isActive ? 0 : -1}');
    expect(resourceCategoryTabs).toContain("event.key === 'ArrowRight'");
    expect(workloadsExplorer).toContain('<ResourceCategoryTabs<ResourceFamily>');
    expect(workloadsExplorer).toContain("labelPrefix=\"resources.families\"");
    expect(resourceCategoryTabs).not.toContain('min-w-[8.5rem]');
    expect(resourceCategoryTabs).toContain('whitespace-nowrap');
    expect(resourceCategoryTabs).toContain('border-b-2');
    expect(resourceExplorerControls).not.toContain('rounded-lg px-5 py-2');
    expect(workloadsExplorer).toContain("const SHOW_UNHEALTHY_ONLY_STORAGE_KEY = 'acornops_resources_show_unhealthy_only'");
    expect(workloadsExplorer).toContain('return true;');
    expect(workloadsExplorer).toContain("const [resourceSearchTerm, setResourceSearchTerm] = useState('');");
    expect(workloadsExplorer).toContain('matchesResourceSearch(resourceSearchTerm');
    expect(workloadsExplorer).toContain('q: resourceSearchTerm.trim() || undefined');
    expect(resourceExplorerControls).toContain('aria-label={t(\'resources.filters.unhealthyPodsCount\'');
    expect(workloadsExplorer).toContain('getDefaultExplorerSelection(unhealthyPodCount)');
    expect(workloadsExplorer).toContain('flex-1 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden');
    expect(appPageContent).toContain('flex-1 min-w-0 w-full max-w-full');
    expect(workloadsExplorerSurface).toContain('<ResourceMetaPair label={t(\'resources.row.kind\')}');
    expect(workloadsExplorerSurface).toContain('<ResourceStatusPill status={workload.status} healthy={isHealthy} />');
    expect(resourceExplorerControls).toContain("showUnhealthyPodsOnly ? 'bg-accent' : 'bg-ui-border'");
    expect(workloadsExplorerSurface).toContain('sortAttentionFirst');
    expect(workloadsExplorerSurface).toContain('(workload) => !isHealthyStatus(workload.status)');
    expect(workloadsExplorerSurface).toContain("(ingress) => !hasReportedValue(ingress.address)");
    expect(workloadsExplorerSurface).toContain('(pvc) => !isHealthyStatus(pvc.status)');
    expect(workloadsExplorerSurface).toContain('(node) => !isHealthyStatus(node.status)');
    expect(workloadsExplorerSurface).toContain('healthy={isHealthyStatus(namespace.status)}');
    expect(resourceExplorerControls).toContain('lg:grid-cols-[minmax(16rem,1fr)_minmax(11rem,14rem)_minmax(11rem,14rem)_minmax(9rem,max-content)]');
    expect(resourceExplorerControls).toContain("t('resources.clusterScoped')");
    expect(resourceExplorerControls).toContain('const resourceScopeDisplayClassName =');
    expect(resourceExplorerControls).not.toContain("formInputClassName(\n  'flex h-11 min-h-11 items-center");
    expect(resourceExplorerControls).toContain('children || <div className="hidden min-w-[9rem] lg:block"');
    expect(resourceExplorerControls).not.toContain("t('resources.filtersInventory.title')");
    expect(resourceExplorerControls).not.toContain("t('resources.summary.visibleOfTotal'");
    expect(resourceExplorerControls).not.toContain('const showActiveFilterActions = activeFilters.length > 0 || canResetFilters');
    expect(resourceExplorerControls).not.toContain('mt-3 border-t border-ui-border pt-3 text-xs font-bold uppercase');
    expect(workloadsExplorerSurface).toContain('ResourceList');
    expect(workloadsExplorer).not.toContain('grid grid-cols-1 gap-3');
    expect(workloadsExplorer).not.toContain('rounded-xl border border-ui-border bg-ui-surface p-3 shadow-sm');
    expect(workloadExplorerParts).toContain('export const resourceRowGridClass =');
    expect(workloadExplorerParts).toContain('export const resourceRowHeaderClass =');
    expect(workloadExplorerParts).toContain('xl:grid-cols-[minmax(24rem,1.8fr)_minmax(14rem,0.7fr)_minmax(15rem,max-content)]');
    expect(workloadsExplorerSurface).toContain('resourceRowGridClass,');
    expect(resourceExplorerLayout).toContain('resourceRowGridClass,');
    expect(resourceExplorerLayout).toContain('data-resource-list-header="true"');
    expect(resourceExplorerLayout).toContain("t('resources.table.resource')");
    expect(resourceExplorerLayout).toContain("t('resources.table.metrics')");
    expect(resourceExplorerLayout).toContain("t('resources.table.status')");
    expect(workloadExplorerParts).toContain('export const resourceMetricGridClass =');
    expect(workloadExplorerParts).toContain(
      'xl:grid-cols-[minmax(0,1fr)_minmax(3.75rem,max-content)]'
    );
    expect(workloadsExplorerSurface).toContain('resourceMetricGridClass,');
    expect(workloadsExplorerSurface).toContain('className={resourceMetricGridClass}');
    expect(resourceExplorerLayout).toContain('className={resourceMetricGridClass}');
    expect(workloadsExplorer).not.toContain('grid min-w-0 grid-cols-2 gap-x-5 gap-y-2');
    expect(workloadExplorerParts).not.toContain('grid min-w-0 grid-cols-2 gap-x-5 gap-y-2');
    expect(workloadExplorerParts).not.toContain(
      'xl:grid-cols-[minmax(16rem,1.15fr)_minmax(14rem,0.8fr)_max-content]'
    );
    expect(workloadsExplorer).not.toContain(
      'xl:grid-cols-[minmax(16rem,1.15fr)_minmax(14rem,0.8fr)_max-content]'
    );
    expect(workloadExplorerParts).toContain('export const resourceRowActionClass =');
    expect(workloadExplorerParts).toContain(
      'flex min-w-0 flex-wrap items-center justify-start gap-3 xl:flex-nowrap xl:justify-end xl:justify-self-end'
    );
    expect(workloadsExplorerSurface).toContain('className={resourceRowActionClass}');
    expect(resourceExplorerLayout).toContain('className={resourceRowActionClass}');
    expect(workloadExplorerParts).toContain(
      'inline-flex min-w-0 max-w-full items-center gap-2 rounded-full'
    );
    expect(workloadExplorerParts).toContain('[overflow-wrap:anywhere]');
    expect(resourceExplorerLayout).toContain('type-ui inline-flex shrink-0 items-center gap-1');
    expect(resourceExplorerLayout).toContain('type-panel-title break-words [overflow-wrap:anywhere]');
    expect(resourceExplorerLayout).toContain('type-row-title break-words');
    expect(resourceExplorerLayout).not.toContain('sm:grid-cols-[repeat(3,minmax(0,7rem))_minmax(12rem,1fr)_minmax(10rem,max-content)]');
    expect(resourceExplorerLayout).not.toContain('truncate text-sm font-bold text-ui-text');
    expect(workloadsExplorer).not.toContain('lg:p-12');
    expect(workloadsExplorer).not.toContain('text-xl font-bold text-ui-text');
    expect(workloadsExplorer).not.toContain('h-1 w-1 rounded-full bg-ui-text-muted opacity-30');
    expect(resourceExplorerLayout).not.toContain('ResourceInventoryStrip');
    expect(resourceExplorerLayout).not.toContain('data-resource-inventory-strip="true"');
    expect(resourceExplorerLayout).not.toContain('data-resource-kind-chip="true"');
    expect(resourceExplorerLayout).toContain('data-resource-list="true"');
    expect(resourceExplorerLayout).toContain('min-w-0 w-full max-w-full overflow-hidden rounded-lg border border-ui-border bg-ui-surface divide-y divide-ui-border');
    expect(workloadExplorerParts).toContain('ResourceMetaPair');
    expect(workloadExplorerParts).not.toContain('ResourceMetadataChip');
    expect(resourceExplorerLayout).toContain('ResourceMetricInline');
    expect(resourceExplorerLayout).toContain('data-resource-metric-inline="true"');
    expect(workloadExplorerParts).not.toContain('export const Metric');
    expect(workloadExplorerParts).not.toContain('getResourceExplorerFilterState');
    expect(workloadExplorerParts).not.toContain('buildResourceInventorySummary');
    expect(workloadExplorerParts).not.toContain('ResourceInventorySummary');
    expect(workloadExplorerParts).toContain('ResourceStatusPill');
    expect(resourceExplorerLayout).toContain('ChevronRight');
    ["search: 'Search resources'", "label: 'Resource families'", "unhealthyPods: 'Unhealthy only'", "unhealthyPodsCount: 'Show unhealthy pods only. {{count}} unhealthy pods found.'", "kind: 'Kind'", "resource: 'Resource'", "metrics: 'Metrics'", "status: 'Status'", "logTime: 'Time'", "logSource: 'Source'", "logMessage: 'Message'", "emptyFiltered: 'No resources match the current search and filters.'", "noSearchResults: 'No VM resources match the current search.'"].forEach((snippet) => expect(enLocale).toContain(snippet));
    ['filtersInventory', 'searchChip', 'resourceMix', 'categoryDescriptions', 'serviceCount'].forEach((snippet) => expect(enLocale).not.toContain(snippet));
    ["search: '搜索资源'", "label: '资源类别'", "unhealthyPods: '仅异常'", "unhealthyPodsCount: '仅显示异常 Pod。发现 {{count}} 个异常 Pod。'", "kind: '类型'", "resource: '资源'", "metrics: '指标'", "status: '状态'", "logTime: '时间'", "logSource: '来源'", "logMessage: '消息'", "emptyFiltered: '没有资源匹配当前搜索和筛选条件。'", "noSearchResults: '没有虚拟机资源匹配当前搜索。'"].forEach((snippet) => expect(zhLocale).toContain(snippet));
    ['filtersInventory', 'searchChip', 'resourceMix', 'categoryDescriptions', 'serviceCount'].forEach((snippet) => expect(zhLocale).not.toContain(snippet));
  });

  it('keeps high-frequency task lists free of broad layout choreography', () => {
    expect(dashboardPage).not.toContain('variants={containerVariants}');
    expect(dashboardPage).not.toContain('variants={itemVariants}');
    expect(dashboardPage).not.toContain('layout');
    expect(overviewPage).not.toContain('variants={containerVariants}');
    expect(overviewPage).not.toContain('variants={itemVariants}');
    expect(overviewPage).not.toContain('layout');
    expect(userSettingsPage).not.toContain('variants={containerVariants}');
    expect(userSettingsPage).not.toContain('variants={itemVariants}');
    expect(workspaceSettingsPage).not.toContain('variants={containerVariants}');
    expect(workspaceSettingsPage).not.toContain('variants={itemVariants}');
  });

  it('keeps button hierarchy restrained with orange reserved for activation actions', () => {
    expect(buttonComponent).toContain("export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'icon' | 'danger' | 'activation'");
    expect(buttonComponent).toContain('primary: filledNeutralButtonClass');
    expect(buttonComponent).toContain('border border-control-boundary bg-control-primary text-control-primary-fg');
    expect(buttonComponent).toContain("activation: 'border border-control-boundary bg-control-activation text-control-activation-fg");
    expect(buttonComponent).toContain('hover:bg-control-activation-hover');
    expect(buttonComponent).toContain("secondary: 'border border-control-boundary bg-control-secondary text-control-secondary-fg shadow-sm");
    expect(buttonComponent).toContain("danger: 'border border-control-boundary bg-control-danger text-control-danger-fg");
    expect(buttonComponent).not.toContain('text-ui-bg');
    expect(buttonComponent).toContain("tertiary: 'text-ui-text-muted");
    expect(buttonComponent).toContain('hover:bg-accent-soft hover:text-accent-strong');
    expect(buttonComponent).not.toContain('bg-[oklch(0.18_0.006_70)]');
    expect(buttonComponent).not.toContain('text-white');
    expect(overviewPage).toContain('variant="secondary"');
    expect(membersPage).toMatch(/onClick=\{openInviteModal\}[\s\S]*?variant="primary"/);
    expect(addClusterModal).not.toContain('text-slate-950');
    expect(addClusterModal).toContain('variant="primary"');
  });

  it('meets WCAG AA contrast for every enabled filled button state and control boundary', () => {
    const textPairs = [
      ['--control-primary-fg-rgb', '--control-primary-bg-rgb'],
      ['--control-primary-fg-rgb', '--control-primary-hover-rgb'],
      ['--control-secondary-fg-rgb', '--control-secondary-bg-rgb'],
      ['--control-secondary-fg-rgb', '--control-secondary-hover-rgb'],
      ['--control-activation-fg-rgb', '--control-activation-bg-rgb'],
      ['--control-activation-fg-rgb', '--control-activation-hover-rgb'],
      ['--control-danger-fg-rgb', '--control-danger-bg-rgb'],
      ['--control-danger-fg-rgb', '--control-danger-hover-rgb']
    ];

    for (const theme of [lightTheme, darkTheme]) {
      for (const [foreground, background] of textPairs) {
        expect(contrastRatio(rgbVariableValue(theme, foreground), rgbVariableValue(theme, background)))
          .toBeGreaterThanOrEqual(4.5);
      }
      for (const surrounding of ['--bg-rgb', '--surface-rgb']) {
        expect(contrastRatio(
          rgbVariableValue(theme, '--control-boundary-rgb'),
          rgbVariableValue(theme, surrounding)
        )).toBeGreaterThanOrEqual(3);
      }
    }

    expect(buttonComponent).toContain('disabled:opacity-50');
    expect(buttonComponent).toContain('focus-visible:ring-control-boundary');
  });

  it('separates warning severity color from the orange workflow accent', () => {
    expect(lightTheme).toContain('--brand-orange: oklch(0.712 0.187 39.7)');
    expect(lightTheme).toContain('--status-warning: oklch(0.58 0.115 105)');
    expect(lightTheme).toContain('--status-warning-soft: oklch(0.955 0.035 108)');
    expect(lightTheme).toContain('--status-warning-text: oklch(0.37 0.095 105)');
    expect(darkTheme).toContain('--status-warning: oklch(0.76 0.11 105)');
    expect(darkTheme).toContain('--status-warning-soft: oklch(0.32 0.04 105)');
    expect(darkTheme).toContain('--status-warning-text: oklch(0.83 0.095 105)');
    expect(lightTheme).not.toContain('--status-warning: oklch(0.6 0.135 76)');
    expect(darkTheme).not.toContain('--status-warning: oklch(0.76 0.13 78)');
  });

  it('keeps app page-header action buttons at the medium size', () => {
    expect(dashboardPage).toContain('<Button onClick={onAddCluster} variant="primary" size="md" className="whitespace-nowrap">');
    expect(overviewPage).not.toContain('<Button onClick={onConnectCluster} variant="secondary" size="md">');
    expect(mcpServersView).toContain(
      '<Button onClick={openCreateServerModal} disabled={!canEditServers} variant="secondary" size="md" className="whitespace-nowrap">'
    );
  });

  it('keeps MCP connection state copy action-oriented instead of ambiguous', () => {
    expect(mcpServerCard).toContain("server.type === 'builtin'");
    expect(mcpServerCard).toContain("'mcpServers.statusNotChecked'");
    expect(mcpServerCard).toContain("t('mcpServers.managedByAcornOps')");
    expect(mcpServerCard).not.toContain('detailKey');
    ["statusConnected: 'Connected'", "statusNeedsAuth: 'Needs auth'", "statusDiscoveryFailed: 'Discovery failed'", "statusNotChecked: 'No check yet'", "notChecked: 'No health check yet'"].forEach((copy) => expect(enLocale).toContain(copy));
    expect(enLocale).toContain("managedByAcornOps: 'Managed by AcornOps'");
    ["statusConnected: '已连接'", "statusNeedsAuth: '需要认证'", "statusDiscoveryFailed: '发现失败'", "statusNotChecked: '尚未检查'", "notChecked: '尚未进行健康检查'"].forEach((copy) => expect(zhLocale).toContain(copy));
    expect(zhLocale).toContain("managedByAcornOps: '由 AcornOps 管理'");
  });

  it('keeps contextual help concise at jargon-heavy controls', () => {
    expect(mcpServerCard).toContain("t('mcpServers.healthCheckHelp')");
    expect(mcpServerToolsDialog).toContain("t('mcpServers.toolAccessSummaryBody')");
    expect(resourceExplorerControls).toContain("t('resources.filters.search')");
    expect(resourceExplorerControls).toContain("ariaLabel={t('resources.filters.category')}");
    expect(enLocale).toContain("healthCheckHelp: 'Checks connectivity and refreshes discovered tools.'");
    expect(enLocale).toContain("toolAccessSummaryBody: 'Tools available from this MCP server.'");
    expect(enLocale).toContain("search: 'Search resources'");
    expect(enLocale).toContain("category: 'Category'");
    expect(zhLocale).toContain("healthCheckHelp: '检查连接并刷新已发现的工具。'");
    expect(zhLocale).toContain("toolAccessSummaryBody: '此 MCP 服务器提供的工具。'");
    expect(zhLocale).toContain("search: '搜索资源'");
    expect(zhLocale).toContain("category: '类别'");
  });

  it('keeps MCP server management as an explicit inventory surface', () => {
    expect(mcpServersInventory).toContain('data-mcp-server-access-summary="true"');
    expect(mcpServersInventory).toContain('data-mcp-server-list="true"');
    expect(mcpServerCard).toContain('data-mcp-server-row="true"');
    expect(mcpServersView).not.toContain('data-mcp-server-card-grid="true"');
    expect(mcpServerCard).not.toContain('data-mcp-server-card="true"');
    expect(mcpServersView).not.toContain('xl:grid-cols-3');
    expect(mcpServersView).not.toContain('absolute inset-0 z-0');
    expect(mcpServerCard).toContain("aria-label={t('mcpServers.serverActionsNamed', { name: server.name })}");
    expect(mcpServerCard).toContain('<MenuItem');
  });

  it('keeps app page-header titles at the standard page scale', () => {
    expect(pageComposition).toContain('type-route-title');
    expect(dashboardPage).toContain('<PageHeader');
    expect(overviewPage).toContain('<PageHeader');
    expect(membersPage).toContain('<PageHeader');
    expect(userSettingsPage).toContain('<PageHeader');
    expect(workspaceSettingsPage).toContain('<PageHeader');
  });

  it('keeps primary workspace pages on the shared full-width shell', () => {
    expect(styles).toContain('scrollbar-gutter: stable both-edges;');
    expect(pageComposition).toContain('px-[var(--route-padding-x)] py-[var(--route-padding-y)] custom-scrollbar stable-scrollbar-gutter');
    expect(overviewPage).toContain('<PageShell>');
    expect(dashboardPage).toContain('<PageShell>');
    expect(overviewPage).not.toContain('max-w-[90rem]');
    expect(dashboardPage).not.toContain('max-w-[90rem]');
  });

  it('keeps cluster detail pages on the shared full-width shell', () => {
    expect(clusterOverviewView).toContain('px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8');
    expect(clusterSettingsView).toContain('px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8');
    expect(workloadsExplorer).toContain('px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8');
    expect(mcpServersView).toContain('px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8');
  });

  it('keeps the workspace homepage in normal responsive flow', () => {
    expect(overviewPage).toContain('data-overview-quick-actions="true"');
    expect(overviewPage).toContain('data-connected-targets="true"');
    expect(overviewPage).toContain('data-attention-board="true"');
    expect(overviewPage).toContain('rounded-lg border border-ui-border bg-ui-surface');
    expect(overviewPage).toContain('sm:flex-row sm:items-center lg:w-auto lg:max-w-2xl lg:justify-end');
    expect(overviewPage).toContain('flex min-h-11 w-full items-center justify-between gap-3');
    expect(overviewPage).toContain('flex flex-col gap-4 px-5 py-5 sm:px-6');
    expect(overviewPage).toContain('xl:grid-cols-2');
    expect(overviewPage).toContain('overflow-hidden rounded-xl border border-accent/20');
    expect(overviewPage).toContain('w-full justify-center sm:w-auto');
    expect(overviewPage).toContain('group flex w-full items-center gap-4 px-4 py-3');
    expect(overviewPage).toContain("data-primary-issue-card={isPrimary ? 'true' : undefined}");
    expect(overviewPage).toContain("t('overview.evidenceLabel')");
    expect(overviewPage.indexOf('data-attention-board="true"')).toBeLessThan(
      overviewPage.indexOf('data-connected-targets="true"')
    );
    expect(overviewPage).not.toContain('{card.targetTypeLabel}');
    expect(overviewPage).not.toContain('{issue.summary &&');
  });

  it('keeps connected target lists directly reachable without a secondary healthy-target panel', () => {
    expect(overviewPage).toContain("t('overview.connectedClustersTitle')");
    expect(overviewPage).toContain("t('overview.connectedVirtualMachinesTitle')");
    expect(overviewPage).not.toContain('data-healthy-targets="true"');
  });

  it('keeps workspace member access changes deliberate and stable', () => {
    expect(membersPage).toContain('confirmRemoveMember');
    expect(membersPage).toContain('setIsConfirmingRemove(true)');
    expect(membersPage).toContain('members.confirmRemoveAccess');
    expect(membersPage).toContain('members.confirmRoleChange');
    expect(membersPage).not.toContain('changeMemberRoleFromRow');
    expect(membersPage).not.toContain('variants={tableVariants} initial="hidden" animate="show"');
    expect(membersPage).not.toContain('variants={rowVariants}');
  });

  it('preserves one-time invitation links while invitation pages refresh', () => {
    expect(membersPage).toContain('inviteLink: existing?.inviteLink');
    expect(membersPage).toContain('onCreateInvitation ? createInvitation : undefined');
    expect(membersPage).not.toContain('[loadInvitations, workspace.id, workspace.invitations]');
  });

});
