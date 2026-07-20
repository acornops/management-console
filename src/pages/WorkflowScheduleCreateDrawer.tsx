import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { CloseButton, TextInput } from '@/components/common/ComponentVocabulary';
import { Radio } from '@/components/common/FormControls';
import { RightSidePanel } from '@/components/common/RightSidePanel';
import { Select } from '@/components/common/Select';
import { ICONS } from '@/constants';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';
import { WorkflowPromptEditor } from '@/pages/WorkspaceWorkflowsPage.launchFields';
import { WorkflowMcpCredentialDialog, WorkflowPreviewAuthRow, workflowCapabilityBlockerMessage } from '@/pages/WorkspaceWorkflowsPage.components';
import {
  createWorkflowSchedule,
  previewWorkflowCapabilities,
  previewWorkflowSchedule,
  type WorkflowCapabilitiesPreview,
  type WorkflowMcpRequirementPreview,
  type WorkflowSchedulePreview
} from '@/services/control-plane/workflowApi';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { formatUserDateTime, getUserTimeZone } from '@/utils/dateTime';

interface WorkflowScheduleCreateDrawerProps {
  workspaceId: string;
  scheduleWorkflow?: WorkflowDefinition;
  onClose: () => void;
}

type Frequency = 'daily' | 'weekdays' | 'weekly' | 'custom';

const weekdayOptions = [
  { value: 1, key: 'monday' },
  { value: 2, key: 'tuesday' },
  { value: 3, key: 'wednesday' },
  { value: 4, key: 'thursday' },
  { value: 5, key: 'friday' },
  { value: 6, key: 'saturday' },
  { value: 0, key: 'sunday' }
] as const;

function cronFromGuided(frequency: Frequency, time: string, weekdays: number[], currentCron: string): string {
  if (frequency === 'custom') return currentCron;
  const [hour = '9', minute = '0'] = time.split(':');
  if (frequency === 'daily') return `${Number(minute)} ${Number(hour)} * * *`;
  if (frequency === 'weekdays') return `${Number(minute)} ${Number(hour)} * * 1-5`;
  return `${Number(minute)} ${Number(hour)} * * ${weekdays.length > 0 ? weekdays.join(',') : '1'}`;
}

