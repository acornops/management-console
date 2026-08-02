import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface GridSizingContract {
  template: string;
  rowFile: string;
}

const root = resolve(process.cwd());
const srcRoot = join(root, 'src');

const gridSizingContracts: Record<string, GridSizingContract> = {
  'src/features/kubernetes-cluster-detail/components/workloads/resourceExplorerLayout.tsx': {
    template: 'resourceLedgerGridClass',
    rowFile: 'src/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts.tsx'
  },
  'src/features/webhooks/WebhookList.tsx': {
    template: 'webhookLedgerGridClass',
    rowFile: 'src/features/webhooks/WebhookList.tsx'
  },
  'src/pages/WorkspaceActivityPage.tsx': {
    template: 'workflowExecutionLedgerGridClass',
    rowFile: 'src/features/workflow-activity/WorkflowActivityUi.tsx'
  },
  'src/pages/WorkspaceIncomingWebhooksPage.tsx': {
    template: 'workspaceWebhookLedgerGridClass',
    rowFile: 'src/pages/WorkspaceWebhookCard.tsx'
  },
  'src/pages/virtual-machines/VirtualMachineResourcesView.tsx': {
    template: 'virtualMachineLogGridClass',
    rowFile: 'src/pages/virtual-machines/VirtualMachineResourcesView.tsx'
  }
};

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  }).filter((path) => path.endsWith('.tsx') && !path.includes('.test.'));
}

function read(repoPath: string): string {
  return readFileSync(join(root, repoPath), 'utf8');
}

function occurrences(source: string, value: string): number {
  return source.split(value).length - 1;
}

describe('table column sizing contracts', () => {
  it('keeps content sizing as the shared DataTable default', () => {
    const dataTable = read('packages/ui/src/DataTable.tsx');
    const defaultClasses = dataTable.match(/<table className=\{twMerge\('([^']+)'/)?.[1] || '';

    expect(defaultClasses).toContain('w-full');
    expect(defaultClasses).toContain('min-w-[44rem]');
    expect(defaultClasses).not.toContain('table-fixed');
  });

  it('requires one explicit column model for every fixed table', () => {
    const fixedTables = sourceFiles(srcRoot).flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return Array.from(source.matchAll(/<DataTable\b(?=[^>]*\btable-fixed\b)[^>]*>([\s\S]*?)<\/DataTable>/g))
        .map((match) => ({ body: match[1], path: relative(root, path).replaceAll('\\', '/') }));
    });

    expect(fixedTables.length).toBeGreaterThan(0);
    for (const table of fixedTables) {
      const columnGroup = table.body.match(/<colgroup>([\s\S]*?)<\/colgroup>/)?.[1] || '';
      const columns = columnGroup.match(/<col\b[^>]*>/g) || [];

      expect(columnGroup, `${table.path} must place a colgroup inside table-fixed DataTable`).not.toBe('');
      expect(columns.length, `${table.path} must size every fixed-table column`).toBeGreaterThan(0);
      for (const column of columns) {
        expect(column, `${table.path} has an unsized fixed-table column`).toMatch(/["\s](?:[a-z0-9]+:)*w-\[/);
      }
    }
  });

  it('registers every responsive grid header', () => {
    const discovered = sourceFiles(srcRoot)
      .filter((path) => !path.endsWith('/design-system.tsx'))
      .filter((path) => readFileSync(path, 'utf8').includes('<DataTableGridHeader'))
      .map((path) => relative(root, path).replaceAll('\\', '/'))
      .sort();

    expect(discovered).toEqual(Object.keys(gridSizingContracts).sort());
  });

  for (const [headerFile, contract] of Object.entries(gridSizingContracts)) {
    it(`${headerFile} reuses ${contract.template} for its header and rows`, () => {
      const headerSource = read(headerFile);
      const headerOpening = headerSource.match(/<DataTableGridHeader\b[\s\S]*?>/)?.[0] || '';
      const rowSource = read(contract.rowFile);

      expect(headerOpening).toContain(contract.template);
      expect(occurrences(rowSource, contract.template)).toBeGreaterThanOrEqual(2);
    });
  }
});
