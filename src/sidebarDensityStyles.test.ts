import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const styles = readFileSync(resolve(root, 'src/styles.css'), 'utf8');
const desktopSidebar = readFileSync(resolve(root, 'src/app/AppDesktopSidebar.tsx'), 'utf8');
const desktopSidebarParts = readFileSync(resolve(root, 'src/app/AppDesktopSidebarParts.tsx'), 'utf8');
const navigationPrimitives = readFileSync(resolve(root, 'packages/ui/src/Navigation.tsx'), 'utf8');

describe('short desktop sidebar spacing contract', () => {
  it('preserves normal rhythm and uses independent navigation overflow', () => {
    expect(styles).not.toContain('@media (min-width: 1200px) and (max-height: 820px)');
    expect(desktopSidebar).toContain('data-sidebar-density-nav="true"');
    expect(desktopSidebarParts).toContain("data-sidebar-section-titled={title && !collapsed ? 'true' : undefined}");
    expect(desktopSidebar).toContain('className="no-scrollbar min-h-0 flex-1 overflow-y-auto"');
    expect(navigationPrimitives).toContain("compactAfter ? 'pb-5 px-3' : 'pb-7 px-3'");
    expect(desktopSidebarParts).toContain("[&>div:last-child]:space-y-0.5");
  });

  it('keeps target context navigation quiet and aligned with section headings', () => {
    expect(desktopSidebar.match(/variant="tertiary"\s+size="sm"\s+onClick=\{onBackToWorkspaceSidebar\}/g)).toHaveLength(3);
    expect(desktopSidebar).toContain('w-full justify-start gap-3 rounded-md px-3');
    expect(desktopSidebar).not.toContain('rounded-lg border border-ui-border bg-ui-bg px-4');
    expect(desktopSidebarParts).toContain("'border-y border-ui-border bg-ui-surface px-2 py-3'");
  });
});
