import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import { describe, expect, it } from 'vitest';
import { createMarkdownComponents, markdownRemarkPlugins } from './markdown';

describe('chat markdown rendering', () => {
  it('renders GitHub-flavored markdown tables as table markup', () => {
    const html = renderToStaticMarkup(
      <ReactMarkdown
        components={createMarkdownComponents('assistant')}
        remarkPlugins={markdownRemarkPlugins}
      >
        {'| Name | Status |\n| --- | --- |\n| api | Running |'}
      </ReactMarkdown>
    );

    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('<td');
    expect(html).toContain('api');
    expect(html).toContain('Running');
  });
});
