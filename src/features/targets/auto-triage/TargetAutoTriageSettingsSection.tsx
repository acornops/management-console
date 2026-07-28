import React from 'react';
import { AlertTriangle, Bot, CheckCircle2, Clock3, Info, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/common/Button';
import { ExperimentalBadge } from '@/components/common/ExperimentalBadge';
import { Switch } from '@/components/common/FormControls';
import { InlineAlert } from '@/components/common/InlineAlert';
import { Select, type SelectOption } from '@/components/common/Select';
import { formInputClassName } from '@/components/common/formControlStyles';
import {
  controlPlaneApi,
  type AutoTriageMinimumSeverity,
  type AutoTriageReadinessReason,
  type AutoTriageWriteMode,
  type TargetAutoTriageSettings
} from '@/services/controlPlaneApi';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { ControlPlaneRequestError } from '@/services/control-plane/http';

interface AutoTriageDraft {
  enabled: boolean;
  minimumSeverity: AutoTriageMinimumSeverity;
  writeMode: AutoTriageWriteMode;
  additionalInstructions: string;
}

const textareaClassName = formInputClassName('min-h-32 resize-y py-3 leading-6');

export function toAutoTriageDraft(settings: TargetAutoTriageSettings): AutoTriageDraft {
  return {
    enabled: settings.enabled,
    minimumSeverity: settings.minimumSeverity,
    writeMode: settings.writeMode,
    additionalInstructions: settings.additionalInstructions
  };
}

export function isSameAutoTriageDraft(settings: TargetAutoTriageSettings, draft: AutoTriageDraft): boolean {
  return (
    settings.enabled === draft.enabled
    && settings.minimumSeverity === draft.minimumSeverity
    && settings.writeMode === draft.writeMode
    && settings.additionalInstructions === draft.additionalInstructions
  );
}

export function shouldOfferExistingIssueStart(settings: TargetAutoTriageSettings): boolean {
  return settings.enabled && settings.eligibleCurrentIssueCount > 0;
}

export const TargetAutoTriageSettingsSection: React.FC<{
  workspaceId: string;
  targetId: string;
  canManageTargets: boolean;
  canCreateReadWriteRuns: boolean;
}> = ({ workspaceId, targetId, canManageTargets, canCreateReadWriteRuns }) => {
  const { t } = useTranslation();
  const [settings, setSettings] = React.useState<TargetAutoTriageSettings | null>(null);
  const [draft, setDraft] = React.useState<AutoTriageDraft | null>(null);
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'saving' | 'starting' | 'error'>('loading');
  const [error, setError] = React.useState<string | null>(null);
  const [isConflict, setIsConflict] = React.useState(false);
  const [showExistingIssuePrompt, setShowExistingIssuePrompt] = React.useState(false);
  const [startResult, setStartResult] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setStatus('loading');
    setError(null);
    setIsConflict(false);
    try {
      const next = await controlPlaneApi.getTargetAutoTriageSettings(workspaceId, targetId);
      setSettings(next);
      setDraft(toAutoTriageDraft(next));
      setShowExistingIssuePrompt(shouldOfferExistingIssueStart(next));
      setStartResult(null);
      setStatus('ready');
    } catch (loadError) {
      setError(formatControlPlaneError(loadError, t('autoTriage.loadFailed'), { area: 'cluster' }));
      setStatus('error');
    }
  }, [targetId, t, workspaceId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const canEdit = Boolean(settings?.canEdit && canManageTargets);
  const isWriteCapable = draft?.writeMode !== 'read_only';
  const characterCount = draft ? [...draft.additionalInstructions].length : 0;
  const isDirty = Boolean(settings && draft && !isSameAutoTriageDraft(settings, draft));
  const cannotSaveWriteMode = Boolean(isWriteCapable && !canCreateReadWriteRuns);
  const canSave = Boolean(canEdit && isDirty && !cannotSaveWriteMode && status !== 'saving' && status !== 'starting');
  const canStartExisting = Boolean(
    canEdit
    && settings?.enabled
    && settings.eligibleCurrentIssueCount > 0
    && (settings.writeMode === 'read_only' || canCreateReadWriteRuns)
    && !isDirty
    && status === 'ready'
  );

  const severityOptions = React.useMemo<Array<SelectOption<AutoTriageMinimumSeverity>>>(() => [
    { value: 'critical', label: t('autoTriage.severityCritical') },
    { value: 'warning', label: t('autoTriage.severityWarning') },
    { value: 'info', label: t('autoTriage.severityAll') }
  ], [t]);

  const writeModeOptions = React.useMemo<Array<SelectOption<AutoTriageWriteMode>>>(() => [
    {
      value: 'follow_target',
      label: t('autoTriage.actionsFollowTarget'),
      disabled: !canCreateReadWriteRuns && draft?.writeMode !== 'follow_target'
    },
    { value: 'read_only', label: t('autoTriage.actionsReadOnly') },
    {
      value: 'approval_required',
      label: t('autoTriage.actionsApprovalRequired'),
      disabled: !canCreateReadWriteRuns && draft?.writeMode !== 'approval_required'
    },
    {
      value: 'full_write',
      label: t('autoTriage.actionsAutomatic'),
      disabled: !canCreateReadWriteRuns && draft?.writeMode !== 'full_write'
    }
  ], [canCreateReadWriteRuns, draft?.writeMode, t]);

  const save = async () => {
    if (!settings || !draft || !canSave) return;
    setStatus('saving');
    setError(null);
    setIsConflict(false);
    try {
      const saved = await controlPlaneApi.updateTargetAutoTriageSettings(workspaceId, targetId, {
        expectedRevision: settings.revision,
        ...draft
      });
      setSettings(saved);
      setDraft(toAutoTriageDraft(saved));
      setShowExistingIssuePrompt(shouldOfferExistingIssueStart(saved));
      setStartResult(saved.enabled && saved.eligibleCurrentIssueCount === 0
        ? t('autoTriage.futureIssues', { severity: severityLabel(saved.minimumSeverity, t) })
        : null);
      setStatus('ready');
    } catch (saveError) {
      const conflict = saveError instanceof ControlPlaneRequestError
        && (saveError.status === 409 || saveError.code === 'AUTO_TRIAGE_SETTINGS_CONFLICT');
      setIsConflict(conflict);
      setError(conflict
        ? t('autoTriage.conflict')
        : formatControlPlaneError(saveError, t('autoTriage.saveFailed'), { area: 'cluster' }));
      setStatus('ready');
    }
  };

  const startExisting = async () => {
    if (!settings || !canStartExisting) return;
    setStatus('starting');
    setError(null);
    try {
      const result = await controlPlaneApi.startExistingAutoTriageInvestigations(
        workspaceId,
        targetId,
        settings.revision
      );
      setShowExistingIssuePrompt(false);
      setStartResult(t('autoTriage.existingQueued', {
        queued: result.queuedCount,
        existing: result.alreadyExistsCount
      }));
      try {
        const refreshed = await controlPlaneApi.getTargetAutoTriageSettings(workspaceId, targetId);
        setSettings(refreshed);
        setDraft(toAutoTriageDraft(refreshed));
      } catch (refreshError) {
        setError(formatControlPlaneError(
          refreshError,
          t('autoTriage.refreshAfterStartFailed'),
          { area: 'cluster' }
        ));
      }
      setStatus('ready');
    } catch (startError) {
      setError(formatControlPlaneError(startError, t('autoTriage.startFailed'), { area: 'cluster' }));
      setStatus('ready');
    }
  };

  return (
    <section className="mb-10 last:mb-0" data-target-auto-triage-settings="true">
      <div className="mb-6 px-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-ui-text">{t('autoTriage.title')}</h2>
          <ExperimentalBadge>{t('app.experimental')}</ExperimentalBadge>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-ui-text-muted">{t('autoTriage.description')}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">
        {status === 'loading' && (
          <div className="flex min-h-40 items-center justify-center p-6 text-sm text-ui-text-muted" role="status">
            {t('autoTriage.loading')}
          </div>
        )}

        {status === 'error' && (
          <div className="grid gap-4 p-6">
            <InlineAlert tone="danger">{error}</InlineAlert>
            <Button onClick={() => void load()} size="sm" className="w-fit">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t('common.retry')}
            </Button>
          </div>
        )}

        {settings && draft && status !== 'loading' && status !== 'error' && (
          <>
            <div className="grid gap-6 border-b border-ui-border p-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong shadow-sm">
                  <Bot className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-ui-text">{t('autoTriage.enabledLabel')}</p>
                    <span className="text-xs font-semibold text-ui-text-muted" aria-hidden="true">
                      {draft.enabled ? t('common.on') : t('common.off')}
                    </span>
                  </div>
                  <p id="auto-triage-enabled-help" className="mt-1 text-xs leading-5 text-ui-text-muted">
                    {t('autoTriage.enabledHelp')}
                  </p>
                </div>
              </div>
              <div className="flex justify-start lg:justify-end">
                <Switch
                  checked={draft.enabled}
                  label={t('autoTriage.enabledLabel')}
                  aria-describedby="auto-triage-enabled-help"
                  disabled={!canEdit}
                  onCheckedChange={(enabled) => setDraft((current) => current ? { ...current, enabled } : current)}
                />
              </div>
            </div>

            <div className="grid gap-5 border-b border-ui-border p-6 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-ui-text">{t('autoTriage.minimumSeverity')}</span>
                <span className="text-xs leading-5 text-ui-text-muted">{t('autoTriage.minimumSeverityHelp')}</span>
                <Select
                  value={draft.minimumSeverity}
                  options={severityOptions}
                  disabled={!canEdit}
                  ariaLabel={t('autoTriage.minimumSeverity')}
                  onChange={(minimumSeverity) => setDraft((current) => current ? { ...current, minimumSeverity } : current)}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-ui-text">{t('autoTriage.allowedActions')}</span>
                <span className="text-xs leading-5 text-ui-text-muted">{t('autoTriage.allowedActionsHelp')}</span>
                <Select
                  value={draft.writeMode}
                  options={writeModeOptions}
                  disabled={!canEdit}
                  ariaLabel={t('autoTriage.allowedActions')}
                  onChange={(writeMode) => setDraft((current) => current ? { ...current, writeMode } : current)}
                />
              </label>
            </div>

            <div className="grid gap-3 border-b border-ui-border p-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <label htmlFor={`auto-triage-instructions-${targetId}`} className="text-sm font-bold text-ui-text">
                    {t('autoTriage.additionalInstructions')}
                  </label>
                  <p
                    id={`auto-triage-instructions-description-${targetId}`}
                    className="mt-1 text-xs leading-5 text-ui-text-muted"
                  >
                    {t('autoTriage.additionalInstructionsHelp')}
                  </p>
                </div>
                <Button
                  variant="tertiary"
                  size="sm"
                  disabled={!canEdit || !draft.additionalInstructions}
                  onClick={() => setDraft((current) => current ? { ...current, additionalInstructions: '' } : current)}
                >
                  {t('autoTriage.clearInstructions')}
                </Button>
              </div>
              <textarea
                id={`auto-triage-instructions-${targetId}`}
                value={draft.additionalInstructions}
                disabled={!canEdit}
                aria-describedby={
                  `auto-triage-instructions-description-${targetId} auto-triage-instructions-help-${targetId}`
                }
                placeholder={t('autoTriage.instructionsPlaceholder')}
                className={textareaClassName}
                onChange={(event) => {
                  const next = [...event.target.value].slice(0, 4000).join('');
                  setDraft((current) => current ? { ...current, additionalInstructions: next } : current);
                }}
              />
              <p id={`auto-triage-instructions-help-${targetId}`} className="text-right text-xs tabular-nums text-ui-text-muted">
                {t('autoTriage.characterCount', { count: characterCount })}
              </p>
            </div>

            <div className="grid gap-4 border-b border-ui-border p-6 sm:grid-cols-2">
              <BehaviorPreview
                settings={settings}
                writeModeChanged={draft.writeMode !== settings.writeMode}
                t={t}
              />
              <Readiness settings={settings} t={t} />
            </div>

            <div className="grid gap-4 p-6">
              {!canEdit && (
                <InlineAlert tone="neutral">{t('autoTriage.readOnly')}</InlineAlert>
              )}
              {cannotSaveWriteMode && (
                <InlineAlert tone="warning">{t('autoTriage.writePermissionRequired')}</InlineAlert>
              )}
              {draft.writeMode === 'full_write' && (
                <InlineAlert tone="warning">{t('autoTriage.automaticWriteAcknowledgement')}</InlineAlert>
              )}
              {error && (
                <InlineAlert tone={isConflict ? 'warning' : 'danger'}>
                  <span>{error}</span>
                  {isConflict && (
                    <Button variant="tertiary" size="sm" className="ml-2" onClick={() => void load()}>
                      {t('autoTriage.reloadCurrent')}
                    </Button>
                  )}
                </InlineAlert>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-ui-text-muted" aria-live="polite">
                  {isDirty ? t('autoTriage.unsavedChanges') : t('autoTriage.saved')}
                </span>
                <Button variant="primary" size="sm" disabled={!canSave} onClick={() => void save()}>
                  {status === 'saving' ? t('common.saving') : t('autoTriage.save')}
                </Button>
              </div>
            </div>

            {showExistingIssuePrompt && (
              <div className="border-t border-ui-border bg-ui-bg/50 p-6" role="status">
                <p className="text-sm font-bold text-ui-text">
                  {t('autoTriage.existingIssuesPrompt', { count: settings.eligibleCurrentIssueCount })}
                </p>
                <p className="mt-1 text-xs leading-5 text-ui-text-muted">{t('autoTriage.existingIssuesHelp')}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" disabled={!canStartExisting} onClick={() => void startExisting()}>
                    {status === 'starting'
                      ? t('autoTriage.startingExisting')
                      : t('autoTriage.startExisting', { count: settings.eligibleCurrentIssueCount })}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={status !== 'ready'}
                    onClick={() => setShowExistingIssuePrompt(false)}
                  >
                    {t('autoTriage.notNow')}
                  </Button>
                </div>
              </div>
            )}

            {startResult && (
              <div className="border-t border-ui-border p-6" aria-live="polite">
                <InlineAlert tone="neutral">{startResult}</InlineAlert>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

function severityLabel(
  severity: AutoTriageMinimumSeverity,
  t: (key: string, values?: Record<string, unknown>) => string
): string {
  if (severity === 'critical') return t('autoTriage.thresholdCritical');
  if (severity === 'info') return t('autoTriage.thresholdAll');
  return t('autoTriage.thresholdWarning');
}

function BehaviorPreview({
  settings,
  writeModeChanged,
  t
}: {
  settings: TargetAutoTriageSettings;
  writeModeChanged: boolean;
  t: (key: string, values?: Record<string, unknown>) => string;
}) {
  const summaryKey = {
    read_only: 'autoTriage.behaviorReadOnly',
    approval_required: 'autoTriage.behaviorApproval',
    automatic_write: 'autoTriage.behaviorAutomatic',
    reduced_to_approval: 'autoTriage.behaviorReduced',
    agent_read_only: 'autoTriage.behaviorAgentReadOnly'
  }[settings.effectiveBehavior.summary];
  const Icon = settings.effectiveBehavior.targetCeilingApplied ? AlertTriangle : Info;

  return (
    <div className="rounded-lg border border-ui-border bg-ui-bg/45 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-ui-text">
        <Icon className="h-4 w-4 text-accent-strong" aria-hidden="true" />
        {t('autoTriage.effectiveBehavior')}
      </div>
      <p className="mt-2 text-xs leading-5 text-ui-text-muted">{t(summaryKey)}</p>
      {writeModeChanged && (
        <p className="mt-2 text-xs font-semibold leading-5 text-ui-text-muted">
          {t('autoTriage.behaviorPreviewAfterSave')}
        </p>
      )}
    </div>
  );
}

function Readiness({
  settings,
  t
}: {
  settings: TargetAutoTriageSettings;
  t: (key: string, values?: Record<string, unknown>) => string;
}) {
  const status = settings.readiness.status;
  const Icon = status === 'ready' ? CheckCircle2 : status === 'needs_setup' ? AlertTriangle : Clock3;
  const label = status === 'ready'
    ? t('autoTriage.ready')
    : status === 'needs_setup'
      ? t('autoTriage.needsSetup')
      : t('autoTriage.temporarilyUnavailable');

  return (
    <div className="rounded-lg border border-ui-border bg-ui-bg/45 p-4" aria-live="polite">
      <div className="flex items-center gap-2 text-sm font-bold text-ui-text">
        <Icon className="h-4 w-4 text-accent-strong" aria-hidden="true" />
        {t('autoTriage.readiness')}: {label}
      </div>
      {settings.readiness.reasons.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-ui-text-muted">
          {settings.readiness.reasons.map((reason) => (
            <li key={reason}>{readinessReason(reason, settings.readiness.unavailableOptionalMcpToolCount, t)}</li>
          ))}
        </ul>
      )}
      {status !== 'ready' && <p className="mt-2 text-xs font-semibold leading-5 text-ui-text-muted">{t('autoTriage.readinessDelay')}</p>}
    </div>
  );
}

function readinessReason(
  reason: AutoTriageReadinessReason,
  unavailableOptionalMcpToolCount: number,
  t: (key: string, values?: Record<string, unknown>) => string
): string {
  if (reason === 'ai_provider_credentials_missing') return t('autoTriage.reasonAiCredentials');
  if (reason === 'target_agent_disconnected') return t('autoTriage.reasonDisconnected');
  if (reason === 'no_diagnostic_tools') return t('autoTriage.reasonNoTools');
  if (reason === 'mcp_tools_need_setup') return t('autoTriage.reasonMcpSetup');
  return t('autoTriage.reasonOptionalMcp', { count: unavailableOptionalMcpToolCount });
}
