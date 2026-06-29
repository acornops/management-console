import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Check, ChevronDown, ChevronRight, FileText, Image as ImageIcon, Loader2, Plus, Square, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Tooltip } from '@/components/common/Tooltip';
import { AssistantCapabilityPreviewControl } from '@/features/kubernetes-cluster-detail/components/detail/views/AssistantCapabilityPreviewControl';
import { formatAttachmentSize, providerLabel } from '@/features/kubernetes-cluster-detail/components/detail/views/targetChatViewHelpers';
import type { TargetChatViewBodyProps } from '@/features/kubernetes-cluster-detail/components/detail/views/TargetChatViewBody.types';
import type { ReasoningEffort } from '@/types';

type TargetChatComposerProps = Pick<TargetChatViewBodyProps,
  | 'allowedReasoningOptions'
  | 'assistantCapabilitiesPreview'
  | 'assistantCapabilitiesPreviewError'
  | 'canChat'
  | 'canCancelActiveRun'
  | 'canPost'
  | 'cluster'
  | 'composerActionLabel'
  | 'composerAttachmentNotice'
  | 'composerAttachments'
  | 'composerModelOptions'
  | 'composerRootRef'
  | 'composerSubmitUnavailableReason'
  | 'composerTextareaRef'
  | 'conversationNotice'
  | 'fileInputRef'
  | 'handleAttachmentInputChange'
  | 'handleComposerKeyDown'
  | 'handleModelAndEffortChange'
  | 'handleModelChange'
  | 'hasComposerSubmitPayload'
  | 'inputValue'
  | 'isAssistantCapabilitiesPreviewLoading'
  | 'isCancellingRun'
  | 'isComposerRuntimeUnavailable'
  | 'isModelMenuOpen'
  | 'isModelSubmenuOpen'
  | 'isPanel'
  | 'isRunActive'
  | 'isWorkspaceAiSettingsLoading'
  | 'modelMenuPanelId'
  | 'modelMenuRef'
  | 'modelSelectorId'
  | 'modelSubmenuButtonId'
  | 'modelSubmenuPanelId'
  | 'onCancelRun'
  | 'onInputChange'
  | 'recentActivityWarning'
  | 'removeComposerAttachment'
  | 'requestedToolAccessMode'
  | 'resolvedFooterKey'
  | 'resolvedFooterNoAccessKey'
  | 'resolvedInputPlaceholderKey'
  | 'resolvedNoChatAccessKey'
  | 'selectedEffort'
  | 'selectedEffortLabel'
  | 'selectedModel'
  | 'selectedModelLabel'
  | 'selectedProvider'
  | 'setIsModelMenuOpen'
  | 'setIsModelSubmenuOpen'
  | 'submitComposerMessage'
  | 't'
  | 'workspaceAiSettingsError'
>;

