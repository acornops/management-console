import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { buttonClassName } from './Button';
import { PageBackLink } from './PageComposition';

const root = resolve(__dirname, '../../..');
const pageComposition = readFileSync(resolve(root, 'src/components/common/PageComposition.tsx'), 'utf8');
const overlayFrames = readFileSync(resolve(root, 'src/components/common/OverlayFrames.tsx'), 'utf8');
const formControls = readFileSync(resolve(root, 'src/components/common/FormControls.tsx'), 'utf8');
const catalog = readFileSync(resolve(root, 'src/design-system.tsx'), 'utf8');

describe('design-system primitives', () => {
  it('uses semantic neutral and activation button intents', () => {
    expect(buttonClassName({ variant: 'primary' })).toContain('bg-control-primary');
    expect(buttonClassName({ variant: 'activation' })).toContain('bg-control-activation');
    expect(buttonClassName({ variant: 'danger' })).toContain('bg-control-danger');
    expect(buttonClassName({ variant: 'primary', size: 'md' })).toContain('min-h-11');
    expect(buttonClassName({ variant: 'primary', className: 'w-full' })).toContain('w-full');
  });

  it('owns route scrolling, responsive tokens, header wrapping, and embedded mode', () => {
    expect(pageComposition).toMatch(/embedded\s*\? 'page-shell--embedded'/);
    expect(pageComposition).toContain('px-[var(--route-padding-x)]');
    expect(pageComposition).toContain('mb-[var(--header-content-gap)]');
    expect(pageComposition).toContain('sm:flex-row sm:items-start sm:justify-between');
    expect(pageComposition).toContain('DataSurfaceState');
    expect(pageComposition).toContain('<TableToolbar>');
  });

  it('standardizes page-level return navigation', () => {
    const markup = renderToStaticMarkup(createElement(PageBackLink, { href: '/workspaces' }, 'Back to workspaces'));

    expect(markup).toContain('href="/workspaces"');
    expect(markup).toContain('page-back-link');
    expect(markup).toContain('min-h-11');
    expect(markup).toContain('focus-visible:ring-control-boundary');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('Back to workspaces');
  });

  it('standardizes dialog and drawer anatomy on accessible overlay foundations', () => {
    expect(overlayFrames).toContain('<Dialog');
    expect(overlayFrames).toContain('<RightSidePanel');
    expect(overlayFrames).toContain('<CloseButton');
    expect(overlayFrames).toContain('closeDisabled={closeDisabled}');
    expect(overlayFrames).toContain('initialFocusRef={initialFocusRef}');
    expect(overlayFrames).toContain('border-t border-ui-border');
  });

  it('provides shared radio, switch, menu, label, and help controls', () => {
    expect(formControls).toContain('type="radio"');
    expect(formControls).toContain('accent-accent');
    expect(formControls).toContain('appearance-none');
    expect(formControls).toContain('rounded-full');
    expect(formControls).toContain('checked:border-accent');
    expect(formControls).toContain('checked:bg-[radial-gradient(circle_at_center,rgb(var(--brand-orange-rgb))_0_35%,transparent_40%)]');
    expect(formControls).toContain('outline-none');
    expect(formControls).toContain('focus-visible:ring-2');
    expect(formControls).toContain('focus-visible:ring-control-boundary');
    expect(formControls).toContain('role="switch"');
    expect(formControls).toContain('aria-checked={checked}');
    expect(formControls).toContain('border-control-boundary bg-ui-surface-strong');
    expect(formControls).toContain('bg-ui-surface shadow-sm ring-1 ring-inset ring-ui-border');
    expect(formControls).toContain('role="menuitem"');
    expect(formControls).toContain('FieldLabel');
    expect(formControls).toContain('HelpText');
  });

  it('catalogs themes, responsive composition, interactive states, and overlays', () => {
    expect(catalog).toContain("document.documentElement.classList.toggle('dark', dark)");
    expect(catalog).toContain('<PageBackLink href="/">Back to console</PageBackLink>');
    expect(catalog).toContain('variant="activation"');
    expect(catalog).toContain('state="loading"');
    expect(catalog).toContain('state="empty"');
    expect(catalog).toContain('state="error"');
    expect(catalog).toContain('<DialogFrame');
    expect(catalog).toContain('<DrawerFrame');
    expect(catalog).toContain("dark ? <Sun");
    expect(catalog).toContain('<SegmentedTabs');
    expect(catalog).toContain('<FilterToggleGroup');
    expect(catalog).toContain('<DiscoveryFilterBar');
    expect(catalog).toContain('createDiscoveryFilterGroup');
    expect(catalog.match(/data-catalog-discovery=/g)).toHaveLength(3);
    expect(catalog).toContain('data-catalog-code-surface="true"');
    expect(catalog).toContain('bg-code-bg p-4 text-code-text');
    expect(catalog.match(/data-catalog-control=/g)).toHaveLength(5);
  });
});
