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
      "isWriteCapable && primaryAction === 'launch' && !visibleLaunchBlocker",
      'id="workflow-launch-acknowledgement"',
      'cursor-pointer',
      'text-ui-text-muted transition-colors hover:text-ui-text focus-within:text-ui-text',
      'I understand this workflow can modify live systems.',
      "needsLaunchAcknowledgement ? 'workflow-launch-acknowledgement' : undefined",
      'sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start',
      'aria-label="Selected workflow tags"',
      "tags.length > 0 ? 'mt-2' : ''",
      'flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end',
      'className="w-full whitespace-nowrap sm:w-auto"'
    ]) expect(launchActions).toContain(snippet);

    expect(launchActions).toContain('disabled={launching || Boolean(visibleLaunchBlocker) || needsLaunchAcknowledgement}');
    expect(launchActions).not.toContain('border-t border-ui-border');
    expect(launchActions).not.toContain('bg-status-warning-soft');
    expect(page).toContain("setLaunchAcknowledgedId('');");
    expect(page).toContain('<WorkflowLaunchActions');
    expect(page).toContain('tags={selectedWorkflow.tags}');
    expect(page).not.toContain('WorkflowLaunchFooter');
  });

  it('replaces blocked launch with setup or activation and keeps customization secondary', () => {
    for (const snippet of [
      "primaryAction === 'setup'",
      "primaryAction === 'activate'",
      "primaryAction === 'launch'",
      "t('agentsWorkflows.workflowActions.completeSetup')",
      "t('agentsWorkflows.workflowActions.activate')",
      "t('agentsWorkflows.workflowActions.customize')",
      'variant="tertiary"',
      'showCustomize={systemProvidedSelected}',
      'onActivate={() => void workflowActions.toggleWorkflowActive(selectedWorkflow, true)}'
    ]) expect(launchActions + page).toContain(snippet);

    expect(page).not.toContain('SystemWorkflowDuplicateBanner');
    expect(page).not.toContain('systemWorkflowDuplicateNotice');
  });
});