export const TargetChatComposer: React.FC<TargetChatComposerProps> = ({
  allowedReasoningOptions,
  assistantCapabilitiesPreview,
  assistantCapabilitiesPreviewError,
  canChat,
  canCancelActiveRun,
  canPost,
  cluster,
  composerActionLabel,
  composerAttachmentNotice,
  composerAttachments,
  composerModelOptions,
  composerRootRef,
  composerSubmitUnavailableReason,
  composerTextareaRef,
  conversationNotice,
  fileInputRef,
  handleAttachmentInputChange,
  handleComposerKeyDown,
  handleModelAndEffortChange,
  handleModelChange,
  hasComposerSubmitPayload,
  inputValue,
  isAssistantCapabilitiesPreviewLoading,
  isCancellingRun,
  isComposerRuntimeUnavailable,
  isModelMenuOpen,
  isModelSubmenuOpen,
  isPanel,
  isRunActive,
  isWorkspaceAiSettingsLoading,
  modelMenuPanelId,
  modelMenuRef,
  modelSelectorId,
  modelSubmenuButtonId,
  modelSubmenuPanelId,
  onCancelRun,
  onInputChange,
  recentActivityWarning,
  removeComposerAttachment,
  requestedToolAccessMode,
  resolvedFooterKey,
  resolvedFooterNoAccessKey,
  resolvedInputPlaceholderKey,
  resolvedNoChatAccessKey,
  selectedEffort,
  selectedEffortLabel,
  selectedModel,
  selectedModelLabel,
  selectedProvider,
  setIsModelMenuOpen,
  setIsModelSubmenuOpen,
  submitComposerMessage,
  t,
  workspaceAiSettingsError
}) => {
  const blockedComposerMessage = recentActivityWarning
    ? t('chat.chooseRecentActivityAction')
    : conversationNotice || t(resolvedNoChatAccessKey);
  const blockedFooterMessage = recentActivityWarning
    ? t('chat.chooseRecentActivityAction')
    : conversationNotice || t(resolvedFooterNoAccessKey);

  return (
        <form
          className={`${isPanel ? 'px-5 py-4 sm:px-6 sm:py-5' : 'px-4 pb-4 pt-2 sm:px-5'} bg-ui-bg`}
          onSubmit={(event) => {
            event.preventDefault();
            void submitComposerMessage();
          }}
        >
          <div ref={composerRootRef} className={`${isPanel ? 'max-w-2xl' : 'max-w-3xl'} relative mx-auto`}>
            <div className="overflow-visible rounded-[1.375rem] border border-ui-border bg-ui-surface px-2 py-2 text-ui-text shadow-sm transition-colors focus-within:border-accent/45 focus-within:ring-2 focus-within:ring-accent/10 dark:bg-ui-surface-strong dark:shadow-ui-text/10">
              {(composerAttachments.length > 0 || composerAttachmentNotice) && (
                <div className="space-y-2 pb-2">
                  {composerAttachments.length > 0 && (
                    <div className="flex max-h-32 gap-2 overflow-x-auto custom-scrollbar" role="list" aria-label={t('chat.attachments')}>
                      {composerAttachments.map((attachment) => {
                        const isImagePreview = Boolean(attachment.previewUrl);
                        const statusLabel = attachment.status === 'ready'
                          ? t('chat.attachmentIncluded')
                          : attachment.status === 'error'
                            ? t('chat.attachmentFailed')
                            : t('chat.attachmentPreviewOnly');
                        return (
                          <div
                            key={attachment.id}
                            role="listitem"
                            className={`${isPanel ? 'h-20 w-20' : 'h-24 w-24'} relative flex shrink-0 flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface text-left shadow-sm`}
                          >
                            <button
                              type="button"
                              onClick={() => removeComposerAttachment(attachment.id)}
                              className="absolute right-1 top-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-ui-border bg-ui-bg text-ui-text shadow-sm transition-colors hover:bg-ui-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                              aria-label={t('chat.removeAttachment', { name: attachment.name })}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            <div className="flex min-h-0 flex-1 items-center justify-center bg-ui-bg">
                              {isImagePreview ? (
                                <img src={attachment.previewUrl} alt="" className="h-full w-full object-cover" />
                              ) : attachment.status === 'ready' ? (
                                <FileText className="h-5 w-5 text-ui-text-muted" />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-ui-text-muted" />
                              )}
                            </div>
                            <div className="min-w-0 border-t border-ui-border px-2 py-1">
                              <p className="truncate text-[10px] font-semibold text-ui-text">{attachment.name}</p>
                              <p className="mt-0.5 truncate text-[9px] font-medium text-ui-text-muted">{statusLabel}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {composerAttachmentNotice && (
                    <p className="rounded-lg border border-status-warning/25 bg-status-warning-soft/45 px-3 py-2 text-xs font-semibold leading-5 text-status-warning-text">
                      {composerAttachmentNotice}
                    </p>
                  )}
                </div>
              )}
              <div className="px-4 pb-0 pt-0.5">
                <textarea
                  ref={composerTextareaRef}
                  value={inputValue}
                  onChange={(event) => onInputChange(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  rows={1}
                  className={`${isPanel ? 'min-h-9 text-sm' : 'min-h-10 text-sm'} max-h-36 w-full min-w-0 resize-none overflow-y-auto border-0 bg-transparent px-0 py-2 font-medium text-ui-text outline-none placeholder:text-ui-text-muted/60 disabled:cursor-not-allowed disabled:opacity-60`}
                  aria-label={t('chat.composerInputLabel', { name: cluster.name })}
                  placeholder={canPost ? t(resolvedInputPlaceholderKey, { name: cluster.name }) : blockedComposerMessage}
                  disabled={!canPost || isRunActive}
                />
              </div>
              <div className="flex items-center gap-2 px-2 pb-0.5">
                <Tooltip content={t('chat.attachFiles')}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!canPost || isRunActive}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={t('chat.attachFiles')}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </Tooltip>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={(event) => void handleAttachmentInputChange(event)}
                  disabled={!canPost || isRunActive}
                />
                <span className="min-w-0 flex-1" aria-hidden="true" />
                <div className="inline-flex h-8 items-center rounded-full bg-ui-bg/70 px-0.5 text-ui-text-muted ring-1 ring-ui-border/60">
                  <AssistantCapabilityPreviewControl
                    canChat={canChat}
                    isLoading={isAssistantCapabilitiesPreviewLoading}
                    error={assistantCapabilitiesPreviewError}
                    preview={assistantCapabilitiesPreview}
                    requestedToolAccessMode={requestedToolAccessMode}
                  />
                  <span className="h-4 w-px shrink-0 bg-ui-border" aria-hidden="true" />
                  <div ref={modelMenuRef} className="relative">
                    <button
                      type="button"
                      id={modelSelectorId}
                      onClick={() => {
                        setIsModelMenuOpen((current) => !current);
                        setIsModelSubmenuOpen(false);
                      }}
                      disabled={!canPost || isRunActive || isWorkspaceAiSettingsLoading || Boolean(workspaceAiSettingsError)}
                      className="inline-flex h-8 max-w-[15rem] items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold leading-5 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={t('chat.modelAndEffortSelector')}
                      aria-controls={modelMenuPanelId}
                      aria-expanded={isModelMenuOpen}
                    >
                      <span className="truncate">{composerModelOptions.length > 0 ? `${selectedModelLabel} ${selectedEffortLabel}` : selectedModelLabel}</span>
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    </button>
                    <AnimatePresence>
                      {isModelMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.98 }}
                          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                          id={modelMenuPanelId}
                          className="absolute bottom-full right-0 z-50 mb-3 w-64 rounded-2xl border border-ui-border bg-ui-surface-strong p-2 text-sm shadow-xl shadow-ui-text/10"
                          role="group"
                          aria-labelledby={modelSelectorId}
                        >
                          <p className="px-3 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wide text-ui-text-muted">
                            {t('chat.effortSelector')}
                          </p>
                          {allowedReasoningOptions.map((option) => {
                            const isSelected = option.value === selectedEffort;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => handleModelAndEffortChange(option.value as ReasoningEffort)}
                                className="flex h-10 w-full items-center justify-between rounded-xl px-3 text-left font-medium text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
                                aria-pressed={isSelected}
                              >
                                <span>{t(option.labelKey)}</span>
                                {isSelected && <Check className="h-4 w-4 text-accent-strong" />}
                              </button>
                            );
                          })}
                          <div className="my-2 border-t border-ui-border" />
                          <div className="relative" onMouseEnter={() => setIsModelSubmenuOpen(true)}>
                            <button
                              type="button"
                              id={modelSubmenuButtonId}
                              onClick={() => setIsModelSubmenuOpen((current) => !current)}
                              className="flex h-10 w-full items-center justify-between rounded-xl px-3 text-left font-medium text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
                              aria-controls={modelSubmenuPanelId}
                              aria-expanded={isModelSubmenuOpen}
                            >
                              <span>{selectedModelLabel}</span>
                              <ChevronRight className="h-4 w-4 text-ui-text-muted" />
                            </button>
                            <AnimatePresence>
                              {isModelSubmenuOpen && (
                                <motion.div
                                  initial={{ opacity: 0, x: -4, scale: 0.98 }}
                                  animate={{ opacity: 1, x: 0, scale: 1 }}
                                  exit={{ opacity: 0, x: -4, scale: 0.98 }}
                                  transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
                                  id={modelSubmenuPanelId}
                                  className="absolute bottom-[calc(100%+0.5rem)] right-0 z-50 max-h-[min(24rem,calc(100vh-8rem))] w-56 overflow-y-auto rounded-2xl border border-ui-border bg-ui-surface-strong p-2 shadow-xl shadow-ui-text/10 custom-scrollbar sm:bottom-0 sm:left-[calc(100%+0.5rem)] sm:right-auto"
                                  role="group"
                                  aria-labelledby={modelSubmenuButtonId}
                                >
                                  <p className="px-3 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wide text-ui-text-muted">
                                    {t('chat.modelSelector')}
                                  </p>
                                  {composerModelOptions.length === 0 && (
                                    <div className="px-3 py-2 text-sm font-medium text-ui-text-muted">
                                      {workspaceAiSettingsError || t('chat.noModelsAvailable')}
                                    </div>
                                  )}
                                  {composerModelOptions.map((option) => {
                                    const isSelected = option.provider === selectedProvider && option.model === selectedModel;
                                    return (
                                      <button
                                        key={`${option.provider}:${option.model}`}
                                        type="button"
                                        onClick={() => handleModelChange(option)}
                                        className="flex h-10 w-full items-center justify-between rounded-xl px-3 text-left font-medium text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
                                        aria-pressed={isSelected}
                                      >
                                        <span className="min-w-0">
                                          <span className="block truncate">{option.model}</span>
                                          <span className="block truncate text-xs text-ui-text-muted">
                                            {providerLabel(option.provider)}
                                          </span>
                                        </span>
                                        {isSelected && <Check className="h-4 w-4 shrink-0 text-accent-strong" />}
                                      </button>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <Tooltip content={composerActionLabel}>
                  <Button
                    type={isRunActive ? 'button' : 'submit'}
                    onClick={isRunActive ? () => {
                      if (canCancelActiveRun && !isCancellingRun) void onCancelRun();
                    } : undefined}
                    disabled={isRunActive ? !canCancelActiveRun || isCancellingRun : !canPost || !hasComposerSubmitPayload || isComposerRuntimeUnavailable}
                    variant={isRunActive ? 'secondary' : 'primary'}
                    size="icon"
                    className={`h-9 w-9 shrink-0 rounded-full border-0 bg-ui-text text-ui-bg hover:bg-ui-text/90 focus-visible:ring-accent/25 disabled:bg-ui-text/35 disabled:text-ui-bg/70 dark:bg-ui-text dark:text-ui-bg dark:hover:bg-ui-text/90 ${isRunActive ? 'border-status-danger/25 bg-status-danger-soft text-status-danger-text hover:border-status-danger/40 hover:bg-status-danger-soft/80 focus-visible:ring-status-danger/20' : ''}`}
                    aria-label={composerActionLabel}
                  >
                    {isRunActive ? (isCancellingRun ? <Loader2 className="h-5 w-5 animate-spin" /> : <Square className="h-4 w-4 fill-current" />) : <ArrowUp className="h-5 w-5 stroke-[2.4]" />}
                  </Button>
                </Tooltip>
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] font-medium text-ui-text-muted">
              {canPost ? composerSubmitUnavailableReason || t(resolvedFooterKey) : blockedFooterMessage}
            </p>
          </div>
        </form>
  );
};
