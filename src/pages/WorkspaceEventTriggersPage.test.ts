import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { retainDeclaredBindings } from './WorkspaceEventTriggersPage.model';

const root = resolve(__dirname, '../..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');
const page = readSource('src/pages/WorkspaceEventTriggersPage.tsx');
const schedulesPage = readSource('src/pages/WorkspaceSchedulesPage.tsx');
const appPageContent = readSource('src/app/AppPageContent.tsx');
const navigation = readSource('src/app/workspaceNavigation.tsx');
const pageModel = readSource('src/pages/WorkspaceEventTriggersPage.model.ts');
const triggerCard = readSource('src/pages/WorkspaceEventTriggerCard.tsx');
const deleteDialog = readSource('src/pages/WorkspaceEventTriggerDeleteDialog.tsx');
const scheduleDeleteDialog = readSource('src/pages/WorkspaceScheduleDeleteDialog.tsx');
const createMenu = readSource('src/pages/WorkflowTriggerCreateMenu.tsx');
const triggersPageHeader = readSource('src/pages/WorkflowTriggersPageHeader.tsx');
const workflowApi = readSource('src/services/control-plane/workflowEventTriggerApi.ts');

describe('WorkspaceEventTriggersPage contract surface', () => {
  it('mounts event sources inside the shared Triggers child route', () => {
    expect(appPageContent).toContain("route.kind === 'workspaceTriggers'");
    expect(appPageContent).toContain('<WorkspaceEventTriggersPage');
    expect(navigation).toContain("id: 'workflowTriggers'");
    expect(navigation).toContain('AppPaths.workspaceTriggers(workspace.id)');
    expect(page).toContain('trigger.sourceType === sourceType');
  });

  it('uses persistent trigger-type tabs instead of changing the collection from a filter', () => {
    expect(triggersPageHeader).toContain('<SegmentedTabs<WorkflowTriggerType>');
    expect(triggersPageHeader).toContain('idBase="workflow-trigger-type"');
    expect(triggersPageHeader).toContain("t('triggers.tabsLabel')");
    expect(triggersPageHeader).toContain('AppPaths.workspaceTriggers(workspace.id, triggerType)');
    expect(triggersPageHeader).toContain('pendingTriggerTabFocus = { workspaceId: workspace.id, triggerType }');
    expect(triggersPageHeader).toContain('document.getElementById(`workflow-trigger-type-${currentType}-tab`)?.focus()');
    expect(page).toContain('role="tabpanel"');
    expect(page).toContain('id={`workflow-trigger-type-${sourceType}-panel`}');
    expect(schedulesPage).toContain('id="workflow-trigger-type-schedule-panel"');
    expect(page).not.toContain("id: 'type'");
    expect(schedulesPage).not.toContain("id: 'type'");
  });

  it('offers every trigger creator without requiring a type-filter change first', () => {
    expect(page).toContain('<WorkflowTriggersPageHeader');
    expect(triggersPageHeader).toContain('<WorkflowTriggerCreateMenu');
    expect(triggersPageHeader).toContain('AppPaths.workspaceTriggerCreate(workspace.id, triggerType)');
    expect(createMenu).toContain("['schedule', 'acornops_event', 'webhook']");
    expect(createMenu).toContain('aria-haspopup="menu"');
    expect(createMenu).toContain('role="menu"');
    expect(createMenu).toContain('<MenuItem');
    expect(createMenu).toContain("event.key === 'Escape'");
    expect(appPageContent).toContain('createTriggerType={route.createTriggerType}');
  });

  it('uses the persisted event-trigger API for CRUD and secret rotation', () => {
    expect(workflowApi).toContain('listWorkspaceWorkflowEventTriggers(');
    expect(workflowApi).toContain('createWorkflowEventTrigger(');
    expect(workflowApi).toContain('updateWorkflowEventTrigger(');
    expect(workflowApi).toContain('deleteWorkflowEventTrigger(');
    expect(workflowApi).toContain('rotateWorkflowEventTriggerSecret(');
    expect(page).not.toContain('localStorage');
    expect(page).not.toContain('sessionStorage');
  });

  it('keeps the first source set narrow and maps issue fields explicitly', () => {
    expect(page).toContain("'acornops_event'");
    expect(page).toContain("'webhook'");
    expect(page).toContain("'issue.created.v1'");
    expect(pageModel).toContain("'target.id'");
    expect(page).toContain("parameter.type === 'chat'");
    expect(page).toContain('missingIssueBinding');
  });

  it('removes bindings for workflow parameters that no longer exist', () => {
    expect(retainDeclaredBindings({
      target: 'target.id',
      removedParameter: 'issue.title'
    }, ['target'])).toEqual({ target: 'target.id' });
  });

  it('uses accessible collection, drawer, status, and destructive confirmation primitives', () => {
    expect(page).toContain('<PageShell>');
    expect(page).toContain('<WorkflowTriggersPageHeader');
    expect(triggersPageHeader).toContain('<PageHeader');
    expect(page).toContain('<DiscoveryFilterBar');
    expect(page).toContain('<DataSurface');
    expect(page).toContain('<CollectionState');
    expect(page).toContain('<DrawerFrame');
    expect(triggerCard).toContain('<StatusBadge');
    expect(triggerCard).toContain('<InlineConfirmation');
    expect(triggerCard).toContain('<OverflowActionMenu');
    expect(page).toContain("t('eventTriggers.columns.workflow')");
    expect(page).toContain("t('eventTriggers.columns.configuration')");
    expect(schedulesPage).toContain('actionButtonRefs={scheduleActionButtonRefs}');
    expect(page).toContain('<WorkspaceEventTriggerDeleteDialog');
    expect(deleteDialog).toContain('<DestructiveConfirmationDialog');
    expect(schedulesPage).toContain('<WorkspaceScheduleDeleteDialog');
    expect(scheduleDeleteDialog).toContain('<DestructiveConfirmationDialog');
    expect(page).not.toContain("heading={t('eventTriggers.listTitle')}");
  });

  it('stacks event-trigger facts below an in-view compact action row until the desktop ledger fits', () => {
    expect(triggerCard).toContain('grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[');
    expect(triggerCard.match(/col-span-2 min-w-0 xl:col-span-1/g)).toHaveLength(3);
    expect(triggerCard).toContain('col-start-2 row-start-1 flex shrink-0');
    expect(triggerCard).toContain('xl:col-start-auto xl:row-start-auto');
  });

  it('keeps URL-backed search visible and labels it for the selected trigger type', () => {
    expect(page).toContain("const query = urlSearch.get('q') || ''");
    expect(page).toContain("'eventTriggers.filters.searchIncomingWebhooks'");
    expect(page).toContain("'eventTriggers.filters.searchAcornOpsEvents'");
    expect(page).toContain('queryLabel={searchLabel}');
    expect(page).toContain('trigger.name');
    expect(page).toContain('workflow?.name');
    expect(page).toContain('trigger.endpointUrl');
  });

  it('discloses webhook secrets once in component state and fences refreshes by workspace', () => {
    expect(page).toContain('const [secretDisclosure, setSecretDisclosure]');
    expect(page).toContain('setSecretDisclosure({ ...created.webhook');
    expect(page).toContain('currentWorkspaceId.current === requestedWorkspaceId');
    expect(page).toContain('stateWorkspaceId === workspace.id');
    expect(page).toContain('refreshSequence.current === requestSequence');
    expect(page).toContain('mutationSequence.current === requestSequence');
  });
});
