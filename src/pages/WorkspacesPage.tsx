import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, IconTile, PageHeader, PageShell, StatusBadge } from '@acornops/ui';
import { ICONS } from '@/constants';
import type { Workspace } from '@/types';

interface WorkspacesPageProps {
  mode: 'home' | 'workspaces';
  workspaces: Workspace[];
  onCreateWorkspace: () => void;
  onOpenWorkspace: (workspace: Workspace) => void;
}

export const WorkspacesPage: React.FC<WorkspacesPageProps> = ({
  mode,
  workspaces,
  onCreateWorkspace,
  onOpenWorkspace
}) => {
  const { t } = useTranslation();

  return (
    <PageShell data-route-state={mode}>
      <PageHeader
        title={t(mode === 'home' ? 'app.workspaceHomeTitle' : 'app.workspaces')}
        description={t(mode === 'home' ? 'app.workspaceHomeDescription' : 'app.workspacesDescription')}
        actions={(
          <Button type="button" variant="primary" size="md" onClick={onCreateWorkspace}>
            <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
            {t('app.createWorkspaceAction')}
          </Button>
        )}
      />

      <section aria-labelledby="workspace-list-heading" className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        <div className="border-b border-ui-border px-5 py-4 sm:px-6">
          <h2 id="workspace-list-heading" className="type-section-title">{t('app.availableWorkspaces')}</h2>
          <p className="mt-1 type-caption text-ui-text-muted">{t('app.availableWorkspacesDescription', { count: workspaces.length })}</p>
        </div>
        <ul className="divide-y divide-ui-border">
          {workspaces.map((workspace) => (
            <li key={workspace.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <IconTile>
                  <ICONS.LayoutGrid className="h-5 w-5" aria-hidden="true" />
                </IconTile>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="type-row-title break-words">{workspace.name}</h3>
                    {workspace.currentUserRole && (
                      <StatusBadge tone="neutral">{workspace.currentUserRoleTemplate?.displayName || workspace.currentUserRole}</StatusBadge>
                    )}
                  </div>
                  <p className="mt-1 max-w-3xl type-body text-ui-text-muted">
                    {workspace.description || t('app.workspaceDescriptionUnavailable')}
                  </p>
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 type-caption text-ui-text-muted">
                    <span>{t('app.workspaceMemberCount', { count: workspace.memberCount ?? workspace.members.length })}</span>
                    <span>{t('app.workspaceClusterCount', { count: workspace.clusterCount ?? 0 })}</span>
                  </p>
                </div>
              </div>
              <Button type="button" variant="secondary" size="md" className="w-full justify-center sm:w-auto" onClick={() => onOpenWorkspace(workspace)}>
                {t('app.openWorkspace')}
                <ICONS.ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
};
