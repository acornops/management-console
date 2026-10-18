import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { initializeI18n } from '@/i18n';
import { WorkflowLaunchReview } from './WorkflowRunDrawer';
import { normalizeWorkflowCapabilitiesPreview } from '@/services/control-plane/workflowApi';

beforeAll(initializeI18n);

describe('workflow launch review', () => {
  const agents = [{ agentId: 'agent-1', name: 'Payments operator', role: 'Direct', required: true }];
  it('summarizes assigned Agents and preview scope separately from approval requirements', () => {
    const preview = normalizeWorkflowCapabilitiesPreview({ mode: 'read_write', approvalRequirements: ['restart_service'], status: 'ready' });
    const html = renderToStaticMarkup(<WorkflowLaunchReview agents={agents} preview={preview} />);
    expect(html).toContain('Payments operator');
    expect(html).toContain('Read/write');
    expect(html).toContain('restart_service');
    expect(html).toContain('Direct-executor approval gates');
  });
  it('does not infer a scope or approval policy without preview data', () => {
    const html = renderToStaticMarkup(<WorkflowLaunchReview agents={agents} preview={null} />);
    expect(html).toContain('Unknown until the capability preview loads.');
    expect(html).not.toContain('Read-only');
    expect(html).not.toContain('No approval');
  });
  it('does not turn a ready coordinator direct preview into a no-change guarantee for its write-capable Agent', () => {
    const selectedAgent = { id: 'agent-writer', name: 'Service operator', permissionMode: 'ask_before_changes' as const };
    const assignments = [{ agentId: selectedAgent.id, name: selectedAgent.name, role: 'Specialist', required: true }];
    const preview = normalizeWorkflowCapabilitiesPreview({ mode: 'read_only', status: 'ready', tools: { read: [], write: [] }, approvalRequirements: [] });
    const html = renderToStaticMarkup(<WorkflowLaunchReview agents={assignments} preview={preview} />);
    expect(html).toContain('Service operator');
    expect(html).toContain('Direct-executor preview scope');
    expect(html).toContain('Read-only for direct tools');
    expect(html).toContain('Delegated Agent capabilities and approval policies are not reported.');
    expect(html).not.toContain('no target changes');
    expect(html).not.toContain('Effective scope');
  });
  it('keeps known blocked-preview direct facts without claiming effective launch policy', () => {
    const preview = normalizeWorkflowCapabilitiesPreview({ mode: 'read_write', status: 'blocked', approvalRequirements: ['direct-gate'] });
    const html = renderToStaticMarkup(<WorkflowLaunchReview agents={agents} preview={preview} />);
    expect(html).toContain('Blocked · not ready to launch');
    expect(html).toContain('Read/write for direct tools');
    expect(html).toContain('direct-gate');
    expect(html).not.toContain('Effective scope');
    expect(html).not.toContain('Unknown until the capability preview loads.');
  });
});
