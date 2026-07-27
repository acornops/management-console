import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SidebarSection, WorkspaceSidebarNavLink } from '@/app/AppDesktopSidebarParts';
import { getWorkspaceNavigationGroups, handleAppLinkClick } from '@/app/workspaceNavigation';
import type { Workspace } from '@/types';
import { AppPaths } from '@/utils/routes';

const t = ((key: string) => key) as never;

function workspace(permissions: Record<string, boolean>): Workspace {
  return { id: 'workspace-1', name: 'Workspace', permissions, members: [] } as unknown as Workspace;
}

describe('workspace navigation model', () => {
  it('keeps navigation rows and groups visually separated', () => {
    const regular = renderToStaticMarkup(<SidebarSection title="Inventory"><span>Clusters</span></SidebarSection>);
    const compact = renderToStaticMarkup(<SidebarSection title="Inventory" compactAfter><span>Clusters</span></SidebarSection>);
    const experimental = renderToStaticMarkup(<SidebarSection title="Automation" badge="Experimental"><span>Workflows</span></SidebarSection>);

    expect(regular).toContain('pb-7 px-3');
    expect(compact).toContain('pb-5 px-3');
    expect(regular).toContain('mb-2 flex');
    expect(regular).toContain('space-y-1');
    expect(experimental).toContain('Automation');
    expect(experimental).toContain('Experimental');
    expect(experimental).toContain('bg-status-warning-soft');
  });

  it('groups all permitted destinations and marks Triggers as the current Workflows child', () => {
    const groups = getWorkspaceNavigationGroups({
      workspace: workspace({ read_workspace_data: true, read_audit_log: true }),
      activeResourceNav: 'triggers',
      pendingApprovalCount: 100,
      openWorkflowRunCount: 3,
      t
    });

    expect(groups.map((group) => group.id)).toEqual(['primary', 'inventory', 'automation', 'governance', 'utilities']);
    expect(groups.flatMap((group) => group.items).map((item) => item.id)).toEqual([
      'overview', 'clusters', 'virtualMachines', 'agents', 'workflows', 'outboundWebhooks', 'approvals', 'workspaceAuditLog', 'workspaceSettings', 'help'
    ]);
    expect(groups.flatMap((group) => group.items).some((item) => item.path.includes('/catalog'))).toBe(false);
    expect(groups.find((group) => group.id === 'automation')?.badge).toBe('app.experimental');
    const workflows = groups.flatMap((group) => group.items).find((item) => item.id === 'workflows');
    expect(workflows).toMatchObject({
      active: true,
      current: false,
      path: AppPaths.workspaceWorkflows('workspace-1'),
      children: [
        { id: 'workflowLibrary', path: AppPaths.workspaceWorkflows('workspace-1'), current: false },
        { id: 'workflowTriggers', path: AppPaths.workspaceTriggers('workspace-1'), current: true },
        { id: 'workflowRuns', path: AppPaths.workspaceRuns('workspace-1'), current: false, badge: 3 }
      ]
    });
    expect(workflows?.badge).toBe(3);
    expect(groups.flatMap((group) => group.items).find((item) => item.id === 'approvals')?.badge).toBe(100);
  });

  it('marks Outbound webhooks as a first-class Automation destination', () => {
    const groups = getWorkspaceNavigationGroups({
      workspace: workspace({ read_workspace_data: true }),
      activeResourceNav: 'workspaceWebhooks',
      t
    });
    const outboundWebhooks = groups
      .find((group) => group.id === 'automation')
      ?.items.find((item) => item.id === 'outboundWebhooks');

    expect(outboundWebhooks).toMatchObject({
      label: 'app.outboundWebhooks',
      path: AppPaths.workspaceWebhooks('workspace-1'),
      active: true
    });
    expect(groups.find((group) => group.id === 'utilities')?.items.find((item) => item.id === 'workspaceSettings')?.active).toBe(false);
  });

  it('marks Library as current and hides workflow children outside workflow routes', () => {
    const workflowGroups = getWorkspaceNavigationGroups({
      workspace: workspace({ read_workspace_data: true }),
      activeResourceNav: 'workflows',
      t
    });
    const workflows = workflowGroups.flatMap((group) => group.items).find((item) => item.id === 'workflows');
    expect(workflows?.children?.map((child) => [child.id, child.current])).toEqual([
      ['workflowLibrary', true],
      ['workflowTriggers', false],
      ['workflowRuns', false]
    ]);

    const overviewGroups = getWorkspaceNavigationGroups({
      workspace: workspace({ read_workspace_data: true }),
      activeResourceNav: 'overview',
      t
    });
    expect(overviewGroups.flatMap((group) => group.items).find((item) => item.id === 'workflows')?.children).toBeUndefined();
  });

  it('renders Governance only with permitted destinations', () => {
    const groups = getWorkspaceNavigationGroups({
      workspace: workspace({ read_workspace_data: false, read_audit_log: true }),
      activeResourceNav: 'workspaceAuditLog',
      t
    });
    expect(groups.map((group) => group.id)).toEqual(['governance', 'utilities']);
    expect(groups[0].items.map((item) => item.id)).toEqual(['workspaceAuditLog']);
  });

  it('uses page semantics only for the active genuine link', () => {
    const active = renderToStaticMarkup(<WorkspaceSidebarNavLink active href="/base/workspaces/1/overview" icon={<span />} label="Overview" onClick={() => undefined} />);
    const inactive = renderToStaticMarkup(<WorkspaceSidebarNavLink active={false} href="/base/workspaces/1/approvals" icon={<span />} label="Approvals" onClick={() => undefined} />);
    expect(active).toContain('href="/base/workspaces/1/overview"');
    expect(active).toContain('aria-current="page"');
    expect(inactive).not.toContain('aria-current');
  });

  it('styles Workflows as an active parent while reserving page semantics for its child', () => {
    const parent = renderToStaticMarkup(<WorkspaceSidebarNavLink active current={false} href="/base/workspaces/1/workflows" icon={<span />} label="Workflows" onClick={() => undefined} />);
    const child = renderToStaticMarkup(<WorkspaceSidebarNavLink active current nested href="/base/workspaces/1/triggers" label="Triggers" onClick={() => undefined} />);
    expect(parent).toContain('bg-ui-bg');
    expect(parent).not.toContain('aria-current');
    expect(child).toContain('aria-current="page"');
    expect(child).toContain('before:bg-accent-strong');
    expect(child).toContain('bg-ui-surface');
    expect(child).not.toContain('bg-accent-soft');
  });

  it('preserves modified clicks and intercepts unmodified same-tab navigation', () => {
    const navigate = vi.fn();
    const modified = { button: 0, ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, preventDefault: vi.fn() } as unknown as React.MouseEvent<HTMLAnchorElement>;
    handleAppLinkClick(modified, '/workspaces/1/overview', navigate);
    expect(modified.preventDefault).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();

    const plain = { ...modified, ctrlKey: false, preventDefault: vi.fn() } as unknown as React.MouseEvent<HTMLAnchorElement>;
    handleAppLinkClick(plain, '/workspaces/1/overview', navigate);
    expect(plain.preventDefault).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/workspaces/1/overview');
  });
});
