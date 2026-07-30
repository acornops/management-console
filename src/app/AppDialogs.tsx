import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Trans, useTranslation } from 'react-i18next';
import { AddClusterModal } from '@/components/kubernetes-clusters/AddClusterModal';
import { ClusterAgentInstallModal } from '@/components/kubernetes-clusters/ClusterAgentInstallModal';
import { CreateWorkspaceModal } from '@/components/workspaces/CreateWorkspaceModal';
import { Button, CloseButton, DialogFrame, formInputClassName, TextInput } from '@acornops/ui';
import { ICONS } from '@/constants';
import type { AgentAccessMode } from '@/services/control-plane/types';
import {
  KubernetesCluster,
  ProjectMember,
  Workspace,
  WorkspaceAiSettings,
  WorkspaceMemberAccessResult,
  WorkspaceRoleTemplate
} from '@/types';

interface AppDialogsProps {
  clusterCreationStep: 'details' | 'instructions';
  clusterInstallCommand: string;
  clusterInstallWarnings: string[];
  deleteTargetWorkspace: Workspace | undefined;
  excludeNamespaces: string;
  includeNamespaces: string;
  installAgentCluster: KubernetesCluster | null;
  installAgentWorkspace: Workspace | undefined;
  currentUserEmail: string;
  isAddingCluster: boolean;
  isCreatingCluster: boolean;
  isCreatingWorkspace: boolean;
  isRegisteredClusterAgentConnected: boolean;
  isDeletingWorkspace: boolean;
  newClusterName: string;
  onClusterNameChange: (value: string) => void;
  onCloseAddCluster: () => void;
  onCloseInstallAgent: () => void;
  onCloseWorkspaceCreate: () => void;
  onCloseWorkspaceDelete: () => void;
  onConfirmClusterInstalled: () => void;
  onConfirmDeleteWorkspace: (workspace: Workspace) => Promise<void>;
  onCreateWorkspace: (name: string) => Promise<Workspace>;
  onLoadWorkspaceAiSettings: (workspaceId: string) => Promise<WorkspaceAiSettings>;
  onOpenWorkspaceAiSettings: (workspaceId: string) => void;
  onAddOrInviteWorkspaceMember: (
    workspaceId: string,
    input: { email: string; role: ProjectMember['role'] }
  ) => Promise<WorkspaceMemberAccessResult>;
  onExcludeNamespacesChange: (value: string) => void;
  onIncludeNamespacesChange: (value: string) => void;
  onLoadWorkspaceRoles: (workspaceId: string) => Promise<WorkspaceRoleTemplate[]>;
  onProceedToClusterInstructions: (agentAccessMode: AgentAccessMode) => void;
  onSetDeletingWorkspace: (value: boolean) => void;
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
  currentUserEmail,
  isAddingCluster,
  isCreatingCluster,
  isCreatingWorkspace,
  isRegisteredClusterAgentConnected,
  isDeletingWorkspace,
  newClusterName,
  onClusterNameChange,
  onCloseAddCluster,
  onCloseInstallAgent,
  onCloseWorkspaceCreate,
  onCloseWorkspaceDelete,
  onConfirmClusterInstalled,
  onConfirmDeleteWorkspace,
  onCreateWorkspace,
  onLoadWorkspaceAiSettings,
  onOpenWorkspaceAiSettings,
  onAddOrInviteWorkspaceMember,
  onExcludeNamespacesChange,
  onIncludeNamespacesChange,
  onLoadWorkspaceRoles,
  onProceedToClusterInstructions,
  onSetDeletingWorkspace,
  showToast
}) => {
  const { t } = useTranslation();
  const [workspaceDeleteConfirmation, setWorkspaceDeleteConfirmation] = React.useState('');
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
          <DialogFrame
            unframed
            titleId="delete-workspace-title"
            closeDisabled={isDeletingWorkspace}
            onClose={handleCloseWorkspaceDelete}
            overlayClassName="bg-ui-text/45 dark:bg-ui-bg/75"
            className="relative w-full max-w-md overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
          >
              <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-danger-soft text-status-danger-text">
                    <ICONS.Trash2 className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 id="delete-workspace-title" className="type-panel-title">
                      {t('app.deleteWorkspace')}
                    </h3>
                    <p className="mt-0.5 type-caption">{t('app.deleteWorkspaceSubtitle')}</p>
                  </div>
                </div>
                <CloseButton onClick={handleCloseWorkspaceDelete} disabled={isDeletingWorkspace} aria-label={t('app.closeDeleteWorkspaceDialog')} />
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 type-ui leading-6 text-status-danger-text">
                  {t('app.deleteWorkspaceWarning', {
                    name: deleteTargetWorkspace.name
                  })}
                </div>
                <p className="type-caption leading-5 text-ui-text-muted">{t('app.deleteWorkspaceCleanup')}</p>
                <div>
                  <label htmlFor="delete-workspace-confirmation-input" className="type-label mb-1.5 block px-1">
                    <Trans
                      i18nKey="app.deleteWorkspaceConfirmationLabel"
                      values={{ name: deleteTargetWorkspace.name }}
                      components={{
                        name: <span className="type-emphasis text-status-danger-text" />
                      }}
                    />
                  </label>
                  <TextInput
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
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCloseWorkspaceDelete}
                    disabled={isDeletingWorkspace}
                    className="control-target rounded-lg"
                  >
                    {t('app.cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      onSetDeletingWorkspace(true);
                      try {
                        await onConfirmDeleteWorkspace(deleteTargetWorkspace);
                        handleCloseWorkspaceDelete();
                      } catch (err) {
                        console.error('Failed deleting workspace', err);
                        showToast(
                          t('app.failedDeleteWorkspace', {
                            name: deleteTargetWorkspace.name
                          })
                        );
                      } finally {
                        onSetDeletingWorkspace(false);
                      }
                    }}
                    disabled={isDeletingWorkspace || workspaceDeleteConfirmation !== deleteTargetWorkspace.name}
                    className="control-target rounded-lg"
                  >
                    {isDeletingWorkspace ? t('app.deleting') : t('app.deleteWorkspace')}
                  </Button>
                </div>
              </div>
          </DialogFrame>
        )}

        <CreateWorkspaceModal
          isOpen={isCreatingWorkspace}
          currentUserEmail={currentUserEmail}
          onClose={onCloseWorkspaceCreate}
          onCreateWorkspace={onCreateWorkspace}
          onLoadWorkspaceAiSettings={onLoadWorkspaceAiSettings}
          onOpenAiSettings={onOpenWorkspaceAiSettings}
          onLoadWorkspaceRoles={onLoadWorkspaceRoles}
          onAddOrInviteWorkspaceMember={onAddOrInviteWorkspaceMember}
        />
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
          isAgentConnected={isRegisteredClusterAgentConnected}
          isCreatingCluster={isCreatingCluster}
          onClose={onCloseAddCluster}
          onClusterNameChange={onClusterNameChange}
          onIncludeNamespacesChange={onIncludeNamespacesChange}
          onExcludeNamespacesChange={onExcludeNamespacesChange}
          onProceedToInstructions={onProceedToClusterInstructions}
          onConfirmInstalled={onConfirmClusterInstalled}
        />

        {installAgentCluster && installAgentWorkspace && (
          <ClusterAgentInstallModal cluster={installAgentCluster} workspaceName={installAgentWorkspace.name} onClose={onCloseInstallAgent} />
        )}
      </AnimatePresence>
    </>
  );
};
