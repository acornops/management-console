import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const page = readFileSync(resolve(root, 'src/pages/WorkspaceAgentsPage.tsx'), 'utf8');
const catalog = readFileSync(resolve(root, 'src/pages/WorkspaceAgentsCatalog.tsx'), 'utf8');
const discoveryFilterBar = readFileSync(resolve(root, 'src/components/common/DiscoveryFilterBar.tsx'), 'utf8');
const searchFilterFrame = readFileSync(resolve(root, 'src/components/common/SearchFilterFrame.tsx'), 'utf8');
const panel = readFileSync(resolve(root, 'src/components/common/RightSidePanel.tsx'), 'utf8');
const detail = readFileSync(resolve(root, 'src/pages/WorkspaceAgentDetailPanel.tsx'), 'utf8');
const componentVocabulary = readFileSync(resolve(root, 'src/components/common/ComponentVocabulary.tsx'), 'utf8');

describe('WorkspaceAgentsPage responsive polish', () => {
  it('contains the route and catalog at narrow widths', () => {
    expect(page).toContain('<PageShell>');
    expect(page).toContain("from '@/components/common/PageComposition'");
    expect(catalog).toContain('overflow-hidden rounded-lg border');
    expect(catalog).toContain('gap-x-5 gap-y-3 px-4 py-3.5');
    expect(catalog).toContain('grid-cols-2');
    expect(catalog).toContain('col-span-2 lg:col-span-1');
    expect(catalog).toContain('lg:grid-cols-[minmax(14rem,1.4fr)_7rem_minmax(12rem,0.8fr)_minmax(13rem,1fr)_2.75rem]');
    expect(catalog).not.toContain('min-w-[66rem]');
  });

  it('keeps the toolbar and filters contained', () => {
    expect(catalog).toContain('<DiscoveryFilterBar');
    expect(catalog).toContain('createDiscoveryFilterGroup<AgentFocusFilter>');
    expect(discoveryFilterBar).toContain('<SearchFilterFrame');
    expect(discoveryFilterBar).toContain('w-full pl-11 pr-12 lg:w-full');
    expect(discoveryFilterBar).toContain('<Select<string>');
    expect(searchFilterFrame).toContain('sm:grid-cols-2 lg:contents');
    expect(searchFilterFrame).toContain('lg:w-[clamp(10.5rem,14vw,14rem)]');
    expect(searchFilterFrame).toContain('lg:flex-nowrap');
  });

  it('keeps touch and keyboard navigation available across row layouts', () => {
    expect(catalog).toContain('absolute inset-0');
    expect(catalog).toContain('focus-visible:ring-inset focus-visible:ring-accent/45');
    expect(catalog).toContain('inline-flex min-h-11');
    expect(catalog).toContain('absolute right-4 top-3.5');
  });

  it('uses the shared focus-managed drawer chrome', () => {
    expect(page).toContain('titleId="agent-details-title"');
    expect(page).toContain('<AgentWorkspaceDrawer');
    expect(panel).toContain('role="dialog"');
    expect(panel).toContain('aria-modal="true"');
  });

  it('reveals keyboard-selected tabs within a horizontally scrolling mobile strip', () => {
    expect(detail).toContain('allPanelsMounted={false}');
    expect(componentVocabulary).toContain("tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });");
    expect(componentVocabulary).not.toContain('focus({ preventScroll: true })');
  });
});
