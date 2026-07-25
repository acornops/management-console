import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { hasWorkspacePermission } from '@/app/workspacePermissions';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { CollectionState } from '@/components/common/CollectionState';
import { EmptyState } from '@/components/common/EmptyState';
import { InlineAlert } from '@/components/common/InlineAlert';
import { InlineConfirmation } from '@/components/common/InlineConfirmation';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { DrawerFrame } from '@/components/common/OverlayFrames';
import { DataSurface, PageHeader, PageShell } from '@/components/common/PageComposition';
import { Select, type SelectOption } from '@/components/common/Select';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formInputClassName, formTextareaClassName } from '@/components/common/formControlStyles';
import { ICONS } from '@/constants';
import type { CursorCollectionPhase } from '@/hooks/resourceLifecycle';
import {
  listWorkspaceWorkflows,
  type WorkflowApiDefinition
} from '@/services/control-plane/workflowApi';
import {
  createWorkflowEventTrigger,
  deleteWorkflowEventTrigger,
  listWorkspaceWorkflowEventTriggers,
  rotateWorkflowEventTriggerSecret,
  updateWorkflowEventTrigger,
  type WorkflowEventInputBinding,
  type WorkflowEventTrigger,
  type WorkflowEventTriggerListResponse,
  type WorkflowEventTriggerSourceType
} from '@/services/control-plane/workflowEventTriggerApi';
import type { Workspace } from '@/types';
import { formatUserDateTime } from '@/utils/dateTime';
import { humanizeWorkflowParameterKey } from '@/pages/WorkspaceWorkflowsPage.launchFields';
import {
  draftFromTrigger,
  emptyTriggerDraft,
  issueTextBindings,
  parseContextGrants,
  type SecretDisclosure,
  type TriggerDraft
} from '@/pages/WorkspaceEventTriggersPage.model';

interface WorkspaceEventTriggersPageProps {
  workspace: Workspace;
}

const inputClassName = formInputClassName('mt-2');
const textareaClassName = formTextareaClassName('mt-2');

function triggerStatusTone(trigger: WorkflowEventTrigger): React.ComponentProps<typeof StatusBadge>['tone'] {
  if (trigger.status === 'paused' && trigger.lastStatus === 'auto_paused') return 'warning';
  if (trigger.status === 'enabled') return 'success';
  return 'neutral';
}

function lastStatusTone(status?: WorkflowEventTrigger['lastStatus']): React.ComponentProps<typeof StatusBadge>['tone'] {
  if (status === 'dispatched') return 'success';
  if (status === 'failed' || status === 'rejected') return 'danger';
  if (status === 'auto_paused') return 'warning';
  return 'neutral';
}

