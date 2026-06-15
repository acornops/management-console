import { describe, expect, it } from 'vitest';
import {
  addClusterModal,
  appDialogs,
  appPageContent,
  appShell,
  auditLogPage,
  buttonComponent,
  chatSubmit,
  chatView,
  clusterOverviewView,
  clusterSettingsView,
  contrastRatio,
  darkTheme,
  dashboardPage,
  designDocsIndex,
  desktopSidebar,
  enLocale,
  fieldValidationMessage,
  indexHtml,
  investigationsPage,
  lightTheme,
  loginAuthPanel,
  loginAuthPanelParts,
  loginPage,
  loginPasswordAuthForm,
  loginPreview,
  markdownComponents,
  mcpServerCard,
  mcpServersDialogs,
  mcpServersView,
  membersPage,
  mobileNavigation,
  overviewPage,
  resourceExplorerControls,
  resourceExplorerLayout,
  resourcesView,
  rgbVariableValue,
  runbooksPage,
  styles,
  tailwindConfig,
  traceFooter,
  typographyDoc,
  userSettingsPage,
  workloadExplorerParts,
  workloadsExplorer,
  workloadsExplorerSurface,
  workspaceInviteModal,
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

    expect(darkTheme).toContain('--bg: oklch(0.18 0.008 60)');
    expect(darkTheme).toContain('--surface: oklch(0.225 0.008 58)');
    expect(darkTheme).toContain('--surface-strong: oklch(0.265 0.01 58)');
    expect(darkTheme).toContain('--border: oklch(0.32 0.018 54)');
    expect(darkTheme).toContain('--text: oklch(0.96 0.008 80)');
    expect(darkTheme).toContain('--text-muted: oklch(0.7 0.018 60)');
    expect(darkTheme).toContain('--bg-rgb: 20 17 14');
    expect(darkTheme).toContain('--surface-rgb: 31 27 24');
    expect(darkTheme).toContain('--surface-strong-rgb: 41 36 33');
    expect(darkTheme).toContain('--border-rgb: 58 49 42');
    expect(darkTheme).toContain('--text-rgb: 245 241 236');
    expect(darkTheme).toContain('--text-muted-rgb: 167 156 148');

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

  it('keeps browser chrome and status colors on the token system', () => {
    expect(indexHtml).toContain('content="#fcfaf6" media="(prefers-color-scheme: light)"');
    expect(indexHtml).toContain('content="#14110e" media="(prefers-color-scheme: dark)"');
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

    expect(indexHtml).toContain('family=Outfit:wght@400;500;600;700;800&family=Ubuntu+Mono:wght@400;700');
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
    expect(resourceExplorerControls).toContain("'type-label flex h-9");
    expect(resourceExplorerLayout).toContain('className="type-micro-label');
    expect(markdownComponents).toContain('type-code');
  });

  it('keeps login anchored to triage instead of decorative SaaS motion', () => {
    expect(loginPage).toContain('LoginPreview');
    expect(loginPreview).toContain('data-login-visual-variant="a3"');
    expect(loginPreview).toContain('Service health');
    expect(loginPreview).toContain('Service restart loop');
    expect(loginPreview).toContain('login-health-indicator');
    expect(loginPreview).not.toContain('Payments API');
    expect(loginPreview).not.toContain('Payment restart loop');
    expect(loginPreview).toContain('visualEvidenceTrace.map');
    expect(loginPreview).toContain('CrashLoopBackOff spike');
    expect(loginPreview).toContain('Memory limit reduced');
    expect(loginPreview).toContain('Service path clear');
    expect(loginPreview).toContain('login-evidence-node');
    expect(loginPreview).toContain('login-evidence-signal');
    expect(loginPreview).toContain('login-evidence-signal-y');
    expect(loginPreview).toContain('login-evidence-trace');
    expect(loginPreview).toContain('login-evidence-trace-row');
    expect(loginPreview).toContain('login-evidence-run-card');
    expect(loginPreview).toContain('login-evidence-note-card');
    expect(loginPreview).not.toContain('login-evidence-primary-card');
    expect(loginPreview).not.toContain('login-evidence-signal-late');
    expect(loginPreview).not.toContain('login-evidence-signal-y-late');
    expect(loginPreview).not.toContain('login-evidence-icon');
    expect(loginPreview).not.toContain('login-evidence-badge');
    expect(loginPreview).not.toContain('login-evidence-status');
    expect(loginPreview).not.toContain('login-evidence-line');
    expect(loginPreview).not.toContain('login-evidence-card-sweep');
    expect(loginPreview).not.toContain('login-evidence-scan');
    expect(loginPreview).toContain('top-[7rem]');
    expect(loginPreview).toContain('min-h-[31rem]');
    expect(loginPreview).toContain('top-[21rem]');
    expect(loginPreview).toContain('login-evidence-signal absolute z-0');
    expect(loginPreview).toContain('login-evidence-signal-y absolute z-0');
    expect(loginPreview).toContain('login-evidence-node absolute z-10');
    expect(loginPreview).toContain('login-evidence-trace absolute z-10');
    expect(loginPreview).not.toContain('bg-[linear-gradient(to_right');
    expect(loginPreview).not.toContain('ambientSignals.map');
    expect(loginPreview).not.toContain('login-ambient-signal');
    expect(loginPreview).not.toContain('overflow-hidden rounded-lg border border-ui-border bg-ui-bg/45');
    expect(loginPreview).not.toContain('Triage focus');
    expect(styles).toContain('login-evidence-node');
    expect(styles).toContain('login-evidence-rule');
    expect(styles).toContain('login-evidence-signal');
    expect(styles).toContain('login-evidence-signal-y');
    expect(styles).toContain('login-evidence-trace');
    expect(styles).toContain('login-health-indicator');
    expect(styles).toContain('login-health-breathe');
    expect(styles).toContain('login-evidence-run-card');
    expect(styles).toContain('login-evidence-note-card');
    expect(styles).toContain('login-run-card-shift');
    expect(styles).toContain('login-note-card-shift');
    expect(styles).not.toContain('login-evidence-primary-card');
    expect(styles).not.toContain('login-card-shift');
    expect(styles).toContain('login-signal-travel');
    expect(styles).toContain('login-signal-drop');
    expect(styles).toContain('login-trace-row-enter');
    expect(styles).not.toContain('login-health-search');
    expect(styles).not.toContain('steps(1, end)');
    expect(styles).not.toContain('login-evidence-signal-late');
    expect(styles).not.toContain('login-evidence-signal-y-late');
    expect(styles).not.toContain('login-node-drift');
    expect(styles).not.toContain('login-note-breathe');
    expect(styles).not.toContain('login-icon-attention');
    expect(styles).not.toContain('login-badge-live');
    expect(styles).not.toContain('login-trace-float');
    expect(styles).not.toContain('login-status-pulse');
    expect(styles).not.toContain('login-line-resolve');
    expect(styles).not.toContain('login-card-sweep');
    expect(styles).not.toContain('login-trace-scan');
    expect(styles).not.toContain('login-row-focus');
    expect(styles).toContain('background: rgb(var(--surface-rgb) / 1);');
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

  it('makes the desktop triage workflow inspectable from queue to trace', () => {
    expect(investigationsPage).toContain('listWorkspaceInvestigations');
    expect(investigationsPage).toContain('nextCursor');
    expect(investigationsPage).toContain('investigations.queueTitle');
    expect(investigationsPage).toContain('investigations.activeTriageTitle');
    expect(investigationsPage).toContain('investigations.activeTriageBody');
    expect(investigationsPage).toContain('investigations.viewCluster');
    expect(investigationsPage).toContain('investigations.runTriagePrimary');
    expect(investigationsPage).toContain('remainingInvestigations.map');
    expect(investigationsPage).toContain('lg:grid-cols-[1.75rem_minmax(0,1fr)_auto] lg:items-start');
    expect(investigationsPage).toContain('grid min-w-0 grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center lg:self-start lg:justify-end');
    expect(investigationsPage).not.toContain('onOpenClusterFindings');
    expect(chatView).not.toContain('chat.runStatus');
    expect(chatView).not.toContain('chat.activeTriage');
    expect(chatView).not.toContain('chat.guardedWrites');
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
    expect(userSettingsPage).toContain('min-h-0 flex-1 overflow-y-auto');
    expect(workspaceSettingsPage).toContain('min-h-0 flex-1 overflow-y-auto');
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

  it('keeps workload filter controls compact and aligned', () => {
    expect(resourceExplorerControls).toContain('h-9');
    expect(resourceExplorerControls).toContain('grid-cols-2');
    expect(resourceExplorerControls).toContain('sm:min-w-[8.5rem]');
    expect(resourceExplorerControls).not.toContain('rounded-lg px-5 py-2');
    expect(workloadsExplorer).toContain("const SHOW_UNHEALTHY_ONLY_STORAGE_KEY = 'acornops_resources_show_unhealthy_only'");
    expect(workloadsExplorer).toContain('return true;');
    expect(resourceExplorerControls).toContain('aria-label={t(\'resources.filters.unhealthyPodsCount\'');
    expect(workloadsExplorer).toContain('t(resultSummaryParts.summaryKey');
    expect(workloadsExplorer).toContain('getDefaultExplorerSelection(unhealthyPodCount)');
    expect(workloadsExplorer).toContain('buildResourceInventorySummary({');
    expect(resourceExplorerControls).toContain('<ResourceInventoryStrip summary={inventorySummary} />');
    expect(workloadsExplorer).toContain('flex-1 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden');
    expect(appPageContent).toContain('flex-1 min-w-0 w-full max-w-full');
    expect(workloadsExplorerSurface).toContain('<ResourceMetaPair label={t(\'resources.row.kind\')}');
    expect(workloadsExplorerSurface).toContain('<ResourceStatusPill status={workload.status} healthy={isHealthy} />');
    expect(resourceExplorerControls).toContain("showUnhealthyPodsOnly ? 'bg-accent' : 'bg-ui-border'");
    expect(resourceExplorerControls).toContain('data-resource-filter-summary="true"');
    expect(resourceExplorerControls).toContain('data-resource-advanced-controls="true"');
    expect(resourceExplorerControls).toContain('lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)]');
    expect(resourceExplorerControls).toContain('type-row-title min-w-0 break-words');
    expect(resourceExplorerControls).toContain("t('resources.summary.visibleOfTotal'");
    expect(resourceExplorerControls).toContain('activeFilterCount === 1');
    expect(resourceExplorerControls).toContain('className="mt-3 border-t border-ui-border pt-3"');
    expect(resourceExplorerControls).toContain('const showActiveFilterActions = activeFilters.length > 0 || canResetFilters');
    expect(resourceExplorerControls).not.toContain('mt-3 border-t border-ui-border pt-3 text-xs font-bold uppercase');
    expect(workloadsExplorerSurface).toContain('ResourceList');
    expect(workloadsExplorer).not.toContain('grid grid-cols-1 gap-3');
    expect(workloadsExplorer).not.toContain('grid grid-cols-1 gap-4');
    expect(workloadsExplorer).not.toContain('rounded-xl border border-ui-border bg-ui-surface p-3 shadow-sm');
    expect(workloadExplorerParts).toContain('export const resourceRowGridClass =');
    expect(workloadExplorerParts).toContain('xl:grid-cols-[minmax(24rem,1.8fr)_minmax(14rem,0.7fr)_minmax(15rem,max-content)]');
    expect(workloadsExplorerSurface).toContain('resourceRowGridClass,');
    expect(resourceExplorerLayout).toContain('resourceRowGridClass,');
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
    expect(resourceExplorerLayout).toContain('grid grid-cols-2 gap-2');
    expect(resourceExplorerLayout).toContain('min-w-0 overflow-hidden rounded-md border border-ui-border/70');
    expect(resourceExplorerLayout).not.toContain('sm:grid-cols-[repeat(3,minmax(0,7rem))_minmax(12rem,1fr)_minmax(10rem,max-content)]');
    expect(resourceExplorerLayout).not.toContain('truncate text-sm font-bold text-ui-text');
    expect(workloadsExplorer).not.toContain('lg:p-12');
    expect(workloadsExplorer).not.toContain('text-xl font-bold text-ui-text');
    expect(workloadsExplorer).not.toContain('h-1 w-1 rounded-full bg-ui-text-muted opacity-30');
    expect(resourceExplorerLayout).toContain('data-resource-inventory-strip="true"');
    expect(resourceExplorerLayout).toContain('data-resource-kind-chip="true"');
    expect(resourceExplorerLayout).toContain('data-resource-list="true"');
    expect(resourceExplorerLayout).toContain('min-w-0 w-full max-w-full overflow-hidden rounded-lg border border-ui-border bg-ui-surface divide-y divide-ui-border');
    expect(workloadExplorerParts).toContain('ResourceMetaPair');
    expect(workloadExplorerParts).not.toContain('ResourceMetadataChip');
    expect(resourceExplorerLayout).toContain('ResourceMetricInline');
    expect(resourceExplorerLayout).toContain('data-resource-metric-inline="true"');
    expect(workloadExplorerParts).not.toContain('export const Metric');
    expect(workloadExplorerParts).toContain('ResourceStatusPill');
    expect(resourceExplorerLayout).toContain('ChevronRight');
    expect(enLocale).toContain("unhealthyPods: 'Unhealthy only'");
    expect(enLocale).toContain("unhealthyPodsCount: 'Show unhealthy pods only. {{count}} unhealthy pods found.'");
    expect(enLocale).toContain("unhealthyPodsCategory: 'Unhealthy pods'");
    expect(enLocale).toContain("namespaced: '{{count}} {{category}} · {{namespace}}'");
    expect(enLocale).toContain("clusterScoped: '{{count}} {{category}} · Cluster-scoped'");
    expect(enLocale).toContain("attention: 'Attention'");
    expect(enLocale).toContain("resourceMix: 'Mix'");
    expect(enLocale).toContain("kind: 'Kind'");
    expect(zhLocale).toContain("unhealthyPods: '仅异常'");
    expect(zhLocale).toContain("unhealthyPodsCount: '仅显示异常 Pod。发现 {{count}} 个异常 Pod。'");
    expect(zhLocale).toContain("unhealthyPodsCategory: '异常 Pod'");
    expect(zhLocale).toContain("namespaced: '{{count}} 项 {{category}} · {{namespace}}'");
    expect(zhLocale).toContain("clusterScoped: '{{count}} 项 {{category}} · 集群范围'");
    expect(zhLocale).toContain("attention: '需关注'");
    expect(zhLocale).toContain("resourceMix: '构成'");
    expect(zhLocale).toContain("kind: '类型'");
  });

  it('keeps high-frequency task lists free of broad layout choreography', () => {
    expect(dashboardPage).not.toContain('variants={containerVariants}');
    expect(dashboardPage).not.toContain('variants={itemVariants}');
    expect(dashboardPage).not.toContain('layout');
    expect(investigationsPage).not.toContain('variants={containerVariants}');
    expect(investigationsPage).not.toContain('variants={itemVariants}');
    expect(investigationsPage).not.toContain('layout');
    expect(runbooksPage).not.toContain('variants={containerVariants}');
    expect(runbooksPage).not.toContain('variants={itemVariants}');
    expect(runbooksPage).not.toContain('layout');
    expect(userSettingsPage).not.toContain('variants={containerVariants}');
    expect(userSettingsPage).not.toContain('variants={itemVariants}');
    expect(workspaceSettingsPage).not.toContain('variants={containerVariants}');
    expect(workspaceSettingsPage).not.toContain('variants={itemVariants}');
  });

  it('keeps button hierarchy restrained with orange reserved for accent actions', () => {
    expect(buttonComponent).toContain("type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'ghost' | 'icon' | 'danger'");
    expect(buttonComponent).toContain('primary: filledNeutralButtonClass');
    expect(buttonComponent).toContain('bg-[oklch(0.18_0.006_70)]');
    expect(buttonComponent).toContain("accent: 'border border-accent bg-accent");
    expect(buttonComponent).toContain('text-[oklch(0.99_0.004_86)]');
    expect(buttonComponent).toContain('hover:bg-accent-bright');
    expect(buttonComponent).toContain("secondary: 'border border-ui-border bg-ui-surface text-ui-text shadow-sm");
    expect(buttonComponent).toContain("tertiary: 'text-ui-text-muted");
    expect(buttonComponent).toContain('hover:bg-accent-soft hover:text-accent-strong');
    expect(buttonComponent).not.toContain('text-white');
    expect(investigationsPage).toContain('variant="accent" size="md"');
    expect(investigationsPage).toContain('<Button onClick={onConnectCluster} variant="accent" size="lg" className="mt-8">');
    expect(investigationsPage).not.toContain('text-status-success-text text-status-success-text');
    expect(membersPage).toMatch(/onClick=\{openInviteModal\}[\s\S]*?variant="secondary"/);
    expect(addClusterModal).not.toContain('text-slate-950');
    expect(addClusterModal).toContain('variant="accent"');
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
    expect(dashboardPage).toContain('<Button onClick={onAddCluster} variant="secondary" size="md" className="whitespace-nowrap">');
    expect(overviewPage).not.toContain('<Button onClick={onConnectCluster} variant="secondary" size="md">');
    expect(investigationsPage).not.toContain('<Button onClick={onConnectCluster} variant="secondary" size="md">');
    expect(runbooksPage).toContain('<Button onClick={startCreatingRunbook} variant="accent" size="md" className="whitespace-nowrap">');
    expect(mcpServersView).toContain(
      '<Button onClick={openCreateServerModal} disabled={!canEditServers} variant="secondary" size="md">'
    );
  });

  it('keeps MCP connection state copy action-oriented instead of ambiguous', () => {
    expect(mcpServerCard).toContain("server.type === 'builtin'");
    expect(mcpServerCard).toContain("t('mcpServers.localServer')");
    expect(mcpServerCard).toContain("'mcpServers.notChecked'");
    expect(enLocale).toContain("notChecked: 'Not checked'");
    expect(enLocale).toContain("localServer: 'Local server'");
    expect(zhLocale).toContain("notChecked: '尚未检查'");
    expect(zhLocale).toContain("localServer: '本地服务器'");
  });

  it('keeps contextual help concise at jargon-heavy controls', () => {
    expect(mcpServerCard).toContain("t('mcpServers.healthCheckHelp')");
    expect(mcpServersDialogs).toContain("t('mcpServers.toolEnablementHelp')");
    expect(resourceExplorerControls).toContain("t('resources.filters.namespaceHelp')");
    expect(resourceExplorerControls).toContain("t('resources.filters.categoryHelp')");
    expect(enLocale).toContain("healthCheckHelp: 'Checks connectivity and refreshes discovered tools.'");
    expect(enLocale).toContain("toolEnablementHelp: 'Newly discovered external tools stay disabled until an admin reviews and enables them.'");
    expect(enLocale).toContain("namespaceHelp: 'Limits the list to resources reported in one namespace.'");
    expect(enLocale).toContain("categoryHelp: 'Narrows results to the selected resource type.'");
    expect(zhLocale).toContain("healthCheckHelp: '检查连接并刷新已发现的工具。'");
    expect(zhLocale).toContain("toolEnablementHelp: '新发现的外部工具会保持停用，直到管理员审核并启用。'");
    expect(zhLocale).toContain("namespaceHelp: '仅列出一个命名空间上报的资源。'");
    expect(zhLocale).toContain("categoryHelp: '将结果缩小到所选资源类型。'");
  });

  it('keeps MCP server management as an explicit card-action surface', () => {
    expect(mcpServersView).toContain('data-mcp-server-card-grid="true"');
    expect(mcpServerCard).toContain('data-mcp-server-card="true"');
    expect(mcpServersView).not.toContain('data-mcp-server-list="true"');
    expect(mcpServersView).not.toContain('data-mcp-server-row="true"');
    expect(mcpServersView).toContain('lg:grid-cols-2');
    expect(mcpServersView).not.toContain('xl:grid-cols-3');
    expect(mcpServersView).not.toContain('absolute inset-0 z-0');
    expect(mcpServerCard).toContain("aria-label={t('mcpServers.manageToolsNamed', { name: server.name })}");
    expect(mcpServerCard).toContain("aria-label={t('mcpServers.healthCheckNamed', { name: server.name })}");
    expect(mcpServerCard).toContain("aria-label={t('mcpServers.editNamed', { name: server.name })}");
    expect(mcpServerCard).toContain("aria-label={t('mcpServers.deleteNamed', { name: server.name })}");
  });

  it('keeps runbook creation and execution context separated', () => {
    expect(runbooksPage).toContain('runbooks.targetHelper');
    expect(runbooksPage).toContain('ariaLabel={t(\'runbooks.runTarget\')}');
    expect(runbooksPage).toContain('className="mb-5 flex flex-col gap-4 border-y border-ui-border bg-ui-surface/60 px-4 py-4');
    expect(runbooksPage).not.toContain('setIsCreatingRunbook((isOpen) => !isOpen)');
    expect(runbooksPage).not.toContain("t('runbooks.cancelCreate')");
  });

  it('keeps app page-header titles at the standard page scale', () => {
    expect(dashboardPage).toContain('type-route-title');
    expect(overviewPage).toContain('type-route-title');
    expect(membersPage).toContain('type-route-title');
    expect(investigationsPage).toContain('type-route-title');
    expect(runbooksPage).toContain('type-route-title');
    expect(userSettingsPage).toContain('mb-2 text-3xl font-bold tracking-tight text-ui-text');
    expect(workspaceSettingsPage).toContain('type-route-title');
  });

  it('keeps primary workspace pages on the shared full-width shell', () => {
    expect(styles).toContain('scrollbar-gutter: stable both-edges;');
    expect(overviewPage).toContain('px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8');
    expect(dashboardPage).toContain('px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8');
    expect(overviewPage).not.toContain('max-w-[90rem]');
    expect(dashboardPage).not.toContain('max-w-[90rem]');
  });

  it('keeps cluster detail pages on the shared full-width shell', () => {
    expect(clusterOverviewView).toContain('px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8');
    expect(clusterSettingsView).toContain('px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8');
    expect(workloadsExplorer).toContain('px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8');
    expect(mcpServersView).toContain('px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8');
  });

  it('keeps the workspace command center in normal responsive flow', () => {
    expect(overviewPage).toMatch(
      /<section\s+data-workspace-command-center="true"\s+className="mb-6 min-w-0 w-full max-w-full overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm"/
    );
    expect(overviewPage).toContain('data-workspace-command-center-header="true"');
    expect(overviewPage).toContain('xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] xl:items-start');
    expect(overviewPage).toContain('<h2 className="type-row-title">{t(\'overview.triageQueueTitle\')}</h2>');
    expect(overviewPage).toContain('grid min-w-0 max-w-full overflow-hidden rounded-md border border-current/10 bg-ui-surface/70 sm:grid-cols-3 lg:min-w-[26rem]');
    expect(overviewPage).toContain('border-b border-ui-border/70 sm:border-b-0 sm:border-r');
    expect(overviewPage).toContain('<dt className="type-caption">{item.label}</dt>');
    expect(overviewPage).toContain('data-workspace-command-center-body="true"');
    expect(overviewPage).toContain('data-priority-queue-panel="true"');
    expect(overviewPage).toContain('data-operating-signals-panel="true"');
    expect(overviewPage).toContain('xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]');
    expect(overviewPage).toContain(
      'flex flex-col items-start gap-3 border-b border-ui-border bg-ui-bg px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6'
    );
    expect(overviewPage).not.toContain('className="w-full justify-center whitespace-nowrap sm:w-auto sm:shrink-0"');
    expect(overviewPage).toContain("const queuePrimaryActionLabel = clusterCount === 0 && canManageClusters ? t('app.connectClusterHelm') : t('overview.viewInvestigationQueue');");
    expect(overviewPage).toContain('data-queue-primary-action="true"');
    expect(overviewPage.indexOf('data-workspace-command-center-header')).toBeLessThan(
      overviewPage.indexOf('data-workspace-command-center-body')
    );
    expect(overviewPage.indexOf('data-priority-queue-panel')).toBeLessThan(
      overviewPage.indexOf('data-operating-signals-panel')
    );
  });

  it('promotes mobile investigation triage before the desktop queue toolbar and queue introduction', () => {
    expect(investigationsPage).toContain('data-mobile-triage-actions="true"');
    expect(investigationsPage).not.toContain('data-investigation-metrics="true"');
    expect(investigationsPage).toContain('data-investigation-queue-toolbar="true"');
    expect(investigationsPage.indexOf('data-mobile-triage-actions="true"')).toBeLessThan(
      investigationsPage.indexOf('data-investigation-queue-toolbar="true"')
    );
    expect(investigationsPage.indexOf('data-mobile-triage-actions="true"')).toBeLessThan(
      investigationsPage.indexOf('data-investigation-queue-panel="true"')
    );
    expect(investigationsPage).toContain('className="mb-5 md:hidden"');
    expect(investigationsPage).toContain('variant="accent" size="md" className="w-full"');
  });

  it('keeps workspace member access changes deliberate and stable', () => {
    expect(membersPage).toContain('confirmRemoveMember');
    expect(membersPage).toContain('setIsConfirmingRemove(true)');
    expect(membersPage).toContain('members.confirmRemoveAccess');
    expect(membersPage).not.toContain('variants={tableVariants} initial="hidden" animate="show"');
    expect(membersPage).not.toContain('variants={rowVariants}');
  });

  it('preserves one-time invitation links while invitation pages refresh', () => {
    expect(membersPage).toContain('inviteLink: existing?.inviteLink');
    expect(membersPage).toContain('onCreateInvitation ? createInvitation : undefined');
    expect(membersPage).not.toContain('[loadInvitations, workspace.id, workspace.invitations]');
  });

  it('labels paged member and investigation counts as loaded counts', () => {
    expect(membersPage).toContain('members.loadedTotalCount');
    expect(membersPage).toContain('members.loadedMatchingCount');
    expect(enLocale).toContain("inviteLinksCount: '{{count}} loaded links'");
    expect(enLocale).toContain("active: 'Loaded investigations'");
  });

  it('clears resource pages before replacing paginated resources', () => {
    expect(resourcesView).toContain("if (mode === 'replace') {");
    expect(resourcesView).toContain('setResourceItems([]);');
    expect(resourcesView).toContain('setNextCursor(undefined);');
    expect(resourcesView).not.toContain('window.setTimeout');
  });

  it('does not require the full MCP tool list before requesting write-capable chat runs', () => {
    expect(chatSubmit).toContain("canRequestWriteRuns ? 'read_write' : 'read_only'");
    expect(chatSubmit).not.toContain('app.mcpTools || []');
  });

  it('keeps table rows visibly highlighted on hover', () => {
    expect(membersPage).toContain('className="group border-b border-ui-bg transition-colors hover:bg-accent-soft/45"');
    expect(clusterOverviewView).toContain('transition-colors last:border-b-0 hover:bg-ui-bg/70');
    expect(markdownComponents).toContain("const tableRowHoverClass = isUserTone ? 'hover:bg-ui-bg/10' : 'hover:bg-ui-bg/70'");
    expect(markdownComponents).toContain('<tr className={`transition-colors ${tableRowHoverClass}`}>{children}</tr>');
  });

  it('keeps workspace members and audit log tables inside the viewport', () => {
    expect(membersPage).not.toContain('overflow-x-auto');
    expect(membersPage).not.toContain('min-w-[760px]');
    expect(auditLogPage).not.toContain('overflow-x-auto');
    expect(auditLogPage).not.toContain('min-w-[920px]');
  });

  it('keeps workspace member and audit log pages on the shared route margins', () => {
    const sharedRouteShell = 'min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8';
    expect(membersPage).toContain(sharedRouteShell);
    expect(auditLogPage).toContain(sharedRouteShell);
    expect(auditLogPage).not.toContain('mx-auto max-w-7xl px-5 py-8 lg:px-8');
    expect(auditLogPage).not.toContain('overflow-hidden border-y border-ui-border bg-ui-surface');
  });

  it('uses app-styled validation instead of native browser validation bubbles', () => {
    const validationSurfaces = [
      workspaceInviteModal,
      loginAuthPanel,
      loginPasswordAuthForm,
      loginAuthPanelParts
    ].join('\n');
    expect(validationSurfaces).toContain('noValidate');
    expect(validationSurfaces).toContain('aria-invalid={Boolean(');
    expect(validationSurfaces).toContain('FieldValidationMessage');
    expect(validationSurfaces).not.toMatch(/\srequired(?:\s|>|$)/);
    expect(fieldValidationMessage).toContain('role="alert"');
    expect(fieldValidationMessage).toContain('border-status-danger/25 bg-status-danger-soft');
  });

  it('keeps audit log time presets available for log-style filtering', () => {
    expect(auditLogPage).toContain("const timePresetOptions: AuditTimePreset[] = ['today', 'last24h', 'past7d', 'past30d'];");
    expect(auditLogPage).toContain('aria-pressed={isActive}');
    expect(auditLogPage).toContain('applyNormalizedFilters(nextFilters);');
  });

  it('auto-applies audit log filter selections without relying on an apply button', () => {
    expect(auditLogPage).toContain('data-audit-filter-toolbar="true"');
    expect(auditLogPage).toContain('aria-controls="audit-custom-range-controls"');
    expect(auditLogPage).toContain('const timer = window.setTimeout(() => {');
    expect(auditLogPage).toContain('applyNormalizedFilters(draftFilters);');
    expect(auditLogPage).not.toContain("t('auditLog.applyFilters')");
  });

});
