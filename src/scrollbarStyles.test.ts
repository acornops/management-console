import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const styles = readFileSync(resolve(root, 'src/styles.css'), 'utf8');
const tokens = readFileSync(resolve(root, 'packages/ui/tokens.css'), 'utf8');
const design = readFileSync(resolve(root, 'DESIGN.md'), 'utf8');
const compactControls = readFileSync(resolve(root, 'packages/ui/src/CompactControls.tsx'), 'utf8');
const resourceCategoryTabs = readFileSync(resolve(root, 'src/components/common/ResourceCategoryTabs.tsx'), 'utf8');
const desktopSidebar = readFileSync(resolve(root, 'src/app/AppDesktopSidebar.tsx'), 'utf8');
const mobileNavigation = readFileSync(resolve(root, 'src/app/AppMobileNavigation.tsx'), 'utf8');
const agentDetailPanel = readFileSync(resolve(root, 'src/pages/WorkspaceAgentDetailPanel.tsx'), 'utf8');

describe('scrollbar styling contract', () => {
  it('scopes custom scrollbar styling to intentional scroll regions', () => {
    expect(tokens).toContain('.custom-scrollbar {');
    expect(tokens).toContain('.custom-scrollbar::-webkit-scrollbar {');
    expect(tokens).toContain('.custom-scrollbar::-webkit-scrollbar-thumb {');
    expect(styles).not.toMatch(/\n::?-webkit-scrollbar(?:-|\s|\{)/);
  });

  it('keeps navigation scrollable without visible scrollbar chrome', () => {
    expect(compactControls).toContain('no-scrollbar flex gap-2 overflow-x-auto');
    expect(resourceCategoryTabs).toContain('no-scrollbar flex w-full max-w-full shrink-0 items-center overflow-x-auto');
    expect(desktopSidebar).toContain('no-scrollbar min-h-0 flex-1 overflow-y-auto');
    expect(mobileNavigation).toContain('no-scrollbar min-h-0 flex-1 divide-y divide-ui-border overflow-y-auto');
    expect(agentDetailPanel).toContain('className="flex h-full min-h-0 flex-1 flex-col"');
    expect(agentDetailPanel).not.toContain('className="min-h-0 flex-1 py-5"');
    expect(agentDetailPanel).not.toContain('overflow-y-auto');
    expect(design).toContain('horizontally scrollable when needed without displaying a scrollbar');
  });

  it('uses the neutral token for Chromium and Firefox scrollbar thumbs', () => {
    expect(tokens).toContain('scrollbar-color: rgb(var(--ao-text-muted-rgb) / 28%) transparent;');
    expect(tokens).toContain('background: rgb(var(--ao-text-muted-rgb) / 28%);');
    expect(tokens).toContain('background: rgb(var(--ao-text-muted-rgb) / 44%);');
    expect(styles).not.toContain('background: rgb(var(--ao-brand-orange-rgb) / 22%);');
    expect(styles).not.toContain('background: rgb(var(--ao-brand-orange-rgb) / 40%);');
    expect(design).not.toContain('scroll thumbs, and activation moments');
    expect(design).toContain('scoped scrollbar thumb used by intentional console scroll regions');
  });

  it('preserves the explicit hidden-scrollbar utility without restoring a global override', () => {
    expect(tokens).toContain('.no-scrollbar::-webkit-scrollbar {');
    expect(tokens).toContain('scrollbar-width: none;');
    expect(styles).not.toContain('.cluster-catalog-scrollbar');
  });
});
