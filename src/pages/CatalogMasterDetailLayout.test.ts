import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const source = (path: string) => readFileSync(resolve(root, path), 'utf8');
const layout = source('src/components/common/MasterDetailLayout.tsx');
const workflows = source('src/pages/WorkspaceWorkflowsPage.tsx');
const workflowLibrary = source('src/pages/WorkspaceWorkflowsPage.components.tsx');
const workflowRows = workflowLibrary.slice(workflowLibrary.indexOf('export const WorkflowLibraryList'), workflowLibrary.indexOf('export const WorkflowDeleteDialog'));
const catalog = source('src/pages/WorkspaceCatalogPage.tsx');

describe('catalog master-detail surfaces', () => {
  it('routes Workflows and MCP Catalog through the same desktop split', () => {
    expect(layout).toContain('lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]');
    expect(layout).toContain('min-h-[32rem]');
    expect(layout).toContain('lg:border-r lg:border-ui-border');
    [workflows, catalog].forEach((page) => {
      expect(page).toContain("from '@/components/common/MasterDetailLayout'");
      expect(page).toContain('<MasterDetailLayout');
    });
    expect(workflows).not.toContain('xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]');
    expect(catalog).not.toContain('lg:grid-cols-[minmax(18rem,0.85fr)_minmax(28rem,1.35fr)]');
  });

  it('uses explicit route selection for compact drill-in and shared Back actions', () => {
    expect(workflows).toContain('showDetailOnCompact={hasExplicitWorkflowSelection}');
    expect(workflows).toContain('compactBackLabel="Back to workflows"');
    expect(catalog).toContain('showDetailOnCompact={Boolean(routeState.artifact)}');
    expect(catalog).toContain('compactBackLabel="Back to servers"');
    expect(layout).toContain("showDetailOnCompact ? 'hidden lg:block' : 'block'");
    expect(layout).toContain("showDetailOnCompact ? 'block' : 'hidden lg:block'");
  });

  it('keeps both libraries compact, divided, descriptive, and stateful', () => {
    for (const snippet of [
      '<ul className="divide-y divide-ui-border">',
      '<MasterDetailRow',
      'workflow.name',
      'workflow.description',
      'workflowStatusTone(workflow.status)',
      "pluralize(workflow.agents.length, 'agent')",
      'workflowProvenanceLabel(workflow)',
      'selected={workflow.id === selectedWorkflow?.id}'
    ]) expect(workflowRows).toContain(snippet);
    expect(workflowRows).not.toContain("pluralize(workflow.semanticCapabilityIds.length, 'capability')");
    for (const snippet of ['<MasterDetailRow', 'description={artifact.description}', 'selected={selectedArtifact?.id === artifact.id}']) {
      expect(catalog).toContain(snippet);
    }
    expect(layout).toContain('focus-visible:ring-inset focus-visible:ring-accent');
    expect(layout).toContain("selected ? 'bg-accent-soft/45' : 'hover:bg-ui-bg/70'");
  });

  it('shares discovery rhythm and detail-pane chrome while preserving page-specific content', () => {
    expect(workflowLibrary).toContain('masterDetailDiscoverySpacingClass');
    expect(catalog).toContain('className={masterDetailDiscoverySpacingClass}');
    [workflows, catalog].forEach((page) => {
      expect(page).toContain('<MasterDetailPaneHeader');
      expect(page).toContain('<MasterDetailPaneBody>');
    });
    expect(workflows).toContain('<SegmentedTabs<WorkflowTab>');
    expect(catalog).toContain('ariaLabel="Install destination"');
  });
});
