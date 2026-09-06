import { Button } from '@acornops/ui';
import type { Workspace } from '@/types';
import { AppPaths } from '@/utils/routes';

export function WorkspaceSuspendedScreen({ workspace, workspaces, navigate, onLogout }: {
  workspace: Workspace;
  workspaces: Workspace[];
  navigate: (path: string) => void;
  onLogout: () => Promise<void>;
}) {
  return <main className="flex min-h-screen items-center justify-center bg-ui-bg p-6">
    <section className="w-full max-w-lg space-y-5 rounded-xl border border-ui-border bg-ui-surface p-6" role="alertdialog" aria-modal="true" aria-labelledby="suspended-title" aria-describedby="suspended-reason">
      <h1 id="suspended-title" className="type-route-title text-ui-text">{workspace.name} is suspended</h1>
      <p id="suspended-reason" className="type-body text-ui-text-muted">{workspace.publicReason || 'Workspace access is temporarily suspended.'}</p>
      <p className="type-body text-ui-text-muted">Refresh to check whether access has been restored.</p>
      <div className="flex flex-wrap gap-2"><Button variant="primary" autoFocus onClick={() => window.location.assign(AppPaths.workspaceOverview(workspace.id))}>Refresh access</Button><Button variant="secondary" onClick={() => navigate(AppPaths.workspaces())}>Back to workspace directory</Button><Button variant="secondary" onClick={() => void onLogout()}>Sign out</Button></div>
      {workspaces.some(item => item.id !== workspace.id) && <div className="space-y-2"><h2 className="type-section-title">Switch workspace</h2>{workspaces.filter(item => item.id !== workspace.id).map(item => <Button key={item.id} variant="secondary" className="w-full" onClick={() => navigate(AppPaths.workspaceOverview(item.id))}>{item.name}{item.accessState === 'suspended' ? ' · Suspended' : ''}</Button>)}</div>}
    </section>
  </main>;
}