export const WorkspaceEventTriggersPage: React.FC<WorkspaceEventTriggersPageProps> = ({ workspace }) => {
  const { t } = useTranslation();
  const [triggerPage, setTriggerPage] = useState<WorkflowEventTriggerListResponse | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowApiDefinition[]>([]);
  const [stateWorkspaceId, setStateWorkspaceId] = useState(workspace.id);
  const [phase, setPhase] = useState<CursorCollectionPhase>('loading');
  const [loadError, setLoadError] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<TriggerDraft>(() => emptyTriggerDraft());
  const [saving, setSaving] = useState(false);
  const [mutatingId, setMutatingId] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const [pendingRotateId, setPendingRotateId] = useState('');
  const [secretDisclosure, setSecretDisclosure] = useState<SecretDisclosure | null>(null);
  const [copyFeedback, setCopyFeedback] = useState('');
  const deleteButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const rotateButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const currentWorkspaceId = useRef(workspace.id);
  const refreshSequence = useRef(0);
  const mutationSequence = useRef(0);
  currentWorkspaceId.current = workspace.id;
  const canManage = hasWorkspacePermission(workspace, 'manage_workflows');

  const refresh = async () => {
    const requestedWorkspaceId = workspace.id;
    const requestSequence = ++refreshSequence.current;
    const isCurrentRequest = () => currentWorkspaceId.current === requestedWorkspaceId
      && refreshSequence.current === requestSequence;
    setPhase(triggerPage === null ? 'loading' : 'refreshing');
    setLoadError('');
    try {
      const [loadedTriggers, loadedWorkflows] = await Promise.all([
        listWorkspaceWorkflowEventTriggers(requestedWorkspaceId),
        listWorkspaceWorkflows(requestedWorkspaceId)
      ]);
      if (!isCurrentRequest()) return;
      setTriggerPage(loadedTriggers);
      setWorkflows(loadedWorkflows);
      setPhase('ready');
    } catch (error) {
      if (!isCurrentRequest()) return;
      setLoadError(error instanceof Error ? error.message : t('eventTriggers.loadError'));
      setPhase('error');
    }
  };

  useEffect(() => {
    refreshSequence.current += 1;
    mutationSequence.current += 1;
    setStateWorkspaceId(workspace.id);
    setTriggerPage(null);
    setSecretDisclosure(null);
    setDrawerOpen(false);
    setDraft(emptyTriggerDraft());
    setSaving(false);
    setMutatingId('');
    setPendingDeleteId('');
    setPendingRotateId('');
    setMutationError('');
    void refresh();
  }, [workspace.id]);

  const workspaceStateCurrent = stateWorkspaceId === workspace.id;
  const triggers = workspaceStateCurrent ? triggerPage?.items || [] : [];
  const activeWorkflows = useMemo(
    () => workspaceStateCurrent ? workflows.filter((workflow) => workflow.status === 'active') : [],
    [workflows, workspaceStateCurrent]
  );
  const workflowOptions = useMemo<Array<SelectOption<string>>>(
    () => workspaceStateCurrent ? workflows.map((workflow) => ({
      value: workflow.id,
      label: workflow.name,
      disabled: workflow.status !== 'active'
    })) : [],
    [workflows, workspaceStateCurrent]
  );
  const selectedWorkflow = workspaceStateCurrent
    ? workflows.find((workflow) => workflow.id === draft.workflowId)
    : undefined;
  const unsupportedIssueParameter = draft.sourceType === 'acornops_event'
    ? selectedWorkflow?.parameters.find((parameter) => parameter.type === 'chat')
    : undefined;
  const missingIssueBinding = draft.sourceType === 'acornops_event'
    ? selectedWorkflow?.parameters.find((parameter) => !draft.inputBindings[parameter.key])
    : undefined;
  const canSave = Boolean(
    draft.name.trim()
    && draft.workflowId
    && !unsupportedIssueParameter
    && !missingIssueBinding
  );

  const openCreate = () => {
    const workflow = activeWorkflows[0];
    setDraft({
      ...emptyTriggerDraft(),
      workflowId: workflow?.id || '',
      approvedContextGrants: workflow?.capabilityPolicy.contextGrants.join('\n') || ''
    });
    setMutationError('');
    setDrawerOpen(true);
  };

  const openEdit = (trigger: WorkflowEventTrigger) => {
    const workflow = workflows.find((candidate) => candidate.id === trigger.workflowId);
    setDraft(draftFromTrigger(
      trigger,
      workflow?.parameters.map((parameter) => parameter.key)
    ));
    setMutationError('');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setMutationError('');
  };

  const save = async () => {
    if (!canManage || !canSave || saving) return;
    const requestedWorkspaceId = workspace.id;
    const requestSequence = ++mutationSequence.current;
    const isCurrentRequest = () => currentWorkspaceId.current === requestedWorkspaceId
      && mutationSequence.current === requestSequence;
    setSaving(true);
    setMutationError('');
    try {
      if (draft.id) {
        await updateWorkflowEventTrigger(requestedWorkspaceId, draft.id, {
          name: draft.name.trim(),
          enabled: draft.enabled,
          inputBindings: draft.sourceType === 'acornops_event' ? draft.inputBindings : {},
          approvedContextGrants: parseContextGrants(draft.approvedContextGrants)
        });
      } else {
        const created = await createWorkflowEventTrigger(requestedWorkspaceId, {
          workflowId: draft.workflowId,
          name: draft.name.trim(),
          enabled: draft.enabled,
          sourceType: draft.sourceType,
          ...(draft.sourceType === 'acornops_event' ? { eventType: 'issue.created.v1' as const } : {}),
          inputBindings: draft.sourceType === 'acornops_event' ? draft.inputBindings : {},
          approvedContextGrants: parseContextGrants(draft.approvedContextGrants)
        });
        if (!isCurrentRequest()) return;
        if (created.webhook) setSecretDisclosure({ ...created.webhook, name: created.trigger.name });
      }
      if (!isCurrentRequest()) return;
      setDrawerOpen(false);
      await refresh();
    } catch (error) {
      if (!isCurrentRequest()) return;
      setMutationError(error instanceof Error ? error.message : t('eventTriggers.saveError'));
    } finally {
      if (isCurrentRequest()) setSaving(false);
    }
  };

  const toggle = async (trigger: WorkflowEventTrigger) => {
    if (!canManage || mutatingId) return;
    const requestedWorkspaceId = workspace.id;
    const requestSequence = ++mutationSequence.current;
    const isCurrentRequest = () => currentWorkspaceId.current === requestedWorkspaceId
      && mutationSequence.current === requestSequence;
    setMutatingId(trigger.id);
    setMutationError('');
    try {
      await updateWorkflowEventTrigger(requestedWorkspaceId, trigger.id, { enabled: trigger.status !== 'enabled' });
      if (!isCurrentRequest()) return;
      await refresh();
    } catch (error) {
      if (!isCurrentRequest()) return;
      setMutationError(error instanceof Error ? error.message : t('eventTriggers.updateError'));
    } finally {
      if (isCurrentRequest()) setMutatingId('');
    }
  };

  const remove = async (trigger: WorkflowEventTrigger) => {
    if (!canManage || mutatingId) return;
    const requestedWorkspaceId = workspace.id;
    const requestSequence = ++mutationSequence.current;
    const isCurrentRequest = () => currentWorkspaceId.current === requestedWorkspaceId
      && mutationSequence.current === requestSequence;
    setMutatingId(trigger.id);
    setMutationError('');
    try {
      await deleteWorkflowEventTrigger(requestedWorkspaceId, trigger.id);
      if (!isCurrentRequest()) return;
      setPendingDeleteId('');
      await refresh();
    } catch (error) {
      if (!isCurrentRequest()) return;
      setMutationError(error instanceof Error ? error.message : t('eventTriggers.deleteError'));
    } finally {
      if (isCurrentRequest()) setMutatingId('');
    }
  };

  const rotateSecret = async (trigger: WorkflowEventTrigger) => {
    if (!canManage || mutatingId || trigger.sourceType !== 'webhook') return;
    const requestedWorkspaceId = workspace.id;
    const requestSequence = ++mutationSequence.current;
    const isCurrentRequest = () => currentWorkspaceId.current === requestedWorkspaceId
      && mutationSequence.current === requestSequence;
    setMutatingId(trigger.id);
    setMutationError('');
    try {
      const rotated = await rotateWorkflowEventTriggerSecret(requestedWorkspaceId, trigger.id);
      if (!isCurrentRequest()) return;
      if (rotated.webhook) setSecretDisclosure({ ...rotated.webhook, name: rotated.trigger.name });
      setPendingRotateId('');
      await refresh();
    } catch (error) {
      if (!isCurrentRequest()) return;
      setMutationError(error instanceof Error ? error.message : t('eventTriggers.rotateError'));
    } finally {
      if (isCurrentRequest()) setMutatingId('');
    }
  };

  const copy = async (value: string, feedback: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(feedback);
    } catch {
      setCopyFeedback(t('eventTriggers.copyError'));
    }
  };

  const setSourceType = (sourceType: WorkflowEventTriggerSourceType) => {
    setDraft((current) => ({ ...current, sourceType, inputBindings: {} }));
  };

  const updateWorkflow = (workflowId: string) => {
    const workflow = workflows.find((candidate) => candidate.id === workflowId);
    setDraft((current) => ({
      ...current,
      workflowId,
      inputBindings: {},
      approvedContextGrants: workflow?.capabilityPolicy.contextGrants.join('\n') || ''
    }));
  };

  return (
    <PageShell>
      <PageHeader
        title={t('eventTriggers.title')}
        description={t('eventTriggers.subtitle', { workspace: workspace.name })}
        actions={<>
          <Button size="md" variant="secondary" onClick={() => void refresh()} disabled={phase === 'loading' || phase === 'refreshing'}>
            <ICONS.RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('common.refresh')}
          </Button>
          <Button size="md" variant="primary" onClick={openCreate} disabled={!canManage || !activeWorkflows.length}>
            <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
            {t('eventTriggers.create')}
          </Button>
        </>}
      />

      {!canManage && <InlineAlert tone="neutral" className="mb-5">{t('eventTriggers.permissionNotice')}</InlineAlert>}
      {!activeWorkflows.length && phase === 'ready' && <InlineAlert tone="warning" className="mb-5">{t('eventTriggers.noActiveWorkflows')}</InlineAlert>}
      {workspaceStateCurrent && mutationError && <InlineAlert tone="danger" className="mb-5">{mutationError}</InlineAlert>}
      {copyFeedback && <p role="status" className="sr-only">{copyFeedback}</p>}

      {workspaceStateCurrent && secretDisclosure && (
        <section className="mb-5 rounded-lg border border-status-success/30 bg-status-success-soft p-4" aria-labelledby="event-trigger-secret-title">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h2 id="event-trigger-secret-title" className="text-sm font-bold text-status-success-text">
                {t('eventTriggers.secret.title', { name: secretDisclosure.name })}
              </h2>
              <p className="mt-1 type-caption text-status-success-text">{t('eventTriggers.secret.description')}</p>
              <dl className="mt-3 grid gap-3">
                <div>
                  <dt className="type-micro-label text-status-success-text">{t('eventTriggers.secret.endpoint')}</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-ui-text">{secretDisclosure.url}</dd>
                </div>
                <div>
                  <dt className="type-micro-label text-status-success-text">{t('eventTriggers.secret.signingSecret')}</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-ui-text">{secretDisclosure.secret}</dd>
                </div>
              </dl>
              <p className="mt-3 max-w-3xl type-caption text-status-success-text">
                {t('eventTriggers.secret.signingHelp')}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button size="sm" onClick={() => void copy(secretDisclosure.url, t('eventTriggers.secret.endpointCopied'))}>{t('eventTriggers.secret.copyEndpoint')}</Button>
              <Button size="sm" onClick={() => void copy(secretDisclosure.secret, t('eventTriggers.secret.secretCopied'))}>{t('eventTriggers.secret.copySecret')}</Button>
              <Button size="sm" variant="tertiary" onClick={() => setSecretDisclosure(null)}>{t('eventTriggers.secret.dismiss')}</Button>
            </div>
          </div>
        </section>
      )}

      <DataSurface
        heading={t('eventTriggers.listTitle')}
        description={t('eventTriggers.listDescription')}
        count={t('eventTriggers.count', { count: triggers.length })}
        icon={<ICONS.Zap className="h-5 w-5" aria-hidden="true" />}
      >
        <CollectionState
          phase={workspaceStateCurrent ? phase : 'loading'}
          itemCount={triggers.length}
          loading={<InlineLoadingIndicator label={t('common.loading')} className="w-full justify-center py-10" />}
          empty={<EmptyState
            embedded
            icon={<ICONS.Zap />}
            title={t('eventTriggers.emptyTitle')}
            description={t('eventTriggers.emptyDescription')}
            actions={canManage && activeWorkflows.length
              ? <Button size="sm" variant="primary" onClick={openCreate}><ICONS.Plus className="h-4 w-4" aria-hidden="true" />{t('eventTriggers.create')}</Button>
              : undefined}
          />}
          error={<EmptyState
            embedded
            role="alert"
            icon={<ICONS.AlertTriangle />}
            title={t('eventTriggers.loadError')}
            description={loadError}
            actions={<Button size="sm" variant="secondary" onClick={() => void refresh()}>{t('common.retry')}</Button>}
          />}
          feedback={loadError ? <InlineAlert tone="danger" className="m-4">{loadError}</InlineAlert> : null}
          announcement={phase === 'refreshing' ? t('eventTriggers.refreshing') : undefined}
        >
          <div className="divide-y divide-ui-border">
            {triggers.map((trigger) => {
              const workflow = workflows.find((candidate) => candidate.id === trigger.workflowId);
              const busy = mutatingId === trigger.id;
              return (
                <article key={trigger.id}>
                  <div className="p-[var(--surface-padding)]">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="type-row-title text-ui-text">{trigger.name}</h3>
                          <StatusBadge tone={triggerStatusTone(trigger)}>
                            {trigger.status === 'paused' && trigger.lastStatus === 'auto_paused'
                              ? t('eventTriggers.status.autoPaused')
                              : trigger.status === 'enabled'
                                ? t('eventTriggers.status.enabled')
                                : t('eventTriggers.status.paused')}
                          </StatusBadge>
                          <StatusBadge tone="neutral">
                            {trigger.sourceType === 'webhook'
                              ? t('eventTriggers.source.webhook')
                              : t('eventTriggers.source.acornopsEvent')}
                          </StatusBadge>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-ui-text">
                          {t('eventTriggers.startsWorkflow', { workflow: workflow?.name || trigger.workflowId })}
                        </p>
                        <p className="mt-1 type-caption text-ui-text-muted">
                          {trigger.sourceType === 'webhook'
                            ? t('eventTriggers.webhookDescription')
                            : t('eventTriggers.issueCreatedDescription')}
                        </p>
                        {trigger.sourceType === 'webhook' && trigger.endpointUrl && (
                          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                            <code className="max-w-full break-all rounded-md border border-ui-border bg-ui-bg px-2 py-1 text-xs text-ui-text-muted">{trigger.endpointUrl}</code>
                            <Button size="sm" variant="tertiary" onClick={() => void copy(trigger.endpointUrl!, t('eventTriggers.secret.endpointCopied'))}>
                              {t('eventTriggers.copyEndpoint')}
                            </Button>
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2 type-caption text-ui-text-muted">
                          {trigger.lastStatus && <StatusBadge tone={lastStatusTone(trigger.lastStatus)}>{t(`eventTriggers.lastStatus.${trigger.lastStatus}`)}</StatusBadge>}
                          <span>
                            {trigger.lastTriggeredAt
                              ? t('eventTriggers.lastTriggered', { time: formatUserDateTime(trigger.lastTriggeredAt, { fallback: trigger.lastTriggeredAt }) })
                              : t('eventTriggers.neverTriggered')}
                          </span>
                        </div>
                        {trigger.lastError && <p className="mt-2 max-w-3xl type-caption text-status-danger-text">{trigger.lastError}</p>}
                      </div>
                      {canManage && (
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button size="sm" onClick={() => openEdit(trigger)} disabled={busy}>{t('eventTriggers.actions.edit')}</Button>
                          <Button size="sm" onClick={() => void toggle(trigger)} disabled={busy}>
                            {trigger.status === 'enabled' ? t('eventTriggers.actions.pause') : t('eventTriggers.actions.resume')}
                          </Button>
                          {trigger.sourceType === 'webhook' && (
                            <Button
                              ref={(node) => {
                                if (node) rotateButtonRefs.current.set(trigger.id, node);
                                else rotateButtonRefs.current.delete(trigger.id);
                              }}
                              size="sm"
                              onClick={() => {
                                setPendingDeleteId('');
                                setPendingRotateId(trigger.id);
                              }}
                              disabled={busy}
                            >
                              {t('eventTriggers.actions.rotateSecret')}
                            </Button>
                          )}
                          <Button
                            ref={(node) => {
                              if (node) deleteButtonRefs.current.set(trigger.id, node);
                              else deleteButtonRefs.current.delete(trigger.id);
                            }}
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setPendingRotateId('');
                              setPendingDeleteId(trigger.id);
                            }}
                            disabled={busy}
                          >
                            {t('eventTriggers.actions.delete')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {pendingRotateId === trigger.id && (
                    <InlineConfirmation
                      id={`rotate-event-trigger-secret-${trigger.id}`}
                      title={t('eventTriggers.rotate.title', { name: trigger.name })}
                      description={t('eventTriggers.rotate.description')}
                      tone="warning"
                      confirmLabel={t('eventTriggers.actions.rotateSecret')}
                      confirmDisabled={busy}
                      cancelLabel={t('common.cancel')}
                      onCancel={() => {
                        setPendingRotateId('');
                        window.requestAnimationFrame(() => rotateButtonRefs.current.get(trigger.id)?.focus({ preventScroll: true }));
                      }}
                      onConfirm={() => void rotateSecret(trigger)}
                      className="border-t border-status-warning/20"
                    />
                  )}
                  {pendingDeleteId === trigger.id && (
                    <InlineConfirmation
                      id={`delete-event-trigger-${trigger.id}`}
                      title={t('eventTriggers.delete.title', { name: trigger.name })}
                      description={t('eventTriggers.delete.description')}
                      tone="danger"
                      confirmLabel={t('eventTriggers.actions.delete')}
                      confirmVariant="danger"
                      confirmDisabled={busy}
                      cancelLabel={t('common.cancel')}
                      onCancel={() => {
                        setPendingDeleteId('');
                        window.requestAnimationFrame(() => deleteButtonRefs.current.get(trigger.id)?.focus({ preventScroll: true }));
                      }}
                      onConfirm={() => void remove(trigger)}
                      className="border-t border-status-danger/20"
                    />
                  )}
                </article>
              );
            })}
          </div>
        </CollectionState>
      </DataSurface>

      <DrawerFrame
        open={workspaceStateCurrent && drawerOpen}
        onClose={closeDrawer}
        closeDisabled={saving}
        titleId="event-trigger-drawer-title"
        title={draft.id ? t('eventTriggers.form.editTitle') : t('eventTriggers.form.createTitle')}
        description={t('eventTriggers.form.description')}
        closeLabel={t('common.close')}
        width="lg"
        bodyClassName="space-y-5"
        footer={<>
          <Button size="sm" variant="tertiary" onClick={closeDrawer} disabled={saving}>{t('common.cancel')}</Button>
          <Button size="sm" variant="primary" onClick={() => void save()} disabled={!canSave || saving}>
            {saving ? t('eventTriggers.form.saving') : t('eventTriggers.form.save')}
          </Button>
        </>}
      >
        {mutationError && <InlineAlert tone="danger">{mutationError}</InlineAlert>}
        <label className="block text-sm font-semibold text-ui-text">
          {t('eventTriggers.form.name')}
          <input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            className={inputClassName}
            maxLength={120}
          />
        </label>
        <label className="block text-sm font-semibold text-ui-text">
          {t('eventTriggers.form.workflow')}
          <Select<string>
            value={draft.workflowId}
            options={workflowOptions}
            onChange={updateWorkflow}
            disabled={Boolean(draft.id)}
            className="mt-2"
            ariaLabel={t('eventTriggers.form.workflow')}
          />
          <span className="mt-1 block type-caption text-ui-text-muted">{t('eventTriggers.form.workflowHelp')}</span>
        </label>
        <label className="block text-sm font-semibold text-ui-text">
          {t('eventTriggers.form.source')}
          <Select<WorkflowEventTriggerSourceType>
            value={draft.sourceType}
            options={[
              { value: 'acornops_event', label: t('eventTriggers.source.acornopsEvent') },
              { value: 'webhook', label: t('eventTriggers.source.webhook') }
            ]}
            onChange={setSourceType}
            disabled={Boolean(draft.id)}
            className="mt-2"
            ariaLabel={t('eventTriggers.form.source')}
          />
          <span className="mt-1 block type-caption text-ui-text-muted">{t('eventTriggers.form.sourceHelp')}</span>
        </label>

        {draft.sourceType === 'acornops_event' ? (
          <section className="rounded-lg border border-ui-border bg-ui-bg p-4">
            <h3 className="type-row-title text-ui-text">{t('eventTriggers.form.issueCreated')}</h3>
            <p className="mt-1 type-caption text-ui-text-muted">{t('eventTriggers.form.issueCreatedHelp')}</p>
            {unsupportedIssueParameter ? (
              <InlineAlert tone="warning" className="mt-4">
                {t('eventTriggers.form.chatUnsupported', { parameter: humanizeWorkflowParameterKey(unsupportedIssueParameter.key) })}
              </InlineAlert>
            ) : selectedWorkflow?.parameters.length ? (
              <div className="mt-4 grid gap-4">
                {selectedWorkflow.parameters.map((parameter) => {
                  const bindings = parameter.type === 'target' ? ['target.id' as const] : issueTextBindings;
                  return (
                    <label key={parameter.key} className="block text-sm font-semibold text-ui-text">
                      {humanizeWorkflowParameterKey(parameter.key)}
                      <Select<WorkflowEventInputBinding | ''>
                        value={draft.inputBindings[parameter.key] || ''}
                        options={[
                          { value: '', label: t('eventTriggers.form.selectBinding') },
                          ...bindings.map((binding) => ({ value: binding, label: t(`eventTriggers.bindings.${binding.replace('.', '_')}`) }))
                        ]}
                        onChange={(binding) => setDraft((current) => ({
                          ...current,
                          inputBindings: binding
                            ? { ...current.inputBindings, [parameter.key]: binding }
                            : Object.fromEntries(Object.entries(current.inputBindings).filter(([name]) => name !== parameter.key))
                        }))}
                        className="mt-2"
                        ariaLabel={t('eventTriggers.form.bindingLabel', { parameter: humanizeWorkflowParameterKey(parameter.key) })}
                      />
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 type-caption text-ui-text-muted">{t('eventTriggers.form.noInputs')}</p>
            )}
          </section>
        ) : (
          <InlineAlert tone="neutral">{t('eventTriggers.form.webhookHelp')}</InlineAlert>
        )}

        <div className="block text-sm font-semibold text-ui-text">
          {t('eventTriggers.form.runsAs')}
          <div className="mt-2 min-h-11 rounded-md border border-ui-border bg-ui-bg px-3 py-2.5 font-normal text-ui-text">
            {draft.principalId || t('eventTriggers.form.currentUser')}
          </div>
          <span className="mt-1 block type-caption text-ui-text-muted">{t('eventTriggers.form.runsAsHelp')}</span>
        </div>
        <label className="block text-sm font-semibold text-ui-text">
          {t('eventTriggers.form.approvedContextGrants')}
          <textarea
            value={draft.approvedContextGrants}
            onChange={(event) => setDraft((current) => ({ ...current, approvedContextGrants: event.target.value }))}
            className={textareaClassName}
            rows={3}
          />
          <span className="mt-1 block type-caption text-ui-text-muted">{t('eventTriggers.form.approvedContextGrantsHelp')}</span>
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold text-ui-text">
          <Checkbox checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} />
          {t('eventTriggers.form.enabled')}
        </label>
      </DrawerFrame>
    </PageShell>
  );
};
