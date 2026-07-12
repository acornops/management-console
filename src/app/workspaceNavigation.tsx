import React from 'react';
import type { TFunction } from 'i18next';
import { canReadWorkspaceAuditLog, canReadWorkspaceData } from '@/app/workspacePermissions';
import type { ActiveResourceNav } from '@/app/appRouteState';
import { ICONS } from '@/constants';
import type { Workspace } from '@/types';
import { AppPaths } from '@/utils/routes';

export interface WorkspaceNavigationItem {
  id: 'overview' | 'clusters' | 'virtualMachines' | 'agents' | 'workflows' | 'approvals' | 'workspaceAuditLog' | 'workspaceSettings' | 'help';
  label: string;
  path: string;
  icon: React.ElementType;
  active: boolean;
  current?: boolean;
  badge?: number;
  children?: WorkspaceNavigationChildItem[];
}

export interface WorkspaceNavigationChildItem {
  id: 'workflowLibrary' | 'workflowSchedules';
  label: string;
  path: string;
  current: boolean;
}

export interface WorkspaceNavigationGroup {
  id: 'primary' | 'inventory' | 'automation' | 'governance' | 'utilities';
  label?: string;
  items: WorkspaceNavigationItem[];
}

interface WorkspaceNavigationOptions {
  workspace: Workspace | undefined;
  activeResourceNav: ActiveResourceNav;
  pendingApprovalCount?: number;
  t: TFunction;
}

export function getWorkspaceNavigationGroups({
  workspace,
  activeResourceNav,
  pendingApprovalCount,
  t
}: WorkspaceNavigationOptions): WorkspaceNavigationGroup[] {
  if (!workspace) return [];
  const canReadData = canReadWorkspaceData(workspace);
  const canReadAudit = canReadWorkspaceAuditLog(workspace);
  const isWorkflowRoute = activeResourceNav === 'workflows' || activeResourceNav === 'schedules';
  const groups: WorkspaceNavigationGroup[] = [];
  if (canReadData) {
    groups.push({
      id: 'primary',
      items: [{ id: 'overview', label: t('app.overview'), path: AppPaths.workspaceOverview(workspace.id), icon: ICONS.LayoutGrid, active: activeResourceNav === 'overview' }]
    });
    groups.push({
      id: 'inventory',
      label: t('app.inventory'),
      items: [
        { id: 'clusters', label: t('app.clusters'), path: AppPaths.workspaceKubernetesClusters(workspace.id), icon: ICONS.Layers, active: activeResourceNav === 'clusters' },
        { id: 'virtualMachines', label: t('app.virtualMachines'), path: AppPaths.workspaceVirtualMachines(workspace.id), icon: ICONS.Server, active: activeResourceNav === 'virtualMachines' }
      ]
    });
    groups.push({
      id: 'automation',
      label: t('app.automation'),
      items: [
        { id: 'agents', label: t('app.agents'), path: AppPaths.workspaceAgents(workspace.id), icon: ICONS.Bot, active: activeResourceNav === 'agents' },
        {
          id: 'workflows',
          label: t('app.workflows'),
          path: AppPaths.workspaceWorkflows(workspace.id),
          icon: ICONS.GitBranch,
          active: isWorkflowRoute,
          current: false,
          children: isWorkflowRoute
            ? [
                { id: 'workflowLibrary', label: t('app.library'), path: AppPaths.workspaceWorkflows(workspace.id), current: activeResourceNav === 'workflows' },
                { id: 'workflowSchedules', label: t('app.schedules'), path: AppPaths.workspaceSchedules(workspace.id), current: activeResourceNav === 'schedules' }
              ]
            : undefined
        }
      ]
    });
  }
  const governanceItems: WorkspaceNavigationItem[] = [];
  if (canReadData) {
    governanceItems.push({
      id: 'approvals', label: t('app.approvals'), path: AppPaths.workspaceApprovals(workspace.id), icon: ICONS.CheckCircle2,
      active: activeResourceNav === 'approvals', badge: pendingApprovalCount
    });
  }
  if (canReadAudit) {
    governanceItems.push({ id: 'workspaceAuditLog', label: t('app.auditLog'), path: AppPaths.workspaceAuditLog(workspace.id), icon: ICONS.Shield, active: activeResourceNav === 'workspaceAuditLog' });
  }
  if (governanceItems.length) groups.push({ id: 'governance', label: t('app.governance'), items: governanceItems });
  groups.push({
    id: 'utilities',
    label: t('app.utilities'),
    items: [
      { id: 'workspaceSettings', label: t('app.workspaceSettings'), path: AppPaths.workspaceSettings(workspace.id), icon: ICONS.Settings, active: ['workspaceSettings', 'workspaceAiSettings', 'members'].includes(activeResourceNav) },
      { id: 'help', label: t('app.help'), path: AppPaths.help(), icon: ICONS.CircleHelp, active: activeResourceNav === 'help' }
    ]
  });
  return groups.filter((group) => group.items.length > 0);
}

export function appHref(path: string): string {
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  return `${baseUrl && baseUrl !== '/' ? baseUrl : ''}${path.startsWith('/') ? path : `/${path}`}`;
}

export function handleAppLinkClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  path: string,
  navigate: (path: string) => void,
  beforeNavigate?: () => void
): void {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  beforeNavigate?.();
  navigate(path);
}
