import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, 'WorkspaceWorkflowsPage.tsx'), 'utf8');

describe('WorkspaceWorkflowsPage catalog states', () => {
  it('keeps request failures retryable without page-wide setup or empty-catalog notices', () => {
    for (const snippet of [
      'Workflow options could not be loaded.',
      'Workflow options must load before creating a workflow.',
      'Workflow options must load before launching a workflow.',
      'workflowOptionsReady={workflowOptionsReady}',
      'setWorkflowOptionsError(error instanceof Error ? error.message',
      'setWorkflowOptionsReloadKey((value) => value + 1)'
    ]) expect(source).toContain(snippet);

    for (const snippet of [
      'aria-label="Loading workflow options"',
      'workflowOptionsLoading',
      'Some workflow options need setup',
      'Some option catalogs are empty',
      'Some workflow options failed to load'
    ]) expect(source).not.toContain(snippet);
  });
});
