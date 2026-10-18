import { renderToStaticMarkup } from 'react-dom/server';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/i18n/locales/en.js';
import { clearSessionDataCache, writeSessionDataCache } from '@/hooks/sessionDataCache';
import type { Workspace } from '@/types';
import type { WorkflowDefinition } from './workflows/workflowModel';
import { WorkspaceApprovalsPage } from './WorkspaceApprovalsPage';
import { WorkspaceWorkflowsPage } from './WorkspaceWorkflowsPage';

vi.mock('./WorkspaceWorkflowsPage.panels', async (importOriginal) => ({
  ...await importOriginal<typeof import('./WorkspaceWorkflowsPage.panels')>(),
  // Observe the real route's permission decision at its review-entry boundary.
  WorkflowRunsPanel: ({ canDecideApprovals }: { canDecideApprovals: boolean }) => <output>{canDecideApprovals ? 'Run decisions allowed' : 'Run decisions unavailable'}</output>
}));

const workflow: WorkflowDefinition = {
  id: 'workflow-1', workspaceId: 'workspace-1', name: 'Review health', description: '',
  status: 'active', agentIds: [], executionMode: 'direct', semanticCapabilityIds: [],
  capabilityRestrictionMode: 'restrict', owner: 'Operator', tags: [], lastRun: '',
  agents: [], policy: { mode: 'read_only', approvals: [] }, starterPrompt: 'Inspect health', runs: []
};
const role = {
  key: 'operator', displayName: 'Operator', description: '', kind: 'custom' as const,
  capabilities: ['create_read_write_runs'], protected: false, sortOrder: 100
};

describe('approval entry-point effective-permission parity', () => {
  beforeEach(() => {
    clearSessionDataCache();
    writeSessionDataCache('workspace:workspace-1:workflow-page:workflows', [workflow]);
    vi.stubGlobal('window', { location: new URL('http://fixture.local/workspaces/workspace-1/workflows?workflow=workflow-1&tab=runs') });
  });
  afterEach(() => { clearSessionDataCache(); vi.unstubAllGlobals(); });

  it.each([
    { name: 'role-template fallback grant', input: { currentUserRoleTemplate: role }, allowed: true },
    { name: 'explicit denial overrides fallback grant', input: { currentUserRoleTemplate: role, permissions: { create_read_write_runs: false } }, allowed: false },
    { name: 'effective grant without a role template', input: { permissions: { create_read_write_runs: true } }, allowed: true },
    { name: 'missing permission metadata', input: {}, allowed: false },
    { name: 'suspended workspace overrides every grant', input: { accessState: 'suspended', currentUserRoleTemplate: role, permissions: { create_read_write_runs: true } }, allowed: false }
  ])('$name is interpreted identically by inbox and run review', async ({ input, allowed }) => {
    const workspace = { id: 'workspace-1', name: 'Workspace 1', description: '', members: [], clusterIds: [], ...input } as Workspace;
    const i18n = createInstance();
    await i18n.init({ resources: { en: { translation: en } }, lng: 'en' });
    const inbox = renderToStaticMarkup(<I18nextProvider i18n={i18n}><WorkspaceApprovalsPage workspace={workspace} /></I18nextProvider>);
    const runs = renderToStaticMarkup(<I18nextProvider i18n={i18n}><WorkspaceWorkflowsPage workspace={workspace} navigate={vi.fn()} /></I18nextProvider>);

    expect(inbox.includes(en.approvals.permissionNotice)).toBe(!allowed);
    expect(runs.match(/<output>([^<]+)<\/output>/)?.[1]).toBe(allowed ? 'Run decisions allowed' : 'Run decisions unavailable');
  });
});
