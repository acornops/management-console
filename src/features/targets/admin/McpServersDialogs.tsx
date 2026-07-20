import React from 'react';
import { motion } from 'framer-motion';
import { Plus, ShieldCheck, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { CloseButton } from '@/components/common/ComponentVocabulary';
import { Switch } from '@/components/common/FormControls';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { ModalStepIndicator } from '@/components/common/ModalStepIndicator';
import { Select, SelectOption } from '@/components/common/Select';
import { formInputClassName } from '@/components/common/formControlStyles';
import type { TargetToolCatalogItem, TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';
import { getToolLabel, ServerFormState } from '@/features/targets/admin/mcpServersCatalog';
import { modalOverlayMotion, modalPanelMotion } from '@/lib/motion';
import { McpCredentialOwnershipSelector } from '@/features/catalog/McpCredentialOwnershipSelector';
import { InlineConfirmation } from '@/components/common/InlineConfirmation';

const mcpServerInputClassName = formInputClassName('px-4 font-medium');
const mcpPublicHeaderInputClassName = formInputClassName('min-h-10 min-w-0 font-medium');

export const McpServerFormDialog: React.FC<{
  mode: 'create' | 'edit';
  createStep?: 'configure' | 'review';
  urlReadOnly: boolean;
  form: ServerFormState;
  mutationError: string | null;
  pending: boolean;
  isValid: boolean;
  publicHeadersValidationError: string | null;
  reviewServer?: TargetToolCatalogServer | null;
  reviewToolsLoading?: boolean;
  reviewToolsError?: string | null;
  canManageTools?: boolean;
  pendingToolName?: string | null;
  onClose: () => void;
  onFormChange: React.Dispatch<React.SetStateAction<ServerFormState>>;
  onSubmit: () => void;
  onToggleReviewTool?: (tool: TargetToolCatalogItem, enabled: boolean) => void | Promise<void>;
  onFinishReview?: () => void;
  credentialModeConfirmation?: {
    serverName: string;
    credentialMode: 'workspace' | 'individual';
    affectedScheduleCount: number;
    onConfirm: () => void;
    onCancel: () => void;
  } | null;
}> = ({
  mode,
  createStep = 'configure',
  urlReadOnly,
  form,
  mutationError,
  pending,
  isValid,
  publicHeadersValidationError,
  reviewServer,
  reviewToolsLoading = false,
  reviewToolsError = null,
  canManageTools = false,
  pendingToolName = null,
  onClose,
  onFormChange,
  onSubmit,
  onToggleReviewTool,
  onFinishReview,
  credentialModeConfirmation
}) => {
  const { t } = useTranslation();
  const isReviewStep = mode === 'create' && createStep === 'review';
  const authTypeOptions: Array<SelectOption<ServerFormState['authType']>> = [
    { value: 'none', label: t('mcpServers.authNone') },
    { value: 'bearer_token', label: t('mcpServers.authBearer') },
    { value: 'custom_header', label: t('mcpServers.authCustomHeader') }
  ];
  const addPublicHeader = () => {
    onFormChange((current) => ({
      ...current,
      publicHeaders: [
        ...current.publicHeaders,
        { id: `header-${Math.random().toString(36).slice(2)}`, name: '', value: '' }
      ]
    }));
  };
  const updatePublicHeader = (id: string, patch: Partial<ServerFormState['publicHeaders'][number]>) => {
    onFormChange((current) => ({
      ...current,
      publicHeaders: current.publicHeaders.map((header) => (header.id === id ? { ...header, ...patch } : header))
    }));
  };
  const removePublicHeader = (id: string) => {
    onFormChange((current) => ({
      ...current,
      publicHeaders: current.publicHeaders.filter((header) => header.id !== id)
    }));
  };
  const reviewTools = reviewServer?.tools || [];
  const reviewEnabledCount = reviewTools.filter((tool) => tool.enabledConfigured).length;
  const reviewWriteCount = reviewTools.filter((tool) => tool.capability === 'write').length;
  const createSteps = [
    { id: 'configure', label: t('mcpServers.stepConfigure') },
    { id: 'review', label: t('mcpServers.stepReviewTools') }
  ];
  const renderReviewTool = (tool: TargetToolCatalogItem) => {
    const pendingTool = pendingToolName === tool.name;
    return (
      <div key={tool.name} className="grid min-w-0 grid-cols-1 gap-3 border-b border-ui-border px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_6rem_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h4 className="type-row-title truncate" title={getToolLabel(tool)}>{getToolLabel(tool)}</h4>
          </div>
          <p className="type-code mt-1 truncate text-ui-text-muted" title={tool.name}>{tool.name}</p>
        </div>
        <span className={`type-micro-label w-fit rounded-full px-2 py-1 ${tool.capability === 'write' ? 'bg-status-warning-soft text-status-warning-text' : 'bg-status-success-soft text-status-success-text'}`}>
          {tool.capability === 'write' ? t('mcpServers.capabilityWrite') : t('mcpServers.capabilityRead')}
        </span>
        <Switch
          checked={tool.enabledConfigured}
          disabled={!canManageTools || pendingTool || pending}
          onCheckedChange={(enabled) => onToggleReviewTool?.(tool, enabled)}
          label={t(tool.enabledConfigured ? 'mcpServers.disableToolNamed' : 'mcpServers.enableToolNamed', { name: getToolLabel(tool) })}
        />
      </div>
    );
  };
  return (
    <motion.div
    {...modalOverlayMotion}
    className="fixed inset-0 z-50 flex items-center justify-center bg-ui-text/45 p-4 dark:bg-ui-bg/75"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget && !pending) onClose();
    }}
  >
    <motion.div
      {...modalPanelMotion}
      role="dialog"
      aria-modal="true"
        aria-labelledby="mcp-server-form-title"
      className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-2xl"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-6 py-4">
        <div>
          <h3 id="mcp-server-form-title" className="type-panel-title">
            {t(mode === 'edit' ? 'mcpServers.edit' : 'mcpServers.add')}
          </h3>
          {mode === 'create' && (
            <ModalStepIndicator steps={createSteps} currentStepId={isReviewStep ? 'review' : 'configure'} className="mt-4" />
          )}
        </div>
        <CloseButton
          onClick={onClose}
          disabled={pending}
          aria-label={t('mcpServers.closeForm')}
        />
      </div>

      <div className="grid min-h-0 gap-6 overflow-y-auto p-6 custom-scrollbar lg:grid-cols-[minmax(0,1fr)_19rem]">
        {isReviewStep ? (
          <>
            <div className="overflow-hidden rounded-lg border border-ui-border bg-ui-bg">
              <div className="border-b border-ui-border bg-ui-surface px-5 py-4">
                <h4 className="type-row-title">{t('mcpServers.reviewToolsTitle')}</h4>
                <p className="type-caption mt-1 text-ui-text-muted">{t('mcpServers.reviewToolsBody')}</p>
              </div>
              {reviewToolsError && (
                <div className="type-caption m-4 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
                  {reviewToolsError}
                </div>
              )}
              {mutationError && (
                <div className="type-caption m-4 rounded-lg border border-status-warning/25 bg-status-warning-soft px-4 py-3 text-status-warning-text">
                  {mutationError}
                </div>
              )}
              {reviewToolsLoading ? (
                <InlineLoadingIndicator label={t('mcpServers.loadingTools')} className="m-4 bg-ui-surface text-xs" />
              ) : reviewTools.length === 0 ? (
                <div className="type-caption m-4 rounded-lg border border-ui-border bg-ui-surface px-4 py-3 text-ui-text-muted">
                  {t('mcpServers.noToolsDiscovered')}
                </div>
              ) : (
                reviewTools.map(renderReviewTool)
              )}
            </div>

            <aside className="rounded-lg border border-ui-border bg-ui-surface p-5">
              <h4 className="type-row-title">{t('mcpServers.serverCreated')}</h4>
              <p className="type-caption mt-2 text-ui-text-muted">{t('mcpServers.serverCreatedBody')}</p>
              <div className="mt-5 space-y-3">
                <div>
                  <p className="type-label text-ui-text-muted">{t('mcpServers.server')}</p>
                  <p className="type-row-title mt-1 truncate" title={reviewServer?.name}>{reviewServer?.name || t('mcpServers.loadingCatalog')}</p>
                </div>
                <div className="rounded-lg border border-ui-border bg-ui-bg px-4 py-3">
                  <div className="flex items-center justify-between gap-4 border-b border-ui-border py-2 first:pt-0">
                    <p className="type-caption text-ui-text-muted">{t('mcpServers.totalTools')}</p>
                    <p className="text-base font-semibold tracking-tight text-ui-text">{reviewTools.length}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-ui-border py-2">
                    <p className="type-caption text-ui-text-muted">{t('mcpServers.enabledToolsMetric')}</p>
                    <p className="text-base font-semibold tracking-tight text-status-success-text">{reviewEnabledCount}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2 last:pb-0">
                    <p className="type-caption text-ui-text-muted">{t('mcpServers.writeCapableTools')}</p>
                    <p className="text-base font-semibold tracking-tight text-status-warning-text">{reviewWriteCount}</p>
                  </div>
                </div>
                {!canManageTools && (
                  <p className="type-caption rounded-lg border border-ui-border bg-ui-bg px-3 py-2 text-ui-text-muted">
                    {t('mcpServers.manageToolsNoAccess')}
                  </p>
                )}
              </div>
            </aside>
          </>
        ) : (
          <>
        <div className="space-y-4 rounded-lg border border-ui-border bg-ui-bg p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="type-label px-1">{t('mcpServers.serverName')}</span>
            <input
              value={form.name}
              onChange={(event) => onFormChange((current) => ({ ...current, name: event.target.value }))}
              className={mcpServerInputClassName}
            />
          </label>
          <label className="space-y-1">
            <span className="type-label px-1">{t('mcpServers.serverUrl')}</span>
            <input
              type="url"
              pattern="https://.*"
              value={form.url}
              onChange={(event) => onFormChange((current) => ({ ...current, url: event.target.value }))}
              placeholder={t('mcpServers.serverUrlPlaceholder')}
              disabled={urlReadOnly}
              className={mcpServerInputClassName}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="type-label px-1">{t('mcpServers.authType')}</span>
            <Select<ServerFormState['authType']>
              value={form.authType}
              options={authTypeOptions}
              onChange={(authType) =>
                onFormChange((current) => ({
                  ...current,
                  authType,
                  credentialMode: authType === 'none'
                    ? 'none'
                    : current.credentialMode === 'none' ? 'individual' : current.credentialMode
                }))
              }
              ariaLabel={t('mcpServers.authType')}
            />
          </label>
          <label className="space-y-1">
            <span className="type-label px-1">{t('mcpServers.enabled')}</span>
            <div className="flex h-[44px] items-center">
              <Switch
                checked={form.enabled}
                onCheckedChange={(enabled) => onFormChange((current) => ({ ...current, enabled }))}
                label={t('mcpServers.enabled')}
              />
            </div>
          </label>
        </div>

        {form.authType !== 'none' && (
          <div className="space-y-3">
            <McpCredentialOwnershipSelector
              name="mcp-credential-ownership"
              value={form.credentialMode === 'workspace' ? 'workspace' : 'individual'}
              onChange={(credentialMode) => onFormChange((current) => ({ ...current, credentialMode }))}
            />
            {form.authType === 'custom_header' && (
              <label className="space-y-1">
                <span className="type-label px-1">{t('mcpServers.headerName')}</span>
                <input
                  value={form.headerName}
                  onChange={(event) => onFormChange((current) => ({ ...current, headerName: event.target.value }))}
                  placeholder={t('mcpServers.headerNamePlaceholder')}
                  className={mcpServerInputClassName}
                />
              </label>
            )}
            <p className="type-caption rounded-lg border border-ui-border bg-ui-surface px-4 py-3 text-ui-text-muted">{t('mcpServers.credentialSetupHelp')}</p>
          </div>
        )}

        <details className="rounded-lg border border-ui-border bg-ui-surface">
          <summary className="type-label flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
            {t('mcpServers.advancedOptions')}
            <span className="text-ui-text-muted">›</span>
          </summary>
          <div className="space-y-3 border-t border-ui-border px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="type-label px-1">{t('mcpServers.publicHeaders')}</p>
                <p className="type-caption px-1 text-ui-text-muted">{t('mcpServers.publicHeadersHelp')}</p>
              </div>
              <button
                type="button"
                onClick={addPublicHeader}
                className="control-target inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ui-border text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
                aria-label={t('mcpServers.addHeader')}
                title={t('mcpServers.addHeader')}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {publicHeadersValidationError && (
              <p className="type-caption rounded-md border border-status-danger/25 bg-status-danger-soft px-3 py-2 text-status-danger-text">
                {publicHeadersValidationError}
              </p>
            )}
            {form.publicHeaders.length > 0 && (
              <div className="space-y-2">
                {form.publicHeaders.map((header) => (
                  <div key={header.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <input
                      value={header.name}
                      onChange={(event) => updatePublicHeader(header.id, { name: event.target.value })}
                      placeholder={t('mcpServers.publicHeaderNamePlaceholder')}
                      className={mcpPublicHeaderInputClassName}
                    />
                    <input
                      value={header.value}
                      onChange={(event) => updatePublicHeader(header.id, { value: event.target.value })}
                      placeholder={t('mcpServers.publicHeaderValuePlaceholder')}
                      className={mcpPublicHeaderInputClassName}
                    />
                    <button
                      type="button"
                      onClick={() => removePublicHeader(header.id)}
                      className="control-target rounded-lg border border-ui-border p-2 text-ui-text-muted transition-colors hover:bg-status-danger-soft hover:text-status-danger-text sm:self-center"
                      aria-label={t('mcpServers.removeHeader')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>

        <div className="type-caption rounded-lg border border-ui-border bg-ui-bg p-3">
          {urlReadOnly ? t('mcpServers.editHelp') : t('mcpServers.createHelp')}
        </div>

        {mutationError && (
          <div className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
            {mutationError}
          </div>
        )}
        {credentialModeConfirmation && (
          <InlineConfirmation
            id="target-mcp-credential-mode-confirmation"
            title={t('mcpServers.credentialModeChangeTitle', { name: credentialModeConfirmation.serverName })}
            description={credentialModeConfirmation.credentialMode === 'individual'
              ? credentialModeConfirmation.affectedScheduleCount > 0
                ? t('mcpServers.confirmWorkspaceToIndividualTargetWithSchedules', { count: credentialModeConfirmation.affectedScheduleCount })
                : t('mcpServers.confirmWorkspaceToIndividualTarget')
              : t('mcpServers.confirmIndividualToWorkspace')}
            tone="warning"
            confirmLabel={t('mcpServers.credentialModeChangeConfirm')}
            confirmDisabled={pending}
            cancelLabel={t('common.cancel')}
            onConfirm={credentialModeConfirmation.onConfirm}
            onCancel={credentialModeConfirmation.onCancel}
          />
        )}
        </div>

        <aside className="rounded-lg border border-ui-border bg-ui-surface p-5">
          <h4 className="type-row-title">{t('mcpServers.aboutServers')}</h4>
          <p className="type-caption mt-2 text-ui-text-muted">{t('mcpServers.aboutServersBody')}</p>
          <div className="mt-5 space-y-4">
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ui-bg text-ui-text-muted">
                <SlidersHorizontal className="h-4 w-4" />
              </span>
              <p className="type-caption text-ui-text-muted">{t('mcpServers.aboutDiscovery')}</p>
            </div>
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-status-warning-soft text-status-warning-text">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <p className="type-caption text-ui-text-muted">{t('mcpServers.aboutWriteApproval')}</p>
            </div>
          </div>
        </aside>
          </>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
        {isReviewStep ? (
          <Button onClick={onFinishReview || onClose} disabled={pending} variant="primary" size="sm">
            {t('mcpServers.finish')}
          </Button>
        ) : (
          <>
            <Button
              onClick={onClose}
              disabled={pending}
              variant="secondary"
              size="sm"
            >
              {t('app.cancel')}
            </Button>
            <Button
              onClick={onSubmit}
              disabled={pending || !isValid || Boolean(credentialModeConfirmation)}
              variant="primary"
              size="sm"
            >
              {pending
                ? t(mode === 'edit' ? 'mcpServers.saving' : 'mcpServers.discoveringTools')
                : t(mode === 'edit' ? 'mcpServers.save' : 'mcpServers.reviewToolsAction')}
            </Button>
          </>
        )}
      </div>
    </motion.div>
    </motion.div>
  );
};

export const DeleteMcpServerDialog: React.FC<{
  server: TargetToolCatalogServer;
  mutationError: string | null;
  pending: boolean;
  onClose: () => void;
  onDelete: () => void;
}> = ({ server, mutationError, pending, onClose, onDelete }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      {...modalOverlayMotion}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ui-text/45 p-4 dark:bg-ui-bg/75"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <motion.div
        {...modalPanelMotion}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-mcp-server-title"
        className="w-full max-w-md overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
      <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-danger-soft text-status-danger-text">
            <Trash2 className="h-4 w-4" />
          </span>
          <div>
            <h3 id="delete-mcp-server-title" className="type-panel-title">{t('mcpServers.delete')}</h3>
            <p className="mt-0.5 text-[11px] font-semibold text-ui-text-muted">{t('mcpServers.deleteSubtitle')}</p>
          </div>
        </div>
        <CloseButton
          onClick={onClose}
          disabled={pending}
          aria-label={t('mcpServers.closeDelete')}
        />
      </div>
      <div className="space-y-3 px-6 py-5">
        <p className="type-body">
          {t('mcpServers.deleteBody', { name: server.name })}
        </p>
        <p className="type-caption rounded-lg border border-status-warning/25 bg-status-warning-soft px-3 py-2 text-status-warning-text">
          {t('mcpServers.deleteConsoleBoundary')}
        </p>
        {mutationError && (
          <div className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-3 py-2 text-status-danger-text">
            {mutationError}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="control-target type-ui rounded-lg border border-ui-border bg-ui-surface px-4 py-2 text-ui-text-muted transition-colors hover:bg-ui-bg disabled:opacity-50"
        >
          {t('app.cancel')}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="control-target type-ui rounded-lg border border-control-boundary bg-control-danger px-4 py-2 text-control-danger-fg transition-colors hover:bg-control-danger-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-control-boundary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? t('app.deleting') : t('mcpServers.deleteAction')}
        </button>
      </div>
      </motion.div>
    </motion.div>
  );
};
