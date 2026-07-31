import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { hasWorkspacePermission } from '@/app/workspacePermissions';
import { Button } from '@acornops/ui';
import { Checkbox } from '@acornops/ui';
import { CollectionState } from '@acornops/ui';
import { DataTableGridHeader, DataTableGridHeaderCell } from '@acornops/ui';
import { createDiscoveryFilterGroup, DiscoveryFilterBar } from '@acornops/ui';
import { EmptyState } from '@acornops/ui';
import { InlineAlert } from '@acornops/ui';
import { InlineLoadingIndicator } from '@acornops/ui';
import { DialogFrame } from '@acornops/ui';
import { DataSurface, PageHeader, PageShell } from '@acornops/ui';
import { Select, type SelectOption } from '@acornops/ui';
import { formInputClassName, formTextareaClassName } from '@acornops/ui';
import { ICONS } from '@/constants';
import type { CursorCollectionPhase } from '@/hooks/resourceLifecycle';
import { listWorkspaceWorkflows, type WorkflowApiDefinition } from '@/services/control-plane/workflowApi';
import {
  createWorkflowWebhook,
  deleteWorkflowWebhook,
  listWorkspaceWorkflowWebhooks,
  rotateWorkflowWebhookSecret,
  updateWorkflowWebhook,
  type WorkflowWebhook,
  type WorkflowWebhookListResponse
} from '@/services/control-plane/workflowWebhookApi';
import type { Workspace } from '@/types';
import { WorkspaceWebhookCard, workspaceWebhookLedgerGridClass } from '@/pages/WorkspaceWebhookCard';
import { WorkspaceWebhookDrawerTable } from '@/pages/WorkspaceWebhookDrawerTable';
import { WorkspaceWebhookDeleteDialog } from '@/pages/WorkspaceWebhookDeleteDialog';
import { updateUrlSearch, useUrlSearchState } from '@/hooks/useUrlSearchState';
import {
  draftFromWebhook,
  emptyWebhookDraft,
  parseContextGrants,
  type SecretDisclosure,
  type WebhookDraft
} from '@/pages/WorkspaceIncomingWebhooksPage.model';
import { TextInput, Textarea } from '@acornops/ui';

interface WorkspaceIncomingWebhooksPageProps {
  workspace: Workspace;
  create?: boolean;
  createWorkflowId?: string;
  constrainedWorkflowId?: string;
  embedded?: boolean;
}

type TriggerStatusFilter = 'all' | 'enabled' | 'paused';

const inputClassName = formInputClassName('mt-2');
const eventTriggerTextareaClassName = formTextareaClassName('mt-2');

