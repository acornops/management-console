import type { WorkflowSchedule } from '@/services/control-plane/workflowApi';
import { formatUserDateTime, getUserTimeZone } from '@/utils/dateTime';

export interface ScheduleDraft {
  id?: string;
  workflowId: string;
  name: string;
  cron: string;
  timezone: string;
  enabled: boolean;
  approvedContextGrants: string;
  runsAsUserId: string;
}

export const createEmptyDraft = (): ScheduleDraft => ({
  workflowId: '',
  name: '',
  cron: '0 9 * * 1-5',
  timezone: getUserTimeZone(),
  enabled: true,
  approvedContextGrants: 'workspace_metadata',
  runsAsUserId: ''
});

export function formatScheduleDateTime(value: string | undefined, fallback: string): string {
  return formatUserDateTime(value, { fallback: value || fallback });
}

export function scheduleToDraft(schedule: WorkflowSchedule): ScheduleDraft {
  return {
    id: schedule.id,
    workflowId: schedule.workflowId,
    name: schedule.name,
    cron: schedule.cron,
    timezone: schedule.timezone,
    enabled: schedule.status === 'enabled',
    approvedContextGrants: schedule.approvedContextGrants.join('\n'),
    runsAsUserId: schedule.principal.id
  };
}

export function approvedContextGrants(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((grant) => grant.trim())
    .filter(Boolean);
}
