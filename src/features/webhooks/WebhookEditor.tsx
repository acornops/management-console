import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { FieldLabel, HelpText } from '@/components/common/FormControls';
import { formInputClassName } from '@/components/common/formControlStyles';
import { ICONS } from '@/constants';
import {
  CONTROL_PLANE_WEBHOOK_EVENT_TYPES,
  type ControlPlaneWebhookEventType
} from '@/services/controlPlaneApi';
import {
  sortedWebhookEvents,
  webhookEventGroups,
  webhookEventLabel,
  type WebhookDraft
} from './webhookModel';

interface WebhookEditorProps {
  draft: WebhookDraft;
  editingName?: string;
  isSaving: boolean;
  onChange: (draft: WebhookDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const WebhookEditor: React.FC<WebhookEditorProps> = ({
  draft,
  editingName,
  isSaving,
  onCancel,
  onChange,
  onSave
}) => {
  const { t } = useTranslation();
  const idPrefix = React.useId();
  const selectedEvents = new Set(draft.eventTypes);

  const toggleEvent = (eventType: ControlPlaneWebhookEventType) => {
    const next = new Set(draft.eventTypes);
    if (next.has(eventType)) next.delete(eventType);
    else next.add(eventType);
    onChange({ ...draft, eventTypes: sortedWebhookEvents(Array.from(next)) });
  };

  const applyEventGroup = (eventTypes: ControlPlaneWebhookEventType[]) => {
    onChange({ ...draft, eventTypes: sortedWebhookEvents([...draft.eventTypes, ...eventTypes]) });
  };

  const canSave = draft.name.trim().length > 0 && draft.url.trim().length > 0 && draft.eventTypes.length > 0;

  return (
    <form
      className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave && !isSaving) onSave();
      }}
    >
      <div className="border-b border-ui-border px-[var(--surface-padding)] py-4">
        <h2 className="type-section-title text-ui-text">
          {editingName
            ? t('workspaceWebhooks.editTitle', { name: editingName })
            : t('workspaceWebhooks.createTitle')}
        </h2>
        <p className="type-caption mt-1 text-ui-text-muted">{t('workspaceWebhooks.workspaceWideScope')}</p>
      </div>
      <div className="grid gap-6 p-[var(--surface-padding)] lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="space-y-5">
          <div>
            <FieldLabel htmlFor={`${idPrefix}-name`}>{t('workspaceWebhooks.name')}</FieldLabel>
            <input
              id={`${idPrefix}-name`}
              value={draft.name}
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
              className={formInputClassName()}
              placeholder={t('workspaceWebhooks.namePlaceholder')}
              autoComplete="off"
              required
            />
          </div>
          <div>
            <FieldLabel htmlFor={`${idPrefix}-url`}>{t('workspaceWebhooks.deliveryUrl')}</FieldLabel>
            <input
              id={`${idPrefix}-url`}
              type="url"
              inputMode="url"
              value={draft.url}
              onChange={(event) => onChange({ ...draft, url: event.target.value })}
              className={formInputClassName()}
              placeholder="https://bot.example.com/acornops/webhook"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              required
            />
            <HelpText>{t('workspaceWebhooks.deliveryUrlHelp')}</HelpText>
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-md border border-ui-border bg-ui-bg px-3 py-2">
            <Checkbox
              checked={draft.enabled}
              onChange={(event) => onChange({ ...draft, enabled: event.target.checked })}
            />
            <span className="text-sm font-semibold text-ui-text">{t('workspaceWebhooks.enabled')}</span>
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <p className="type-label text-ui-text">{t('workspaceWebhooks.eventGroups')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {webhookEventGroups.map((group) => (
                <Button
                  key={group.id}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => applyEventGroup(group.eventTypes)}
                >
                  <ICONS.Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  {t(`workspaceWebhooks.groups.${group.id}`)}
                </Button>
              ))}
            </div>
          </div>
          <fieldset className="max-h-72 overflow-y-auto rounded-lg border border-ui-border bg-ui-bg p-3 custom-scrollbar">
            <legend className="px-1 type-label text-ui-text">{t('workspaceWebhooks.events')}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {CONTROL_PLANE_WEBHOOK_EVENT_TYPES.map((eventType) => (
                <label key={eventType} className="flex min-h-11 items-center gap-2 rounded-md border border-ui-border bg-ui-surface px-3 py-2">
                  <Checkbox checked={selectedEvents.has(eventType)} onChange={() => toggleEvent(eventType)} />
                  <span className="text-xs font-semibold capitalize text-ui-text">{webhookEventLabel(eventType)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {draft.eventTypes.length === 0 && (
            <p role="alert" className="type-caption text-status-danger-text">{t('workspaceWebhooks.selectEvent')}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-ui-border px-[var(--surface-padding)] py-4 sm:flex-row sm:justify-end">
        {editingName && (
          <Button type="button" variant="tertiary" onClick={onCancel} disabled={isSaving}>
            {t('common.cancel')}
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={isSaving || !canSave}>
          <ICONS.Send className="h-4 w-4" aria-hidden="true" />
          {isSaving
            ? t('common.saving')
            : editingName
              ? t('workspaceWebhooks.save')
              : t('workspaceWebhooks.create')}
        </Button>
      </div>
    </form>
  );
};
