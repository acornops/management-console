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
const workflowPanels = readSource('src/pages/WorkspaceWorkflowsPage.panels.tsx');
const workflowHelpers = readSource('src/pages/workflows/workflowPageHelpers.tsx');
const workflowModel = readSource('src/pages/workflows/workflowModel.ts');
const schedulesPage = readSource('src/pages/WorkspaceSchedulesPage.tsx');
const webhooksPage = readSource('src/pages/WorkspaceIncomingWebhooksPage.tsx');
const webhookApi = readSource('src/services/control-plane/workflowWebhookApi.ts');
const navigation = readSource('src/app/workspaceNavigation.tsx');
const sections = readSource('src/pages/workflows/WorkflowSections.tsx');

describe('workflow sections and Activity', () => {
  it('mounts Workflows, Schedules, Incoming Webhooks, and Activity as route-backed tabs', () => {
    expect(sections).toContain("value: 'all'");
    expect(sections).toContain("value: 'schedules'");
    expect(sections).toContain("value: 'incomingWebhooks'");
    expect(sections).toContain("value: 'activity'");
    expect(sections).toContain('AppPaths.workspaceActivity(workspaceId)');
    expect(sections).toContain('activity.openCount > 0 ? activity.openCount : undefined');
    expect(sections).toContain('AppPaths.workspaceWorkflows(workspaceId, section)');
    expect(workflowsPage).toContain('<WorkflowSections activeSection="all"');
    expect(schedulesPage).toContain('<WorkflowSections activeSection="schedules"');
    expect(webhooksPage).toContain('<WorkflowSections activeSection="incomingWebhooks"');
    expect(activityPage).toContain('<WorkflowSections activeSection="activity"');
  });

  it('restores text-labelled workflow actions below the description', () => {
    expect(workflowActions).toContain('aria-label="Workflow actions"');
    expect(workflowActions).toContain('mt-3 flex w-full');
    expect(workflowActions).toContain("t('workflows.actions.edit')");
    expect(workflowActions).toContain("t('workflows.actions.schedules')");
    expect(workflowActions).toContain("t('workflows.actions.webhooks')");
    expect(workflowActions).toContain("t('workflows.actions.launch')");
    expect(workflowActions).toContain('size="md"');
    expect(workflowActions).not.toContain('size="icon"');
    expect(workflowActions).not.toContain('<Tooltip');
    expect(workflowsPage).not.toContain('density="compact"');
    expect(workflowsPage).toContain("panel: 'schedules'");
    expect(workflowsPage).toContain("panel: 'webhooks'");
  });

  it('routes schedules and incoming webhooks through the Workflows page family', () => {
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
    expect(activityPage).not.toContain('<DiscoveryFilterBar\n            embedded');
    expect(activityPage).toContain("activityLedgerFillsAvailableSpace = phase === 'loading' || items.length > 0");
    expect(workflowPageComponents).toContain('<DiscoveryFilterBar searchWidth="fluid"');
    expect(workflowPageComponents).not.toContain('embedded={!withSpacing}');
    expect(workflowsPage).not.toContain('listWidth="compact"');
  });

  it('restores five route-backed detail tabs with current panel contents', () => {
    expect(workflowHelpers).toContain("workflowViews: WorkflowView[] = ['overview', 'agents', 'capabilities', 'runs', 'settings']");
    expect(workflowsPage).toContain('<SegmentedTabs<WorkflowView>');
    expect(workflowsPage).toContain('workflowViewLabels');
    expect(workflowsPage).toContain("activeView === 'overview'");
    expect(workflowsPage).toContain("activeView === 'agents'");
    expect(workflowsPage).toContain("activeView === 'capabilities'");
    expect(workflowsPage).toContain("activeView === 'runs'");
    expect(workflowsPage).toContain("const usesBoundedWorkflowDetail = activeView !== 'runs';");
    expect(workflowsPage).toContain('boundedOnDesktop={usesBoundedWorkflowDetail}');
    expect(workflowsPage).toContain("activeView === 'settings'");
    expect(workflowsPage).toContain("onReviewCapabilities={() => selectWorkflowView('capabilities'");
    expect(workflowsPage).not.toContain("open={activeView === 'runs'}");
    expect(workflowsPage).not.toContain("open={activeView === 'settings'}");
    expect(workflowsPage).toContain("managementPanel === 'schedules'");
    expect(workflowsPage).toContain("managementPanel === 'webhooks'");
    expect(workflowsPage).toContain('<WorkflowOverviewPanel');
    expect(workflowPanels).toContain('title="Capabilities"');
    expect(workflowsPage).toContain('<WorkflowRunsPanel');
    expect(workflowPanels).toContain('timelineLayout="flow"');
    expect(workflowPanels).toContain('className="-mx-4 max-w-none"');
    expect(workflowPanels).toContain('Use Launch in the workflow header');
  });

  it('renders schedule and webhook collections in drawers and creation forms in dialogs', () => {
    expect(workflowsPage).toContain('<WorkspaceSchedulesPage');
    expect(workflowsPage).toContain('<WorkspaceIncomingWebhooksPage');
    expect(schedulesPage).toContain('<PageShell embedded={embedded}');
    expect(webhooksPage).toContain('<PageShell embedded={embedded}');
    expect(schedulesPage).toContain('<DialogFrame');
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
