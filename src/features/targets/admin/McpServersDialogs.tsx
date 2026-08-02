import React from 'react';
import { Plus, ShieldCheck, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, DestructiveConfirmationDialog, IconTile } from '@acornops/ui';
import { CloseButton } from '@acornops/ui';
import { Switch } from '@acornops/ui';
import { CollectionLoadingSkeleton } from '@acornops/ui';
import { ModalStepIndicator } from '@acornops/ui';
import { Select, SelectOption } from '@acornops/ui';
import { formInputClassName } from '@acornops/ui';
import type { TargetToolCatalogItem, TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';
import { getToolLabel, ServerFormState } from '@/features/targets/admin/mcpServersCatalog';
import { McpCredentialOwnershipSelector } from '@/features/catalog/McpCredentialOwnershipSelector';
import { InlineConfirmation } from '@acornops/ui';
import { DialogFrame } from '@acornops/ui';
import { TextInput } from '@acornops/ui';

const mcpServerInputClassName = formInputClassName('px-4 type-ui');
const mcpPublicHeaderInputClassName = formInputClassName('min-h-10 min-w-0 type-ui');

export function getMcpCreateFlowCopyKeys(authType: ServerFormState['authType']) {
  if (authType === 'oauth') {
    return {
      nextStep: 'mcpServers.stepAuthorize',
      help: 'mcpServers.oauthCreateHelp',
      pending: 'mcpServers.addingServer',
      action: 'mcpServers.continueToAuthorization'
    };
  }
  if (authType !== 'none') {
    return {
      nextStep: 'mcpServers.stepAddCredential',
      help: 'mcpServers.credentialCreateHelp',
      pending: 'mcpServers.addingServer',
      action: 'mcpServers.continueToCredentials'
    };
  }
  return {
    nextStep: 'mcpServers.stepReviewTools',
    help: 'mcpServers.createHelp',
    pending: 'mcpServers.discoveringTools',
    action: 'mcpServers.reviewToolsAction'
  };
}

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
  onChangeReviewToolCapability?: (tool: TargetToolCatalogItem, capability: 'read' | 'write') => void | Promise<void>;
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
  onChangeReviewToolCapability,
  onFinishReview,
  credentialModeConfirmation
}) => {
  const { t } = useTranslation();
  const isReviewStep = mode === 'create' && createStep === 'review';
  const authTypeOptions: Array<SelectOption<ServerFormState['authType']>> = [
    { value: 'none', label: t('mcpServers.authNone') },
    { value: 'bearer_token', label: t('mcpServers.authBearer') },
    { value: 'custom_header', label: t('mcpServers.authCustomHeader') },
    { value: 'oauth', label: 'OAuth' }
  ];
  const capabilityOptions: Array<SelectOption<'read' | 'write'>> = [
    { value: 'read', label: t('mcpServers.capabilityRead') },
    { value: 'write', label: t('mcpServers.capabilityWrite') }
  ];
  const addPublicHeader = () => {
    onFormChange((current) => ({
      ...current,
      publicHeaders: [
        ...current.publicHeaders,
        {
          id: `header-${Math.random().toString(36).slice(2)}`,
          name: '',
          value: ''
        }
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
  const createFlowCopy = getMcpCreateFlowCopyKeys(form.authType);
  const createSteps = [
    { id: 'configure', label: t('mcpServers.stepConfigure') },
    { id: 'review', label: t(createFlowCopy.nextStep) }
  ];
  const renderReviewTool = (tool: TargetToolCatalogItem) => {
    const pendingTool = pendingToolName === tool.name;
    return (
      <div key={tool.name} className="grid min-w-0 grid-cols-1 gap-3 border-b border-ui-border px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_6rem_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h4 className="type-row-title truncate" title={getToolLabel(tool)}>
              {getToolLabel(tool)}
            </h4>
          </div>
          <p className="type-code mt-1 truncate text-ui-text-muted" title={tool.name}>
            {tool.name}
          </p>
        </div>
        <Select<'read' | 'write'>
          value={tool.capability}
          options={capabilityOptions}
          size="sm"
          disabled={!canManageTools || pendingTool || pending}
          ariaLabel={t('mcpServers.capabilityForTool', { name: getToolLabel(tool) })}
          onChange={(capability) => onChangeReviewToolCapability?.(tool, capability)}
        />
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
    <DialogFrame
      unframed
      titleId="mcp-server-form-title"
      closeDisabled={pending}
      onClose={onClose}
      overlayClassName="bg-ui-text/45 dark:bg-ui-bg/75"
      className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-2xl"
    >
        <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-6 py-4">
          <div>
            <h3 id="mcp-server-form-title" className="type-panel-title">
              {t(mode === 'edit' ? 'mcpServers.edit' : 'mcpServers.add')}
            </h3>
            {mode === 'create' && <ModalStepIndicator steps={createSteps} currentStepId={isReviewStep ? 'review' : 'configure'} className="mt-4" />}
          </div>
          <CloseButton onClick={onClose} disabled={pending} aria-label={t('mcpServers.closeForm')} />
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
                  <div className="type-caption m-4 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">{reviewToolsError}</div>
                )}
                {mutationError && (
                  <div className="type-caption m-4 rounded-lg border border-status-warning/25 bg-status-warning-soft px-4 py-3 text-status-warning-text">{mutationError}</div>
                )}
                {reviewToolsLoading ? (
                  <CollectionLoadingSkeleton label={t('mcpServers.loadingTools')} rows={3} className="m-4 overflow-hidden rounded-lg border border-ui-border bg-ui-surface" />
                ) : reviewTools.length === 0 ? (
                  <div className="type-caption m-4 rounded-lg border border-ui-border bg-ui-surface px-4 py-3 text-ui-text-muted">{t('mcpServers.noToolsDiscovered')}</div>
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
                    <p className="type-row-title mt-1 truncate" title={reviewServer?.name}>
                      {reviewServer?.name || t('mcpServers.loadingCatalog')}
                    </p>
                  </div>
                  <div className="rounded-lg border border-ui-border bg-ui-bg px-4 py-3">
                    <div className="flex items-center justify-between gap-4 border-b border-ui-border py-2 first:pt-0">
                      <p className="type-caption text-ui-text-muted">{t('mcpServers.totalTools')}</p>
                      <p className="type-panel-title tracking-tight text-ui-text">{reviewTools.length}</p>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-b border-ui-border py-2">
                      <p className="type-caption text-ui-text-muted">{t('mcpServers.enabledToolsMetric')}</p>
                      <p className="type-panel-title tracking-tight text-status-success-text">{reviewEnabledCount}</p>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-2 last:pb-0">
                      <p className="type-caption text-ui-text-muted">{t('mcpServers.writeCapableTools')}</p>
                      <p className="type-panel-title tracking-tight text-status-warning-text">{reviewWriteCount}</p>
                    </div>
                  </div>
                  {!canManageTools && (
                    <p className="type-caption rounded-lg border border-ui-border bg-ui-bg px-3 py-2 text-ui-text-muted">{t('mcpServers.manageToolsNoAccess')}</p>
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
                    <TextInput
                      value={form.name}
                      onChange={(event) =>
                        onFormChange((current) => ({
                          ...current,
                          name: event.target.value
                        }))
                      }
                      className={mcpServerInputClassName}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="type-label px-1">{t('mcpServers.serverUrl')}</span>
                    <TextInput
                      type="url"
                      pattern="https://.*"
                      value={form.url}
                      onChange={(event) =>
                        onFormChange((current) => ({
                          ...current,
                          url: event.target.value
                        }))
                      }
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
                            : authType === 'oauth'
                              ? 'individual'
                              : current.credentialMode === 'none' ? 'individual' : current.credentialMode
                        }))
                      }
                      ariaLabel={t('mcpServers.authType')}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="type-label px-1">{t('mcpServers.enabled')}</span>
                    <div className="flex h-[44px] items-center">
                      <Switch checked={form.enabled} onCheckedChange={(enabled) => onFormChange((current) => ({ ...current, enabled }))} label={t('mcpServers.enabled')} />
                    </div>
                  </label>
                </div>

                {form.authType !== 'none' && (
                  <div className="space-y-3">
                    {form.authType !== 'oauth' && (
                      <McpCredentialOwnershipSelector
                        name="mcp-credential-ownership"
                        value={form.credentialMode === 'workspace' ? 'workspace' : 'individual'}
                        onChange={(credentialMode) =>
                          onFormChange((current) => ({
                            ...current,
                            credentialMode
                          }))
                        }
                      />
                    )}
                    {form.authType === 'custom_header' && (
                      <label className="space-y-1">
                        <span className="type-label px-1">{t('mcpServers.headerName')}</span>
                        <TextInput
                          aria-describedby={mode === 'create' ? 'mcp-header-name-help' : undefined}
                          value={form.headerName}
                          onChange={(event) =>
                            onFormChange((current) => ({
                              ...current,
                              headerName: event.target.value
                            }))
                          }
                          placeholder={t('mcpServers.headerNamePlaceholder')}
                          className={mcpServerInputClassName}
                        />
                        {mode === 'create' && (
                          <span id="mcp-header-name-help" className="type-caption block px-1 text-ui-text-muted">
                            {t('mcpServers.headerNameCreateHelp')}
                          </span>
                        )}
                      </label>
                    )}
                    {(mode === 'edit' || form.authType === 'oauth') && (
                      <p className="type-caption rounded-lg border border-ui-border bg-ui-surface px-4 py-3 text-ui-text-muted">
                        {t(form.authType === 'oauth' ? 'mcpServers.oauthCredentialSetupHelp' : 'mcpServers.credentialSetupHelp')}
                      </p>
                    )}
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
                      <Button
                        type="button"
                        variant="icon"
                        size="icon"
                        onClick={addPublicHeader}
                        className="control-target inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ui-border text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
                        aria-label={t('mcpServers.addHeader')}
                        title={t('mcpServers.addHeader')}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
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
                            <TextInput
                              value={header.name}
                              onChange={(event) =>
                                updatePublicHeader(header.id, {
                                  name: event.target.value
                                })
                              }
                              placeholder={t('mcpServers.publicHeaderNamePlaceholder')}
                              className={mcpPublicHeaderInputClassName}
                            />
                            <TextInput
                              value={header.value}
                              onChange={(event) =>
                                updatePublicHeader(header.id, {
                                  value: event.target.value
                                })
                              }
                              placeholder={t('mcpServers.publicHeaderValuePlaceholder')}
                              className={mcpPublicHeaderInputClassName}
                            />
                            <Button
                              type="button"
                              variant="dangerIcon"
                              size="icon"
                              onClick={() => removePublicHeader(header.id)}
                              className="control-target sm:self-center"
                              aria-label={t('mcpServers.removeHeader')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>

                <div className="type-caption rounded-lg border border-ui-border bg-ui-bg p-3">
                  {urlReadOnly ? t('mcpServers.editHelp') : t(createFlowCopy.help)}
                </div>

                {mutationError && (
                  <div className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">{mutationError}</div>
                )}
                {credentialModeConfirmation && (
                  <InlineConfirmation
                    id="target-mcp-credential-mode-confirmation"
                    title={t('mcpServers.credentialModeChangeTitle', {
                      name: credentialModeConfirmation.serverName
                    })}
                    description={
                      credentialModeConfirmation.credentialMode === 'individual'
                        ? credentialModeConfirmation.affectedScheduleCount > 0
                          ? t('mcpServers.confirmWorkspaceToIndividualTargetWithSchedules', {
                              count: credentialModeConfirmation.affectedScheduleCount
                            })
                          : t('mcpServers.confirmWorkspaceToIndividualTarget')
                        : t('mcpServers.confirmIndividualToWorkspace')
                    }
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
                    <IconTile size="xs" className="mt-0.5">
                      <SlidersHorizontal className="h-4 w-4" />
                    </IconTile>
                    <p className="type-caption text-ui-text-muted">{t('mcpServers.aboutDiscovery')}</p>
                  </div>
                  <div className="flex gap-3">
                    <IconTile size="xs" tone="warning" className="mt-0.5">
                      <ShieldCheck className="h-4 w-4" />
                    </IconTile>
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
              <Button onClick={onClose} disabled={pending} variant="secondary" size="sm">
                {t('app.cancel')}
              </Button>
              <Button onClick={onSubmit} disabled={pending || !isValid || Boolean(credentialModeConfirmation)} variant="primary" size="sm">
                {pending
                  ? t(mode === 'edit' ? 'mcpServers.saving' : createFlowCopy.pending)
                  : t(mode === 'edit' ? 'mcpServers.save' : createFlowCopy.action)}
              </Button>
            </>
          )}
        </div>
    </DialogFrame>
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
    <DestructiveConfirmationDialog
      open
      titleId="delete-mcp-server-title"
      title={t('mcpServers.delete')}
      subtitle={t('mcpServers.deleteSubtitle')}
      description={(
        <>
          <span className="block">{t('mcpServers.deleteBody', { name: server.name })}</span>
          <span className="mt-2 block">{t('mcpServers.deleteConsoleBoundary')}</span>
        </>
      )}
      error={mutationError}
      confirmLabel={t('mcpServers.deleteAction')}
      loadingLabel={t('app.deleting')}
      cancelLabel={t('app.cancel')}
      closeLabel={t('mcpServers.closeDelete')}
      pending={pending}
      onCancel={onClose}
      onConfirm={onDelete}
      overlayClassName="bg-ui-text/45 dark:bg-ui-bg/75"
    />
  );
};
