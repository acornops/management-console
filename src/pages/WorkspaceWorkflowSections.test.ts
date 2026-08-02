import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');
const appPageContent = readSource('src/app/AppPageContent.tsx');
const workflowsPage = readSource('src/pages/WorkspaceWorkflowsPage.tsx');
const workflowPageComponents = readSource('src/pages/WorkspaceWorkflowsPage.components.tsx');
const activityPage = readSource('src/pages/WorkspaceActivityPage.tsx');
const workflowActions = readSource('src/pages/workflows/WorkflowLaunchActions.tsx');
const workflowDetailTabs = readSource('src/pages/workflows/WorkflowDetailTabs.tsx');
const workflowChrome = readSource('src/pages/WorkspaceWorkflowsChrome.tsx');
const workflowTriggerPanel = readSource('src/pages/WorkflowTriggerPanel.tsx');
const workflowPanels = readSource('src/pages/WorkspaceWorkflowsPage.panels.tsx');
const workflowOverview = readSource('src/pages/WorkspaceWorkflowOverviewPanel.tsx');
const workflowHelpers = readSource('src/pages/workflows/workflowPageHelpers.tsx');
const workflowModel = readSource('src/pages/workflows/workflowModel.ts');
const schedulesPage = readSource('src/pages/WorkspaceSchedulesPage.tsx');
const webhooksPage = readSource('src/pages/WorkspaceIncomingWebhooksPage.tsx');
const webhookApi = readSource('src/services/control-plane/workflowWebhookApi.ts');
const navigation = readSource('src/app/workspaceNavigation.tsx');
const sections = readSource('src/pages/workflows/WorkflowSections.tsx');