export const WorkflowScheduleCreateDrawer: React.FC<WorkflowScheduleCreateDrawerProps> = ({ workspaceId, scheduleWorkflow, onClose }) => {
  const { t } = useTranslation();
  const [name, setName] = React.useState('');
  const [frequency, setFrequency] = React.useState<Frequency>('weekdays');
  const [time, setTime] = React.useState('09:00');
  const [weekdays, setWeekdays] = React.useState<number[]>([1, 2, 3, 4, 5]);
  const [cron, setCron] = React.useState('0 9 * * 1-5');
  const [timezone, setTimezone] = React.useState(getUserTimeZone);
  const [enabled, setEnabled] = React.useState(true);
  const [approvedContextGrants, setApprovedContextGrants] = React.useState<string[]>([]);
  const [controlMessage, setControlMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [preview, setPreview] = React.useState<WorkflowSchedulePreview | null>(null);
  const [capabilityPreview, setCapabilityPreview] = React.useState<WorkflowCapabilitiesPreview | null>(null);
  const [capabilityPreviewError, setCapabilityPreviewError] = React.useState('');
  const [credentialRequirement, setCredentialRequirement] = React.useState<WorkflowMcpRequirementPreview | null>(null);
  const [previewRevision, setPreviewRevision] = React.useState(0);
  const [previewing, setPreviewing] = React.useState(false);
  const previewRequestRef = React.useRef(0);
  const [runAsUser, setRunAsUser] = React.useState<{ id: string; label: string } | null>(null);
  const principal = runAsUser ? { type: 'user' as const, id: runAsUser.id } : null;

  React.useEffect(() => {
    let cancelled = false;
    controlPlaneApi.getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        setRunAsUser({ id: user.id, label: user.name || user.email });
      })
      .catch((cause) => !cancelled && setError(cause instanceof Error ? cause.message : t('agentsWorkflows.schedule.identityLoadFailed')));
    return () => { cancelled = true; };
  }, [workspaceId, t]);

  React.useEffect(() => {
    if (!scheduleWorkflow) return;
    setName(t('agentsWorkflows.schedule.defaultName', { name: scheduleWorkflow.name }));
    setFrequency('weekdays');
    setTime('09:00');
    setWeekdays([1, 2, 3, 4, 5]);
    setCron('0 9 * * 1-5');
    setTimezone(getUserTimeZone());
    setEnabled(true);
    setApprovedContextGrants([...new Set(scheduleWorkflow.contextGrants)]);
    setControlMessage(scheduleWorkflow.starterPrompt);
    setError('');
    setPreview(null);
    setCapabilityPreview(null);
    setCapabilityPreviewError('');
    setCredentialRequirement(null);
  }, [scheduleWorkflow?.id, t]);

  React.useEffect(() => {
    setCron((current) => cronFromGuided(frequency, time, weekdays, current));
  }, [frequency, time, weekdays]);

  React.useEffect(() => {
    if (!scheduleWorkflow || !principal) return;
    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    setPreviewing(true);
    const timer = window.setTimeout(() => {
      Promise.allSettled([
        previewWorkflowSchedule(workspaceId, {
          workflowId: scheduleWorkflow.id,
          name: name.trim(),
          cron,
          timezone,
          enabled,
          approvedContextGrants,
          controlMessage,
          principal
        }),
        previewWorkflowCapabilities(workspaceId, scheduleWorkflow.id, {
          approvedContextGrants,
          content: controlMessage
        })
      ]).then(([scheduleResult, capabilityResult]) => {
        if (previewRequestRef.current !== requestId) return;
        if (scheduleResult.status === 'fulfilled') {
          setPreview(scheduleResult.value);
        } else {
          setPreview({
            valid: false,
            summary: scheduleResult.reason instanceof Error ? scheduleResult.reason.message : t('agentsWorkflows.schedule.previewUnavailable'),
            nextRunTimes: [],
            errors: []
          });
        }
        if (capabilityResult.status === 'fulfilled') {
          setCapabilityPreview(capabilityResult.value);
          setCapabilityPreviewError('');
        } else {
          setCapabilityPreview(null);
          setCapabilityPreviewError(capabilityResult.reason instanceof Error ? capabilityResult.reason.message : t('agentsWorkflows.schedule.previewUnavailable'));
        }
      }).finally(() => {
        if (previewRequestRef.current === requestId) setPreviewing(false);
      });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      if (previewRequestRef.current === requestId) previewRequestRef.current += 1;
    };
  }, [approvedContextGrants, controlMessage, cron, enabled, name, principal, previewRevision, scheduleWorkflow?.id, timezone, workspaceId, t]);

  const toggleContextGrant = (grant: string, checked: boolean) => {
    setApprovedContextGrants((current) => checked
      ? [...new Set([...current, grant])]
      : current.filter((value) => value !== grant));
  };

  const save = async () => {
    if (!scheduleWorkflow || saving || !scheduleReady || !principal) return;
    setError('');
    setSaving(true);
    try {
      await createWorkflowSchedule(workspaceId, {
        workflowId: scheduleWorkflow.id,
        name: name.trim(),
        cron: cron.trim(),
        timezone: timezone.trim(),
        enabled,
        approvedContextGrants,
        controlMessage,
        principal
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('agentsWorkflows.schedule.createError'));
    } finally {
      setSaving(false);
    }
  };

  const localTimezone = getUserTimeZone();
  const timezoneOptions = [...new Set([localTimezone, 'UTC', 'Asia/Singapore', 'America/New_York'])]
    .map((value) => ({ value, label: value === localTimezone ? `${value} (${t('agentsWorkflows.schedule.local')})` : value }));
  const fieldError = (field: string) => preview?.errors.find((item) => item.field === field)?.message;
  const capabilityReady = capabilityPreview?.status === 'ready' && !capabilityPreviewError;
  const scheduleReady = Boolean(preview?.valid && (!enabled || capabilityReady));
  const readinessError = fieldError('mcpReadiness') || fieldError('readiness');

  return (
    <RightSidePanel isOpen={Boolean(scheduleWorkflow)} onClose={onClose} closeDisabled={saving} titleId="workflow-schedule-create-title" descriptionId="workflow-schedule-create-description" className="w-full max-w-2xl">
      <div className="flex min-w-0 items-start justify-between gap-3 border-b border-ui-border px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 id="workflow-schedule-create-title" className="type-section-title">{t('agentsWorkflows.schedule.title')}</h2>
          <p id="workflow-schedule-create-description" className="type-caption mt-1 text-ui-text-muted">{t('agentsWorkflows.schedule.description')}</p>
        </div>
        <CloseButton onClick={onClose} disabled={saving} label={t('agentsWorkflows.schedule.close')} />
      </div>
      <div className="min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-5">
        {error && <div role="alert" className="rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-sm font-semibold text-status-danger-text">{error}</div>}
        <div className="rounded-md border border-ui-border bg-ui-bg px-4 py-3">
          <div className="type-micro-label text-ui-text-muted">{t('agentsWorkflows.schedule.workflow')}</div>
          <div className="mt-1 break-words text-sm font-semibold text-ui-text">{scheduleWorkflow?.name || t('agentsWorkflows.schedule.noWorkflow')}</div>
        </div>

        <label className="block text-sm font-semibold text-ui-text">
          {t('agentsWorkflows.schedule.name')}
          <TextInput value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full" aria-invalid={!name.trim()} />
        </label>

        <div className="block text-sm font-semibold text-ui-text">
          {t('agentsWorkflows.schedule.runAs')}
          <div className="mt-2 min-h-11 rounded-md border border-ui-border bg-ui-bg px-3 py-2.5 font-normal text-ui-text" aria-live="polite">
            {runAsUser?.label || t('common.loading')}
          </div>
          <span className="type-caption mt-1 block text-ui-text-muted">{t('agentsWorkflows.schedule.creatorIdentityHelp')}</span>
          {fieldError('principal') && <span className="type-caption mt-1 block text-status-danger-text">{fieldError('principal')}</span>}
        </div>

        <fieldset className="min-w-0 space-y-3">
          <legend className="text-sm font-semibold text-ui-text">{t('agentsWorkflows.schedule.frequency')}</legend>
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
            {(['daily', 'weekdays', 'weekly', 'custom'] as Frequency[]).map((value) => (
              <label
                key={value}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${frequency === value ? 'border-accent/35 bg-accent-soft text-accent-strong' : 'border-control-boundary bg-control-secondary text-control-secondary-fg hover:bg-control-secondary-hover'}`}
              >
                <Radio
                  name="workflow-schedule-frequency"
                  value={value}
                  checked={frequency === value}
                  onChange={() => setFrequency(value)}
                />
                <span>{t(`agentsWorkflows.schedule.frequency_${value}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {frequency !== 'custom' && (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <label className="block min-w-0 text-sm font-semibold text-ui-text">
              {t('agentsWorkflows.schedule.time')}
              <TextInput type="time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-2 w-full" />
            </label>
            <label className="block min-w-0 text-sm font-semibold text-ui-text">
              {t('agentsWorkflows.schedule.timezone')}
              <Select<string> value={timezone} options={timezoneOptions} onChange={setTimezone} className="mt-2 w-full" ariaLabel={t('agentsWorkflows.schedule.timezone')} />
            </label>
          </div>
        )}

        {frequency === 'weekly' && (
          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold text-ui-text">{t('agentsWorkflows.schedule.weekdays')}</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {weekdayOptions.map((day) => (
                <label key={day.value} className="flex min-w-0 items-center gap-2 rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm font-semibold text-ui-text">
                  <Checkbox checked={weekdays.includes(day.value)} onChange={(event) => setWeekdays((current) => event.target.checked ? [...new Set([...current, day.value])].sort() : current.filter((value) => value !== day.value))} />
                  <span className="truncate">{t(`agentsWorkflows.schedule.${day.key}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {scheduleWorkflow ? (
          <div className="min-w-0 text-sm font-semibold text-ui-text">
            {t('agentsWorkflows.schedule.controlMessage')}
            <WorkflowPromptEditor workflow={scheduleWorkflow} message={controlMessage} onChange={setControlMessage} />
            {fieldError('controlMessage') && <span className="type-caption mt-1 block text-status-danger-text">{fieldError('controlMessage')}</span>}
          </div>
        ) : null}

        {scheduleWorkflow?.contextGrants.length ? (
          <fieldset className="min-w-0 space-y-2">
            <legend className="text-sm font-semibold text-ui-text">{t('agentsWorkflows.schedule.context')}</legend>
            <p className="type-caption text-ui-text-muted">{t('agentsWorkflows.schedule.contextHelp')}</p>
            {scheduleWorkflow.contextGrants.map((grant) => (
              <label key={grant} className="flex min-w-0 items-start gap-3 rounded-md border border-ui-border bg-ui-bg px-3 py-3 text-sm text-ui-text">
                <Checkbox className="mt-0.5" checked={approvedContextGrants.includes(grant)} onChange={(event) => toggleContextGrant(grant, event.target.checked)} />
                <span className="min-w-0"><strong className="break-words">{grant.replaceAll('_', ' ')}</strong><span className="type-caption mt-1 block text-ui-text-muted">{t('agentsWorkflows.schedule.contextGrantHelp')}</span></span>
              </label>
            ))}
          </fieldset>
        ) : null}

        <div role="status" aria-live="polite" className={`rounded-md border px-4 py-3 ${scheduleReady ? 'border-status-success/30 bg-status-success-soft' : 'border-ui-border bg-ui-bg'}`}>
          <div className="flex items-center gap-2 text-sm font-semibold text-ui-text">
            <ICONS.Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            {previewing ? t('agentsWorkflows.schedule.previewing') : preview?.summary || t('agentsWorkflows.schedule.previewPending')}
          </div>
          {preview?.nextRunTimes.length ? <ol className="type-caption mt-2 grid gap-1 text-ui-text-muted">{preview.nextRunTimes.slice(0, 3).map((runAt) => <li key={runAt}>{formatUserDateTime(runAt, { timeZone: timezone })}</li>)}</ol> : null}
          {readinessError && <p className="type-caption mt-2 text-status-warning-text">{readinessError}</p>}
        </div>

        {(capabilityPreview?.mcpRequirements.length || capabilityPreviewError || (enabled && capabilityPreview && capabilityPreview.status !== 'ready')) ? (
          <section aria-labelledby="workflow-schedule-credential-readiness" className="rounded-md border border-ui-border bg-ui-bg px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 id="workflow-schedule-credential-readiness" className="type-row-title">{t(capabilityPreview?.mcpRequirements.length ? 'agentsWorkflows.schedule.credentialReadiness' : 'agentsWorkflows.schedule.capabilityReadiness')}</h3>
                <p className="type-caption mt-1 text-ui-text-muted">{capabilityPreview?.mcpRequirements.length
                  ? t('agentsWorkflows.schedule.credentialReadinessHelp', { owner: runAsUser?.label || t('agentsWorkflows.schedule.scheduleOwner') })
                  : t('agentsWorkflows.schedule.capabilityReadinessHelp')}</p>
              </div>
              {capabilityPreviewError && <Button type="button" size="sm" variant="secondary" onClick={() => setPreviewRevision((value) => value + 1)}>{t('common.retry')}</Button>}
            </div>
            {capabilityPreviewError ? (
              <p role="alert" className="type-caption mt-3 text-status-danger-text">{capabilityPreviewError}</p>
            ) : capabilityPreview ? (
              capabilityPreview.mcpRequirements.length > 0 ? (
                <dl className="mt-3 border-t border-ui-border pt-1">
                  <WorkflowPreviewAuthRow requirements={capabilityPreview.mcpRequirements} onConnectCredential={setCredentialRequirement} />
                </dl>
              ) : capabilityPreview.status !== 'ready' ? (
                <p role="alert" className="type-caption mt-3 text-status-warning-text">{workflowCapabilityBlockerMessage(capabilityPreview, t('agentsWorkflows.schedule.capabilityBlocked'))}</p>
              ) : null
            ) : null}
          </section>
        ) : null}

        <details className="group min-w-0 rounded-md border border-ui-border bg-ui-surface px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-ui-text [&::-webkit-details-marker]:hidden">
            {t('agentsWorkflows.schedule.advanced')}
            <ICONS.ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-4 grid min-w-0 gap-4">
            <label className="block min-w-0 text-sm font-semibold text-ui-text">
              {t('agentsWorkflows.schedule.cron')}
              <TextInput value={cron} onChange={(event) => { setFrequency('custom'); setCron(event.target.value); }} className="mt-2 w-full font-mono" aria-invalid={Boolean(fieldError('cron'))} />
              {fieldError('cron') && <span className="type-caption mt-1 block text-status-danger-text">{fieldError('cron')}</span>}
            </label>
            {frequency === 'custom' && <label className="block min-w-0 text-sm font-semibold text-ui-text">{t('agentsWorkflows.schedule.timezone')}<Select<string> value={timezone} options={timezoneOptions} onChange={setTimezone} className="mt-2 w-full" ariaLabel={t('agentsWorkflows.schedule.timezone')} /></label>}
          </div>
        </details>

        <label className="flex items-center gap-3 text-sm font-semibold text-ui-text"><Checkbox checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />{t('agentsWorkflows.schedule.enabled')}</label>
      </div>
      <div className="grid grid-cols-1 gap-2 border-t border-ui-border px-4 py-4 sm:flex sm:justify-end sm:px-5">
        <Button size="sm" variant="tertiary" className="w-full justify-center sm:w-auto" onClick={onClose} disabled={saving}>{t('agentsWorkflows.schedule.cancel')}</Button>
        <Button size="sm" variant="primary" className="w-full justify-center sm:w-auto" onClick={() => void save()} disabled={saving || previewing || !scheduleWorkflow || !name.trim() || !controlMessage.trim() || !scheduleReady}>
          <ICONS.Clock className="h-4 w-4" aria-hidden="true" />
          {saving ? t('agentsWorkflows.schedule.creating') : t('agentsWorkflows.schedule.create')}
        </Button>
      </div>
      {credentialRequirement && (
        <WorkflowMcpCredentialDialog
          workspaceId={workspaceId}
          requirement={credentialRequirement}
          onClose={() => setCredentialRequirement(null)}
          onConnected={() => setPreviewRevision((value) => value + 1)}
        />
      )}
    </RightSidePanel>
  );
};
