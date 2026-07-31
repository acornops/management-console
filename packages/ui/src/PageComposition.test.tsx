import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PageShell } from './PageComposition';

describe('PageShell', () => {
  it('allows a route to bound its content without changing the shared shell', () => {
    const markup = renderToStaticMarkup(
      <PageShell className="lg:overflow-y-hidden" contentClassName="lg:flex lg:h-full lg:min-h-0 lg:flex-col">
        <div>Route content</div>
      </PageShell>
    );

    expect(markup).toContain('lg:overflow-y-hidden');
    expect(markup).toContain('max-w-none lg:flex lg:h-full lg:min-h-0 lg:flex-col');
    expect(markup).toContain('Route content');
  });
});
