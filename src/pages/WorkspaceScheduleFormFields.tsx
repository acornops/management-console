import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  Button,
  Checkbox,
  InlineAlert,
  InlineLoadingIndicator,
  Select,
  Textarea,
  TextInput,
  formInputClassName,
  formTextareaClassName
} from '@acornops/ui';
import {
  cronFromScheduleBuilder,
  scheduleTimeFromCron,
  scheduleWeekdayFromCron,
  type ScheduleDraft,
  type ScheduleFrequency
} from '@/pages/WorkspaceSchedulesPage.helpers';
import {
  WorkflowPreviewAuthRow,
  workflowCapabilityBlockerMessage
} from '@/pages/WorkspaceWorkflowsPage.components';
import type {
  WorkflowApiDefinition,
  WorkflowCapabilitiesPreview,
  WorkflowMcpRequirementPreview
} from '@/services/control-plane/workflowApi';

export type ScheduleDraftField = 'workflowId' | 'name' | 'cron' | 'timezone' | 'runsAsUserId';

const inputClassName = formInputClassName('mt-2');
const scheduleTextareaClassName = formTextareaClassName('mt-2');
const timeZoneSuggestions = [
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney'
];

interface WorkspaceScheduleFormFieldsProps {
  capabilityPreview: WorkflowCapabilitiesPreview | null;
  capabilityPreviewError: string;
  capabilityPreviewing: boolean;
  currentUser: { id: string; label: string } | null;
  draft: ScheduleDraft;
  draftFieldErrors: Partial<Record<ScheduleDraftField, string>>;
  draftOwnerIsCurrentUser: boolean;
  scheduleFrequency: ScheduleFrequency;
  setCapabilityPreviewRevision: React.Dispatch<React.SetStateAction<number>>;
  setCredentialRequirement: React.Dispatch<React.SetStateAction<WorkflowMcpRequirementPreview | null>>;
  setDraft: React.Dispatch<React.SetStateAction<ScheduleDraft>>;
  setDraftFieldErrors: React.Dispatch<React.SetStateAction<Partial<Record<ScheduleDraftField, string>>>>;
  setScheduleFrequency: React.Dispatch<React.SetStateAction<ScheduleFrequency>>;
  workflows: WorkflowApiDefinition[];
}

