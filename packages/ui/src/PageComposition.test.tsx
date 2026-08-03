import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PageHeader, PageShell, SettingsSection } from './PageComposition';

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

describe('SettingsSection', () => {
  it('uses the available parent measure for its description by default', () => {
    const markup = renderToStaticMarkup(
      <SettingsSection title="Run permissions" description="Set the maximum change access this Agent can request.">
        <div>Permission controls</div>
      </SettingsSection>
    );

    expect(markup).toContain('aria-labelledby=');
    expect(markup).toContain('max-w-none');
    expect(markup).toContain('rounded-xl border border-ui-border bg-ui-surface shadow-sm');
    expect(markup).toContain('Permission controls');
  });
});
