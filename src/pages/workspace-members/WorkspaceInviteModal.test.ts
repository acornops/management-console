import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const inviteModal = readFileSync(resolve(root, 'src/pages/workspace-members/WorkspaceInviteModal.tsx'), 'utf8');

describe('WorkspaceInviteModal role preview', () => {
  it('shows the selected invite role capability preview below the role picker', () => {
    expect(inviteModal).toContain('const selectedInviteRoleTemplate = roleTemplates.find((role) => role.key === inviteRole);');
    expect(inviteModal).toContain('<RoleTemplatePreview');
    expect(inviteModal).toContain('roleTemplate={selectedInviteRoleTemplate}');
    expect(inviteModal).toContain("emptyMessage={t('members.rolePreviewUnavailable')}");
  });

  it('keeps expanded role details inside a scrollable modal body', () => {
    expect(inviteModal).toContain('max-h-[calc(100vh-3rem)]');
    expect(inviteModal).toContain('flex min-h-0 flex-1 flex-col');
    expect(inviteModal).toContain('min-h-0 flex-1 space-y-5 overflow-y-auto p-5 custom-scrollbar sm:p-6');
    expect(inviteModal).toContain('flex shrink-0 flex-col-reverse gap-3 border-t border-ui-border bg-ui-surface px-5 py-4 sm:flex-row sm:justify-end sm:px-6 sm:py-5');
  });

  it('prioritizes invite fields before secondary explanation copy', () => {
    expect(inviteModal).toContain('max-w-2xl');
    expect(inviteModal).toContain('grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(12rem,0.8fr)]');
    expect(inviteModal.indexOf("t('members.email')")).toBeLessThan(inviteModal.indexOf("t('members.inviteHowItWorks')"));
    expect(inviteModal.indexOf('<RoleTemplatePreview')).toBeLessThan(inviteModal.indexOf("t('members.inviteHowItWorks')"));
  });
});
