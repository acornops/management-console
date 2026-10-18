import { renderToStaticMarkup } from 'react-dom/server';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/i18n/locales/en.js';
import { clearSessionDataCache, writeSessionDataCache } from '@/hooks/sessionDataCache';
import { WorkspaceWorkflowsPage } from '@/pages/WorkspaceWorkflowsPage';
import type { Workspace } from '@/types';
import type { WorkflowDefinition } from './workflowModel';

const workflow: WorkflowDefinition = {
  id: 'workflow-1', workspaceId: 'workspace-1', name: 'Review health', description: '', status: 'active',
  agentIds: [], executionMode: 'direct', semanticCapabilityIds: [], capabilityRestrictionMode: 'restrict',
  owner: 'Operator', tags: [], lastRun: '', agents: [], policy: { mode: 'read_only', approvals: [] }, starterPrompt: 'Inspect health', runs: []
};
const workspace = { id: 'workspace-1', name: 'Workspace', members: [], permissions: { manage_workflows: true, create_read_only_runs: true } } as unknown as Workspace;
beforeEach(() => clearSessionDataCache());
afterEach(() => { clearSessionDataCache(); vi.unstubAllGlobals(); });
async function render(selection: string, loaded = true) {
  if (loaded) writeSessionDataCache('workspace:workspace-1:workflow-page:workflows', [workflow]);
  vi.stubGlobal('window', { location: new URL(`http://fixture.local/workspaces/workspace-1/workflows${selection}`) });
  const i18n = createInstance();
  await i18n.init({ resources: { en: { translation: en } }, lng: 'en' });
  return renderToStaticMarkup(<I18nextProvider i18n={i18n}><WorkspaceWorkflowsPage workspace={workspace} navigate={() => undefined} /></I18nextProvider>);
}
describe('workflow route identity before effects', () => {
  it.each(['missing-workflow', 'deleted-workflow'])('never renders substitute actions for %s', async (id) => {
    const markup = await render(`?workflow=${id}&tab=overview`);
    expect(markup).toContain('Workflow unavailable');
    expect(markup).not.toContain('aria-label="Selected workflow actions"');
    expect(window.location.search).toBe(`?workflow=${id}&tab=overview`);
  });
  it.each(['?workflow=workflow-1', '?workflow=Review%20health', ''])('preserves supported selection %s', async (search) => {
    expect(await render(search)).toContain('aria-label="Selected workflow actions"');
  });
  it('does not present a not-found claim while loading', async () => {
    expect(await render('?workflow=workflow-1', false)).not.toContain('Workflow unavailable');
  });
});
