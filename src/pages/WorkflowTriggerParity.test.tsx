import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, expect, it, vi } from 'vitest';
import { initializeI18n } from '@/i18n';
import { WorkspaceScheduleDrawerTable } from './WorkspaceScheduleDrawerTable';
import { WorkspaceWebhookDrawerTable } from './WorkspaceWebhookDrawerTable';
import type { WorkflowSchedule, WorkflowExecutionSummary } from '@/services/control-plane/workflowApi';
import type { WorkflowWebhook } from '@/services/control-plane/workflowWebhookApi';
import { WorkspaceScheduleExecutionFacts } from './WorkspaceScheduleExecutionFacts';

beforeAll(initializeI18n);
const schedule: WorkflowSchedule = { id: 'schedule-1', workspaceId: 'workspace-1', workflowId: 'workflow-1', name: 'Health check', status: 'enabled', cron: '30 8 * * 1-5', timezone: 'Asia/Singapore', principal: { type: 'user', id: 'operator' }, createdAt: '', updatedAt: '', lastStatus: 'failed', lastError: 'Missing permission' };

it('retains dispatch failure recovery and no-execution facts in desktop workflow schedules', () => {
  const html = renderToStaticMarkup(<WorkspaceScheduleDrawerTable actionButtonRefs={{ current: new Map() }} canManage={false} deletingId="" empty={null} error={null} onDelete={vi.fn()} onEdit={vi.fn()} onRepair={vi.fn()} onToggle={vi.fn()} phase="ready" schedules={[schedule]} updatingId="" workflows={[]} workspaceId="workspace-1" />);
  const desktop = html.slice(html.indexOf('<table'));
  expect(desktop).toContain('Weekdays at 08:30');
  expect(desktop).toContain('Asia/Singapore');
  expect(desktop).toContain('30 8 * * 1-5');
  expect(desktop).toContain('No execution was created');
  expect(desktop).toContain('Missing permission');
  expect(desktop).toContain('Next step');
  expect(desktop).not.toContain('Review failure');
  expect(desktop).not.toContain('Retry started');
});

it('retains cause, impact and execution evidence in desktop workflow webhooks', () => {
  const trigger = { id: 'hook-1', workflowId: 'workflow-1', name: 'Health hook', status: 'enabled', lastStatus: 'failed', lastError: 'Permission denied' } as WorkflowWebhook;
  const html = renderToStaticMarkup(<WorkspaceWebhookDrawerTable actionButtonRefs={{ current: new Map() }} canManage={false} loadError="" mutatingId="" onCopyEndpoint={vi.fn()} onEdit={vi.fn()} onRequestDelete={vi.fn()} onRequestRotate={vi.fn()} onRetry={vi.fn()} onRotate={vi.fn()} onToggle={vi.fn()} pendingRotateId="" phase="ready" setPendingRotateId={vi.fn()} triggers={[trigger]} />);
  const desktop = html.slice(html.indexOf('<table'));
  expect(desktop).toContain('No execution was created');
  expect(desktop).toContain('Permission denied');
  expect(desktop).toContain('Next step');
});

it('does not claim a dispatch with existing execution evidence never started', () => {
  const latestExecution: WorkflowExecutionSummary = {
    id: 'execution-1', workspaceId: 'workspace-1', workflow: { id: 'workflow-1', name: 'Health check' },
    status: 'failed', origin: { schemaVersion: 1, kind: 'schedule', label: 'Health check', scheduleId: 'schedule-1' },
    rootRun: { id: 'run-1', requestedAt: '2026-07-01T00:00:00Z' },
    createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:01:00Z'
  };
  const html = renderToStaticMarkup(<WorkspaceScheduleExecutionFacts schedule={{ ...schedule, latestExecution }} mcpAutoPaused={false} recoveryPath="/configuration" />);
  expect(html).toContain('An execution exists. Inspect its run evidence before deciding what to do next.');
  expect(html).not.toContain('The workflow did not start');
  expect(html).toContain(latestExecution.id);
});
