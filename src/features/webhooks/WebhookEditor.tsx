import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@acornops/ui';
import { Checkbox } from '@acornops/ui';
import { FieldLabel, HelpText } from '@acornops/ui';
import { formInputClassName } from '@acornops/ui';
import { ICONS } from '@/constants';
import { CONTROL_PLANE_WEBHOOK_EVENT_TYPES, type ControlPlaneWebhookEventType } from '@/services/controlPlaneApi';
import { isWebhookEventGroupSelected, sortedWebhookEvents, toggleWebhookEventGroup, webhookEventGroups, webhookEventLabel, type WebhookDraft } from './webhookModel';
import { TextInput } from '@acornops/ui';

interface WebhookEditorProps {
  draft: WebhookDraft;
  formId: string;
  isSaving: boolean;
  onChange: (draft: WebhookDraft) => void;
  onSave: () => void;
}

export const WebhookEditor: React.FC<WebhookEditorProps> = ({ draft, formId, isSaving, onChange, onSave }) => {
  const { t } = useTranslation();
  const idPrefix = React.useId();
  const eventListRef = React.useRef<HTMLDivElement>(null);
  const eventRefs = React.useRef(new Map<ControlPlaneWebhookEventType, HTMLLabelElement>());
  const [eventScrollIndicator, setEventScrollIndicator] = React.useState({
    top: 0,
    height: 40
  });
  const selectedEvents = new Set(draft.eventTypes);

  const updateEventScrollIndicator = React.useCallback(() => {
    const eventList = eventListRef.current;
    if (!eventList) return;
    const { clientHeight, scrollHeight, scrollTop } = eventList;
    const height = Math.max(40, clientHeight * (clientHeight / scrollHeight));
    const availableTrack = clientHeight - height;
    const availableScroll = scrollHeight - clientHeight;
    setEventScrollIndicator({
      height,
      top: availableScroll > 0 ? (scrollTop / availableScroll) * availableTrack : 0
    });
  }, []);

  React.useLayoutEffect(() => {
    updateEventScrollIndicator();
    window.addEventListener('resize', updateEventScrollIndicator);
    return () => window.removeEventListener('resize', updateEventScrollIndicator);
  }, [updateEventScrollIndicator]);

  const toggleEvent = (eventType: ControlPlaneWebhookEventType) => {
    const next = new Set(draft.eventTypes);
    if (next.has(eventType)) next.delete(eventType);
    else next.add(eventType);
    onChange({ ...draft, eventTypes: sortedWebhookEvents(Array.from(next)) });
  };

  const toggleEventGroup = (eventTypes: ControlPlaneWebhookEventType[]) => {
    const groupSelected = isWebhookEventGroupSelected(draft.eventTypes, eventTypes);
    onChange({
      ...draft,
      eventTypes: toggleWebhookEventGroup(draft.eventTypes, eventTypes)
    });
    if (groupSelected) return;

    window.requestAnimationFrame(() => {
      const eventList = eventListRef.current;
      const firstGroupEvent = eventRefs.current.get(eventTypes[0]);
      if (!eventList || !firstGroupEvent) return;
      const top = eventList.scrollTop + firstGroupEvent.getBoundingClientRect().top - eventList.getBoundingClientRect().top - 12;
      eventList.scrollTo({
        top: Math.max(0, top),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    });
  };

  const canSave = draft.name.trim().length > 0 && draft.url.trim().length > 0 && draft.eventTypes.length > 0;

  return (
    <form
      id={formId}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave && !isSaving) onSave();
      }}
    >
      <div className="space-y-5">
        <div>
          <FieldLabel htmlFor={`${idPrefix}-name`}>{t('workspaceWebhooks.name')}</FieldLabel>
          <TextInput
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
          <TextInput
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
          <Checkbox checked={draft.enabled} onChange={(event) => onChange({ ...draft, enabled: event.target.checked })} />
          <span className="type-body type-emphasis text-ui-text">{t('workspaceWebhooks.enabled')}</span>
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <p className="type-label text-ui-text">{t('workspaceWebhooks.eventGroups')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {webhookEventGroups.map((group) => {
              const groupSelected = isWebhookEventGroupSelected(draft.eventTypes, group.eventTypes);
              return (
                <Button
                  key={group.id}
                  type="button"
                  size="sm"
                  variant="secondary"
                  aria-pressed={groupSelected}
                  className={groupSelected ? 'border-accent/50 bg-accent-soft text-accent-strong shadow-none hover:bg-accent-soft' : undefined}
                  onClick={() => toggleEventGroup(group.eventTypes)}
                >
                  {groupSelected ? <ICONS.CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <ICONS.Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                  {t(`workspaceWebhooks.groups.${group.id}`)}
                  <span className="tabular-nums opacity-70">({group.eventTypes.length})</span>
                </Button>
              );
            })}
          </div>
          <HelpText>{t('workspaceWebhooks.eventGroupsHelp')}</HelpText>
        </div>
        <fieldset className="rounded-lg border border-ui-border bg-ui-bg p-3">
          <legend className="px-1 type-label text-ui-text">{t('workspaceWebhooks.events')}</legend>
          <div className="relative">
            <div ref={eventListRef} data-event-scroll-region className="max-h-64 overflow-y-scroll pr-4 custom-scrollbar" onScroll={updateEventScrollIndicator}>
              <div className="grid gap-2 sm:grid-cols-2">
                {CONTROL_PLANE_WEBHOOK_EVENT_TYPES.map((eventType) => (
                  <label
                    key={eventType}
                    ref={(node) => {
                      if (node) eventRefs.current.set(eventType, node);
                      else eventRefs.current.delete(eventType);
                    }}
                    className="flex min-h-11 items-center gap-2 rounded-md border border-ui-border bg-ui-surface px-3 py-2"
                  >
                    <Checkbox checked={selectedEvents.has(eventType)} onChange={() => toggleEvent(eventType)} />
                    <span className="type-caption type-emphasis capitalize text-ui-text">{webhookEventLabel(eventType)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div aria-hidden="true" data-event-scrollbar className="pointer-events-none absolute inset-y-0 right-0 w-2 rounded-full bg-ui-surface-strong">
              <div
                data-event-scroll-thumb
                className="absolute inset-x-0 rounded-full bg-ui-text-muted/50"
                style={{
                  height: `${eventScrollIndicator.height}px`,
                  transform: `translateY(${eventScrollIndicator.top}px)`
                }}
              />
            </div>
          </div>
        </fieldset>
        {draft.eventTypes.length === 0 && <p className="type-caption text-ui-text-muted">{t('workspaceWebhooks.selectEvent')}</p>}
      </div>
    </form>
  );
};
