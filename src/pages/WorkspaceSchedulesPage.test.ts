import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');

describe('WorkspaceSchedulesPage control-plane surface', () => {
  const schedulesPage = readFileSync(resolve(root, 'src/pages/WorkspaceSchedulesPage.tsx'), 'utf8');
  const workflowApi = readFileSync(resolve(root, 'src/services/control-plane/workflowApi.ts'), 'utf8');
  const enLocale = readFileSync(resolve(root, 'src/i18n/locales/en.js'), 'utf8');

  it('loads and mutates real schedules through the workflow API', () => {
    expect(schedulesPage).toContain('listWorkspaceWorkflowSchedules');
    expect(schedulesPage).toContain('createWorkflowSchedule');
    expect(schedulesPage).toContain('updateWorkflowSchedule');
    expect(schedulesPage).toContain('deleteWorkflowSchedule');
    expect(schedulesPage).toContain('listWorkspaceWorkflows');
    expect(workflowApi).toContain('/workflow-schedules');
    expect(schedulesPage).not.toContain('const scheduleRows');
    expect(schedulesPage).not.toContain('placeholderNotice');
  });

  it('renders loading, empty, error, permission, and drawer states', () => {
    expect(schedulesPage).toContain("useState<CursorCollectionPhase>('loading')");
    expect(schedulesPage).toContain("setSchedulePhase(schedulePage === null ? 'loading' : 'refreshing')");
    expect(schedulesPage).toContain("setSchedulePhase('ready')");
    expect(schedulesPage).toContain("setSchedulePhase('error')");
    expect(schedulesPage).toContain('scheduleError');
    expect(schedulesPage).toContain('schedules.emptyTitle');
    expect(schedulesPage).toContain('<CollectionState');
    expect(schedulesPage).toContain('phase={schedulePhase}');
    expect(schedulesPage).toContain('itemCount={schedules.length}');
    expect(schedulesPage).toContain("loading={<InlineLoadingIndicator label={t('common.loading')}");
    expect(schedulesPage).not.toContain('isInitialSchedulesLoad');
    expect(schedulesPage).not.toContain('isLoadingSchedules');
    expect(schedulesPage).toContain('icon={<ICONS.Clock />}');
    expect(schedulesPage).not.toContain('<EmptyState embedded');
    expect(schedulesPage).toContain('schedules.permissionNotice');
    expect(schedulesPage).toContain('<DrawerFrame');
    expect(schedulesPage).toContain('titleId="schedule-drawer-title"');
    expect(schedulesPage).toContain('approvedContextGrants');
    expect(schedulesPage).toContain('inputDefaultsText');
    expect(enLocale).toContain("emptyTitle: 'No workflow schedules'");
    expect(enLocale).toContain("permissionNotice: 'You need manage_workflows to create or edit schedules.'");
  });

  it('opens the create drawer from a workflow route handoff with the workflow preselected', () => {
    expect(schedulesPage).toContain('createWorkflowId?: string;');
    expect(schedulesPage).toContain('const consumedCreateWorkflowIdRef = React.useRef<string | undefined>(undefined);');
    expect(schedulesPage).toContain('openCreateDrawer(createWorkflowId);');
    expect(schedulesPage).toContain("setDraft({ ...createEmptyDraft(), workflowId: workflowId || activeWorkflows[0]?.id || workflows[0]?.id || '', runsAsUserId: currentUser?.id || '' });");
    expect(schedulesPage).toContain('<Button size="md" variant="primary" onClick={() => openCreateDrawer()}');
  });

  it('uses shared controls and consistent sizing for schedule actions', () => {
    expect(schedulesPage).toContain("import { Checkbox } from '@/components/common/Checkbox'");
    expect(schedulesPage).toContain('<Button size="md" variant="secondary" onClick={() => void refreshSchedules()}');
    expect(schedulesPage).toContain('<Button size="md" variant="primary" onClick={() => openCreateDrawer()}');
    expect(schedulesPage).toContain('<Checkbox checked={draft.enabled}');
    expect(schedulesPage).toContain('<Button size="sm" variant="tertiary" onClick={closeDrawer}>');
    expect(schedulesPage).toContain('<Button size="sm" variant="primary" onClick={() => void saveDraft()}');
    expect(schedulesPage).toContain('<Button size="sm" variant="danger" onClick={() => void deleteSchedule(schedule)}');
    expect(schedulesPage).not.toContain('<ICONS.Trash2 className="h-4 w-4" aria-hidden="true" />\n                          {t(\'schedules.actions.delete\')}');
    expect(schedulesPage).not.toContain('className="h-4 w-4 rounded border-ui-border text-accent focus:ring-accent"');
  });

  it('does not render the removed page-level workflow tabs', () => {
    expect(schedulesPage).not.toContain('WorkspaceAutomationRouteNav');
    expect(schedulesPage).not.toContain('aria-label="Workflow views"');
  });

  it('shows bounded MCP auto-pause recovery while keeping resume manual', () => {
    expect(schedulesPage).toContain("schedule.lastStatus === 'auto_paused'");
    expect(schedulesPage).toContain('.slice(0, 240)');
    expect(schedulesPage).toContain('Repair MCP before resuming. Resume remains a manual action.');
    expect(schedulesPage).toContain("t('workflowCoordination.reviewWorkflowAccess')");
    expect(schedulesPage).toContain("workflow?.executionMode === 'coordinated'");
    expect(schedulesPage).toContain("tab: 'capabilities'");
    expect(schedulesPage).toContain("capabilityTab: 'mcp'");
    expect(schedulesPage).toContain("schedule.status === 'enabled' ? t('schedules.actions.pause') : t('schedules.actions.resume')");
  });
});
