import { useTranslation } from 'react-i18next';
import { Button } from '@acornops/ui';
import type { Workspace } from '@/types';
import { AppPaths } from '@/utils/routes';

export function WorkspaceSuspendedScreen({ workspace, workspaces, navigate, onLogout }: {
  workspace: Workspace;
  workspaces: Workspace[];
  navigate: (path: string) => void;
  onLogout: () => Promise<void>;
}) {
  const { t } = useTranslation();
  return <main className="flex min-h-screen items-center justify-center bg-ui-bg p-6">
    <section className="w-full max-w-lg space-y-5 rounded-xl border border-ui-border bg-ui-surface p-6" role="alertdialog" aria-modal="true" aria-labelledby="suspended-title" aria-describedby="suspended-reason">
      <h1 id="suspended-title" className="type-route-title text-ui-text">{t('appRecovery.suspendedTitle', { name: workspace.name })}</h1>
      <p id="suspended-reason" className="type-body text-ui-text-muted">{workspace.publicReason || t('appRecovery.suspendedReason')}</p>
      <p className="type-body text-ui-text-muted">{t('appRecovery.refreshHelp')}</p>
      <div className="flex flex-wrap gap-2"><Button variant="primary" autoFocus onClick={() => window.location.assign(AppPaths.workspaceOverview(workspace.id))}>{t('appRecovery.refreshAccess')}</Button><Button variant="secondary" onClick={() => navigate(AppPaths.workspaces())}>{t('appRecovery.directory')}</Button><Button variant="secondary" onClick={() => void onLogout()}>{t('appRecovery.signOut')}</Button></div>
      {workspaces.some(item => item.id !== workspace.id) && <div className="space-y-2"><h2 className="type-section-title">{t('appRecovery.switchWorkspace')}</h2>{workspaces.filter(item => item.id !== workspace.id).map(item => <Button key={item.id} variant="secondary" className="w-full" onClick={() => navigate(AppPaths.workspaceOverview(item.id))}>{item.name}{item.accessState === 'suspended' ? t('appRecovery.suspendedSuffix') : ''}</Button>)}</div>}
    </section>
  </main>;
}
