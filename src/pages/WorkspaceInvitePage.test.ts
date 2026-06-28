import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const invitePage = readFileSync(resolve(root, 'src/pages/WorkspaceInvitePage.tsx'), 'utf8');

describe('WorkspaceInvitePage role context', () => {
  it('uses shared member role formatting and role-template preview context', () => {
    expect(invitePage).toContain("import { formatRole } from '@/pages/workspace-members/memberUtils'");
    expect(invitePage).toContain("import { RoleTemplatePreview } from '@/pages/workspace-members/RoleTemplatePreview'");
    expect(invitePage).not.toContain('function formatRole(role: string)');
    expect(invitePage).toContain('formatRole(invitation.role, invitation.roleTemplate)');
    expect(invitePage).toContain('roleTemplate={invitation.roleTemplate}');
    expect(invitePage).toContain("emptyMessage={t('members.rolePreviewUnavailable')}");
  });
});
