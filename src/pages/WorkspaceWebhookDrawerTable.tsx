import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  Button,
  CollectionState,
  DataSurface,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
  InlineConfirmation,
  InlineLoadingIndicator,
  StatusBadge
} from '@acornops/ui';
import { ICONS } from '@/constants';
import { WorkspaceWebhookActionMenu, WorkspaceWebhookCard } from '@/pages/WorkspaceWebhookCard';
import type { CursorCollectionPhase } from '@/hooks/resourceLifecycle';
import type { WorkflowWebhook } from '@/services/control-plane/workflowWebhookApi';

interface WorkspaceWebhookDrawerTableProps {
  actionButtonRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  canManage: boolean;
  loadError: string;
  mutatingId: string;
  onCopyEndpoint: (endpoint: string) => void;
  onEdit: (trigger: WorkflowWebhook) => void;
  onRequestDelete: (trigger: WorkflowWebhook) => void;
  onRequestRotate: (trigger: WorkflowWebhook) => void;
  onRetry: () => void;
  onRotate: (trigger: WorkflowWebhook) => void;
  onToggle: (trigger: WorkflowWebhook) => void;
  pendingRotateId: string;
  phase: CursorCollectionPhase;
  setPendingRotateId: React.Dispatch<React.SetStateAction<string>>;
  triggers: WorkflowWebhook[];
}

