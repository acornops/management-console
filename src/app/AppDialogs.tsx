import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trans, useTranslation } from 'react-i18next';
import { AddClusterModal } from '@/components/kubernetes-clusters/AddClusterModal';
import { ClusterAgentInstallModal } from '@/components/kubernetes-clusters/ClusterAgentInstallModal';
import { Button } from '@/components/common/Button';
import { AppToast, ToastViewport } from '@/components/common/ToastViewport';
import { formInputClassName } from '@/components/common/formControlStyles';
import { ICONS } from '@/constants';
import { modalOverlayMotion, modalPanelMotion } from '@/lib/motion';
import { KubernetesCluster, User, Workspace } from '@/types';

interface AppDialogsProps {
  clusterCreationStep: 'details' | 'instructions';
  clusterInstallCommand: string;
  clusterInstallWarnings: string[];
  deleteTargetWorkspace: Workspace | undefined;
  excludeNamespaces: string;
  includeNamespaces: string;
  installAgentCluster: KubernetesCluster | null;
  installAgentWorkspace: Workspace | undefined;
  isAddingCluster: boolean;
  isCreatingCluster: boolean;
  isCreatingWorkspace: boolean;
  isDark: boolean;
  isDeletingWorkspace: boolean;
  newClusterName: string;
  newWorkspaceName: string;
  toasts: AppToast[];
  user: User;
  onClusterNameChange: (value: string) => void;
  onCloseAddCluster: () => void;
  onCloseInstallAgent: () => void;
  onCloseWorkspaceCreate: () => void;
  onCloseWorkspaceDelete: () => void;
  onConfirmClusterInstalled: () => void;
  onConfirmDeleteWorkspace: (workspace: Workspace) => Promise<void>;
  onCreateWorkspace: (workspace: Omit<Workspace, 'id' | 'clusterIds'>) => void;
  onDismissToast: (id: string) => void;
  onExcludeNamespacesChange: (value: string) => void;
  onIncludeNamespacesChange: (value: string) => void;
  onProceedToClusterInstructions: () => void;
  onSetDeletingWorkspace: (value: boolean) => void;
  onWorkspaceNameChange: (value: string) => void;
  showToast: (message: string) => void;
}

