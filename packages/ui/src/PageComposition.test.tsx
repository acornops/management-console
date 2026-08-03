import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PageHeader, PageHeaderButton, PageShell } from './PageComposition';

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

describe('PageHeader', () => {
  it('keeps route actions on the default control size', () => {
    const markup = renderToStaticMarkup(
      <PageHeaderButton variant="primary">Create</PageHeaderButton>
    );

    expect(markup).toContain('data-page-header-action="true"');
    expect(markup).toContain('min-h-11');
    expect(markup).toContain('px-4');
    expect(markup).toContain('py-2.5');
    expect(markup).not.toContain('sm:min-h-9');
    expect(markup).not.toContain('type-caption');
  });

  it('allows a route to widen its description measure', () => {
    const markup = renderToStaticMarkup(
      <PageHeader
        title="Workflows"
        description="Choose who runs each automation."
        descriptionClassName="max-w-[96ch]"
      />
    );

    expect(markup).toContain('max-w-[96ch]');
    expect(markup).not.toContain('max-w-[72ch]');
  });
});
