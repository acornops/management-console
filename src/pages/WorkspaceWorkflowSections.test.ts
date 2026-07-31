import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');
const appPageContent = readSource('src/app/AppPageContent.tsx');
const sections = readSource('src/pages/workflows/WorkflowSections.tsx');
const workflowsPage = readSource('src/pages/WorkspaceWorkflowsPage.tsx');
const schedulesPage = readSource('src/pages/WorkspaceSchedulesPage.tsx');
const webhooksPage = readSource('src/pages/WorkspaceIncomingWebhooksPage.tsx');
const webhookApi = readSource('src/services/control-plane/workflowWebhookApi.ts');
const navigation = readSource('src/app/workspaceNavigation.tsx');

describe('workflow sections and Activity', () => {
  it('mounts three first-class route-backed Workflow tabs', () => {
    expect(sections).toContain("value: 'all'");
    expect(sections).toContain("value: 'schedules'");
    expect(sections).toContain("value: 'incomingWebhooks'");
    expect(sections).toContain('AppPaths.workspaceWorkflows(workspaceId, section)');
    expect(workflowsPage).toContain('<WorkflowSections activeSection="all"');
    expect(schedulesPage).toContain('<WorkflowSections activeSection="schedules"');
    expect(webhooksPage).toContain('<WorkflowSections activeSection="incomingWebhooks"');
  });

  it('routes schedules and incoming webhooks through the Workflows page family', () => {
    expect(appPageContent).toContain("route.section === 'schedules'");
    expect(appPageContent).toContain("route.section === 'incomingWebhooks'");
    expect(appPageContent).toContain('createWorkflowId={route.createWorkflowId}');
    expect(appPageContent).not.toContain("route.kind === 'workspaceTriggers'");
  });

  it('keeps Activity as a top-level Automation destination', () => {
    expect(navigation).toContain("id: 'activity'");
    expect(navigation).toContain("label: t('app.activity')");
    expect(navigation).toContain('AppPaths.workspaceActivity(workspace.id)');
    expect(navigation).not.toContain('children:');
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