export const WorkspaceScheduleFormFields: React.FC<WorkspaceScheduleFormFieldsProps> = ({
  capabilityPreview,
  capabilityPreviewError,
  capabilityPreviewing,
  currentUser,
  draft,
  draftFieldErrors,
  draftOwnerIsCurrentUser,
  scheduleFrequency,
  setCapabilityPreviewRevision,
  setCredentialRequirement,
  setDraft,
  setDraftFieldErrors,
  setScheduleFrequency,
  workflows
}) => {
  const { t } = useTranslation();
  const scheduleTime = scheduleTimeFromCron(draft.cron);
  const scheduleWeekday = scheduleWeekdayFromCron(draft.cron);
  const workflowOptions = React.useMemo(
    () => workflows.map((workflow) => ({ value: workflow.id, label: workflow.name })),
    [workflows]
  );

  return <>
    <label className="block type-body type-emphasis text-ui-text">
      {t('schedules.form.workflow')} <span aria-hidden="true" className="text-status-danger-text">*</span>
      <Select<string>
        id="schedule-workflow"
        value={draft.workflowId}
        options={workflowOptions}
        onChange={(workflowId) => {
          setDraft((current) => ({ ...current, workflowId }));
          setDraftFieldErrors((current) => ({ ...current, workflowId: undefined }));
        }}
        className="mt-2"
        ariaLabel={`${t('schedules.form.workflow')}, ${t('common.required')}`}
      />
      {draftFieldErrors.workflowId && <span role="alert" className="type-caption mt-1 block text-status-danger-text">{draftFieldErrors.workflowId}</span>}
    </label>
    <label className="block type-body type-emphasis text-ui-text">
      {t('schedules.form.name')} <span aria-hidden="true" className="text-status-danger-text">*</span>
      <TextInput required aria-required="true" aria-invalid={Boolean(draftFieldErrors.name)} value={draft.name} onChange={(event) => {
        setDraft((current) => ({ ...current, name: event.target.value }));
        setDraftFieldErrors((current) => ({ ...current, name: undefined }));
      }} className={inputClassName} />
      {draftFieldErrors.name && <span role="alert" className="type-caption mt-1 block text-status-danger-text">{draftFieldErrors.name}</span>}
    </label>
    <div className="block type-body type-emphasis text-ui-text">
      {t('schedules.form.runsAs')} <span aria-hidden="true" className="text-status-danger-text">*</span>
      <div className="mt-2 min-h-11 rounded-md border border-ui-border bg-ui-bg px-3 py-2.5 type-body text-ui-text">
        {currentUser?.id === draft.runsAsUserId ? currentUser.label : draft.runsAsUserId}
      </div>
      <span className="type-caption mt-1 block text-ui-text-muted">{t('schedules.form.runsAsHelp')}</span>
      {draftFieldErrors.runsAsUserId && <span role="alert" className="type-caption mt-1 block text-status-danger-text">{draftFieldErrors.runsAsUserId}</span>}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block type-body type-emphasis text-ui-text">
        {t('schedules.form.frequency')}
        <Select<ScheduleFrequency>
          value={scheduleFrequency}
          options={[
            { value: 'weekdays', label: t('schedules.form.frequencyWeekdays') },
            { value: 'daily', label: t('schedules.form.frequencyDaily') },
            { value: 'weekly', label: t('schedules.form.frequencyWeekly') },
            { value: 'custom', label: t('schedules.form.frequencyCustom') }
          ]}
          onChange={(frequency) => {
            setScheduleFrequency(frequency);
            if (frequency !== 'custom') setDraft((current) => ({ ...current, cron: cronFromScheduleBuilder(frequency, scheduleTime, scheduleWeekday) }));
          }}
          className="mt-2"
          ariaLabel={t('schedules.form.frequency')}
        />
      </label>
      {scheduleFrequency !== 'custom' && (
        <label className="block type-body type-emphasis text-ui-text">
          {t('schedules.form.time')} <span aria-hidden="true" className="text-status-danger-text">*</span>
          <TextInput type="time" required aria-required="true" value={scheduleTime} onChange={(event) => {
            setDraft((current) => ({ ...current, cron: cronFromScheduleBuilder(scheduleFrequency, event.target.value, scheduleWeekday) }));
            setDraftFieldErrors((current) => ({ ...current, cron: undefined }));
          }} className={inputClassName} />
        </label>
      )}
    </div>
    {scheduleFrequency === 'weekly' && (
      <label className="block type-body type-emphasis text-ui-text">
        {t('schedules.form.weekday')}
        <Select<string>
          value={scheduleWeekday}
          options={[
            { value: '1', label: t('schedules.form.monday') },
            { value: '2', label: t('schedules.form.tuesday') },
            { value: '3', label: t('schedules.form.wednesday') },
            { value: '4', label: t('schedules.form.thursday') },
            { value: '5', label: t('schedules.form.friday') },
            { value: '6', label: t('schedules.form.saturday') },
            { value: '0', label: t('schedules.form.sunday') }
          ]}
          onChange={(weekday) => setDraft((current) => ({ ...current, cron: cronFromScheduleBuilder('weekly', scheduleTime, weekday) }))}
          className="mt-2"
          ariaLabel={t('schedules.form.weekday')}
        />
      </label>
    )}
    {scheduleFrequency === 'custom' && (
      <label className="block type-body type-emphasis text-ui-text">
        {t('schedules.form.cron')} <span aria-hidden="true" className="text-status-danger-text">*</span>
        <TextInput required aria-required="true" aria-invalid={Boolean(draftFieldErrors.cron)} value={draft.cron} onChange={(event) => {
          setDraft((current) => ({ ...current, cron: event.target.value }));
          setDraftFieldErrors((current) => ({ ...current, cron: undefined }));
        }} className={inputClassName} />
        <span className="type-caption mt-1 block text-ui-text-muted">{t('schedules.form.cronHelp')}</span>
        {draftFieldErrors.cron && <span role="alert" className="type-caption mt-1 block text-status-danger-text">{draftFieldErrors.cron}</span>}
      </label>
    )}
    {scheduleFrequency !== 'custom' && (
      <div className="rounded-md border border-ui-border bg-ui-bg px-3 py-2 type-caption text-ui-text-muted">
        {t('schedules.form.scheduleSummary', { frequency: t(`schedules.form.frequency${scheduleFrequency[0].toUpperCase()}${scheduleFrequency.slice(1)}`), time: scheduleTime, timezone: draft.timezone })}
      </div>
    )}
    <label className="block type-body type-emphasis text-ui-text">
      {t('schedules.form.timezone')} <span aria-hidden="true" className="text-status-danger-text">*</span>
      <TextInput list="schedule-timezone-options" required aria-required="true" aria-invalid={Boolean(draftFieldErrors.timezone)} value={draft.timezone} onChange={(event) => {
        setDraft((current) => ({ ...current, timezone: event.target.value }));
        setDraftFieldErrors((current) => ({ ...current, timezone: undefined }));
      }} className={inputClassName} />
      <datalist id="schedule-timezone-options">
        {Array.from(new Set([draft.timezone, ...timeZoneSuggestions])).filter(Boolean).map((timezone) => <option key={timezone} value={timezone} />)}
      </datalist>
      <span className="type-caption mt-1 block text-ui-text-muted">{t('schedules.form.timezoneHelp')}</span>
      {draftFieldErrors.timezone && <span role="alert" className="type-caption mt-1 block text-status-danger-text">{draftFieldErrors.timezone}</span>}
    </label>
    <label className="flex items-center gap-3 type-body type-emphasis text-ui-text">
      <Checkbox checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} />
      {t('schedules.form.enabled')}
    </label>
    <label className="block type-body type-emphasis text-ui-text">
      {t('schedules.form.approvedContextGrants')}
      <Textarea value={draft.approvedContextGrants} onChange={(event) => setDraft((current) => ({ ...current, approvedContextGrants: event.target.value }))} className={scheduleTextareaClassName} />
      <span className="type-caption mt-1 block text-ui-text-muted">{t('schedules.form.approvedContextGrantsHelp')}</span>
    </label>
    {draftOwnerIsCurrentUser ? (
      <section aria-labelledby="schedule-credential-readiness" className="rounded-md border border-ui-border bg-ui-bg px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="schedule-credential-readiness" className="type-row-title">{t(capabilityPreview?.mcpRequirements.length ? 'agentsWorkflows.schedule.credentialReadiness' : 'agentsWorkflows.schedule.capabilityReadiness')}</h3>
            <p className="type-caption mt-1 text-ui-text-muted">{capabilityPreview?.mcpRequirements.length
              ? t('agentsWorkflows.schedule.credentialReadinessHelp', { owner: currentUser?.label || t('agentsWorkflows.schedule.scheduleOwner') })
              : t('agentsWorkflows.schedule.capabilityReadinessHelp')}</p>
          </div>
          {capabilityPreviewError && <Button type="button" size="sm" variant="secondary" onClick={() => setCapabilityPreviewRevision((value) => value + 1)}>{t('common.retry')}</Button>}
        </div>
        {capabilityPreviewing ? (
          <InlineLoadingIndicator label={t('agentsWorkflows.schedule.previewing')} className="mt-3" />
        ) : capabilityPreviewError ? (
          <p role="alert" className="type-caption mt-3 text-status-danger-text">{capabilityPreviewError}</p>
        ) : capabilityPreview?.mcpRequirements.length ? (
          <dl className="mt-3 border-t border-ui-border pt-1">
            <WorkflowPreviewAuthRow requirements={capabilityPreview.mcpRequirements} onConnectCredential={setCredentialRequirement} />
          </dl>
        ) : capabilityPreview?.status === 'ready' ? (
          <p role="status" className="type-caption mt-3 type-emphasis text-status-success-text">{t('schedules.form.credentialsReady')}</p>
        ) : capabilityPreview ? (
          <p role="alert" className="type-caption mt-3 text-status-warning-text">{workflowCapabilityBlockerMessage(t('agentsWorkflows.schedule.capabilityBlocked'))}</p>
        ) : null}
      </section>
    ) : (
      <InlineAlert tone="warning">{t('schedules.form.otherOwnerCredentialHelp')}</InlineAlert>
    )}
  </>;
};
