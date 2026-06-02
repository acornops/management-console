import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const appShell = readFileSync(resolve(root, 'src/app/AppShell.tsx'), 'utf8');

describe('AppShell cluster page callbacks', () => {
  it('keeps workspace cluster merge callbacks stable across parent renders', () => {
    expect(appShell).toContain('const replaceWorkspaceKubernetesClusters = React.useCallback');
    expect(appShell).toContain('const appendWorkspaceKubernetesClusters = React.useCallback');
    expect(appShell).toContain('}, [setKubernetesClusters, setWorkspaces]);');
  });
});