describe('workflow sections and Activity', () => {
  it('mounts Workflows, Schedules, and Activity as route-backed tabs', () => {
    expect(sections).toContain("value: 'all'");
    expect(sections).toContain("value: 'schedules'");
    expect(sections).not.toContain("value: 'incomingWebhooks'");
    expect(sections).toContain("value: 'activity'");
    expect(sections).toContain('AppPaths.workspaceActivity(workspaceId)');
    expect(sections).toContain('activity.openCount > 0 ? activity.openCount : undefined');
    expect(sections).toContain('AppPaths.workspaceWorkflows(workspaceId, section)');
    expect(workflowChrome).toContain('<WorkflowSections activeSection="all"');
    expect(schedulesPage).toContain('<WorkflowSections activeSection="schedules"');
    expect(webhooksPage).not.toContain('<WorkflowSections');
    expect(activityPage).toContain('<WorkflowSections activeSection="activity"');
  });

  it('keeps immediate workflow actions in the header and moves trigger management into detail tabs', () => {
    expect(workflowActions).toContain('aria-label="Selected workflow actions"');
    expect(workflowActions).toContain('mt-3 flex w-full');
    expect(workflowActions).toContain('sm:justify-end');
    expect(workflowActions).not.toContain('border-t border-ui-border');
    expect(workflowActions).toContain("(primaryAction === 'activate' || launchBlocked) && (");
    expect(workflowActions).toContain("primaryAction === 'activate' ? 'Inactive' : 'Blocked'");
    expect(workflowActions).not.toContain("launchBlocked ? 'Blocked' : 'Ready'");
    expect(workflowActions).not.toContain('Readiness checks passed');
    expect(workflowActions).not.toContain('line-clamp-1');
    expect(workflowActions).toContain('max-w-2xl break-words');
    expect(workflowActions).toContain("t('workflows.actions.reviewReadiness')");
    expect(workflowActions).toContain("t('workflows.actions.edit')");
    expect(workflowActions).not.toContain("t('workflows.actions.schedules')");
    expect(workflowActions).not.toContain("t('workflows.actions.webhooks')");
    expect(workflowActions).toContain("t('workflows.actions.launch')");
    expect(workflowActions).toContain('size="md"');
    expect(workflowActions).not.toContain('size="icon"');
    expect(workflowActions).not.toContain('<Tooltip');
    expect(workflowPageComponents).toContain("workflow.status !== 'active' && (");
    expect(workflowPageComponents).toContain("preview.status !== 'ready'");
    expect(workflowPageComponents).toContain('WorkflowWriteAccessValue');
    expect(workflowsPage).toContain("selectedWorkflow.status !== 'active' ? (");
    expect(workflowsPage).toContain('<WorkflowModeLabel');
    expect(workflowsPage).toContain('title={selectedWorkflow.name}');
    expect(workflowsPage).toContain('titleMeta={<WorkflowModeLabel');
    expect(workflowsPage).not.toContain('Owner: {selectedWorkflow.owner}');
    expect(workflowsPage).not.toContain('density="compact"');
    expect(workflowDetailTabs).toContain("schedules: 'Schedules'");
    expect(workflowDetailTabs).toContain("webhooks: 'Webhooks'");
  });

  it('keeps compact workflow navigation discoverable', () => {
    expect(sections).toContain('[&_button]:px-2');
    expect(sections).toContain('[&_button>span:first-child]:hidden');
    expect(workflowPageComponents).toContain('data-search-filter-frame-summary=true');
    expect(workflowsPage).toContain('desktopBreakpoint="wide"');
    expect(workflowsPage).toContain('className="min-[1440px]:overflow-y-hidden"');
  });

  it('opens custom workflow creation directly without a template picker', () => {
    expect(workflowChrome).toContain('onClick={onCreate}');
    expect(workflowChrome).toContain('Add workflow');
    expect(workflowChrome).not.toContain('ActionMenu');
    expect(workflowChrome).not.toContain('WorkflowRecommendation');
    expect(workflowChrome).not.toContain('Use a template');
    expect(workflowsPage).not.toContain('recommendationsOpen');
    expect(workflowsPage).not.toContain("panel === 'templates'");
  });

  it('routes schedules and inbound webhooks through the Workflows page family', () => {
    expect(appPageContent).toContain("route.section === 'schedules'");
    expect(appPageContent).toContain("route.section === 'incomingWebhooks'");
    expect(appPageContent).toContain('createWorkflowId={route.createWorkflowId}');
    expect(appPageContent).not.toContain("route.kind === 'workspaceTriggers'");
  });

  it('keeps Activity content inside the Workflows route family', () => {
    expect(navigation).not.toContain("id: 'activity'");
    expect(navigation).toContain("experimentalBadge: t('app.experimental')");
    expect(navigation).not.toContain("badge: t('app.experimental')");
    expect(activityPage).toContain('searchWidth="fluid"');
    expect(activityPage).toContain('filterWidth="compact"');
    expect(activityPage).toContain('denseBreakpoint="xl"');
    expect(activityPage).toContain("state: routeState.state || 'all'");
    expect(activityPage).toContain("defaultValue: 'all'");
    expect(activityPage).not.toContain('<DiscoveryFilterBar\n            embedded');
    expect(activityPage).toContain("activityLedgerFillsAvailableSpace = phase === 'loading' || items.length > 0");
    expect(workflowPageComponents).toContain('embedded={embedded}');
    expect(workflowPageComponents).toContain('searchWidth="fluid"');
    expect(workflowsPage).toContain('idPrefix="workflow-library-mobile"');
    expect(workflowsPage).toContain('idPrefix="workflow-library-desktop"');
    expect(workflowsPage).toContain('listWidth="wide"');
    expect(workflowPageComponents).toContain("' · Press / to focus search'");
  });

  it('keeps workflow inspection and trigger tabs visible, edits agent assignment in Overview, and opens settings through Edit', () => {
    expect(workflowHelpers).toContain("workflowViews: WorkflowView[] = ['overview', 'capabilities', 'schedules', 'webhooks', 'runs', 'settings']");
    expect(workflowModel).toContain("WorkflowView = 'overview' | 'capabilities' | 'schedules' | 'webhooks' | 'runs' | 'settings'");
    expect(workflowDetailTabs).toContain("workflowInspectionViews: WorkflowView[] = ['overview', 'capabilities', 'schedules', 'webhooks', 'runs']");
    expect(workflowDetailTabs).toContain('<SegmentedTabs<WorkflowView>');
    expect(workflowDetailTabs).toContain('labelSize="compact"');
    expect(workflowDetailTabs).toContain('Scroll for more sections');
    expect(workflowsPage).toContain("activeView === 'overview'");
    expect(workflowsPage).not.toContain("activeView === 'agents'");
    expect(workflowsPage).toContain('<WorkflowAgentAssignmentSection');
    expect(workflowPanels).toContain("title={t('workflowCoordination.assignmentTitle')}");
    expect(workflowsPage).toContain("activeView === 'capabilities'");
    expect(workflowsPage).toContain("activeView === 'schedules' || activeView === 'webhooks'");
    expect(workflowsPage).toContain("activeView === 'runs'");
    expect(workflowsPage).toContain('<MasterDetailLayout\n        boundedOnDesktop');
    expect(workflowsPage).not.toContain('usesBoundedWorkflowDetail');
    expect(workflowsPage).toContain("activeView === 'settings'");
    expect(workflowsPage).toContain("selectWorkflowView('settings', selectedWorkflow.id)");
    expect(workflowsPage).toContain('Back to workflow');
    expect(workflowsPage).toContain("onReviewCapabilities={() => selectWorkflowView('capabilities'");
    expect(workflowPanels).toContain("t('workflowCoordination.effectiveAccess')");
    expect(workflowOverview).not.toContain('title="Capabilities"');
    expect(workflowsPage).not.toContain("open={activeView === 'runs'}");
    expect(workflowsPage).not.toContain("open={activeView === 'settings'}");
    expect(workflowsPage).toContain('<WorkflowTriggerPanel');
    expect(workflowsPage).toContain('<WorkflowOverviewPanel');
    expect(workflowPanels).toContain('title="Capabilities"');
    expect(workflowsPage).toContain('<WorkflowRunsPanel');
    expect(workflowPanels).toContain('timelineLayout="flow"');
    expect(workflowPanels).toContain('className="max-w-none"');
    expect(workflowPanels).toContain("t('workflowActivity.emptyWorkflowDescription')");
  });

  it('renders schedule and webhook collections in workflow detail panels and creation forms in dialogs', () => {
    expect(workflowTriggerPanel).toContain('<WorkspaceSchedulesPage');
    expect(workflowTriggerPanel).toContain('<WorkspaceIncomingWebhooksPage');
    expect(schedulesPage).toContain('<PageShell embedded={embedded}');
    expect(webhooksPage).toContain('<PageShell embedded={embedded || hub}');
    expect(schedulesPage).toContain('<WorkspaceScheduleDialog');
    expect(webhooksPage).toContain('<DialogFrame');
    expect(schedulesPage).toContain('<DataTable');
    expect(webhooksPage).toContain('<DataTable');
  });

  it('uses the webhook-only API and preserves one-time secret disclosure', () => {
    expect(webhookApi).toContain('WorkflowWebhookCreatedResponse');
    expect(webhookApi).toContain('signingSecret: WorkflowWebhookSecret');
    expect(webhookApi).not.toContain('acornops_event');
    expect(webhooksPage).toContain('created.signingSecret');
    expect(webhooksPage).toContain('rotated.signingSecret');
    expect(webhooksPage).not.toContain('inputBindings');
    expect(webhooksPage).not.toContain('sourceType');
  });
});
