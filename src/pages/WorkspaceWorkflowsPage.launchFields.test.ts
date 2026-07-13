import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDefaultWorkflowDefinitions, getWorkflowById, type WorkflowDefinition } from './workflows/workflowModel';
import { createFallbackWorkflowOptions } from './workflows/workflowPageHelpers';
import {
  applyWorkflowPromptReference,
  beginWorkflowPromptReference,
  findActivePromptMention,
  getWorkflowLaunchInputState,
  workflowPromptReference
} from './WorkspaceWorkflowsPage.launchFields';

const root = resolve(__dirname, '../..');
const launchFieldsSource = readFileSync(resolve(root, 'src/pages/WorkspaceWorkflowsPage.launchFields.tsx'), 'utf8');
const pageSource = readFileSync(resolve(root, 'src/pages/WorkspaceWorkflowsPage.tsx'), 'utf8');
const actionsSource = readFileSync(resolve(root, 'src/pages/workflows/useWorkspaceWorkflowActions.ts'), 'utf8');

describe('workflow prompt references', () => {
  it('binds an exact Kubernetes target from a prompt mention without a launch dropdown', () => {
    const workflow = getWorkflowById(createDefaultWorkflowDefinitions(), 'cluster-triage') as WorkflowDefinition;
    const catalog = {
      ...createFallbackWorkflowOptions([]),
      clusters: [{ value: 'cluster-1', label: 'Development Cluster' }]
    };
    const state = getWorkflowLaunchInputState(
      workflow,
      catalog,
      `Triage ${workflowPromptReference('cluster', 'Development Cluster')}.`
    );

    expect(state.blocker).toBeNull();
    expect(state.targetId).toBe('cluster-1');
    expect(launchFieldsSource).toContain("workflow?.category === 'cluster-triage'");
    expect(launchFieldsSource).toContain('Type <span className="font-bold text-ui-text">@</span>');
    expect(pageSource).toContain('<WorkflowPromptEditor');
    expect(actionsSource).toContain('targetId: promptReferences.targetId');
    expect(launchFieldsSource).not.toContain('<Select<string>');
  });

  it('opens cluster suggestions for natural @cluster typing and replaces the starter placeholder', () => {
    expect(findActivePromptMention('Triage @cluster', 15, 'cluster')).toEqual({
      start: 7,
      end: 15,
      query: ''
    });
    const started = beginWorkflowPromptReference(
      'Triage @cluster[Cluster name] using live evidence.',
      'cluster'
    );
    expect(started.message).toBe('Triage @ using live evidence.');
    const completed = applyWorkflowPromptReference(started.message, started.mention, 'cluster', 'Development Cluster');
    expect(completed.message).toBe('Triage @cluster[Development Cluster] using live evidence.');
  });

  it('inserts a prompt reference at the caret without deleting the rest of the instruction', () => {
    const message = 'Triage  using live evidence.';
    const started = beginWorkflowPromptReference(message, 'cluster', 7, 7);
    const completed = applyWorkflowPromptReference(started.message, started.mention, 'cluster', 'Development Cluster');

    expect(completed.message).toBe('Triage @cluster[Development Cluster] using live evidence.');
  });

  it('binds every explicitly mentioned incident chat to the internal report tools', () => {
    const workflow = getWorkflowById(createDefaultWorkflowDefinitions(), 'incident-report-pdf') as WorkflowDefinition;
    const catalog = {
      ...createFallbackWorkflowOptions([]),
      chatSessions: [
        { value: 'chat-1', label: 'Checkout outage' },
        { value: 'chat-2', label: 'Database follow-up' }
      ]
    };
    const state = getWorkflowLaunchInputState(
      workflow,
      catalog,
      `Use ${workflowPromptReference('chat', 'Checkout outage')} and ${workflowPromptReference('chat', 'Database follow-up')}.`
    );

    expect(workflow.allowedTools).toEqual(['chat.sessions.read_selected', 'reports.pdf.generate']);
    expect(state.blocker).toBeNull();
    expect(state.inputs).toEqual({ chatSessionIds: ['chat-1', 'chat-2'] });
    expect(launchFieldsSource).toContain("'Mention at least one incident chat in the control message.'");
    expect(launchFieldsSource).toContain('chatMatches.map((option) => option.value)');
  });
});
