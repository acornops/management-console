import { useCallback, useState, type SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import type { TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';
import {
  DEFAULT_SERVER_FORM,
  mcpServerFormSubmission,
  publicHeaderRowsFromRecord,
  type ServerFormState,
} from '@/features/targets/admin/mcpServersCatalog';

type UseMcpServerFormStateOptions = {
  canEditServers: boolean;
  clearCredentialModeImpact: () => void;
  clearNotice: () => void;
  t: TFunction;
};

export function useMcpServerFormState({
  canEditServers,
  clearCredentialModeImpact,
  clearNotice,
  t,
}: UseMcpServerFormStateOptions) {
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [serverForm, setServerForm] = useState<ServerFormState>(DEFAULT_SERVER_FORM);
  const [editingServer, setEditingServer] = useState<TargetToolCatalogServer | null>(null);
  const [createReviewServerId, setCreateReviewServerId] = useState<string | null>(null);
  const [serverMutationError, setServerMutationError] = useState<string | null>(null);
  const [connectionSettingsConfirmation, setConnectionSettingsConfirmation] = useState(false);

  const resetTransientState = useCallback(() => {
    setServerMutationError(null);
    setConnectionSettingsConfirmation(false);
    clearCredentialModeImpact();
  }, [clearCredentialModeImpact]);

  const openCreateServerModal = useCallback(() => {
    if (!canEditServers) return;
    setEditingServer(null);
    setCreateReviewServerId(null);
    setServerForm({ ...DEFAULT_SERVER_FORM, publicHeaders: [] });
    resetTransientState();
    clearNotice();
    setServerModalOpen(true);
  }, [canEditServers, clearNotice, resetTransientState]);

  const openEditServerModal = useCallback((server: TargetToolCatalogServer) => {
    if (!canEditServers || !server.canEditConnection || server.isSystem) return;
    setEditingServer(server);
    setCreateReviewServerId(null);
    setServerForm({
      name: server.name,
      url: server.url,
      enabled: server.enabled,
      authType: server.authType,
      credentialMode: server.credentialMode,
      headerName: server.authHeaderName || '',
      publicHeaders: publicHeaderRowsFromRecord(server.publicHeaders),
    });
    resetTransientState();
    setServerModalOpen(true);
  }, [canEditServers, resetTransientState]);

  const closeServerModal = useCallback(() => {
    setServerModalOpen(false);
    setEditingServer(null);
    setCreateReviewServerId(null);
    resetTransientState();
    setServerForm({ ...DEFAULT_SERVER_FORM, publicHeaders: [] });
  }, [resetTransientState]);

  const changeServerForm = useCallback((action: SetStateAction<ServerFormState>) => {
    clearCredentialModeImpact();
    setConnectionSettingsConfirmation(false);
    setServerForm(action);
  }, [clearCredentialModeImpact]);

  const refreshEditingServer = useCallback((server: TargetToolCatalogServer) => {
    setEditingServer(server);
  }, []);

  return {
    ...mcpServerFormSubmission(serverForm, editingServer, t),
    changeServerForm,
    closeServerModal,
    connectionSettingsConfirmation,
    createReviewServerId,
    editingServer,
    openCreateServerModal,
    openEditServerModal,
    refreshEditingServer,
    serverForm,
    serverModalOpen,
    serverMutationError,
    setConnectionSettingsConfirmation,
    setCreateReviewServerId,
    setServerModalOpen,
    setServerMutationError,
  };
}
