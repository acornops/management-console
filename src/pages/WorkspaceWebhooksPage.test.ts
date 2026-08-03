import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');
const page = readSource('src/pages/WorkspaceWebhooksPage.tsx');
const inboundPage = readSource('src/pages/WorkspaceIncomingWebhooksPage.tsx');
const inboundCard = readSource('src/pages/WorkspaceWebhookCard.tsx');
const editor = readSource('src/features/webhooks/WebhookEditor.tsx');
const list = readSource('src/features/webhooks/WebhookList.tsx');
const model = readSource('src/features/webhooks/webhookModel.ts');
const appPageContent = readSource('src/app/AppPageContent.tsx');
const settingsPage = readSource('src/pages/SettingsPage.tsx');
const controlPlaneApi = readSource('src/services/controlPlaneApi.ts');
const webhookApi = readSource('src/services/control-plane/webhookApi.ts');

describe('WorkspaceWebhooksPage contract surface', () => {
  it('mounts the webhook route and uses the typed browser API client', () => {
    expect(appPageContent).toContain("route.kind === 'workspaceWebhooks'");
    expect(appPageContent).toContain('<WorkspaceWebhooksPage');
    expect(controlPlaneApi).toContain('...webhookApi');
    expect(webhookApi).toContain('async listWebhooks(workspaceId: string)');
    expect(webhookApi).toContain('async createWebhook(workspaceId: string, input: ControlPlaneWebhookInput)');
    expect(webhookApi).toContain('async updateWebhook(');
    expect(webhookApi).toContain('async deleteWebhook(workspaceId: string, webhookId: string)');
    expect(webhookApi).toContain('async listWebhookHistory(');
  });

  it('renders as an Automation collection page rather than a Settings tab', () => {
    expect(page).toContain('<PageShell>');
    expect(page).toContain('<PageHeader');
    expect(page).toContain('<DiscoveryFilterBar');
    expect(list).not.toContain("heading={t('workspaceWebhooks.listTitle')}");
    expect(page).toContain('<DrawerFrame');
    expect(settingsPage).not.toContain("'webhooks'");
    expect(settingsPage).not.toContain('WorkspaceWebhooksPage');
  });

  it('provides a URL-backed inbound and outbound hub while preserving outbound as the default', () => {
    expect(page).toContain("type WebhookDirection = 'inbound' | 'outbound'");
    expect(page).toContain("urlSearch.get('direction') === 'inbound' ? 'inbound' : 'outbound'");
    expect(page).toContain('<SegmentedTabs<WebhookDirection>');
    expect(page).toContain('direction: direction === \'inbound\' ? \'inbound\' : null');
    expect(page).toContain('<WorkspaceIncomingWebhooksPage hub');
    expect(page).toContain("if (activeDirection === 'outbound') void loadWebhooks(true)");
    expect(page.indexOf("{ value: 'outbound', label: t('workspaceWebhooks.directions.outbound') }")).toBeLessThan(
      page.indexOf("{ value: 'inbound', label: t('workspaceWebhooks.directions.inbound') }")
    );
  });

  it('keeps inbound configuration workflow-owned while the hub aggregates every workflow', () => {
    expect(inboundPage).toContain('listWorkspaceWorkflowWebhooks(requestedWorkspaceId)');
    expect(inboundPage).toContain('workflowActionLabel={hub');
    expect(inboundPage).toContain("tab: 'webhooks'");
    expect(inboundPage).toContain('{!hub && <WorkspaceWebhookDeleteDialog');
    expect(inboundPage).toContain('{!hub && <DialogFrame');
    expect(inboundCard).toContain('workflowPath && workflowActionLabel');
    expect(inboundCard).toContain('handleAppLinkClick(event, workflowPath, navigate)');
  });

  it('shows URL-backed search while loading or useful and searches operational fields', () => {
    expect(page).toContain("const query = urlSearch.get('q') || ''");
    expect(page).toContain('!workspaceStateCurrent || isInitialLoading || visibleWebhooks.length > 0 || hasActiveFilters');
    expect(inboundPage).toContain("!workspaceStateCurrent || phase === 'loading' || triggers.length > 0 || hasActiveFilters");
    expect(page).toContain("queryLabel={t('workspaceWebhooks.filters.search')}");
    expect(page).toContain('webhook.name');
    expect(page).toContain('webhook.url');
    expect(page).toContain('...webhook.eventTypes');
  });

  it('uses the same empty-state icon for inbound and outbound webhooks', () => {
    expect(list).toContain('icon={hasActiveFilters ? <ICONS.Search /> : <ICONS.Send />}');
    expect(inboundPage).toContain('icon={hasActiveFilters ? <ICONS.Search /> : <ICONS.Send />}');
  });

  it('keeps read access separate from manage_webhooks mutations', () => {
    expect(page).toContain('canManageWebhooks');
    expect(page).toContain('if (!canManageWebhooks) return;');
    expect(page).toContain('open={canManageWebhooks && editorOpen}');
    expect(page).toContain('workspaceWebhooks.readOnlyTitle');
    expect(list).toContain('{canManageWebhooks && (');
  });

  it('uses current accessible form, state, status, and destructive confirmation primitives', () => {
    expect(editor).toContain('<form');
    expect(editor).toContain('type="url"');
    expect(editor).toContain('<fieldset');
    expect(list).toContain('<DataSurface');
    expect(list).toContain('<EmptyState');
    expect(list).toContain('<StatusBadge');
    expect(list).toContain('<OverflowActionMenu');
    expect(list).toContain("t('workspaceWebhooks.columns.destination')");
    expect(list).toContain("t('workspaceWebhooks.columns.modified')");
    expect(page).toContain('<DestructiveConfirmationDialog');
    expect(list).not.toContain('<InlineConfirmation');
    expect(list).toContain('hasActiveFilters');
  });

  it('stacks webhook facts below an in-view compact action row until the desktop ledger fits', () => {
    expect(list).toContain('grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[');
    expect(list.match(/col-span-2 min-w-0 xl:col-span-1/g)).toHaveLength(3);
    expect(list).toContain('col-start-2 row-start-1 flex justify-end');
    expect(list).toContain('xl:col-start-auto xl:row-start-auto');
  });

  it('toggles complete event groups, exposes selected state, and scrolls selected events into view', () => {
    expect(editor).toContain('toggleEventGroup(group.eventTypes)');
    expect(editor).toContain('aria-pressed={groupSelected}');
    expect(editor).toContain('eventList.scrollTo({');
    expect(editor).toContain('data-event-scroll-region');
    expect(editor).toContain('eventScrollIndicator.height');
    expect(model).toContain('if (groupSelected) next.delete(eventType)');
    expect(model).toContain('else next.add(eventType)');
    expect(model).toContain("id: 'issueAlerts'");
    expect(model).toContain("eventTypes: ['issue.created.v1', 'issue.reopened.v1', 'issue.resolved.v1']");
    expect(model).toContain("id: 'runAlerts'");
  });

  it('keeps created signing secrets in one-time component state only', () => {
    expect(page).toContain('const [createdSecret, setCreatedSecret]');
    expect(page).toContain('setCreatedSecret({ name: created.name, secret: created.secret })');
    expect(page).not.toContain('localStorage');
    expect(page).not.toContain('sessionStorage');
  });

  it('loads delivery history through the manage_webhooks-gated endpoint', () => {
    expect(page).toContain('controlPlaneApi.listWebhookHistory(requestedWorkspaceId, webhook.id, { limit: 25 })');
    expect(list).toContain("t('workspaceWebhooks.historyEmpty')");
    expect(list).toContain('deliveryStatusTone(entry)');
    expect(list).toContain('entry.attemptNumber');
    expect(list).toContain('entry.nextAttemptAt');
    expect(list).toContain('entry.terminalReason');
  });

  it('fences asynchronous results while retaining workspace-scoped list data', () => {
    expect(page).toContain('currentWorkspaceId.current = workspace.id');
    expect(page).toContain('webhookRequestSequence.current === requestSequence');
    expect(page).toContain('historyRequestSequence.current === requestSequence');
    expect(page).toContain('saveRequestSequence.current === requestSequence');
    expect(page).toContain('deleteRequestSequence.current === requestSequence');
    expect(page).toContain('useSessionCachedState<ControlPlaneWebhookSubscription[]>(webhookCacheKey, [])');
    expect(page).not.toContain('setWebhooks([])');
    expect(page).toContain('const workspaceStateCurrent = stateWorkspaceId === workspace.id');
    expect(page).toContain('const visibleWebhooks = workspaceStateCurrent ? webhooks : []');
  });
});
