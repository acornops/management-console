import { renderToStaticMarkup } from 'react-dom/server';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/i18n/locales/en.js';
import { ApprovalReviewContent, canDecideApprovalReview } from './ApprovalReviewDialog';
import type { WorkflowRunApproval } from '@/services/control-plane/workflowApi';

const approval: WorkflowRunApproval = {
  id: 'approval-1', workspaceId: 'workspace-1', runId: 'run-1', toolCallId: 'call-1',
  toolName: 'scale_workload', summary: 'A friendly description', targetId: 'cluster-1', targetType: 'kubernetes',
  arguments: { namespace: 'payments', replicas: 0, note: '<script>警告</script>\u202e', credentials: { token: 'secret-do-not-render' } },
  status: 'pending', expiresAt: '2026-10-19T00:00:00.000Z', executionStatus: 'not_started'
};

async function render(override: Partial<WorkflowRunApproval> = {}) {
  const i18n = createInstance();
  await i18n.init({ resources: { en: { translation: en } }, lng: 'en' });
  return renderToStaticMarkup(<I18nextProvider i18n={i18n}>
    <ApprovalReviewContent approval={{ ...approval, ...override }} canDecide={true} busy={false}
      onDecide={vi.fn()} now={Date.parse('2026-10-18T00:00:00.000Z')} />
  </I18nextProvider>);
}

describe('informed approval review', () => {
  it('shows the canonical MCP tool and server from the existing approval reference', async () => {
    const alias = 'm_40ad20abc2fe4669a5d259107c56cc55_scale_workload_ca829ba628';
    const html = await render({ toolName: alias,
      toolRef: { serverId: 'server-1', toolName: 'scale_workload' }
    });
    expect(html).toContain('>scale_workload<');
    expect(html).toContain('>server-1<');
    expect(html).not.toContain(alias);
  });

  it('retains the exact legacy alias when no canonical reference is available', async () => {
    const alias = 'm_40ad20abc2fe4669a5d259107c56cc55_scale_workload_ca829ba628';
    const html = await render({ toolName: alias });
    expect(html).toContain(alias);
  });

  it('keeps exact tool identity beside the non-authoritative summary and readable context', async () => {
    const html = await render();
    expect(html).toContain('scale_workload');
    expect(html).toContain('A friendly description');
    expect(html).toContain('payments');
    expect(html).toContain('&lt;script&gt;警告&lt;/script&gt;\\u202e');
    expect(html).toContain('cluster-1');
    expect(html).toContain('runId=run-1');
    expect(html).toContain('Approve');
    expect(html).toContain('Reject');
    expect(html).not.toContain('secret-do-not-render');
  });

  it('renders a real workflow gate without pretending it has a target', async () => {
    const html = await render({ approvalKind: 'pre_step', toolName: 'workflow_gate', targetId: undefined, targetType: undefined });
    expect(html).toContain('Workflow gate');
    expect(html).toContain('workflow_gate');
    expect(html).toContain('Not available');
  });

  it('requires permission, pending context and a known future expiry at the moment of decision', () => {
    const now = Date.parse('2026-10-18T00:00:00.000Z');
    expect(canDecideApprovalReview(approval, true, false, now)).toBe(true);
    expect(canDecideApprovalReview(undefined, true, false, now)).toBe(false);
    expect(canDecideApprovalReview(approval, false, false, now)).toBe(false);
    expect(canDecideApprovalReview(approval, true, true, now)).toBe(false);
    expect(canDecideApprovalReview({ ...approval, expiresAt: '' }, true, false, now)).toBe(false);
    expect(canDecideApprovalReview({ ...approval, expiresAt: 2050 as unknown as string }, true, false, now)).toBe(false);
    expect(canDecideApprovalReview({ ...approval, expiresAt: '2026-10-18T00:00:00.000Z' }, true, false, now)).toBe(false);
    expect(canDecideApprovalReview({ ...approval, status: 'approved' }, true, false, now)).toBe(false);
  });

  it('shows decision and execution history without rendering result or continuation fields', async () => {
    const html = await render({ status: 'rejected', decision: 'rejected', decidedBy: 'operator-1', decidedAt: '2026-10-18T00:00:00.000Z', executionStatus: 'not_started', ...{ toolResult: 'private-result', continuation: 'private-state' } });
    expect(html).toContain('Rejected');
    expect(html).toContain('operator-1');
    expect(html).toContain('Not started');
    expect(html).not.toContain('private-result');
    expect(html).not.toContain('private-state');
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
});
