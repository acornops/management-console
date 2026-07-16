import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { TargetChatViewBody } from '@/features/targets/chat/components/TargetChatViewBody';
import type { TargetChatViewProps } from '@/features/targets/chat/components/TargetChatView.types';
import {
  buildComposerModelOptions,
  buildPromptWithComposerContext,
  ComposerAttachment,
  ComposerModelOption,
  createComposerAttachment,
  chatRuntimeSelectionsEqual,
  findComposerModelOption,
  fitAttachmentToRemainingContext,
  formatAttachmentSize,
  isFileDragEvent,
  MAX_ATTACHMENT_FILE_BYTES,
  MAX_COMPOSER_ATTACHMENTS,
  MAX_TOTAL_ATTACHMENT_CONTEXT_CHARS,
  REASONING_OPTIONS,
  resolveAiSettingsGateReason,
  resolveComposerRuntimeSelection,
  revokeAttachmentPreview,
  SUGGESTION_KEYS,
  useTargetChatHistoryFocus
} from '@/features/targets/chat/components/targetChatViewHelpers';
import type { ReasoningEffort, WorkspaceAiSettings } from '@/types';
import type { ControlPlaneTargetAssistantCapabilitiesPreview } from '@/services/control-plane/types';
export const TargetChatView: React.FC<TargetChatViewProps> = ({
  target,
  titleKey,
  descriptionKey,
  promptTitleKey,
  promptBodyKey,
  suggestionKeys,
  inputPlaceholderKey,
  noChatAccessKey,
  footerKey,
  footerNoAccessKey,
  canChat,
  isConversationOwner,
  conversationNotice,
  recentActivityWarning,
  canRequestWriteRuns,
  canApproveWriteActions,
  canCancelRuns,
  canDeleteSessions,
  canManageAiSettings,
  isRunActive,
  isSessionsLoading,
  isLoadingEarlierMessages,
  hasEarlierMessages,
  activeRunId,
  isCancellingRun,
  inputValue,
  sessions,
  activeSessionId,
  composerRuntimeSelection,
  workspaceAiSettingsRefreshToken,
  assistantMarkdownComponents,
  userMarkdownComponents,
  visibleMessages,
  runTracesByRunId,
  sessionAssistantStatuses = {},
  transcriptRef,
  onChatScroll,
  onLoadEarlierMessages,
  onOpenAiSettings,
  onInputChange,
  onComposerRuntimeSelectionChange,
  onSend,
  onEditLastUserMessage,
  onApprove,
  onReject,
  onSelectSession,
  onCreateSession,
  onDismissRecentActivityWarning,
  onOpenRecentActivitySession,
  onDeleteSession,
  onCancelRun,
  isInFlightAssistantPlaceholder,
  displayMode = 'full',
  onClose,
  onMaximize
}) => {
  const { t } = useTranslation();
  const [traceExpandedByRunId, setTraceExpandedByRunId] = React.useState<Record<string, boolean>>({});
  const [deleteTargetSessionId, setDeleteTargetSessionId] = React.useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = React.useState<string | null>(null);
  const [deleteSessionError, setDeleteSessionError] = React.useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null);
  const [editingMessageValue, setEditingMessageValue] = React.useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);
  const [composerAttachments, setComposerAttachments] = React.useState<ComposerAttachment[]>([]);
  const [composerAttachmentNotice, setComposerAttachmentNotice] = React.useState('');
  const [workspaceAiSettings, setWorkspaceAiSettings] = React.useState<WorkspaceAiSettings | null>(null);
  const [isWorkspaceAiSettingsLoading, setIsWorkspaceAiSettingsLoading] = React.useState(true);
  const [workspaceAiSettingsError, setWorkspaceAiSettingsError] = React.useState('');
  const [assistantCapabilitiesPreview, setAssistantCapabilitiesPreview] = React.useState<ControlPlaneTargetAssistantCapabilitiesPreview | null>(null);
  const [isAssistantCapabilitiesPreviewLoading, setIsAssistantCapabilitiesPreviewLoading] = React.useState(canChat);
  const [assistantCapabilitiesPreviewError, setAssistantCapabilitiesPreviewError] = React.useState('');
  const [runtimeFallbackNotice, setRuntimeFallbackNotice] = React.useState('');
  const [isModelMenuOpen, setIsModelMenuOpen] = React.useState(false);
  const [isModelSubmenuOpen, setIsModelSubmenuOpen] = React.useState(false);
  const [dragDepth, setDragDepth] = React.useState(0);
  const historyButtonRef = React.useRef<HTMLButtonElement>(null);
  const historyPanelRef = React.useRef<HTMLElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const composerRootRef = React.useRef<HTMLDivElement>(null);
  const composerTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const composerAttachmentsRef = React.useRef<ComposerAttachment[]>([]);
  const composerAttachmentEpochRef = React.useRef(0);
  const isMountedRef = React.useRef(true);
  const modelMenuRef = React.useRef<HTMLDivElement>(null);
  const previousIsRunActiveRef = React.useRef(isRunActive);
  const previousActiveSessionIdRef = React.useRef(activeSessionId);
  const pendingComposerFocusRef = React.useRef(false);
  const isComposerSubmittingRef = React.useRef(false);
  const historyPanelId = React.useId();
  const modelMenuId = React.useId();
  const desktopHistoryPanelId = `${historyPanelId}-desktop`;
  const mobileHistoryPanelId = `${historyPanelId}-mobile`;
  const modelSelectorId = `${modelMenuId}-selector`;
  const modelMenuPanelId = `${modelMenuId}-panel`;
  const modelSubmenuButtonId = `${modelMenuId}-model-button`;
  const modelSubmenuPanelId = `${modelMenuId}-model-panel`;

  const deleteTargetSession = React.useMemo(
    () => sessions.find((session) => session.id === deleteTargetSessionId) || null,
    [deleteTargetSessionId, sessions]
  );
  const effectiveRecentActivityWarning = recentActivityWarning && (activeSessionId || recentActivityWarning.actionSessionId) ? recentActivityWarning : null;
  const canPost = canChat && isConversationOwner && !effectiveRecentActivityWarning;
  const requestedToolAccessMode = canRequestWriteRuns ? 'read_write' : 'read_only';
  const lastUserMessageIndex = React.useMemo(() => {
    for (let index = visibleMessages.length - 1; index >= 0; index -= 1) {
      if (visibleMessages[index].role === 'user') return index;
    }
    return -1;
  }, [visibleMessages]);
  const userTurnRunIdsByIndex = React.useMemo(() => {
    const runIdsByIndex = new Map<number, string | undefined>();
    let currentTurnRunId: string | undefined;
    for (let index = visibleMessages.length - 1; index >= 0; index -= 1) {
      const message = visibleMessages[index];
      if (message.role === 'user') {
        runIdsByIndex.set(index, message.runId || currentTurnRunId);
        currentTurnRunId = undefined;
        continue;
      }
      if (message.runId) {
        currentTurnRunId = message.runId;
      }
    }
    return runIdsByIndex;
  }, [visibleMessages]);
  const canCancelActiveRun = isRunActive && canCancelRuns && Boolean(activeRunId);
  const isPanel = displayMode === 'panel';
  const activeSession = sessions.find((session) => session.id === activeSessionId) || null;
  const resolvedTitleKey = titleKey || 'chat.triageConsole';
  const title = activeSession && (activeSession.backendSessionId || activeSession.messages.length > 0) ? activeSession.name : t(resolvedTitleKey);
  const isHydratingExistingConversation = Boolean(activeSession?.backendSessionId && activeSession.hydrated === false && visibleMessages.length === 0);
  const hasConversationLoadError = Boolean(activeSession?.backendSessionId && activeSession.messagesLoadFailed && visibleMessages.length === 0);
  const isLoadingInitialConversation = !activeSession && isSessionsLoading;
  const shouldShowTranscriptSkeleton = visibleMessages.length === 0 && !hasConversationLoadError && (isHydratingExistingConversation || isLoadingInitialConversation);
  const resolvedSuggestionKeys = suggestionKeys || SUGGESTION_KEYS;
  const resolvedDescriptionKey = descriptionKey || 'chat.description';
  const resolvedPromptTitleKey = promptTitleKey || 'chat.promptTitle';
  const resolvedPromptBodyKey = promptBodyKey || 'chat.promptBody';
  const resolvedInputPlaceholderKey = inputPlaceholderKey || 'chat.inputPlaceholder';
  const resolvedNoChatAccessKey = noChatAccessKey || 'chat.noChatAccess';
  const resolvedFooterKey = footerKey || 'chat.footer';
  const resolvedFooterNoAccessKey = footerNoAccessKey || 'chat.footerNoAccess';
  const hasComposerAttachmentContext = composerAttachments.some((attachment) => attachment.status === 'ready' && attachment.content.trim());
  const hasComposerSubmitPayload = Boolean(inputValue.trim() || hasComposerAttachmentContext);
  const composerNotice = [runtimeFallbackNotice, composerAttachmentNotice].filter(Boolean).join(' ');
  const composerModelOptions = React.useMemo(() => buildComposerModelOptions(workspaceAiSettings), [workspaceAiSettings]);
  const selectableComposerModelOptions = React.useMemo(() => composerModelOptions.filter((option) => option.ready), [composerModelOptions]);
  const hasReadyComposerModel = selectableComposerModelOptions.length > 0;
  const runtimeResolution = React.useMemo(
    () => workspaceAiSettings
      ? resolveComposerRuntimeSelection(workspaceAiSettings, composerModelOptions, composerRuntimeSelection)
      : { selection: undefined, fellBack: false },
    [composerModelOptions, composerRuntimeSelection, workspaceAiSettings]
  );
  const resolvedComposerRuntimeSelection = runtimeResolution.selection;
  const selectedProvider = resolvedComposerRuntimeSelection?.provider || composerRuntimeSelection?.provider || 'openai';
  const selectedModel = resolvedComposerRuntimeSelection?.model || composerRuntimeSelection?.model || '';
  const selectedEffort = resolvedComposerRuntimeSelection?.reasoningEffort || composerRuntimeSelection?.reasoningEffort || 'low';
  const selectedModelOption = React.useMemo(
    () => findComposerModelOption(composerModelOptions, selectedProvider, selectedModel),
    [composerModelOptions, selectedModel, selectedProvider]
  );
  const isComposerRuntimeBlocked = Boolean(workspaceAiSettings && !hasReadyComposerModel);
  const aiSettingsGateReason = resolveAiSettingsGateReason(canChat, isWorkspaceAiSettingsLoading, workspaceAiSettingsError, isComposerRuntimeBlocked);
  const isComposerRuntimeUnavailable = Boolean(isWorkspaceAiSettingsLoading || workspaceAiSettingsError || (workspaceAiSettings && !selectedModelOption?.ready));
  const allowedReasoningOptions = React.useMemo(
    () => REASONING_OPTIONS.filter((option) => !workspaceAiSettings || workspaceAiSettings.allowedReasoningEfforts.includes(option.value as ReasoningEffort)),
    [workspaceAiSettings]
  );
  const selectedEffortOption = allowedReasoningOptions.find((option) => option.value === selectedEffort) || allowedReasoningOptions[0] || REASONING_OPTIONS[0];
  const selectedModelLabel = selectedModelOption?.ready
    ? selectedModelOption.model
    : isWorkspaceAiSettingsLoading
      ? t('chat.modelLoading')
      : workspaceAiSettingsError
        ? t('chat.modelUnavailable')
        : workspaceAiSettings && !hasReadyComposerModel
          ? t('chat.noModelsAvailable')
          : t('chat.modelDefault');
  const selectedEffortLabel = t(selectedEffortOption.labelKey);
  const isFileDragActive = dragDepth > 0;
  const composerSubmitUnavailableReason = isComposerRuntimeBlocked
    ? t('chat.noConfiguredModels')
    : isWorkspaceAiSettingsLoading
      ? t('chat.modelLoading')
      : isComposerRuntimeUnavailable
      ? t('chat.modelUnavailable')
      : '';
  const composerActionLabel = isRunActive
    ? isCancellingRun
      ? t('chat.cancellingRun')
      : canCancelActiveRun
        ? t('chat.cancelRun')
        : t('chat.cancelWaiting')
    : composerSubmitUnavailableReason || t('chat.send');
  const newChatUnavailableReason = !canChat
    ? t(resolvedNoChatAccessKey)
    : '';
  const historyControlLabel = isHistoryOpen ? t('chat.hideHistory') : t('chat.showHistory');
  const releaseComposerSubmitLockSoon = () => {
    setTimeout(() => {
      isComposerSubmittingRef.current = false;
    }, 0);
  };
  const sendText = async (text: string) => {
    if (!text.trim() || !canPost || isRunActive || isComposerRuntimeUnavailable || isComposerSubmittingRef.current) return;
    const message = buildPromptWithComposerContext(text, composerAttachments);
    isComposerSubmittingRef.current = true;
    try {
      composerAttachmentEpochRef.current += 1;
      const sendPromise = onSend(message, resolvedComposerRuntimeSelection);
      releaseComposerSubmitLockSoon();
      await sendPromise;
      clearComposerAttachments();
    } catch (error) {
      isComposerSubmittingRef.current = false;
      throw error;
    }
  };
  const openDeleteSessionModal = (sessionId: string) => {
    if (!canDeleteSessions) return;
    setDeleteSessionError(null);
    setDeleteTargetSessionId(sessionId);
  };
  const selectSession = (sessionId: string) => {
    if (sessionId !== activeSessionId) clearComposerAttachments();
    onSelectSession(sessionId);
  };

  const closeDeleteSessionModal = () => {
    if (deletingSessionId) return;
    setDeleteTargetSessionId(null);
    setDeleteSessionError(null);
  };

  const confirmDeleteSession = async () => {
    if (!deleteTargetSession) return;

    try {
      setDeletingSessionId(deleteTargetSession.id);
      setDeleteSessionError(null);
      await onDeleteSession(deleteTargetSession.id);
      setDeleteTargetSessionId(null);
    } catch (error) {
      const message = formatControlPlaneError(error, t('chat.failedDelete'));
      setDeleteSessionError(message);
      console.error('Failed deleting conversation', error);
    } finally {
      setDeletingSessionId(null);
    }
  };

  const startEditingMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingMessageValue(content);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingMessageValue('');
  };

  const submitEditedMessage = async (messageId: string) => {
    const nextContent = editingMessageValue.trim();
    if (!nextContent || !canPost || isSubmittingEdit || isRunActive || isComposerRuntimeUnavailable) return;
    setIsSubmittingEdit(true);
    try {
      await onEditLastUserMessage(messageId, nextContent, resolvedComposerRuntimeSelection);
      cancelEditingMessage();
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const removeComposerAttachment = (attachmentId: string) => {
    setComposerAttachments((current) => {
      const targetAttachment = current.find((attachment) => attachment.id === attachmentId);
      if (targetAttachment) revokeAttachmentPreview(targetAttachment);
      return current.filter((attachment) => attachment.id !== attachmentId);
    });
    setComposerAttachmentNotice('');
  };

  const clearComposerAttachments = () => {
    composerAttachmentEpochRef.current += 1;
    setComposerAttachments((current) => {
      current.forEach(revokeAttachmentPreview);
      return [];
    });
    setComposerAttachmentNotice('');
  };

  const processComposerFiles = async (files: File[]) => {
    if (!canPost || isRunActive || files.length === 0) return;
    const attachmentEpoch = composerAttachmentEpochRef.current;
    const currentAttachments = composerAttachmentsRef.current;
    const remainingSlots = Math.max(0, MAX_COMPOSER_ATTACHMENTS - currentAttachments.length);
    const oversizedCount = files.filter((file) => file.size > MAX_ATTACHMENT_FILE_BYTES).length;
    const eligibleFiles = files.filter((file) => file.size <= MAX_ATTACHMENT_FILE_BYTES);
    const selectedFiles = eligibleFiles.slice(0, remainingSlots);
    const skippedCount = eligibleFiles.length - selectedFiles.length;
    const notices = [
      oversizedCount > 0 ? t('chat.attachmentTooLargeNotice', { count: oversizedCount, size: formatAttachmentSize(MAX_ATTACHMENT_FILE_BYTES) }) : '',
      skippedCount > 0 || (files.length > 0 && remainingSlots === 0) ? t('chat.attachmentLimitNotice', { count: skippedCount || files.length, max: MAX_COMPOSER_ATTACHMENTS }) : ''
    ].filter(Boolean);
    setComposerAttachmentNotice(notices.join(' '));
    if (selectedFiles.length === 0) return;

    let remainingContextChars = Math.max(
      0,
      MAX_TOTAL_ATTACHMENT_CONTEXT_CHARS - currentAttachments.reduce((total, attachment) => total + attachment.content.length, 0)
    );
    const nextAttachments: ComposerAttachment[] = [];
    for (const file of selectedFiles) {
      const attachment = await createComposerAttachment(file, remainingContextChars);
      if (attachment.status === 'ready') {
        remainingContextChars = Math.max(0, remainingContextChars - attachment.content.length);
      }
      nextAttachments.push(attachment);
    }
    if (!isMountedRef.current || attachmentEpoch !== composerAttachmentEpochRef.current) {
      nextAttachments.forEach(revokeAttachmentPreview);
      return;
    }
    setComposerAttachments((current) => {
      const availableSlots = Math.max(0, MAX_COMPOSER_ATTACHMENTS - current.length);
      let remainingContextChars = Math.max(
        0,
        MAX_TOTAL_ATTACHMENT_CONTEXT_CHARS - current.reduce((total, attachment) => total + attachment.content.length, 0)
      );
      const acceptedAttachments = nextAttachments.slice(0, availableSlots).map((attachment) => {
        const fittedAttachment = fitAttachmentToRemainingContext(attachment, remainingContextChars);
        if (fittedAttachment.status === 'ready') {
          remainingContextChars = Math.max(0, remainingContextChars - fittedAttachment.content.length);
        }
        return fittedAttachment;
      });
      nextAttachments.slice(availableSlots).forEach(revokeAttachmentPreview);
      return [...current, ...acceptedAttachments];
    });
  };

  const submitComposerMessage = async () => {
    if (!hasComposerSubmitPayload || !canPost || isRunActive || isComposerRuntimeUnavailable || isComposerSubmittingRef.current) return;
    const message = buildPromptWithComposerContext(inputValue, composerAttachments);
    isComposerSubmittingRef.current = true;
    try {
      composerAttachmentEpochRef.current += 1;
      const sendPromise = onSend(message, resolvedComposerRuntimeSelection);
      releaseComposerSubmitLockSoon();
      await sendPromise;
      clearComposerAttachments();
    } catch (error) {
      isComposerSubmittingRef.current = false;
      throw error;
    }
  };

  const handleAttachmentInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    await processComposerFiles(files);
  };

  const focusComposer = (): boolean => {
    if (!canPost || isRunActive) return false;
    composerTextareaRef.current?.focus({ preventScroll: true });
    return document.activeElement === composerTextareaRef.current;
  };

  const scheduleComposerFocus = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (focusComposer()) pendingComposerFocusRef.current = false;
      });
    });
  };

  const requestComposerFocus = () => {
    pendingComposerFocusRef.current = true;
    scheduleComposerFocus();
  };

  const handleCreateSessionClick = () => {
    clearComposerAttachments();
    onCreateSession();
    requestComposerFocus();
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    void submitComposerMessage();
  };

  const handleModelAndEffortChange = (value: ReasoningEffort) => {
    if (resolvedComposerRuntimeSelection) {
      onComposerRuntimeSelectionChange({ ...resolvedComposerRuntimeSelection, reasoningEffort: value });
    }
    setRuntimeFallbackNotice('');
    setIsModelMenuOpen(false);
    setIsModelSubmenuOpen(false);
  };

  const handleModelChange = (option: ComposerModelOption) => {
    if (!option.ready) return;
    onComposerRuntimeSelectionChange({
      provider: option.provider,
      model: option.model,
      reasoningEffort: resolvedComposerRuntimeSelection?.reasoningEffort || selectedEffort
    });
    setRuntimeFallbackNotice('');
    setIsModelMenuOpen(false);
    setIsModelSubmenuOpen(false);
  };

  const handleChatWindowDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDragEvent(event)) return;
    event.preventDefault();
    setDragDepth((current) => current + 1);
  };

  const handleChatWindowDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDragEvent(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = canPost && !isRunActive ? 'copy' : 'none';
  };

  const handleChatWindowDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDragEvent(event)) return;
    event.preventDefault();
    setDragDepth((current) => Math.max(0, current - 1));
  };

  const handleChatWindowDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDragEvent(event)) return;
    event.preventDefault();
    setDragDepth(0);
    await processComposerFiles(Array.from(event.dataTransfer.files || []));
  };

  React.useEffect(() => {
    let cancelled = false;

    setIsWorkspaceAiSettingsLoading(true);
    setWorkspaceAiSettingsError('');
    controlPlaneApi.getWorkspaceAiSettings(target.workspaceId)
      .then((settings) => {
        if (cancelled) return;
        setWorkspaceAiSettings(settings);
      })
      .catch((error) => {
        if (cancelled) return;
        setWorkspaceAiSettings(null);
        setWorkspaceAiSettingsError(formatControlPlaneError(error, t('workspaceAiSettings.loadFailed'), { area: 'aiSettings' }));
      })
      .finally(() => {
        if (cancelled) return;
        setIsWorkspaceAiSettingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [target.workspaceId, t, workspaceAiSettingsRefreshToken]);

  React.useEffect(() => {
    if (!canChat) {
      setAssistantCapabilitiesPreview(null);
      setAssistantCapabilitiesPreviewError('');
      setIsAssistantCapabilitiesPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setIsAssistantCapabilitiesPreviewLoading(true);
    setAssistantCapabilitiesPreviewError('');
    setAssistantCapabilitiesPreview(null);
    controlPlaneApi.getTargetAssistantCapabilitiesPreview(target.workspaceId, target.id, requestedToolAccessMode)
      .then((preview) => {
        if (cancelled) return;
        setAssistantCapabilitiesPreview(preview);
      })
      .catch((error) => {
        if (cancelled) return;
        setAssistantCapabilitiesPreview(null);
        setAssistantCapabilitiesPreviewError(formatControlPlaneError(error, t('chat.capabilityPreviewUnavailable'), { area: 'targetTools' }));
      })
      .finally(() => {
        if (cancelled) return;
        setIsAssistantCapabilitiesPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canChat, target.id, target.workspaceId, requestedToolAccessMode, t]);

  React.useEffect(() => {
    setRuntimeFallbackNotice('');
  }, [activeSessionId]);

  React.useEffect(() => {
    if (!resolvedComposerRuntimeSelection) return;
    if (runtimeResolution.fellBack && !chatRuntimeSelectionsEqual(composerRuntimeSelection, resolvedComposerRuntimeSelection)) {
      onComposerRuntimeSelectionChange(resolvedComposerRuntimeSelection);
    }
    if (runtimeResolution.fellBack) {
      setRuntimeFallbackNotice(t('chat.runtimeFallbackNotice'));
    }
  }, [composerRuntimeSelection, onComposerRuntimeSelectionChange, resolvedComposerRuntimeSelection, runtimeResolution.fellBack, t]);

  React.useEffect(() => {
    if (deleteTargetSessionId && !deleteTargetSession && !deletingSessionId) {
      setDeleteTargetSessionId(null);
      setDeleteSessionError(null);
    }
  }, [deleteTargetSession, deleteTargetSessionId, deletingSessionId]);

  React.useEffect(() => {
    if (previousActiveSessionIdRef.current === activeSessionId) return;
    previousActiveSessionIdRef.current = activeSessionId;
    clearComposerAttachments();
  }, [activeSessionId]);

  React.useEffect(() => {
    composerAttachmentsRef.current = composerAttachments;
  }, [composerAttachments]);

  React.useLayoutEffect(() => {
    const textarea = composerTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
  }, [inputValue]);

  React.useEffect(() => {
    if (!pendingComposerFocusRef.current || !canPost || isRunActive) return;
    scheduleComposerFocus();
  }, [activeSessionId, canPost, isRunActive]);

  React.useEffect(() => {
    const wasRunActive = previousIsRunActiveRef.current;
    previousIsRunActiveRef.current = isRunActive;
    if (!wasRunActive || isRunActive || !canPost || isHistoryOpen || isModelMenuOpen || editingMessageId) return;
    const activeElement = document.activeElement;
    if (
      activeElement &&
      activeElement !== document.body &&
      activeElement !== composerTextareaRef.current &&
      !(activeElement instanceof Node && composerRootRef.current?.contains(activeElement))
    ) {
      return;
    }
    scheduleComposerFocus();
  }, [canPost, editingMessageId, isHistoryOpen, isModelMenuOpen, isRunActive]);

  React.useEffect(() => {
    if (!isModelMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const targetElement = event.target instanceof Node ? event.target : null;
      if (targetElement && modelMenuRef.current?.contains(targetElement)) return;
      setIsModelMenuOpen(false);
      setIsModelSubmenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsModelMenuOpen(false);
      setIsModelSubmenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModelMenuOpen]);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      composerAttachmentsRef.current.forEach(revokeAttachmentPreview);
    };
  }, []);

  useTargetChatHistoryFocus({ isHistoryOpen, historyButtonRef, historyPanelRef });

  return (
    <TargetChatViewBody
      {...{
        activeRunId, activeSession, activeSessionId, aiSettingsGateReason, allowedReasoningOptions, assistantMarkdownComponents, assistantCapabilitiesPreview, assistantCapabilitiesPreviewError, canApproveWriteActions,
        canCancelActiveRun, canChat, canDeleteSessions, canManageAiSettings, canPost, target, composerActionLabel, composerAttachmentNotice: composerNotice,
        composerAttachments, composerModelOptions: selectableComposerModelOptions, composerRootRef, composerSubmitUnavailableReason, composerTextareaRef, conversationNotice, deleteSessionError, deleteTargetSession,
        deletingSessionId, desktopHistoryPanelId, fileInputRef, hasComposerSubmitPayload, hasConversationLoadError, hasEarlierMessages, handleAttachmentInputChange, handleChatWindowDragEnter,
        handleChatWindowDragLeave, handleChatWindowDragOver, handleChatWindowDrop, handleComposerKeyDown, handleCreateSessionClick, handleModelAndEffortChange, handleModelChange, historyButtonRef,
        historyControlLabel, historyPanelRef, inputValue, isAssistantCapabilitiesPreviewLoading, isCancellingRun, isComposerRuntimeUnavailable, isFileDragActive, isHistoryOpen,
        isLoadingEarlierMessages, isModelMenuOpen, isModelSubmenuOpen, isPanel, isRunActive, isSessionsLoading, isSubmittingEdit, isWorkspaceAiSettingsLoading,
        lastUserMessageIndex, mobileHistoryPanelId, modelMenuPanelId, modelMenuRef, modelSelectorId, modelSubmenuButtonId, modelSubmenuPanelId, newChatUnavailableReason,
        onApprove, onCancelRun, onChatScroll, onClose, onDismissRecentActivityWarning, onInputChange, onLoadEarlierMessages, onMaximize, onOpenAiSettings, onOpenRecentActivitySession, onReject,
        recentActivityWarning: effectiveRecentActivityWarning, removeComposerAttachment, requestedToolAccessMode, resolvedDescriptionKey, resolvedFooterKey, resolvedFooterNoAccessKey, resolvedInputPlaceholderKey,
        resolvedNoChatAccessKey, resolvedPromptBodyKey, resolvedPromptTitleKey, resolvedSuggestionKeys, runTracesByRunId, selectSession, selectedEffort, selectedEffortLabel,
        selectedModel, selectedModelLabel, selectedProvider, sendText, sessionAssistantStatuses, sessions, setEditingMessageValue, setIsHistoryOpen,
        setIsModelMenuOpen, setIsModelSubmenuOpen, setTraceExpandedByRunId, shouldShowTranscriptSkeleton, submitComposerMessage, t, title, traceExpandedByRunId,
        transcriptRef, userMarkdownComponents, userTurnRunIdsByIndex, visibleMessages, workspaceAiSettingsError, startEditingMessage, cancelEditingMessage, closeDeleteSessionModal,
        confirmDeleteSession, editingMessageId, editingMessageValue, isInFlightAssistantPlaceholder, openDeleteSessionModal, submitEditedMessage
      }}
    />
  );
};
