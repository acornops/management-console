import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const styles = readFileSync(resolve(root, 'src/styles.css'), 'utf8');
const desktopSidebar = readFileSync(resolve(root, 'src/app/AppDesktopSidebar.tsx'), 'utf8');
const desktopSidebarParts = readFileSync(resolve(root, 'src/app/AppDesktopSidebarParts.tsx'), 'utf8');

describe('short desktop sidebar density contract', () => {
  it('tightens rows without collapsing section-title spacing', () => {
    expect(styles).toContain('@media (min-width: 1200px) and (max-height: 820px)');
    expect(styles).toContain("[data-sidebar-section='true'] > div:last-child");
    expect(styles).toContain('margin-top: 0.125rem;');
    expect(styles).toContain("[data-sidebar-section-titled='true']");
    expect(styles).toContain('padding-top: 0.5rem;');
    expect(styles).not.toContain("[data-sidebar-section='true'] > div:first-child:not(.sr-only)");
    expect(desktopSidebar).toContain('data-sidebar-density-nav="true"');
    expect(desktopSidebarParts).toContain("data-sidebar-section-titled={title && !collapsed ? 'true' : undefined}");
  });
});