export const WorkspaceIncomingWebhooksPage: React.FC<WorkspaceIncomingWebhooksPageProps> = ({
  workspace,
  create,
  createWorkflowId,
  constrainedWorkflowId,
  embedded = false
}) => {
  const { t } = useTranslation();
  const urlSearch = useUrlSearchState();
  const [triggerPage, setTriggerPage] = useState<WorkflowWebhookListResponse | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowApiDefinition[]>([]);
  const [stateWorkspaceId, setStateWorkspaceId] = useState(workspace.id);
  const [phase, setPhase] = useState<CursorCollectionPhase>('loading');
  const [loadError, setLoadError] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<WebhookDraft>(() => emptyWebhookDraft());
  const consumedCreateIntentRef = useRef('');
  const [saving, setSaving] = useState(false);
  const [mutatingId, setMutatingId] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const [pendingRotateId, setPendingRotateId] = useState('');
  const [secretDisclosure, setSecretDisclosure] = useState<SecretDisclosure | null>(null);
  const [copyFeedback, setCopyFeedback] = useState('');
  const actionButtonRefs = useRef(new Map<string, HTMLButtonElement>());
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
        listWorkspaceWorkflowWebhooks(requestedWorkspaceId),
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
    setDraft(emptyWebhookDraft());
    setSaving(false);
    setMutatingId('');
    setPendingDeleteId('');
    setPendingRotateId('');
    setMutationError('');
    void refresh();
  }, [workspace.id]);

  const workspaceStateCurrent = stateWorkspaceId === workspace.id;
  const triggers = workspaceStateCurrent ? triggerPage?.items || [] : [];
  const query = embedded ? '' : urlSearch.get('q') || '';
  const status = !embedded && (urlSearch.get('status') === 'enabled' || urlSearch.get('status') === 'paused')
    ? urlSearch.get('status') as Exclude<TriggerStatusFilter, 'all'>
    : 'all';
  const workflowFilter = constrainedWorkflowId || urlSearch.get('workflow') || 'all';
  const normalizedQuery = query.trim().toLowerCase();
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
  const searchLabel = t('eventTriggers.filters.searchIncomingWebhooks');
  const visibleTriggers = useMemo(() => triggers.filter((trigger) => {
    if (status !== 'all' && trigger.status !== status) return false;
    if (workflowFilter !== 'all' && trigger.workflowId !== workflowFilter) return false;
    if (!normalizedQuery) return true;
    const workflow = workflows.find((candidate) => candidate.id === trigger.workflowId);
    return [
      trigger.name,
      workflow?.name,
      trigger.endpointUrl
    ].some((value) => value?.toLowerCase().includes(normalizedQuery));
  }), [normalizedQuery, status, workflowFilter, workflows, triggers]);
  const hasActiveFilters = Boolean(normalizedQuery || status !== 'all' || workflowFilter !== 'all');
  const clearFilters = () => {
    updateUrlSearch(
      { q: null, status: null, workflow: null },
      { replace: true }
    );
    window.requestAnimationFrame(() => document.getElementById('workflow-triggers-search')?.focus());
  };
  const canSave = Boolean(draft.name.trim() && draft.workflowId);
  const deleteTargetTrigger = pendingDeleteId
    ? triggers.find((trigger) => trigger.id === pendingDeleteId)
    : undefined;

  const openCreate = (workflowId?: string) => {
    const workflow = activeWorkflows.find((candidate) => candidate.id === workflowId)
      || activeWorkflows[0];
    setDraft({
      ...emptyWebhookDraft(),
      workflowId: workflow?.id || '',
      approvedContextGrants: workflow?.capabilityPolicy.contextGrants.join('\n') || ''
    });
    setMutationError('');
    setDrawerOpen(true);
  };

  useEffect(() => {
    const intent = createWorkflowId ? `workflow:${createWorkflowId}` : create ? 'webhook' : '';
    if (!intent || phase !== 'ready' || !canManage || !activeWorkflows.length
      || consumedCreateIntentRef.current === intent) return;
    consumedCreateIntentRef.current = intent;
    openCreate(createWorkflowId);
  }, [activeWorkflows.length, canManage, create, createWorkflowId, phase]);

  const openEdit = (trigger: WorkflowWebhook) => {
    setDraft(draftFromWebhook(trigger));
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
        await updateWorkflowWebhook(requestedWorkspaceId, draft.id, {
          name: draft.name.trim(),
          enabled: draft.enabled,
          approvedContextGrants: parseContextGrants(draft.approvedContextGrants)
        });
      } else {
        const created = await createWorkflowWebhook(requestedWorkspaceId, {
          workflowId: draft.workflowId,
          name: draft.name.trim(),
          enabled: draft.enabled,
          approvedContextGrants: parseContextGrants(draft.approvedContextGrants)
        });
        if (!isCurrentRequest()) return;
        setSecretDisclosure({ ...created.signingSecret, name: created.webhook.name });
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

  const toggle = async (trigger: WorkflowWebhook) => {
    if (!canManage || mutatingId) return;
    const requestedWorkspaceId = workspace.id;
    const requestSequence = ++mutationSequence.current;
    const isCurrentRequest = () => currentWorkspaceId.current === requestedWorkspaceId
      && mutationSequence.current === requestSequence;
    setMutatingId(trigger.id);
    setMutationError('');
    try {
      await updateWorkflowWebhook(requestedWorkspaceId, trigger.id, { enabled: trigger.status !== 'enabled' });
      if (!isCurrentRequest()) return;
      await refresh();
    } catch (error) {
      if (!isCurrentRequest()) return;
      setMutationError(error instanceof Error ? error.message : t('eventTriggers.updateError'));
    } finally {
      if (isCurrentRequest()) setMutatingId('');
    }
  };

  const remove = async (trigger: WorkflowWebhook) => {
    if (!canManage || mutatingId) return;
    const requestedWorkspaceId = workspace.id;
    const requestSequence = ++mutationSequence.current;
    const isCurrentRequest = () => currentWorkspaceId.current === requestedWorkspaceId
      && mutationSequence.current === requestSequence;
    setMutatingId(trigger.id);
    setMutationError('');
    try {
      await deleteWorkflowWebhook(requestedWorkspaceId, trigger.id);
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

  const rotateSecret = async (trigger: WorkflowWebhook) => {
    if (!canManage || mutatingId) return;
    const requestedWorkspaceId = workspace.id;
    const requestSequence = ++mutationSequence.current;
    const isCurrentRequest = () => currentWorkspaceId.current === requestedWorkspaceId
      && mutationSequence.current === requestSequence;
    setMutatingId(trigger.id);
    setMutationError('');
    try {
      const rotated = await rotateWorkflowWebhookSecret(requestedWorkspaceId, trigger.id);
      if (!isCurrentRequest()) return;
      setSecretDisclosure({ ...rotated.signingSecret, name: rotated.webhook.name });
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

  const updateWorkflow = (workflowId: string) => {
    const workflow = workflows.find((candidate) => candidate.id === workflowId);
    setDraft((current) => ({
      ...current,
      workflowId,
      approvedContextGrants: workflow?.capabilityPolicy.contextGrants.join('\n') || ''
    }));
  };

  return (
    <PageShell embedded={embedded} className={embedded ? 'p-4 sm:p-5' : undefined}>
      {!embedded && <PageHeader
        title={t('eventTriggers.title')}
        description={t('eventTriggers.subtitle', { workspace: workspace.name })}
        actions={<>
          <Button size="md" variant="secondary" onClick={() => void refresh()} disabled={phase === 'loading' || phase === 'refreshing'}>
            <ICONS.RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('common.refresh')}
          </Button>
          <Button size="md" variant="primary" onClick={() => openCreate()} disabled={!canManage || !activeWorkflows.length}>
            <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
            {t('eventTriggers.actions.create')}
          </Button>
        </>}
      />}
      {embedded && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="type-caption text-ui-text-muted">
            {t('eventTriggers.count', { count: visibleTriggers.length })}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => void refresh()} disabled={phase === 'loading' || phase === 'refreshing'}>
              <ICONS.RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t('common.refresh')}
            </Button>
            <Button size="sm" variant="primary" onClick={() => openCreate(constrainedWorkflowId)} disabled={!canManage || !activeWorkflows.length}>
              <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
              {t('eventTriggers.actions.create')}
            </Button>
          </div>
        </div>
      )}

      {!canManage && <InlineAlert tone="neutral" className="mb-5">{t('eventTriggers.permissionNotice')}</InlineAlert>}
      {!activeWorkflows.length && phase === 'ready' && <InlineAlert tone="warning" className="mb-5">{t('eventTriggers.noActiveWorkflows')}</InlineAlert>}
      {workspaceStateCurrent && mutationError && !deleteTargetTrigger && <InlineAlert tone="danger" className="mb-5">{mutationError}</InlineAlert>}
      {copyFeedback && <p role="status" className="sr-only">{copyFeedback}</p>}

      {workspaceStateCurrent && secretDisclosure && (
        <section className="mb-5 rounded-lg border border-status-success/30 bg-status-success-soft p-4" aria-labelledby="workflow-webhook-secret-title">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h2 id="workflow-webhook-secret-title" className="type-row-title text-status-success-text">
                {t('eventTriggers.secret.title', { name: secretDisclosure.name })}
              </h2>
              <p className="mt-1 type-caption text-status-success-text">{t('eventTriggers.secret.description')}</p>
              <dl className="mt-3 grid gap-3">
                <div>
                  <dt className="type-micro-label text-status-success-text">{t('eventTriggers.secret.endpoint')}</dt>
                  <dd className="mt-1 break-all font-mono type-caption text-ui-text">{secretDisclosure.url}</dd>
                </div>
                <div>
                  <dt className="type-micro-label text-status-success-text">{t('eventTriggers.secret.signingSecret')}</dt>
                  <dd className="mt-1 break-all font-mono type-caption text-ui-text">{secretDisclosure.secret}</dd>
                </div>
              </dl>
              <p className="mt-3 max-w-3xl type-caption text-status-success-text">
                {t('eventTriggers.secret.signingHelp')}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => void copy(secretDisclosure.url, t('eventTriggers.secret.endpointCopied'))}>{t('eventTriggers.secret.copyEndpoint')}</Button>
              <Button variant="secondary" size="sm" onClick={() => void copy(secretDisclosure.secret, t('eventTriggers.secret.secretCopied'))}>{t('eventTriggers.secret.copySecret')}</Button>
              <Button size="sm" variant="tertiary" onClick={() => setSecretDisclosure(null)}>{t('eventTriggers.secret.dismiss')}</Button>
            </div>
          </div>
        </section>
      )}

      {!embedded && <DiscoveryFilterBar
        idPrefix="workflow-triggers"
        query={query}
        queryLabel={searchLabel}
        queryPlaceholder={searchLabel}
        queryClearLabel={t('common.clearSearch')}
        resultSummary={hasActiveFilters
          ? t('eventTriggers.filters.showing', { count: visibleTriggers.length, total: triggers.length })
          : t('eventTriggers.count', { count: triggers.length })}
        filters={[
          createDiscoveryFilterGroup<TriggerStatusFilter>({
            id: 'status',
            label: t('eventTriggers.filters.status'),
            value: status,
            defaultValue: 'all',
            options: [
              { value: 'all', label: t('eventTriggers.filters.allStatuses'), count: triggers.length },
              { value: 'enabled', label: t('eventTriggers.status.enabled'), count: triggers.filter((trigger) => trigger.status === 'enabled').length },
              { value: 'paused', label: t('eventTriggers.status.paused'), count: triggers.filter((trigger) => trigger.status === 'paused').length }
            ],
            onChange: (value) => updateUrlSearch({ status: value === 'all' ? null : value })
          }),
          createDiscoveryFilterGroup<string>({
            id: 'workflow',
            label: t('eventTriggers.filters.workflow'),
            value: workflowFilter,
            defaultValue: 'all',
            options: [
              { value: 'all', label: t('eventTriggers.filters.allWorkflows') },
              ...workflows.map((workflow) => ({ value: workflow.id, label: workflow.name }))
            ],
            onChange: (value) => updateUrlSearch({ workflow: value === 'all' ? null : value })
          })
        ]}
        clearAllLabel={t('common.clearAll')}
        onQueryChange={(value) => updateUrlSearch({ q: value || null }, { replace: true })}
        onClearAll={clearFilters}
        className="mb-4"
      />}
      {embedded ? (
        <WorkspaceWebhookDrawerTable
          actionButtonRefs={actionButtonRefs}
          canManage={canManage}
          loadError={loadError}
          mutatingId={mutatingId}
          onCopyEndpoint={(endpoint) => void copy(endpoint, t('eventTriggers.secret.endpointCopied'))}
          onEdit={openEdit}
          onRequestDelete={(trigger) => {
            setPendingRotateId('');
            setMutationError('');
            setPendingDeleteId(trigger.id);
          }}
          onRequestRotate={(trigger) => {
            setPendingDeleteId('');
            setPendingRotateId(trigger.id);
          }}
          onRetry={() => void refresh()}
          onRotate={(trigger) => void rotateSecret(trigger)}
          onToggle={(trigger) => void toggle(trigger)}
          pendingRotateId={pendingRotateId}
          phase={workspaceStateCurrent ? phase : 'loading'}
          setPendingRotateId={setPendingRotateId}
          triggers={visibleTriggers}
        />
      ) : (
      <DataSurface aria-label={t('eventTriggers.listTitle')}>
        <DataTableGridHeader showAt="xl" className={workspaceWebhookLedgerGridClass} collectionState={{ phase: workspaceStateCurrent ? phase : 'loading', itemCount: visibleTriggers.length }}>
          <DataTableGridHeaderCell>{t('eventTriggers.columns.trigger')}</DataTableGridHeaderCell>
          <DataTableGridHeaderCell>{t('eventTriggers.columns.workflow')}</DataTableGridHeaderCell>
          <DataTableGridHeaderCell>{t('eventTriggers.columns.configuration')}</DataTableGridHeaderCell>
          <DataTableGridHeaderCell>{t('workflowActivity.activity')}</DataTableGridHeaderCell>
          <DataTableGridHeaderCell numeric>{t('eventTriggers.columns.actions')}</DataTableGridHeaderCell>
        </DataTableGridHeader>
        <CollectionState
          phase={workspaceStateCurrent ? phase : 'loading'}
          itemCount={visibleTriggers.length}
          loading={<InlineLoadingIndicator label={t('common.loading')} className="w-full justify-center py-10" />}
          empty={<EmptyState
            embedded
            icon={hasActiveFilters ? <ICONS.Search /> : <ICONS.Zap />}
            title={hasActiveFilters
              ? t('eventTriggers.filters.emptyTitle')
              : t('eventTriggers.emptyTitle')}
            description={hasActiveFilters
              ? t('eventTriggers.filters.emptyDescription')
              : t('eventTriggers.emptyDescription')}
            actions={hasActiveFilters
              ? <Button size="sm" variant="secondary" onClick={clearFilters}>{t('common.clearAll')}</Button>
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
          announcement={phase === 'refreshing'
            ? t('eventTriggers.refreshing')
            : phase === 'ready'
              ? t('eventTriggers.filters.showing', { count: visibleTriggers.length, total: triggers.length })
              : undefined}
        >
          <div className="divide-y divide-ui-border">
            {visibleTriggers.map((trigger) => {
              const workflow = workflows.find((candidate) => candidate.id === trigger.workflowId);
              const busy = mutatingId === trigger.id;
              return (
                <WorkspaceWebhookCard
                  key={trigger.id}
                  trigger={trigger}
                  workflowName={workflow?.name || trigger.workflowId}
                  canManage={canManage}
                  busy={busy}
                  pendingRotate={pendingRotateId === trigger.id}
                  actionButtonRefs={actionButtonRefs}
                  onCopyEndpoint={(endpoint) => void copy(endpoint, t('eventTriggers.secret.endpointCopied'))}
                  onEdit={() => openEdit(trigger)}
                  onToggle={() => void toggle(trigger)}
                  onRequestRotate={() => {
                    setPendingDeleteId('');
                    setPendingRotateId(trigger.id);
                  }}
                  onCancelRotate={() => {
                    setPendingRotateId('');
                    window.requestAnimationFrame(() => actionButtonRefs.current.get(trigger.id)?.focus({ preventScroll: true }));
                  }}
                  onConfirmRotate={() => void rotateSecret(trigger)}
                  onRequestDelete={() => {
                    setPendingRotateId('');
                    setMutationError('');
                    setPendingDeleteId(trigger.id);
                  }}
                />
              );
            })}
          </div>
        </CollectionState>
      </DataSurface>
      )}
      <WorkspaceWebhookDeleteDialog
        webhook={deleteTargetTrigger}
        error={mutationError}
        pending={Boolean(deleteTargetTrigger && mutatingId === deleteTargetTrigger.id)}
        onCancel={() => {
          if (!deleteTargetTrigger || mutatingId) return;
          const triggerId = deleteTargetTrigger.id;
          setPendingDeleteId('');
          setMutationError('');
          window.requestAnimationFrame(() => actionButtonRefs.current.get(triggerId)?.focus({ preventScroll: true }));
        }}
        onConfirm={() => {
          if (deleteTargetTrigger) void remove(deleteTargetTrigger);
        }}
      />
      <DialogFrame
        open={workspaceStateCurrent && drawerOpen}
        onClose={closeDrawer}
        closeDisabled={saving}
        titleId="workflow-webhook-drawer-title"
        title={draft.id
          ? t('eventTriggers.form.editTitle')
          : t('eventTriggers.form.createTitle')}
        description={t('eventTriggers.form.description')}
        closeLabel={t('common.close')}
        width="md"
        className="max-h-[min(80vh,36rem)]"
        bodyClassName="space-y-4"
        footer={<>
          <Button size="sm" variant="tertiary" onClick={closeDrawer} disabled={saving}>{t('common.cancel')}</Button>
          <Button size="sm" variant="primary" onClick={() => void save()} disabled={!canSave || saving}>
            {saving ? t('eventTriggers.form.saving') : t('eventTriggers.form.save')}
          </Button>
        </>}
      >
        {mutationError && <InlineAlert tone="danger">{mutationError}</InlineAlert>}
        <label className="block type-body type-emphasis text-ui-text">
          {t('eventTriggers.form.name')}
          <TextInput
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            className={inputClassName}
            maxLength={120}
          />
        </label>
        <label className="block type-body type-emphasis text-ui-text">
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
        <InlineAlert tone="neutral">{t('eventTriggers.form.webhookHelp')}</InlineAlert>

        <div className="block type-body type-emphasis text-ui-text">
          {t('eventTriggers.form.runsAs')}
          <div className="mt-2 min-h-11 rounded-md border border-ui-border bg-ui-bg px-3 py-2.5 type-body text-ui-text">
            {draft.principalId || t('eventTriggers.form.currentUser')}
          </div>
          <span className="mt-1 block type-caption text-ui-text-muted">{t('eventTriggers.form.runsAsHelp')}</span>
        </div>
        <label className="block type-body type-emphasis text-ui-text">
          {t('eventTriggers.form.approvedContextGrants')}
          <Textarea
            value={draft.approvedContextGrants}
            onChange={(event) => setDraft((current) => ({ ...current, approvedContextGrants: event.target.value }))}
            className={eventTriggerTextareaClassName}
            rows={3}
          />
          <span className="mt-1 block type-caption text-ui-text-muted">{t('eventTriggers.form.approvedContextGrantsHelp')}</span>
        </label>
        <label className="flex items-center gap-3 type-body type-emphasis text-ui-text">
          <Checkbox checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} />
          {t('eventTriggers.form.enabled')}
        </label>
      </DialogFrame>
    </PageShell>
  );
};
