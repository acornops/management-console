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

  it('groups all permitted destinations and folds Activity into Workflows', () => {
    const groups = getWorkspaceNavigationGroups({
      workspace: workspace({ read_workspace_data: true, read_audit_log: true }),
      activeResourceNav: 'activity',
      pendingApprovalCount: 100,
      t
    });

    expect(groups.map((group) => group.id)).toEqual(['primary', 'inventory', 'automation', 'governance', 'utilities']);
    expect(groups.flatMap((group) => group.items).map((item) => item.id)).toEqual([
      'overview', 'clusters', 'virtualMachines', 'agents', 'workflows', 'outboundWebhooks', 'approvals', 'workspaceAuditLog', 'workspaceSettings', 'help'
    ]);
    expect(groups.flatMap((group) => group.items).some((item) => item.path.includes('/catalog'))).toBe(false);
    expect(groups.find((group) => group.id === 'automation')?.badge).toBeUndefined();
    const workflows = groups.flatMap((group) => group.items).find((item) => item.id === 'workflows');
    expect(workflows).toMatchObject({
      active: true,
      path: AppPaths.workspaceWorkflows('workspace-1'),
      experimentalBadge: 'app.experimental'
    });
    expect(groups.flatMap((group) => group.items).some((item) => item.id === 'activity')).toBe(false);
    expect(groups.flatMap((group) => group.items).find((item) => item.id === 'approvals')?.badge).toBe(100);
  });

  it('marks Webhooks as a first-class Automation destination', () => {
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

  it('marks Workflows as current without nested sidebar destinations', () => {
    const workflowGroups = getWorkspaceNavigationGroups({
      workspace: workspace({ read_workspace_data: true }),
      activeResourceNav: 'workflows',
      t
    });
    const workflows = workflowGroups.flatMap((group) => group.items).find((item) => item.id === 'workflows');
    expect(workflows).toMatchObject({
      active: true,
      path: AppPaths.workspaceWorkflows('workspace-1'),
      experimentalBadge: 'app.experimental'
    });

    const overviewGroups = getWorkspaceNavigationGroups({
      workspace: workspace({ read_workspace_data: true }),
      activeResourceNav: 'overview',
      t
    });
    expect(overviewGroups.flatMap((group) => group.items).find((item) => item.id === 'workflows')?.active).toBe(false);
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

  it('gives the active Workflows link page semantics', () => {
    const workflows = renderToStaticMarkup(<WorkspaceSidebarNavLink active href="/base/workspaces/1/workflows" icon={<span />} label="Workflows" onClick={() => undefined} />);
    expect(workflows).toContain('aria-current="page"');
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
