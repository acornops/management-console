import { describe, expect, it } from 'vitest';

import {
  hasAnotherWorkspaceOwner,
  isKnownOnlyWorkspaceOwner,
  shouldPreflightWorkspaceOwnerLeave,
  workspacesAfterLeave
} from '@/app/workspaceLeave';
import type { ProjectMember, Workspace } from '@/types';

const member = (role: ProjectMember['role']): ProjectMember => ({
  userId: `${role}-user`,
  name: role,
  email: `${role}@example.com`,
  role,
  source: 'Internal'
});

const workspace = (id: string): Workspace => ({
  id,
  name: id,
  description: '',
  clusterIds: [],
  members: []
});

describe('workspace leave helpers', () => {
  it('only treats a single-member owner summary as a known only-owner block', () => {
    expect(isKnownOnlyWorkspaceOwner('owner', 1)).toBe(true);
    expect(isKnownOnlyWorkspaceOwner('owner', 2)).toBe(false);
    expect(isKnownOnlyWorkspaceOwner('owner', undefined)).toBe(false);
    expect(isKnownOnlyWorkspaceOwner('admin', 1)).toBe(false);
  });

  it('preflights owner leaves and allows non-owner leaves without owner lookup', () => {
    expect(shouldPreflightWorkspaceOwnerLeave('owner')).toBe(true);
    expect(shouldPreflightWorkspaceOwnerLeave('admin')).toBe(false);
    expect(shouldPreflightWorkspaceOwnerLeave(undefined)).toBe(false);
  });

  it('requires another owner before an owner leaves', () => {
    expect(hasAnotherWorkspaceOwner([member('owner')])).toBe(false);
    expect(hasAnotherWorkspaceOwner([member('owner'), member('owner')])).toBe(true);
  });

  it('removes only the left workspace from local workspace state', () => {
    expect(workspacesAfterLeave([workspace('one'), workspace('two')], 'one')).toEqual([workspace('two')]);
  });
});
