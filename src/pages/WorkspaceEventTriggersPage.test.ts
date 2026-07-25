import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { retainDeclaredBindings } from './WorkspaceEventTriggersPage.model';

const root = resolve(__dirname, '../..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');
const page = readSource('src/pages/WorkspaceEventTriggersPage.tsx');
const appPageContent = readSource('src/app/AppPageContent.tsx');
const navigation = readSource('src/app/workspaceNavigation.tsx');
const pageModel = readSource('src/pages/WorkspaceEventTriggersPage.model.ts');
const workflowApi = readSource('src/services/control-plane/workflowEventTriggerApi.ts');

describe('WorkspaceEventTriggersPage contract surface', () => {
  it('mounts Event triggers as a Workflow child route', () => {
    expect(appPageContent).toContain("route.kind === 'workspaceEventTriggers'");
    expect(appPageContent).toContain('<WorkspaceEventTriggersPage');
    expect(navigation).toContain("id: 'workflowEventTriggers'");
    expect(navigation).toContain('AppPaths.workspaceEventTriggers(workspace.id)');
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
    expect(page).toContain('<PageHeader');
    expect(page).toContain('<DataSurface');
    expect(page).toContain('<CollectionState');
    expect(page).toContain('<DrawerFrame');
    expect(page).toContain('<StatusBadge');
    expect(page).toContain('<InlineConfirmation');
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
