import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buttonClassName } from './Button';

const root = resolve(__dirname, '../../..');
const pageComposition = readFileSync(resolve(root, 'src/components/common/PageComposition.tsx'), 'utf8');
const overlayFrames = readFileSync(resolve(root, 'src/components/common/OverlayFrames.tsx'), 'utf8');
const formControls = readFileSync(resolve(root, 'src/components/common/FormControls.tsx'), 'utf8');
const catalog = readFileSync(resolve(root, 'src/design-system.tsx'), 'utf8');

describe('design-system primitives', () => {
  it('uses semantic neutral and activation button intents', () => {
    expect(buttonClassName({ variant: 'primary' })).toContain('bg-ui-text');
    expect(buttonClassName({ variant: 'activation' })).toContain('bg-accent');
    expect(buttonClassName({ variant: 'danger' })).toContain('bg-status-danger');
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
    expect(formControls).toContain('role="switch"');
    expect(formControls).toContain('aria-checked={checked}');
    expect(formControls).toContain('role="menuitem"');
    expect(formControls).toContain('FieldLabel');
    expect(formControls).toContain('HelpText');
  });

  it('catalogs themes, responsive composition, interactive states, and overlays', () => {
    expect(catalog).toContain("document.documentElement.classList.toggle('dark', dark)");
    expect(catalog).toContain('variant="activation"');
    expect(catalog).toContain('state="loading"');
    expect(catalog).toContain('state="empty"');
    expect(catalog).toContain('state="error"');
    expect(catalog).toContain('<DialogFrame');
    expect(catalog).toContain('<DrawerFrame');
  });
});
