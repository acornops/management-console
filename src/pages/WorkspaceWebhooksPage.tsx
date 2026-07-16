import React from 'react';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { formInputClassName } from '@/components/common/formControlStyles';
import { ICONS } from '@/constants';
import {
  CONTROL_PLANE_WEBHOOK_EVENT_TYPES,
  controlPlaneApi,
  type ControlPlaneWebhookEventType,
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

interface Draft {
  name: string;
  url: string;
  eventTypes: ControlPlaneWebhookEventType[];
  enabled: boolean;
}

const emptyDraft: Draft = {
  name: '',
  url: '',
  eventTypes: ['issue.created.v1', 'issue.reopened.v1', 'issue.resolved.v1'],
  enabled: true
};

const eventGroups: Array<{ id: string; label: string; eventTypes: ControlPlaneWebhookEventType[] }> = [
  {
    id: 'issue-alerts',
    label: 'Issue alerts',
    eventTypes: ['issue.created.v1', 'issue.reopened.v1', 'issue.resolved.v1']
  },
  {
    id: 'run-alerts',
    label: 'Run alerts',
    eventTypes: ['run.failed.v1', 'run.cancelled.v1', 'run.tool_approval_requested.v1']
  },
  {
    id: 'target-health',
    label: 'Target health',
    eventTypes: ['target.status_changed.v1', 'agent.connected.v1', 'agent.disconnected.v1']
  },
  {
    id: 'workspace-changes',
    label: 'Workspace changes',
    eventTypes: ['workspace.created.v1', 'workspace.deleted.v1', 'target.registered.v1', 'target.updated.v1', 'target.deleted.v1']
  }
];

function draftFromWebhook(webhook: ControlPlaneWebhookSubscription): Draft {
  return {
    name: webhook.name,
    url: webhook.url,
    eventTypes: webhook.eventTypes,
    enabled: webhook.enabled
  };
}

function sortedEvents(events: ControlPlaneWebhookEventType[]): ControlPlaneWebhookEventType[] {
  const order = new Map(CONTROL_PLANE_WEBHOOK_EVENT_TYPES.map((eventType, index) => [eventType, index]));
  return [...new Set(events)].sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
}

function eventLabel(eventType: string): string {
  return eventType.replace(/\.v1$/, '').replaceAll('.', ' / ').replaceAll('_', ' ');
}

export const WorkspaceWebhooksPage: React.FC<WorkspaceWebhooksPageProps> = ({
  workspace,
  canManageWebhooks,
  showToast
}) => {
  const [webhooks, setWebhooks] = React.useState<ControlPlaneWebhookSubscription[]>([]);
  const [draft, setDraft] = React.useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = React.useState<{ name: string; secret: string } | null>(null);
  const [historyWebhookId, setHistoryWebhookId] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<ControlPlaneWebhookHistory[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadWebhooks = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setWebhooks(await controlPlaneApi.listWebhooks(workspace.id));
    } catch (loadError) {
      setError(formatControlPlaneError(loadError, 'Unable to load webhooks.', { area: 'webhooks' }));
    } finally {
      setIsLoading(false);
    }
  }, [canManageWebhooks, workspace.id]);

  React.useEffect(() => {
    setDraft(emptyDraft);
    setEditingId(null);
    setCreatedSecret(null);
    setHistory([]);
    setHistoryWebhookId(null);
    void loadWebhooks();
  }, [loadWebhooks]);

  const selectedEvents = new Set(draft.eventTypes);
  const editingWebhook = editingId ? webhooks.find((webhook) => webhook.id === editingId) || null : null;

  const toggleEvent = (eventType: ControlPlaneWebhookEventType) => {
    setDraft((current) => {
      const next = new Set(current.eventTypes);
      if (next.has(eventType)) {
        next.delete(eventType);
      } else {
        next.add(eventType);
      }
      return {
        ...current,
        eventTypes: sortedEvents(Array.from(next))
      };
    });
  };

  const applyEventGroup = (eventTypes: ControlPlaneWebhookEventType[]) => {
    setDraft((current) => ({
      ...current,
      eventTypes: sortedEvents([...current.eventTypes, ...eventTypes])
    }));
  };

  const resetForm = () => {
    setDraft(emptyDraft);
    setEditingId(null);
  };

  const saveWebhook = async () => {
    if (!canManageWebhooks) return;
    setIsSaving(true);
    setError(null);
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
        showToast('Webhook updated.');
      } else {
        const created = await controlPlaneApi.createWebhook(workspace.id, input);
        setCreatedSecret({ name: created.name, secret: created.secret });
        showToast('Webhook created.');
      }
      resetForm();
      await loadWebhooks();
    } catch (saveError) {
      setError(formatControlPlaneError(saveError, 'Unable to save webhook.', { area: 'webhooks' }));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWebhook = async (webhook: ControlPlaneWebhookSubscription) => {
    if (!canManageWebhooks) return;
    setError(null);
    setCreatedSecret(null);
    try {
      await controlPlaneApi.deleteWebhook(workspace.id, webhook.id);
      if (historyWebhookId === webhook.id) {
        setHistory([]);
        setHistoryWebhookId(null);
      }
      showToast('Webhook deleted.');
      await loadWebhooks();
    } catch (deleteError) {
      setError(formatControlPlaneError(deleteError, 'Unable to delete webhook.', { area: 'webhooks' }));
    }
  };

  const loadHistory = async (webhook: ControlPlaneWebhookSubscription) => {
    if (!canManageWebhooks) return;
    setError(null);
    setHistoryWebhookId(webhook.id);
    try {
      setHistory(await controlPlaneApi.listWebhookHistory(workspace.id, webhook.id, { limit: 25 }));
    } catch (historyError) {
      setError(formatControlPlaneError(historyError, 'Unable to load webhook history.', { area: 'webhooks' }));
      setHistory([]);
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      {error && (
        <div role="alert" className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-sm font-semibold text-status-danger-text">
          {error}
        </div>
      )}

      {!canManageWebhooks && (
        <section className="rounded-lg border border-ui-border bg-ui-surface p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong">
              <ICONS.Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ui-text">Webhook management required</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-ui-text-muted">
                Your workspace role can view webhook configuration, but must include manage_webhooks to create, edit, delete, or inspect delivery history.
              </p>
            </div>
          </div>
        </section>
      )}

      {canManageWebhooks && createdSecret && (
        <section className="rounded-lg border border-status-success/30 bg-status-success-soft p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-bold text-status-success-text">One-time signing secret for {createdSecret.name}</h2>
              <code className="mt-2 block break-all rounded-md border border-status-success/25 bg-ui-bg px-3 py-2 text-xs font-semibold text-ui-text">
                {createdSecret.secret}
              </code>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                onClick={() => void navigator.clipboard?.writeText(createdSecret.secret)}
              >
                <ICONS.Braces className="h-4 w-4" aria-hidden="true" />
                Copy
              </Button>
              <Button size="sm" variant="tertiary" onClick={() => setCreatedSecret(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        </section>
      )}

      {canManageWebhooks && (
        <section className="overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">
          <div className="border-b border-ui-border px-5 py-4">
            <h2 className="text-sm font-bold text-ui-text">{editingWebhook ? `Edit ${editingWebhook.name}` : 'Create webhook'}</h2>
          </div>
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-ui-text-muted">Name</span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  className={formInputClassName()}
                  placeholder="Ops notifications"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-ui-text-muted">Delivery URL</span>
                <input
                  value={draft.url}
                  onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
                  className={formInputClassName()}
                  placeholder="https://example.com/acornops/webhook"
                />
              </label>
              <label className="flex items-center gap-3 rounded-md border border-ui-border bg-ui-bg px-3 py-2">
                <Checkbox
                  checked={draft.enabled}
                  onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
                />
                <span className="text-sm font-semibold text-ui-text">Enabled</span>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ui-text-muted">Event groups</p>
                <div className="flex flex-wrap gap-2">
                  {eventGroups.map((group) => (
                    <Button key={group.id} size="sm" variant="secondary" onClick={() => applyEventGroup(group.eventTypes)}>
                      <ICONS.Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {group.label}
                    </Button>
                  ))}
                </div>
              </div>
              <fieldset className="max-h-72 overflow-y-auto rounded-lg border border-ui-border bg-ui-bg p-3 custom-scrollbar">
                <legend className="px-1 text-xs font-bold uppercase tracking-widest text-ui-text-muted">Events</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CONTROL_PLANE_WEBHOOK_EVENT_TYPES.map((eventType) => (
                    <label key={eventType} className="flex min-h-10 items-center gap-2 rounded-md border border-ui-border bg-ui-surface px-3 py-2">
                      <Checkbox
                        checked={selectedEvents.has(eventType)}
                        onChange={() => toggleEvent(eventType)}
                      />
                      <span className="text-xs font-semibold capitalize text-ui-text">{eventLabel(eventType)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-ui-border px-5 py-4 sm:flex-row sm:justify-end">
            {editingId && (
              <Button variant="tertiary" onClick={resetForm} disabled={isSaving}>
                Cancel
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => void saveWebhook()}
              disabled={isSaving || draft.name.trim().length === 0 || draft.url.trim().length === 0 || draft.eventTypes.length === 0}
            >
              <ICONS.Send className="h-4 w-4" aria-hidden="true" />
              {isSaving ? 'Saving...' : editingId ? 'Save webhook' : 'Create webhook'}
            </Button>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-ui-border px-5 py-4">
          <h2 className="text-sm font-bold text-ui-text">Webhooks</h2>
          <Button size="sm" variant="secondary" onClick={() => void loadWebhooks()} disabled={isLoading}>
            <ICONS.RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
        <div className="divide-y divide-ui-border">
          {isLoading && <p className="p-5 text-sm font-semibold text-ui-text-muted">Loading webhooks...</p>}
          {!isLoading && webhooks.length === 0 && (
            <p className="p-5 text-sm font-semibold text-ui-text-muted">No webhooks are configured for this workspace.</p>
          )}
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-ui-text">{webhook.name}</h3>
                    <span className={`rounded-md border px-2 py-1 text-[11px] font-bold uppercase tracking-widest ${
                      webhook.enabled
                        ? 'border-status-success/30 bg-status-success-soft text-status-success-text'
                        : 'border-ui-border bg-ui-bg text-ui-text-muted'
                    }`}>
                      {webhook.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="mt-2 break-all text-xs font-semibold text-ui-text-muted">{webhook.url}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {webhook.eventTypes.map((eventType) => (
                      <span key={eventType} className="rounded-md border border-ui-border bg-ui-bg px-2 py-1 text-[11px] font-semibold text-ui-text-muted">
                        {eventType}
                      </span>
                    ))}
                  </div>
                </div>
                {canManageWebhooks && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => {
                      setEditingId(webhook.id);
                      setDraft(draftFromWebhook(webhook));
                      setCreatedSecret(null);
                    }}>
                      <ICONS.Pencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </Button>
                    <Button size="sm" onClick={() => void loadHistory(webhook)}>
                      <ICONS.Activity className="h-4 w-4" aria-hidden="true" />
                      History
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => void deleteWebhook(webhook)}>
                      <ICONS.Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
              {canManageWebhooks && historyWebhookId === webhook.id && (
                <div className="mt-4 rounded-lg border border-ui-border bg-ui-bg">
                  {history.length === 0 ? (
                    <p className="p-4 text-xs font-semibold text-ui-text-muted">No delivery attempts recorded.</p>
                  ) : (
                    <div className="divide-y divide-ui-border">
                      {history.map((entry) => (
                        <div key={entry.id} className="grid gap-2 p-4 text-xs font-semibold text-ui-text-muted md:grid-cols-[minmax(0,1fr)_140px_180px]">
                          <div className="min-w-0">
                            <span className="block truncate text-ui-text">{entry.eventType}</span>
                            <span className="mt-1 block">
                              {entry.status === 'paused' ? 'Paused before next attempt' : `Attempt ${entry.attemptNumber}`}
                              {entry.willRetry && entry.nextAttemptAt
                                ? ` · next retry ${new Date(entry.nextAttemptAt).toLocaleString()}`
                                : ''}
                            </span>
                            {entry.status === 'superseded' && (
                              <span className="mt-1 block text-ui-text">
                                Deliberately not sent because the issue state advanced.
                              </span>
                            )}
                            {entry.terminalReason && entry.status !== 'superseded' && (
                              <span className="mt-1 block">{entry.terminalReason.replaceAll('_', ' ')}</span>
                            )}
                          </div>
                          <span className="capitalize">
                            {entry.status}{entry.responseStatus ? ` (${entry.responseStatus})` : ''}
                            {entry.willRetry ? ' · retrying' : ''}
                          </span>
                          <span>{new Date(entry.sentAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
