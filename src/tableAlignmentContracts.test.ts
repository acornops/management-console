import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Density = 'dense' | 'compact';

interface DensityContract {
  density: Density;
  rowFiles: string[];
}

const root = resolve(process.cwd());
const srcRoot = join(root, 'src');

const densityContracts: Record<string, DensityContract> = {
  'src/features/targets/issues/TargetIssuesPanel.tsx': {
    density: 'compact',
    rowFiles: ['src/features/targets/issues/TargetIssuesPanel.tsx']
  },
  'src/pages/WorkspaceApprovalsPage.tsx': {
    density: 'dense',
    rowFiles: ['src/pages/WorkspaceApprovalsPage.tsx']
  },
  'src/pages/WorkspaceScheduleDrawerTable.tsx': {
    density: 'dense',
    rowFiles: ['src/pages/WorkspaceScheduleDrawerTable.tsx']
  },
  'src/pages/WorkspaceSchedulesPage.tsx': {
    density: 'dense',
    rowFiles: ['src/pages/WorkspaceScheduleRows.tsx']
  },
  'src/pages/WorkspaceWebhookDrawerTable.tsx': {
    density: 'dense',
    rowFiles: ['src/pages/WorkspaceWebhookDrawerTable.tsx']
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

function openings(source: string, component: string): string[] {
  return source.match(new RegExp(`<${component}\\b[^>]*>`, 'g')) || [];
}

describe('table alignment contracts', () => {
  it('registers every table that opts into a non-standard density', () => {
    const discovered = sourceFiles(srcRoot)
      .filter((path) => /<DataTableHeaderCell\b[^>]*density="(?:dense|compact)"/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(root, path).replaceAll('\\', '/'))
      .sort();

    expect(discovered).toEqual(Object.keys(densityContracts).sort());
  });

  for (const [headerFile, contract] of Object.entries(densityContracts)) {
    it(`${headerFile} keeps header and body density aligned`, () => {
      const headerCells = openings(read(headerFile), 'DataTableHeaderCell');
      expect(headerCells.length).toBeGreaterThan(0);
      for (const headerCell of headerCells) {
        expect(headerCell).toContain(`density="${contract.density}"`);
      }

      for (const rowFile of contract.rowFiles) {
        const bodyCells = openings(read(rowFile), 'DataTableCell');
        expect(bodyCells.length).toBeGreaterThan(0);
        for (const bodyCell of bodyCells) {
          expect(bodyCell).toContain(`density="${contract.density}"`);
        }
      }
    });
  }

  it('keeps workflow activity row gaps equal to its desktop header gap', () => {
    const activitySource = read('src/features/workflow-activity/WorkflowActivityUi.tsx');
    expect(activitySource).toContain('sm:gap-x-6 xl:items-center xl:gap-x-3');
  });

  it('keeps dense schedule skeleton cells on the same 16px inset', () => {
    const scheduleSource = read('src/pages/WorkspaceSchedulesPage.tsx');
    expect(scheduleSource).toContain('cellClassName="px-4 py-4"');
  });
});
