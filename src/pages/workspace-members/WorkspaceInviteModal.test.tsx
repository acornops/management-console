import React, { type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Select } from '@acornops/ui';
import type { ProjectMember, WorkspaceInvitation, WorkspaceMemberCandidate, WorkspaceRoleTemplate } from '@/types';
import { WorkspaceMemberIdentityField } from './WorkspaceMemberIdentityField';
import { WorkspaceInviteModal } from './WorkspaceInviteModal';

// Exercise the form's handlers without substituting its identity/role controls.
// Browser fixtures cover the mounted controls and keyboard interactions.
const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0, effects: [] as Array<() => void> }));
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [hooks.values[index], (value: unknown) => { hooks.values[index] = typeof value === 'function' ? value(hooks.values[index]) : value; }];
  },
  useEffect: (effect: () => void) => { hooks.effects.push(effect); },
  useCallback: (callback: unknown) => callback
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const role = (key: string, protectedRole = false): WorkspaceRoleTemplate => ({ key, displayName: key, description: '', kind: 'custom', protected: protectedRole, capabilities: [], sortOrder: 1 });
const candidate = (userId: string, email: string, status: WorkspaceMemberCandidate['status'] = 'available'): WorkspaceMemberCandidate => ({ userId, email, name: 'Alex Chen', status, authMethods: ['oidc'] });
function find(element: ReactElement<any>, predicate: (node: ReactElement<any>) => boolean): ReactElement<any> {
  if (predicate(element)) return element;
  for (const child of React.Children.toArray(element.props.children)) {
    if (!React.isValidElement(child)) continue;
    try { return find(child, predicate); } catch { /* Search sibling. */ }
  }
  throw new Error('Control not found');
}
function form(initialRoles = [role('owner', true), role('incident-reviewer'), role('viewer')], canManageOwners = false) {
  const addedMember: ProjectMember = { userId: 'alex-2', name: 'Alex Chen', email: 'alex2@example.test', role: 'viewer', source: 'Internal' };
  const invitation: WorkspaceInvitation = { id: 'invitation-1', email: 'new@example.test', role: 'viewer', status: 'pending', invitedBy: 'operator-1', createdAt: '2026-10-18T08:00:00Z', expiresAt: '2026-10-25T08:00:00Z' };
  const props = {
    workspaceId: 'workspace-1', roleTemplates: initialRoles, canManageOwners,
    onClose: vi.fn(), onAddMember: vi.fn().mockResolvedValue(addedMember),
    onCreateInvitation: vi.fn().mockResolvedValue(invitation)
  };
  let tree: ReactElement<any>;
  const render = () => { hooks.index = 0; hooks.effects = []; tree = WorkspaceInviteModal(props) as ReactElement<any>; hooks.effects.forEach((effect) => effect()); };
  render();
  return {
    props, render,
    identity: () => find(tree, (node) => node.type === WorkspaceMemberIdentityField).props,
    roles: () => find(tree, (node) => node.type === Select).props,
    disabled: () => find(tree, (node) => node.props.type === 'submit').props.disabled,
    submit: async () => { await find(tree, (node) => node.type === 'form').props.onSubmit({ preventDefault() {} }); },
    mutations: () => props.onAddMember.mock.calls.length + props.onCreateInvitation.mock.calls.length
  };
}

describe('deliberate new workspace access', () => {
  beforeEach(() => { hooks.values = []; });
  it('leaves reordered custom roles empty and untouched submission mutation-free', async () => {
    const view = form();
    expect(view.roles().value).toBe('');
    expect(view.roles().placeholder).toBe('members.selectRole');
    expect(view.roles().id).toBe('workspace-invite-role');
    expect(view.disabled()).toBe(true);
    await view.submit();
    expect(view.mutations()).toBe(0);
  });
  it.each([{ roles: [] }, { roles: [role('owner', true)] }])('blocks unavailable roles: $roles', async ({ roles }) => {
    const view = form(roles);
    view.identity().onChange('new@example.test'); view.render();
    expect(view.disabled()).toBe(true);
    await view.submit(); expect(view.mutations()).toBe(0);
  });
  it('requires valid email as well as an explicit allowed role', async () => {
    const view = form();
    view.roles().onChange('viewer'); view.render();
    expect(view.disabled()).toBe(true);
    view.identity().onChange('invalid'); view.render();
    expect(view.disabled()).toBe(true);
    await view.submit(); expect(view.mutations()).toBe(0);
    view.identity().onChange('new@example.test'); view.render();
    expect(view.disabled()).toBe(false);
    await view.submit();
    expect(view.props.onCreateInvitation).toHaveBeenCalledWith({ email: 'new@example.test', role: 'viewer' });
  });
  it('keeps duplicate names distinct through the selected immutable user id', async () => {
    const view = form();
    view.roles().onChange('incident-reviewer');
    view.identity().onSelect(candidate('alex-2', 'alex2@example.test')); view.render();
    expect(view.disabled()).toBe(false);
    await view.submit();
    expect(view.props.onAddMember).toHaveBeenCalledWith({ userId: 'alex-2', email: 'alex2@example.test', role: 'incident-reviewer' });
    expect(view.props.onCreateInvitation).not.toHaveBeenCalled();
  });
  it.each(['member', 'invited'] as const)('never submits an existing %s', async (status) => {
    const view = form();
    view.roles().onChange('viewer'); view.identity().onSelect(candidate('alex-1', 'alex1@example.test', status)); view.render();
    expect(view.disabled()).toBe(true);
    await view.submit(); expect(view.mutations()).toBe(0);
  });
  it('clears a disappeared role without choosing a newly arrived option', async () => {
    const view = form();
    view.identity().onChange('new@example.test'); view.roles().onChange('viewer'); view.render();
    view.props.roleTemplates = [role('new-custom')]; view.render(); view.render();
    expect(view.roles().value).toBe(''); expect(view.disabled()).toBe(true);
    await view.submit(); expect(view.mutations()).toBe(0);
  });
  it('invalidates protected role access when owner-management permission disappears', async () => {
    const view = form([role('owner', true)], true);
    view.identity().onChange('new@example.test'); view.roles().onChange('owner'); view.render();
    view.props.canManageOwners = false; view.render();
    expect(view.disabled()).toBe(true);
    await view.submit(); expect(view.mutations()).toBe(0);
  });
});
