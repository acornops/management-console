import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkflowRunResponse } from './WorkflowRunResponse';

describe('WorkflowRunResponse', () => {
  it('renders persisted Markdown as semantic response content', () => {
    const html = renderToStaticMarkup(
      <WorkflowRunResponse content={'## Findings\n\n- Scope mismatch\n\n`default`'} />
    );

    expect(html).toContain('<h2');
    expect(html).toContain('<ul');
    expect(html).toContain('<code');
    expect(html).not.toContain('## Findings');
  });
});
