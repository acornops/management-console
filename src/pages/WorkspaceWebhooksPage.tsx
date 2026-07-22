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

  const loadWebhooks = React.useCallback(async (initial = false) => {
    if (initial) setIsInitialLoading(true);
    else setIsRefreshing(true);
    setLoadError(null);
    try {
      setWebhooks(await controlPlaneApi.listWebhooks(workspace.id));
    } catch (loadFailure) {
      setLoadError(formatControlPlaneError(loadFailure, t('workspaceWebhooks.loadFailed'), { area: 'webhooks' }));
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [t, workspace.id]);

  React.useEffect(() => {
    setDraft(emptyWebhookDraft());
    setEditingId(null);
    setCreatedSecret(null);
    setHistory([]);
    setHistoryWebhookId(null);
    setMutationError(null);
    setHistoryError(null);
    void loadWebhooks(true);
  }, [loadWebhooks]);

  const resetForm = () => {
    setDraft(emptyWebhookDraft());
    setEditingId(null);
  };

  const saveWebhook = async () => {
    if (!canManageWebhooks) return;
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
        await controlPlaneApi.updateWebhook(workspace.id, editingId, input);
        showToast(t('workspaceWebhooks.updated'));
      } else {
        const created = await controlPlaneApi.createWebhook(workspace.id, input);
        setCreatedSecret({ name: created.name, secret: created.secret });
        showToast(t('workspaceWebhooks.created'));
      }
      resetForm();
      await loadWebhooks();
    } catch (saveFailure) {
      setMutationError(formatControlPlaneError(saveFailure, t('workspaceWebhooks.saveFailed'), { area: 'webhooks' }));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWebhook = async (webhook: ControlPlaneWebhookSubscription) => {
    if (!canManageWebhooks) return;
    setDeletingId(webhook.id);
    setMutationError(null);
    setCreatedSecret(null);
    try {
      await controlPlaneApi.deleteWebhook(workspace.id, webhook.id);
      if (historyWebhookId === webhook.id) {
        setHistory([]);
        setHistoryWebhookId(null);
      }
      if (editingId === webhook.id) resetForm();
      showToast(t('workspaceWebhooks.deleted'));
      await loadWebhooks();
    } catch (deleteFailure) {
      setMutationError(formatControlPlaneError(deleteFailure, t('workspaceWebhooks.deleteFailed'), { area: 'webhooks' }));
    } finally {
      setDeletingId(null);
    }
  };

  const loadHistory = async (webhook: ControlPlaneWebhookSubscription) => {
    if (!canManageWebhooks) return;
    setHistoryWebhookId(webhook.id);
    setHistory([]);
    setHistoryError(null);
    setIsHistoryLoading(true);
    try {
      setHistory(await controlPlaneApi.listWebhookHistory(workspace.id, webhook.id, { limit: 25 }));
    } catch (historyFailure) {
      setHistoryError(formatControlPlaneError(historyFailure, t('workspaceWebhooks.historyFailed'), { area: 'webhooks' }));
    } finally {
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

  const editingWebhook = editingId ? webhooks.find((webhook) => webhook.id === editingId) : undefined;

  return (
    <div className="max-w-6xl space-y-6">
      {mutationError && (
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

      {canManageWebhooks && createdSecret && (
        <section className="rounded-lg border border-status-success/30 bg-status-success-soft p-4" aria-labelledby="webhook-secret-title">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 id="webhook-secret-title" className="text-sm font-bold text-status-success-text">
                {t('workspaceWebhooks.secretTitle', { name: createdSecret.name })}
              </h2>
              <p className="mt-1 type-caption text-status-success-text">{t('workspaceWebhooks.secretDescription')}</p>
              <code className="mt-2 block break-all rounded-md border border-status-success/25 bg-ui-bg px-3 py-2 text-xs font-semibold text-ui-text">
                {createdSecret.secret}
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
          draft={draft}
          editingName={editingWebhook?.name}
          isSaving={isSaving}
          onChange={setDraft}
          onCancel={resetForm}
          onSave={() => void saveWebhook()}
        />
      )}

      <WebhookList
        webhooks={webhooks}
        canManageWebhooks={canManageWebhooks}
        isLoading={isInitialLoading}
        isRefreshing={isRefreshing}
        loadError={loadError}
        deletingId={deletingId}
        historyWebhookId={historyWebhookId}
        history={history}
        isHistoryLoading={isHistoryLoading}
        historyError={historyError}
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
