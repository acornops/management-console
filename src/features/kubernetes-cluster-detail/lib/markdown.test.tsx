import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import { describe, expect, it } from 'vitest';
import { createMarkdownComponents, markdownRemarkPlugins } from './markdown';

describe('chat markdown rendering', () => {
  it('keeps inline code styling out of fenced code blocks', () => {
    const html = renderToStaticMarkup(
      <ReactMarkdown
        components={createMarkdownComponents('assistant')}
        remarkPlugins={markdownRemarkPlugins}
      >
        {'Run `kubectl get pods`.\n\n```\nkubectl -n demo get pods\n```'}
      </ReactMarkdown>
    );

    expect(html).toContain('bg-code-bg');
    expect(html).toContain('bg-transparent');
    expect(html).toMatch(/<p class="[^"]*">Run <code class="[^"]*bg-ui-bg[^"]*">kubectl get pods<\/code>\.<\/p>/);
    expect(html).toMatch(/<pre class="[^"]*bg-code-bg[^"]*"><code class="[^"]*bg-transparent[^"]*">kubectl -n demo get pods/);
    expect(html).not.toMatch(/<pre class="[^"]*bg-code-bg[^"]*"><code class="[^"]*bg-ui-bg/);
  });

  it('preserves language classes on fenced code blocks', () => {
    const html = renderToStaticMarkup(
      <ReactMarkdown
        components={createMarkdownComponents('assistant')}
        remarkPlugins={markdownRemarkPlugins}
      >
        {'```bash\nkubectl get pods\n```'}
      </ReactMarkdown>
    );

    expect(html).toMatch(/<code class="[^"]*language-bash[^"]*bg-transparent/);
  });

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
