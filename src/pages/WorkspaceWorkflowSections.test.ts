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
const workspaceViewTabs = readSource('src/pages/workflows/WorkflowWorkspaceViewTabs.tsx');

describe('workflow sections and Activity', () => {
  it('uses a tabless workflow canvas with five icon-led task actions', () => {
    expect(workflowsPage).not.toContain('<WorkflowSections');
    expect(workflowsPage).not.toContain('<WorkflowPrimaryTabs');
    expect(schedulesPage).not.toContain('<WorkflowSections');
    expect(webhooksPage).not.toContain('<WorkflowSections');
    expect(workflowActions).toContain('aria-label="Workflow actions"');
    expect(workflowActions).toContain('label="Run activity"');
    expect(workflowActions).toContain('label="Schedules"');
    expect(workflowActions).toContain('label="Incoming webhooks"');
    expect(workflowActions).toContain('aria-label="Workflow operations"');
    expect(workflowActions).toContain('aria-label="Workflow definition and launch"');
    expect(workflowActions).toContain('size="icon"');
    expect(workflowActions).toContain('<Tooltip');
  });

  it('routes schedules and incoming webhooks through the Workflows page family', () => {
    expect(appPageContent).toContain("route.section === 'schedules'");
    expect(appPageContent).toContain("route.section === 'incomingWebhooks'");
    expect(appPageContent).toContain('createWorkflowId={route.createWorkflowId}');
    expect(appPageContent).not.toContain("route.kind === 'workspaceTriggers'");
  });

  it('keeps Activity inside Workflows and moves Experimental beside Workflows', () => {
    expect(navigation).not.toContain("id: 'activity'");
    expect(navigation).toContain("experimentalBadge: t('app.experimental')");
    expect(navigation).not.toContain("badge: t('app.experimental')");
    expect(workspaceViewTabs).toContain("value: 'workflows'");
    expect(workspaceViewTabs).toContain("value: 'activity'");
    expect(workspaceViewTabs).toContain('AppPaths.workspaceActivity(workspaceId)');
    expect(workspaceViewTabs).toContain('mb-4 min-w-0 space-y-3');
    expect(workspaceViewTabs).not.toContain('grid-cols-');
    expect(workspaceViewTabs).not.toContain('lg:items-center');
    expect(workspaceViewTabs).not.toContain('items-start');
    expect(activityPage).toContain('searchWidth="fluid"');
    expect(activityPage).toContain('filterWidth="compact"');
    expect(activityPage).not.toContain('<DiscoveryFilterBar\n            embedded');
    expect(activityPage).toContain("activityLedgerFillsAvailableSpace = phase === 'loading' || items.length > 0");
    expect(workflowPageComponents).toContain('<DiscoveryFilterBar searchWidth="fluid"');
    expect(workflowPageComponents).not.toContain('embedded={!withSpacing}');
    expect(workspaceViewTabs).toContain('{children}');
    expect(workflowsPage).toContain('listWidth="compact"');
  });

  it('keeps Overview permanent while preserving contextual drawer route states', () => {
    expect(workflowHelpers).not.toContain('primaryWorkflowTabs');
    expect(workflowHelpers).toContain("workflowViews: WorkflowView[] = ['overview', 'agents', 'capabilities', 'runs', 'settings']");
    expect(workflowsPage).toContain("selectWorkflowView('agents', selectedWorkflow.id)");
    expect(workflowsPage).toContain("onReviewCapabilities={() => selectWorkflowView('capabilities'");
    expect(workflowsPage).toContain("open={activeView === 'runs'}");
    expect(workflowsPage).toContain("open={activeView === 'settings'}");
    expect(workflowsPage).toContain("managementPanel === 'schedules'");
    expect(workflowsPage).toContain("managementPanel === 'webhooks'");
    expect(workflowsPage).toContain('<WorkflowOverviewPanel');
    expect(workflowPanels).toContain('title="Capabilities"');
    expect(workflowsPage).toContain('title="Run activity"');
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
