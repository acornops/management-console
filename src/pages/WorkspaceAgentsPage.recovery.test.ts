import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const page = readFileSync(resolve(root, 'src/pages/WorkspaceAgentsPage.tsx'), 'utf8');
const catalog = readFileSync(resolve(root, 'src/pages/WorkspaceAgentsCatalog.tsx'), 'utf8');

describe('WorkspaceAgentsPage recovery', () => {
  it('makes the agent name the only profile action', () => {
    expect(catalog).toContain('onClick={() => onOpenManagement(agent)}');
    expect(catalog).toContain('ICONS.ChevronRight');
    expect(catalog).not.toContain('View profile');
  });

  it('keeps synthetic readiness language out of the page', () => {
    expect(`${page}\n${catalog}`).not.toContain('Run readiness');
    expect(`${page}\n${catalog}`).not.toContain('Assignment readiness');
    expect(`${page}\n${catalog}`).not.toContain('Needs review');
  });

  it('retries all failed live sources together', () => {
    expect(page).toContain('setAgentCatalogReloadKey');
    expect(page).toContain('setOwnerUsersReloadKey');
    expect(page).toContain('actionLabel="Retry all"');
  });
});
