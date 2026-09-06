import React from 'react';
import { useTranslation } from 'react-i18next';
import { previewWorkflowSchedule, type WorkflowSchedulePreview } from '@/services/control-plane/workflowApi';
import { isValidScheduleCron, isValidTimeZone, type ScheduleDraft } from '@/pages/WorkspaceSchedulesPage.helpers';
import type { ScheduleDraftField } from '@/pages/WorkspaceScheduleFormFields';

interface PreviewState {
  key: string;
  status: 'pending' | 'ready' | 'error';
  preview?: WorkflowSchedulePreview;
}

export function useScheduleTimingPreview(workspaceId: string, draft: ScheduleDraft, currentUserId: string | undefined, open: boolean) {
  const { t } = useTranslation();
  const [revision, setRevision] = React.useState(0);
  const [state, setState] = React.useState<PreviewState>({ key: '', status: 'pending' });
  const cron = draft.cron.trim();
  const timezone = draft.timezone.trim();
  const key = JSON.stringify([workspaceId, draft.id, draft.workflowId, cron, timezone, currentUserId, open, revision]);
  const localErrors: Partial<Record<ScheduleDraftField, string>> = {};
  if (!isValidScheduleCron(draft.cron)) localErrors.cron = t('schedules.form.cronInvalid');
  if (!isValidTimeZone(timezone)) localErrors.timezone = t('schedules.form.timezoneInvalid');
  const canPreview = open && Boolean(draft.workflowId && currentUserId) && Object.keys(localErrors).length === 0;

  React.useEffect(() => {
    setState({ key, status: 'pending' });
    if (!canPreview) return;
    let current = true;
    const timer = window.setTimeout(() => {
      void previewWorkflowSchedule(workspaceId, {
        workflowId: draft.workflowId,
        name: 'Schedule timing preview',
        cron,
        timezone,
        // Cadence only: never inspect another owner's credentials. Save checks the real owner.
        enabled: false,
        principal: { type: 'user', id: currentUserId! }
      }).then((preview) => {
        if (current) setState({ key, status: 'ready', preview });
      }).catch(() => {
        if (current) setState({ key, status: 'error' });
      });
    }, 350);
    return () => { current = false; window.clearTimeout(timer); };
  }, [key, canPreview]);

  // Never expose the preceding cadence's validity while the new effect is pending.
  const current = state.key === key && canPreview ? state : undefined;
  const preview = current?.preview;
  const fieldErrors = { ...localErrors };
  const generalErrors: string[] = [];
  for (const error of preview?.errors || []) {
    const field = error.field === 'principal' ? 'runsAsUserId' : error.field;
    if (['workflowId', 'name', 'cron', 'timezone', 'runsAsUserId'].includes(field)) {
      fieldErrors[field as ScheduleDraftField] = error.message;
    } else generalErrors.push(error.message);
  }
  const nextRunTimes = (preview?.nextRunTimes || []).filter((value) => Number.isFinite(Date.parse(value)));
  const valid = Boolean(current?.status === 'ready' && preview?.valid && !preview.errors.length && nextRunTimes.length);
  return {
    valid,
    fieldErrors,
    generalErrors,
    nextRunTimes,
    loading: canPreview && (!current || current.status === 'pending'),
    failed: current?.status === 'error',
    noOccurrences: Boolean(preview && !nextRunTimes.length && !preview.errors.length),
    retry: () => setRevision((value) => value + 1)
  };
}

export type ScheduleTimingPreview = ReturnType<typeof useScheduleTimingPreview>;
