import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/common/Button';
import { WebhookEditor } from '@/features/webhooks/WebhookEditor';
import { WebhookList } from '@/features/webhooks/WebhookList';
import {
  draftFromWebhook,
  emptyWebhookDraft,
  type WebhookDraft
} from '@/features/webhooks/webhookModel';
import { ICONS } from '@/constants';
import {
  controlPlaneApi,
  type ControlPlaneWebhookHistory,
  type ControlPlaneWebhookSubscription
} from '@/services/controlPlaneApi';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import type { Workspace } from '@/types';

interface WorkspaceWebhooksPageProps {
  workspace: Workspace;
  canManageWebhooks: boolean;
  showToast: (message: string) => void;
}

export const WorkspaceWebhooksPage: React.FC<WorkspaceWebhooksPageProps> = ({
  workspace,
  canManageWebhooks,
  showToast
}) => {
  const { t } = useTranslation();
  const [webhooks, setWebhooks] = React.useState<ControlPlaneWebhookSubscription[]>([]);
  const [draft, setDraft] = React.useState<WebhookDraft>(emptyWebhookDraft);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = React.useState<{ name: string; secret: string } | null>(null);
  const [historyWebhookId, setHistoryWebhookId] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<ControlPlaneWebhookHistory[]>([]);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [mutationError, setMutationError] = React.useState<string | null>(null);
  const [historyError, setHistoryError] = React.useState<string | null>(null);
  const [stateWorkspaceId, setStateWorkspaceId] = React.useState(workspace.id);
  const currentWorkspaceId = React.useRef(workspace.id);
  const webhookRequestSequence = React.useRef(0);
  const historyRequestSequence = React.useRef(0);
  const saveRequestSequence = React.useRef(0);
  const deleteRequestSequence = React.useRef(0);
  currentWorkspaceId.current = workspace.id;

  const loadWebhooks = React.useCallback(async (initial = false) => {
    const requestedWorkspaceId = workspace.id;
    const requestSequence = ++webhookRequestSequence.current;
    const isCurrentRequest = () => currentWorkspaceId.current === requestedWorkspaceId
      && webhookRequestSequence.current === requestSequence;
    if (initial) setIsInitialLoading(true);
    else setIsRefreshing(true);
    setLoadError(null);
    try {
      const items = await controlPlaneApi.listWebhooks(requestedWorkspaceId);
      if (!isCurrentRequest()) return;
      setWebhooks(items);
    } catch (loadFailure) {
      if (!isCurrentRequest()) return;
      setLoadError(formatControlPlaneError(loadFailure, t('workspaceWebhooks.loadFailed'), { area: 'webhooks' }));
    } finally {
      if (!isCurrentRequest()) return;
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [t, workspace.id]);

  React.useEffect(() => {
    webhookRequestSequence.current += 1;
    historyRequestSequence.current += 1;
    saveRequestSequence.current += 1;
    deleteRequestSequence.current += 1;
    setStateWorkspaceId(workspace.id);
    setWebhooks([]);
    setDraft(emptyWebhookDraft());
    setEditingId(null);
    setCreatedSecret(null);
    setHistory([]);
    setHistoryWebhookId(null);
    setMutationError(null);
    setHistoryError(null);
    setLoadError(null);
    setIsInitialLoading(true);
    setIsRefreshing(false);
    setIsSaving(false);
    setDeletingId(null);
    setIsHistoryLoading(false);
    void loadWebhooks(true);
  }, [loadWebhooks]);

  const resetForm = () => {
    setDraft(emptyWebhookDraft());
    setEditingId(null);
  };

  const saveWebhook = async () => {
    if (!canManageWebhooks) return;
    const requestedWorkspaceId = workspace.id;
    const requestSequence = ++saveRequestSequence.current;
    const isCurrentRequest = () => currentWorkspaceId.current === requestedWorkspaceId
      && saveRequestSequence.current === requestSequence;
    setIsSaving(true);
    setMutationError(null);
    setCreatedSecret(null);
    try {
      const input = {
        name: draft.name.trim(),
        url: draft.url.trim(),
        eventTypes: draft.eventTypes,
        targetId: null,
        enabled: draft.enabled
      };
      if (editingId) {
        await controlPlaneApi.updateWebhook(requestedWorkspaceId, editingId, input);
        if (!isCurrentRequest()) return;
        showToast(t('workspaceWebhooks.updated'));
      } else {
        const created = await controlPlaneApi.createWebhook(requestedWorkspaceId, input);
        if (!isCurrentRequest()) return;
        setCreatedSecret({ name: created.name, secret: created.secret });
        showToast(t('workspaceWebhooks.created'));
      }
      resetForm();
      await loadWebhooks();
    } catch (saveFailure) {
      if (!isCurrentRequest()) return;
      setMutationError(formatControlPlaneError(saveFailure, t('workspaceWebhooks.saveFailed'), { area: 'webhooks' }));
    } finally {
      if (!isCurrentRequest()) return;
      setIsSaving(false);
    }
  };

  const deleteWebhook = async (webhook: ControlPlaneWebhookSubscription) => {
    if (!canManageWebhooks) return;
    const requestedWorkspaceId = workspace.id;
    const requestSequence = ++deleteRequestSequence.current;
    const isCurrentRequest = () => currentWorkspaceId.current === requestedWorkspaceId
      && deleteRequestSequence.current === requestSequence;
    setDeletingId(webhook.id);
    setMutationError(null);
    setCreatedSecret(null);
    try {
      await controlPlaneApi.deleteWebhook(requestedWorkspaceId, webhook.id);
      if (!isCurrentRequest()) return;
      if (historyWebhookId === webhook.id) {
        setHistory([]);
        setHistoryWebhookId(null);
      }
      if (editingId === webhook.id) resetForm();
      showToast(t('workspaceWebhooks.deleted'));
      await loadWebhooks();
    } catch (deleteFailure) {
      if (!isCurrentRequest()) return;
      setMutationError(formatControlPlaneError(deleteFailure, t('workspaceWebhooks.deleteFailed'), { area: 'webhooks' }));
    } finally {
      if (!isCurrentRequest()) return;
      setDeletingId(null);
    }
  };

  const loadHistory = async (webhook: ControlPlaneWebhookSubscription) => {
    if (!canManageWebhooks) return;
    const requestedWorkspaceId = workspace.id;
    const requestSequence = ++historyRequestSequence.current;
    const isCurrentRequest = () => currentWorkspaceId.current === requestedWorkspaceId
      && historyRequestSequence.current === requestSequence;
    setHistoryWebhookId(webhook.id);
    setHistory([]);
    setHistoryError(null);
    setIsHistoryLoading(true);
    try {
      const items = await controlPlaneApi.listWebhookHistory(requestedWorkspaceId, webhook.id, { limit: 25 });
      if (!isCurrentRequest()) return;
      setHistory(items);
    } catch (historyFailure) {
      if (!isCurrentRequest()) return;
      setHistoryError(formatControlPlaneError(historyFailure, t('workspaceWebhooks.historyFailed'), { area: 'webhooks' }));
    } finally {
      if (!isCurrentRequest()) return;
      setIsHistoryLoading(false);
    }
  };

  const copySecret = async () => {
    if (!createdSecret) return;
    try {
      await navigator.clipboard.writeText(createdSecret.secret);
      showToast(t('workspaceWebhooks.secretCopied'));
    } catch {
      setMutationError(t('workspaceWebhooks.copyFailed'));
    }
  };

  const workspaceStateCurrent = stateWorkspaceId === workspace.id;
  const visibleWebhooks = workspaceStateCurrent ? webhooks : [];
  const visibleDraft = workspaceStateCurrent ? draft : emptyWebhookDraft();
  const visibleCreatedSecret = workspaceStateCurrent ? createdSecret : null;
  const editingWebhook = workspaceStateCurrent && editingId
    ? visibleWebhooks.find((webhook) => webhook.id === editingId)
    : undefined;

  return (
    <div className="max-w-6xl space-y-6">
      {workspaceStateCurrent && mutationError && (
        <div role="alert" className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-sm font-semibold text-status-danger-text">
          {mutationError}
        </div>
      )}

      {!canManageWebhooks && (
        <section className="rounded-lg border border-ui-border bg-ui-surface p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-ui-text-muted">
              <ICONS.Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ui-text">{t('workspaceWebhooks.readOnlyTitle')}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-ui-text-muted">{t('workspaceWebhooks.readOnlyDescription')}</p>
            </div>
          </div>
        </section>
      )}

      {canManageWebhooks && visibleCreatedSecret && (
        <section className="rounded-lg border border-status-success/30 bg-status-success-soft p-4" aria-labelledby="webhook-secret-title">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 id="webhook-secret-title" className="text-sm font-bold text-status-success-text">
                {t('workspaceWebhooks.secretTitle', { name: visibleCreatedSecret.name })}
              </h2>
              <p className="mt-1 type-caption text-status-success-text">{t('workspaceWebhooks.secretDescription')}</p>
              <code className="mt-2 block break-all rounded-md border border-status-success/25 bg-ui-bg px-3 py-2 text-xs font-semibold text-ui-text">
                {visibleCreatedSecret.secret}
              </code>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button size="sm" onClick={() => void copySecret()}>
                <ICONS.Braces className="h-4 w-4" aria-hidden="true" />
                {t('workspaceWebhooks.copy')}
              </Button>
              <Button size="sm" variant="tertiary" onClick={() => setCreatedSecret(null)}>
                {t('common.dismissNotification')}
              </Button>
            </div>
          </div>
        </section>
      )}

      {canManageWebhooks && (
        <WebhookEditor
          draft={visibleDraft}
          editingName={editingWebhook?.name}
          isSaving={workspaceStateCurrent && isSaving}
          onChange={setDraft}
          onCancel={resetForm}
          onSave={() => void saveWebhook()}
        />
      )}

      <WebhookList
        webhooks={visibleWebhooks}
        canManageWebhooks={canManageWebhooks}
        isLoading={!workspaceStateCurrent || isInitialLoading}
        isRefreshing={workspaceStateCurrent && isRefreshing}
        loadError={workspaceStateCurrent ? loadError : null}
        deletingId={workspaceStateCurrent ? deletingId : null}
        historyWebhookId={workspaceStateCurrent ? historyWebhookId : null}
        history={workspaceStateCurrent ? history : []}
        isHistoryLoading={workspaceStateCurrent && isHistoryLoading}
        historyError={workspaceStateCurrent ? historyError : null}
        onRefresh={() => void loadWebhooks()}
        onEdit={(webhook) => {
          setEditingId(webhook.id);
          setDraft(draftFromWebhook(webhook));
          setCreatedSecret(null);
          setMutationError(null);
        }}
        onDelete={(webhook) => void deleteWebhook(webhook)}
        onLoadHistory={(webhook) => void loadHistory(webhook)}
      />
    </div>
  );
};
