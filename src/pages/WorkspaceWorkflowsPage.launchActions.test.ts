import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const page = readFileSync(resolve(root, 'src/pages/WorkspaceWorkflowsPage.tsx'), 'utf8');
const components = readFileSync(resolve(root, 'src/pages/WorkspaceWorkflowsPage.components.tsx'), 'utf8');
const launchActions = components.slice(
  components.indexOf('export const WorkflowLaunchActions'),
  components.indexOf('export const WorkflowLibraryList')
);

describe('WorkspaceWorkflowsPage launch actions', () => {
  it('keeps the write acknowledgement compact, actionable, and responsive', () => {
    for (const snippet of [
      'isWriteCapable && !launchBlocker',
      'id="workflow-launch-acknowledgement"',
      'cursor-pointer',
      'text-ui-text-muted transition-colors hover:text-ui-text focus-within:text-ui-text',
      'I understand this workflow can modify live systems.',
      "needsLaunchAcknowledgement ? 'workflow-launch-acknowledgement' : undefined",
      'sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start',
      'aria-label="Selected workflow tags"',
      "tags.length > 0 ? 'mt-2' : ''",
      'grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2',
      'className="w-full whitespace-nowrap sm:w-auto"'
    ]) expect(launchActions).toContain(snippet);

    expect(launchActions).toContain('disabled={launching || Boolean(launchBlocker) || needsLaunchAcknowledgement}');
    expect(launchActions).not.toContain('border-t border-ui-border');
    expect(launchActions).not.toContain('bg-status-warning-soft');
    expect(page).toContain("setLaunchAcknowledgedId('');");
    expect(page).toContain('<WorkflowLaunchActions');
    expect(page).toContain('tags={selectedWorkflow.tags}');
    expect(page).not.toContain('WorkflowLaunchFooter');
  });
});