export const WorkspaceWebhookDrawerTable: React.FC<WorkspaceWebhookDrawerTableProps> = ({
  actionButtonRefs,
  canManage,
  loadError,
  mutatingId,
  onCopyEndpoint,
  onEdit,
  onRequestDelete,
  onRequestRotate,
  onRetry,
  onRotate,
  onToggle,
  pendingRotateId,
  phase,
  setPendingRotateId,
  triggers
}) => {
  const { t } = useTranslation();
  const pendingRotateTrigger = triggers.find((trigger) => trigger.id === pendingRotateId);
  return (
    <>
      <DataSurface aria-label={t('eventTriggers.listTitle')}>
        <div className="divide-y divide-ui-border lg:hidden">
          {triggers.length > 0 ? triggers.map((trigger) => (
            <WorkspaceWebhookCard
              key={trigger.id}
              trigger={trigger}
              workflowName={trigger.workflowId}
              canManage={canManage}
              busy={mutatingId === trigger.id}
              pendingRotate={pendingRotateId === trigger.id}
              actionButtonRefs={actionButtonRefs}
              onCopyEndpoint={onCopyEndpoint}
              onEdit={() => onEdit(trigger)}
              onToggle={() => onToggle(trigger)}
              onRequestRotate={() => onRequestRotate(trigger)}
              onCancelRotate={() => setPendingRotateId('')}
              onConfirmRotate={() => onRotate(trigger)}
              onRequestDelete={() => onRequestDelete(trigger)}
            />
          )) : (
            <CollectionState
              phase={phase}
              itemCount={0}
              loading={<InlineLoadingIndicator label={t('common.loading')} className="w-full justify-center py-10" />}
              empty={<EmptyState embedded icon={<ICONS.Zap />} title={t('eventTriggers.emptyTitle')} description={t('eventTriggers.emptyDescription')} />}
              error={<EmptyState embedded role="alert" icon={<ICONS.AlertTriangle />} title={t('eventTriggers.loadError')} description={loadError} actions={<Button size="sm" variant="secondary" onClick={onRetry}>{t('common.retry')}</Button>} />}
            >
              {null}
            </CollectionState>
          )}
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <DataTable caption={t('eventTriggers.listTitle')} className="min-w-[42rem] w-full border-collapse text-left">
            <DataTableHeader collectionState={{ phase, itemCount: triggers.length }}>
              <DataTableRow>
                <DataTableHeaderCell density="dense">{t('eventTriggers.columns.trigger')}</DataTableHeaderCell>
                <DataTableHeaderCell density="dense">{t('eventTriggers.secret.endpoint')}</DataTableHeaderCell>
                <DataTableHeaderCell density="dense">{t('common.status')}</DataTableHeaderCell>
                <DataTableHeaderCell density="dense">{t('eventTriggers.lastDispatch', { defaultValue: 'Last dispatch' })}</DataTableHeaderCell>
                <DataTableHeaderCell density="dense" numeric>{t('eventTriggers.columns.actions')}</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody className="divide-y divide-ui-border">
              {triggers.length > 0 ? triggers.map((trigger) => (
                <DataTableRow key={trigger.id}>
                  <DataTableCell as="th" scope="row" className="px-4 py-3 type-emphasis text-ui-text">{trigger.name}</DataTableCell>
                  <DataTableCell className="max-w-64 px-4 py-3">
                    <code className="block truncate type-caption text-ui-text-muted" title={trigger.endpointUrl}>{trigger.endpointUrl || '—'}</code>
                  </DataTableCell>
                  <DataTableCell className="px-4 py-3">
                    <StatusBadge tone={trigger.status === 'enabled' ? 'success' : 'neutral'}>
                      {trigger.status === 'enabled' ? t('eventTriggers.status.enabled') : t('eventTriggers.status.paused')}
                    </StatusBadge>
                  </DataTableCell>
                  <DataTableCell className="px-4 py-3 type-caption text-ui-text-muted">
                    {trigger.lastStatus ? trigger.lastStatus.replaceAll('_', ' ') : t('eventTriggers.emptyDescription')}
                  </DataTableCell>
                  <DataTableCell className="px-4 py-3">
                    <div className="flex justify-end">
                      <WorkspaceWebhookActionMenu
                        trigger={trigger}
                        workflowName={trigger.workflowId}
                        canManage={canManage}
                        busy={mutatingId === trigger.id}
                        pendingRotate={pendingRotateId === trigger.id}
                        actionButtonRefs={actionButtonRefs}
                        onCopyEndpoint={onCopyEndpoint}
                        onEdit={() => onEdit(trigger)}
                        onToggle={() => onToggle(trigger)}
                        onRequestRotate={() => onRequestRotate(trigger)}
                        onCancelRotate={() => setPendingRotateId('')}
                        onConfirmRotate={() => onRotate(trigger)}
                        onRequestDelete={() => onRequestDelete(trigger)}
                      />
                    </div>
                  </DataTableCell>
                </DataTableRow>
              )) : (
                <DataTableRow>
                  <DataTableCell colSpan={5} className="p-0">
                    <CollectionState
                      phase={phase}
                      itemCount={0}
                      loading={<InlineLoadingIndicator label={t('common.loading')} className="w-full justify-center py-10" />}
                      empty={<EmptyState embedded icon={<ICONS.Zap />} title={t('eventTriggers.emptyTitle')} description={t('eventTriggers.emptyDescription')} />}
                      error={<EmptyState embedded role="alert" icon={<ICONS.AlertTriangle />} title={t('eventTriggers.loadError')} description={loadError} actions={<Button size="sm" variant="secondary" onClick={onRetry}>{t('common.retry')}</Button>} />}
                    >
                      {null}
                    </CollectionState>
                  </DataTableCell>
                </DataTableRow>
              )}
            </DataTableBody>
          </DataTable>
        </div>
      </DataSurface>
      {pendingRotateTrigger && (
        <InlineConfirmation
          id={`rotate-workflow-webhook-secret-${pendingRotateTrigger.id}`}
          title={t('eventTriggers.rotate.title', { name: pendingRotateTrigger.name })}
          description={t('eventTriggers.rotate.description')}
          tone="warning"
          confirmLabel={t('eventTriggers.actions.rotateSecret')}
          confirmDisabled={Boolean(mutatingId)}
          cancelLabel={t('common.cancel')}
          onCancel={() => setPendingRotateId('')}
          onConfirm={() => onRotate(pendingRotateTrigger)}
          className="mt-4"
        />
      )}
    </>
  );
};
