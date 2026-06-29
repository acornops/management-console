import React from 'react';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { CloseButton, Textarea, TextInput } from '@/components/common/ComponentVocabulary';
import { RightSidePanel } from '@/components/common/RightSidePanel';
import { ICONS } from '@/constants';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';
import { createWorkflowSchedule } from '@/services/control-plane/workflowApi';
import { getUserTimeZone } from '@/utils/dateTime';

interface WorkflowScheduleCreateDrawerProps {
  workspaceId: string;
  scheduleWorkflow?: WorkflowDefinition;
  onClose: () => void;
}

const defaultCron = '0 9 * * 1-5';

function parseJsonObject(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Input defaults must be a JSON object.');
  return parsed as Record<string, unknown>;
}

export const WorkflowScheduleCreateDrawer: React.FC<WorkflowScheduleCreateDrawerProps> = ({ workspaceId, scheduleWorkflow, onClose }) => {
  const [name, setName] = React.useState('');
  const [cron, setCron] = React.useState(defaultCron);
  const [timezone, setTimezone] = React.useState(getUserTimeZone);
  const [enabled, setEnabled] = React.useState(true);
  const [approvedContextGrants, setApprovedContextGrants] = React.useState('workspace_metadata');
  const [inputDefaultsText, setInputDefaultsText] = React.useState('{}');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!scheduleWorkflow) return;
    setName(`${scheduleWorkflow.name} schedule`);
    setCron(defaultCron);
    setTimezone(getUserTimeZone());
    setEnabled(true);
    setApprovedContextGrants(scheduleWorkflow.contextGrants.join('\n') || 'workspace_metadata');
    setInputDefaultsText('{}');
    setError('');
  }, [scheduleWorkflow?.id]);

  const save = async () => {
    if (!scheduleWorkflow || saving) return;
    setError('');
    setSaving(true);
    try {
      await createWorkflowSchedule(workspaceId, {
        workflowId: scheduleWorkflow.id,
        name: name.trim(),
        cron: cron.trim(),
        timezone: timezone.trim(),
        enabled,
        approvedContextGrants: approvedContextGrants.split(/\n|,/).map((value) => value.trim()).filter(Boolean),
        inputDefaults: parseJsonObject(inputDefaultsText)
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create workflow schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RightSidePanel isOpen={Boolean(scheduleWorkflow)} onClose={onClose} closeDisabled={saving} titleId="workflow-schedule-create-title" descriptionId="workflow-schedule-create-description" className="max-w-2xl">
      <div className="flex items-start justify-between border-b border-ui-border px-5 py-4">
        <div>
          <h2 id="workflow-schedule-create-title" className="type-section-title">Schedule workflow</h2>
          <p id="workflow-schedule-create-description" className="type-caption mt-1 text-ui-text-muted">Create a recurring run without leaving this workflow.</p>
        </div>
        <CloseButton onClick={onClose} disabled={saving} label="Close schedule workflow drawer" />
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {error && <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-sm font-semibold text-status-danger-text">{error}</div>}
        <div className="rounded-md border border-ui-border bg-ui-bg px-4 py-3">
          <div className="type-micro-label text-ui-text-muted">Workflow</div>
          <div className="mt-1 text-sm font-semibold text-ui-text">{scheduleWorkflow?.name || 'No workflow selected'}</div>
        </div>
        <label className="block text-sm font-semibold text-ui-text">Schedule name<TextInput value={name} onChange={(event) => setName(event.target.value)} className="mt-2" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-ui-text">Cron<TextInput value={cron} onChange={(event) => setCron(event.target.value)} className="mt-2 font-mono" /></label>
          <label className="block text-sm font-semibold text-ui-text">Timezone<TextInput value={timezone} onChange={(event) => setTimezone(event.target.value)} className="mt-2" /></label>
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold text-ui-text"><Checkbox checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />Enabled</label>
        <label className="block text-sm font-semibold text-ui-text">Approved context grants<Textarea value={approvedContextGrants} onChange={(event) => setApprovedContextGrants(event.target.value)} className="mt-2" /></label>
        <label className="block text-sm font-semibold text-ui-text">Input defaults<Textarea value={inputDefaultsText} onChange={(event) => setInputDefaultsText(event.target.value)} className="mt-2 min-h-36 font-mono text-xs font-normal" /></label>
      </div>
      <div className="flex justify-end gap-2 border-t border-ui-border px-5 py-4">
        <Button size="sm" variant="tertiary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button size="sm" variant="primary" onClick={() => void save()} disabled={saving || !scheduleWorkflow || !name.trim() || !cron.trim() || !timezone.trim()}>
          <ICONS.Clock className="h-4 w-4" aria-hidden="true" />
          {saving ? 'Creating...' : 'Create schedule'}
        </Button>
      </div>
    </RightSidePanel>
  );
};
