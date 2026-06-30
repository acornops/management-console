import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  getDuplicateInviteEmailKeys,
  getSubmittableInviteRows,
  isSelfInviteEmail,
  isValidWorkspaceInviteEmail,
  normalizeInviteEmail,
  type CreateWorkspaceInviteRow
} from './CreateWorkspaceModal';

const root = resolve(__dirname, '../../..');
const createWorkspaceModal = readFileSync(resolve(root, 'src/components/workspaces/CreateWorkspaceModal.tsx'), 'utf8');

const row = (overrides: Partial<CreateWorkspaceInviteRow>): CreateWorkspaceInviteRow => ({
  id: overrides.id || 'row-1',
  email: overrides.email || '',
  role: overrides.role || 'viewer',
  status: overrides.status || 'idle',
  error: overrides.error,
  invitation: overrides.invitation
});

describe('CreateWorkspaceModal source contracts', () => {
  it('uses the shared dialog and two-step modal vocabulary', () => {
    expect(createWorkspaceModal).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(createWorkspaceModal).toContain("import { ModalStepIndicator } from '@/components/common/ModalStepIndicator'");
    expect(createWorkspaceModal).toContain("import { CloseButton, TextInput } from '@/components/common/ComponentVocabulary'");
    expect(createWorkspaceModal).toContain("import { Select, SelectOption } from '@/components/common/Select'");
    expect(createWorkspaceModal).toContain("import { FieldValidationMessage, fieldInvalidClass } from '@/components/common/FieldValidationMessage'");
    expect(createWorkspaceModal).toContain('titleId="create-workspace-title"');
    expect(createWorkspaceModal).toContain('initialFocusRef={workspaceNameInputRef}');
    expect(createWorkspaceModal).toContain('closeDisabled={closeDisabled}');
    expect(createWorkspaceModal).toContain("ariaLabel={t('members.role')}");
    expect(createWorkspaceModal).toContain('currentUserEmail: string;');
    expect(createWorkspaceModal).toContain("t('workspaceCreate.selfInvite')");
    expect(createWorkspaceModal).toContain('className="flex justify-end md:items-start md:pt-6"');
    expect(createWorkspaceModal).toContain('className="sm:h-11 sm:w-11"');
    expect(createWorkspaceModal).toContain("t('workspaceCreate.stepWorkspace')");
    expect(createWorkspaceModal).toContain("t('workspaceCreate.stepInviteMembers')");
    expect(createWorkspaceModal).toContain('<ModalStepIndicator steps={createSteps} currentStepId={step} className="mt-4" />');
    expect(createWorkspaceModal).not.toContain('modalOverlayMotion');
    expect(createWorkspaceModal).not.toContain('rounded-2xl');
    expect(createWorkspaceModal).not.toContain('md:min-h-[4.75rem]');
    expect(createWorkspaceModal).not.toContain('mt-4 space-y-3 rounded-lg border border-ui-border bg-ui-bg p-4');
  });

  it('keeps workspace creation before optional invite setup', () => {
    expect(createWorkspaceModal).toContain('const workspace = await onCreateWorkspace(name);');
    expect(createWorkspaceModal).toContain('setCreatedWorkspace(workspace);');
    expect(createWorkspaceModal).toContain("setStep('members');");
    expect(createWorkspaceModal).toContain('void onLoadWorkspaceRoles(createdWorkspace.id)');
    expect(createWorkspaceModal).toContain('Promise.allSettled(');
    expect(createWorkspaceModal).toContain("throw new Error(t('app.invitationTokenMissing'))");
    expect(createWorkspaceModal).toContain('copiedInviteTimerRef.current = window.setTimeout');
    expect(createWorkspaceModal).toContain('window.clearTimeout(copiedInviteTimerRef.current)');
    expect(createWorkspaceModal).not.toContain('onStepSelect');
  });
});

describe('CreateWorkspaceModal invite helpers', () => {
  it('normalizes and validates email addresses', () => {
    expect(normalizeInviteEmail(' Teammate@Example.COM ')).toBe('teammate@example.com');
    expect(isValidWorkspaceInviteEmail('teammate@example.com')).toBe(true);
    expect(isValidWorkspaceInviteEmail('not-an-email')).toBe(false);
    expect(isValidWorkspaceInviteEmail('missing-domain@')).toBe(false);
    expect(isSelfInviteEmail(' Dev@AcornOps.Local ', 'dev@acornops.local')).toBe(true);
    expect(isSelfInviteEmail('teammate@example.com', 'dev@acornops.local')).toBe(false);
  });

  it('detects duplicate pending invite emails case-insensitively', () => {
    expect(getDuplicateInviteEmailKeys([
      row({ id: 'one', email: 'User@example.com' }),
      row({ id: 'two', email: ' user@EXAMPLE.com ' }),
      row({ id: 'three', email: 'other@example.com' }),
      row({ id: 'four', email: 'user@example.com', status: 'created' })
    ])).toEqual(new Set(['user@example.com']));
  });

  it('submits only non-created rows with email input', () => {
    expect(getSubmittableInviteRows([
      row({ id: 'empty', email: ' ' }),
      row({ id: 'created', email: 'done@example.com', status: 'created' }),
      row({ id: 'failed', email: 'retry@example.com', status: 'failed' })
    ]).map((item) => item.id)).toEqual(['failed']);
  });
});
