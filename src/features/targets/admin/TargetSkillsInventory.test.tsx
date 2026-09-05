import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeI18n } from '@/i18n';
import { TargetSkillsInventory } from '@/features/targets/admin/TargetSkillsInventory';

beforeAll(async () => {
  await initializeI18n();
});

describe('TargetSkillsInventory', () => {
  it('hides discovery controls for a true empty inventory', () => {
    const markup = renderToStaticMarkup(
      <TargetSkillsInventory
        skills={[]}
        canEditSkills
        pendingToggleSkillId={null}
        onEditSkill={vi.fn()}
        onDeleteSkill={vi.fn()}
        onToggleSkill={vi.fn()}
      />
    );

    expect(markup).not.toContain('data-target-skill-access-summary="true"');
    expect(markup).toContain('data-target-skill-list="true"');
    expect(markup).toContain('No skills configured.');
    expect(markup).not.toContain('<table');
    expect(markup).not.toContain('id="target-skill-search"');
    expect(markup).not.toContain('Showing 0 of 0');
  });

  it('labels an untouched workspace skill snapshot as a starter', () => {
    const markup = renderToStaticMarkup(
      <TargetSkillsInventory
        skills={[{
          id: 'platform-default:skill-1',
          workspaceId: 'workspace-1',
          name: 'Starter skill',
          description: 'A creation-time workspace starter.',
          enabled: false,
          validationStatus: 'valid',
          validationErrors: [],
          bundleStats: { fileCount: 1, totalBytes: 128 },
          source: { type: 'manual', syncStatus: 'not_applicable' },
          createdAt: '2026-08-10T00:00:00.000Z',
          updatedAt: '2026-08-10T00:00:00.000Z',
          inherited: true
        }]}
        canEditSkills
        pendingToggleSkillId={null}
        onEditSkill={vi.fn()}
        onDeleteSkill={vi.fn()}
        onToggleSkill={vi.fn()}
      />
    );

    expect(markup).toContain('Workspace starter');
    expect(markup).not.toContain('Platform default');
  });
});
