import React from 'react';
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

    expect(markup).toContain('data-target-skill-access-summary="true"');
    expect(markup).toContain('data-target-skill-list="true"');
    expect(markup).toContain('No skills configured.');
    expect(markup).not.toContain('id="target-skill-search"');
    expect(markup).not.toContain('Showing 0 of 0');
  });
});