export const AppDialogs: React.FC<AppDialogsProps> = ({
  clusterCreationStep,
  clusterInstallCommand,
  clusterInstallWarnings,
  deleteTargetWorkspace,
  excludeNamespaces,
  includeNamespaces,
  installAgentCluster,
  installAgentWorkspace,
  isAddingCluster,
  isCreatingCluster,
  isCreatingWorkspace,
  isDark,
  isDeletingWorkspace,
  newClusterName,
  newWorkspaceName,
  toasts,
  user,
  onClusterNameChange,
  onCloseAddCluster,
  onCloseInstallAgent,
  onCloseWorkspaceCreate,
  onCloseWorkspaceDelete,
  onConfirmClusterInstalled,
  onConfirmDeleteWorkspace,
  onCreateWorkspace,
  onDismissToast,
  onExcludeNamespacesChange,
  onIncludeNamespacesChange,
  onProceedToClusterInstructions,
  onSetDeletingWorkspace,
  onWorkspaceNameChange,
  showToast
}) => {
  const { t } = useTranslation();
  const [workspaceDeleteConfirmation, setWorkspaceDeleteConfirmation] = React.useState('');
  const workspaceNameInputClassName = formInputClassName('px-4');
  const workspaceDeleteInputClassName = formInputClassName('px-4 focus:border-status-danger/45 focus:ring-status-danger/20');

  React.useEffect(() => {
    setWorkspaceDeleteConfirmation('');
  }, [deleteTargetWorkspace?.id]);

  const handleCloseWorkspaceDelete = () => {
    setWorkspaceDeleteConfirmation('');
    onCloseWorkspaceDelete();
  };

  return (
    <>
      <AnimatePresence>
        {deleteTargetWorkspace && (
          <motion.div
            {...modalOverlayMotion}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ui-text/45 p-4 dark:bg-ui-bg/75"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isDeletingWorkspace) {
                handleCloseWorkspaceDelete();
              }
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-workspace-title"
              {...modalPanelMotion}
              className="relative w-full max-w-md overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-danger-soft text-status-danger-text">
                    <ICONS.Trash2 className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 id="delete-workspace-title" className="text-sm font-extrabold tracking-tight text-ui-text">{t('app.deleteWorkspace')}</h3>
                    <p className="mt-0.5 text-[11px] font-semibold text-ui-text-muted">{t('app.deleteWorkspaceSubtitle')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseWorkspaceDelete}
                  disabled={isDeletingWorkspace}
                  className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t('app.closeDeleteWorkspaceDialog')}
                >
                  <ICONS.X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-sm font-medium leading-6 text-status-danger-text">
                  {t('app.deleteWorkspaceWarning', { name: deleteTargetWorkspace.name })}
                </div>
                <p className="text-xs leading-5 text-ui-text-muted">
                  {t('app.deleteWorkspaceCleanup')}
                </p>
                <div>
                  <label
                    htmlFor="delete-workspace-confirmation-input"
                    className="mb-1.5 block px-1 text-xs font-bold text-ui-text-muted"
                  >
                    <Trans
                      i18nKey="app.deleteWorkspaceConfirmationLabel"
                      values={{ name: deleteTargetWorkspace.name }}
                      components={{ name: <span className="font-extrabold text-status-danger-text" /> }}
                    />
                  </label>
                  <input
                    id="delete-workspace-confirmation-input"
                    value={workspaceDeleteConfirmation}
                    onChange={(event) => setWorkspaceDeleteConfirmation(event.target.value)}
                    disabled={isDeletingWorkspace}
                    autoComplete="off"
                    spellCheck={false}
                    className={workspaceDeleteInputClassName}
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCloseWorkspaceDelete}
                    disabled={isDeletingWorkspace}
                    className="rounded-lg border border-ui-border bg-ui-surface px-4 py-2 text-xs font-bold text-ui-text-muted transition-all hover:bg-ui-bg hover:text-ui-text disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('app.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      onSetDeletingWorkspace(true);
                      try {
                        await onConfirmDeleteWorkspace(deleteTargetWorkspace);
                        handleCloseWorkspaceDelete();
                      } catch (err) {
                        console.error('Failed deleting workspace', err);
                        showToast(t('app.failedDeleteWorkspace', { name: deleteTargetWorkspace.name }));
                      } finally {
                        onSetDeletingWorkspace(false);
                      }
                    }}
                    disabled={isDeletingWorkspace || workspaceDeleteConfirmation !== deleteTargetWorkspace.name}
                    className="rounded-lg bg-status-danger px-4 py-2 text-xs font-extrabold text-[oklch(0.99_0.004_86)] shadow-lg shadow-status-danger/20 transition-all hover:bg-status-danger-text disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeletingWorkspace ? t('app.deleting') : t('app.deleteWorkspace')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isCreatingWorkspace && (
          <motion.div
            {...modalOverlayMotion}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ui-text/45 dark:bg-ui-bg/75"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                onCloseWorkspaceCreate();
              }
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-workspace-title"
              {...modalPanelMotion}
              className="relative w-full max-w-lg overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-6 py-4">
                <h3 id="create-workspace-title" className="font-bold tracking-tight text-ui-text">{t('app.createWorkspace')}</h3>
                <button onClick={onCloseWorkspaceCreate} className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-accent-strong" aria-label={t('app.closeCreateWorkspaceDialog')}>
                  <ICONS.X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <label className="mb-1.5 block px-1 text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('app.workspaceName')}</label>
                  <input
                    value={newWorkspaceName}
                    onChange={(event) => onWorkspaceNameChange(event.target.value)}
                    className={workspaceNameInputClassName}
                    placeholder={t('app.workspaceNamePlaceholder')}
                  />
                </div>
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button onClick={onCloseWorkspaceCreate} variant="secondary" size="md">
                    {t('app.cancel')}
                  </Button>
                  <Button
                    disabled={!newWorkspaceName.trim()}
                    onClick={() => {
                      const name = newWorkspaceName.trim();
                      if (!name) return;
                      onCreateWorkspace({
                        name,
                        description: '',
                        members: [{ name: user.name, email: user.email, role: 'owner', source: 'Internal' }]
                      });
                      onWorkspaceNameChange('');
                      onCloseWorkspaceCreate();
                    }}
                    variant="accent"
                    size="md"
                  >
                    <ICONS.Plus className="h-4 w-4" />
                    {t('app.createWorkspaceAction')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        <AddClusterModal
          isOpen={isAddingCluster}
          clusterCreationStep={clusterCreationStep}
          newClusterName={newClusterName}
          includeNamespaces={includeNamespaces}
          excludeNamespaces={excludeNamespaces}
          clusterInstallCommand={clusterInstallCommand}
          clusterInstallWarnings={clusterInstallWarnings}
          isCreatingCluster={isCreatingCluster}
          onClose={onCloseAddCluster}
          onClusterNameChange={onClusterNameChange}
          onIncludeNamespacesChange={onIncludeNamespacesChange}
          onExcludeNamespacesChange={onExcludeNamespacesChange}
          onProceedToInstructions={onProceedToClusterInstructions}
          onConfirmInstalled={onConfirmClusterInstalled}
        />

        {installAgentCluster && installAgentWorkspace && (
          <ClusterAgentInstallModal
            cluster={installAgentCluster}
            workspaceName={installAgentWorkspace.name}
            onClose={onCloseInstallAgent}
          />
        )}
      </AnimatePresence>

      <ToastViewport
        toasts={toasts}
        isDark={isDark}
        onDismiss={onDismissToast}
      />
    </>
  );
};
