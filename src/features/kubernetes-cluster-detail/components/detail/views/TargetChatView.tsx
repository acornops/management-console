import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Check, ChevronDown, ChevronRight, FileText, History, Image as ImageIcon, Loader2, Maximize2, Plus, Square, Upload, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Tooltip } from '@/components/common/Tooltip';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { ConversationHistory } from '@/features/kubernetes-cluster-detail/components/detail/ConversationHistory';
import { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';
import { AssistantTurn } from '@/features/kubernetes-cluster-detail/components/detail/views/AssistantTurn';
import { ChatComposerNotice } from '@/features/kubernetes-cluster-detail/components/detail/views/ChatComposerNotice';
import { ChatEmptyPrompt, ChatTranscriptLoadError, ChatTranscriptSkeleton } from '@/features/kubernetes-cluster-detail/components/detail/views/ChatTranscriptStates';
import { DeleteConversationDialog } from '@/features/kubernetes-cluster-detail/components/detail/views/DeleteConversationDialog';
import { UserMessageTurn } from '@/features/kubernetes-cluster-detail/components/detail/views/UserMessageTurn';
import type { TargetChatViewProps } from '@/features/kubernetes-cluster-detail/components/detail/views/TargetChatView.types';
import type { ChatRuntimeSelection, LlmProvider, ReasoningEffort, WorkspaceAiProviderStatus, WorkspaceAiSettings } from '@/types';

const SUGGESTION_KEYS = ['chat.suggestions.podTermination', 'chat.suggestions.serviceDns', 'chat.suggestions.crashLooping', 'chat.suggestions.mcpConnectivity'];
const READABLE_ATTACHMENT_EXTENSIONS = new Set([
  'csv',
  'json',
  'log',
  'md',
  'txt',
  'yaml',
  'yml'
]);
const READABLE_ATTACHMENT_TYPES = new Set([
  'application/json',
  'application/x-yaml',
  'text/csv',
  'text/markdown',
  'text/plain',
  'text/yaml'
]);
const MAX_ATTACHMENT_CONTEXT_CHARS = 12000;
const MAX_ATTACHMENT_READ_BYTES = 64 * 1024;
const MAX_ATTACHMENT_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_CONTEXT_CHARS = 24000;
const MAX_COMPOSER_ATTACHMENTS = 5;
const REASONING_OPTIONS = [
  { value: 'default', labelKey: 'chat.effortDefault' },
  { value: 'low', labelKey: 'chat.effortLow' },
  { value: 'medium', labelKey: 'chat.effortMedium' },
  { value: 'high', labelKey: 'chat.effortHigh' }
];
const PROVIDERS: LlmProvider[] = ['openai', 'anthropic', 'gemini'];

type ComposerAttachmentStatus = 'ready' | 'preview_only' | 'error';

interface ComposerModelOption {
  provider: LlmProvider;
  model: string;
  configured: boolean;
  enabled: boolean;
  ready: boolean;
}

interface ComposerAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  content: string;
  status: ComposerAttachmentStatus;
  previewUrl?: string;
  truncated?: boolean;
}

const historyFocusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}
function getFocusableHistoryElements(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(historyFocusableSelector)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true' || element.hasAttribute('hidden')) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}
function getHistoryFocusWrapIndex(currentIndex: number, focusableCount: number, shiftKey: boolean): number | null {
  if (focusableCount <= 0) return null;
  if (currentIndex < 0) return shiftKey ? focusableCount - 1 : 0;
  if (shiftKey && currentIndex === 0) return focusableCount - 1;
  if (!shiftKey && currentIndex === focusableCount - 1) return 0;
  return null;
}

function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) return '';
  return fileName.slice(dotIndex + 1).toLowerCase();
}

function canReadAttachmentAsText(file: File): boolean {
  const extension = getFileExtension(file.name);
  return file.type.startsWith('text/') || READABLE_ATTACHMENT_TYPES.has(file.type) || READABLE_ATTACHMENT_EXTENSIONS.has(extension);
}

function formatAttachmentSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function createComposerAttachmentId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
}

function revokeAttachmentPreview(attachment: ComposerAttachment): void {
  if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
}

function markdownFenceFor(content: string): string {
  let fence = '```';
  while (content.includes(fence)) {
    fence += '`';
  }
  return fence;
}

function fitAttachmentToRemainingContext(attachment: ComposerAttachment, remainingContextChars: number): ComposerAttachment {
  if (attachment.status !== 'ready' || !attachment.content) return attachment;
  if (remainingContextChars <= 0) {
    return {
      ...attachment,
      content: '',
      status: 'preview_only',
      truncated: true
    };
  }
  if (attachment.content.length <= remainingContextChars) return attachment;
  const content = attachment.content.slice(0, remainingContextChars);
  return {
    ...attachment,
    content,
    status: content.trim() ? 'ready' : 'preview_only',
    truncated: true
  };
}

async function createComposerAttachment(file: File, remainingContextChars: number): Promise<ComposerAttachment> {
  const extension = getFileExtension(file.name);
  const baseAttachment = {
    id: createComposerAttachmentId(file),
    name: file.name,
    size: file.size,
    type: file.type,
    extension,
    content: ''
  };

  if (canReadAttachmentAsText(file)) {
    if (remainingContextChars <= 0) {
      return {
        ...baseAttachment,
        status: 'preview_only'
      };
    }

    try {
      const content = await file.slice(0, Math.min(file.size, MAX_ATTACHMENT_READ_BYTES)).text();
      const contextLimit = Math.min(MAX_ATTACHMENT_CONTEXT_CHARS, remainingContextChars);
      const includedContent = content.slice(0, contextLimit);
      return {
        ...baseAttachment,
        content: includedContent,
        status: includedContent.trim() ? 'ready' : 'preview_only',
        truncated: file.size > MAX_ATTACHMENT_READ_BYTES || content.length > contextLimit
      };
    } catch {
      return {
        ...baseAttachment,
        status: 'error'
      };
    }
  }

  return {
    ...baseAttachment,
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    status: 'preview_only'
  };
}

function buildPromptWithComposerContext(prompt: string, attachments: ComposerAttachment[]): string {
  const trimmedPrompt = prompt.trim();
  const includedAttachments = attachments.filter((attachment) => attachment.status === 'ready' && attachment.content.trim());
  const previewOnlyAttachments = attachments.filter((attachment) => attachment.status !== 'ready');

  if (includedAttachments.length === 0 && previewOnlyAttachments.length === 0) {
    return trimmedPrompt;
  }

  const promptPrefix = trimmedPrompt || 'Review the attached file context.';
  const attachmentSections = includedAttachments.map((attachment, index) => {
    const fence = markdownFenceFor(attachment.content);
    return [
      `Attachment ${index + 1}: ${attachment.name}`,
      `Type: ${attachment.type || attachment.extension || 'unknown'}`,
      `Size: ${formatAttachmentSize(attachment.size)}`,
      attachment.truncated ? 'Note: content was truncated to fit the message context budget.' : '',
      'Content:',
      fence,
      attachment.content,
      fence
    ].filter(Boolean).join('\n');
  });
  const previewOnlySection = previewOnlyAttachments.length > 0
    ? [
        'Files selected but not included as text context:',
        ...previewOnlyAttachments.map((attachment) => `- ${attachment.name} (${attachment.type || attachment.extension || 'unknown'}, ${formatAttachmentSize(attachment.size)})`)
      ].join('\n')
    : '';
  return [
    promptPrefix,
    '',
    'Attached context:',
    ...attachmentSections,
    previewOnlySection
  ].filter(Boolean).join('\n\n');
}

function isFileDragEvent(event: React.DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes('Files');
}

function providerLabel(provider: LlmProvider): string {
  if (provider === 'openai') return 'OpenAI';
  if (provider === 'anthropic') return 'Anthropic';
  return 'Gemini';
}

function modelBelongsToProvider(model: string, provider: LlmProvider): boolean {
  const normalized = model.toLowerCase();
  if (provider === 'openai') return normalized.startsWith('gpt-') || normalized.startsWith('o');
  if (provider === 'anthropic') return normalized.includes('claude');
  return normalized.includes('gemini');
}

function modelBelongsToAnyProvider(model: string): boolean {
  return PROVIDERS.some((provider) => modelBelongsToProvider(model, provider));
}

function providerStatusFor(settings: WorkspaceAiSettings, provider: LlmProvider): WorkspaceAiProviderStatus | undefined {
  return settings.providers.find((status) => status.provider === provider);
}

function modelsForProvider(allowedModels: string[], provider: LlmProvider): string[] {
  return allowedModels.filter((model) => modelBelongsToProvider(model, provider) || !modelBelongsToAnyProvider(model));
}

function buildComposerModelOptions(settings: WorkspaceAiSettings | null): ComposerModelOption[] {
  if (!settings) return [];
  return settings.allowedProviders.flatMap((provider) => {
    const providerStatus = providerStatusFor(settings, provider);
    const configured = providerStatus?.configured ?? false;
    const enabled = providerStatus?.enabled ?? true;
    return modelsForProvider(settings.allowedModels, provider).map((model) => ({
      provider,
      model,
      configured,
      enabled,
      ready: configured && enabled
    }));
  });
}

function findComposerModelOption(
  options: ComposerModelOption[],
  provider: LlmProvider,
  model: string
): ComposerModelOption | undefined {
  return options.find((option) => option.provider === provider && option.model === model);
}

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
  canApproveWriteActions,
  canCancelRuns,
  canDeleteSessions,
  isRunActive,
  isSessionsLoading,
  isLoadingEarlierMessages,
  hasEarlierMessages,
  activeRunId,
  isCancellingRun,
  inputValue,
  sessions,
  activeSessionId,
  assistantMarkdownComponents,
  userMarkdownComponents,
  visibleMessages,
  runTracesByRunId,
  sessionAssistantStatuses = {},
  transcriptRef,
  onChatScroll,
  onLoadEarlierMessages,
  onInputChange,
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
  const cluster = target;
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
  const [selectedProvider, setSelectedProvider] = React.useState<LlmProvider>('openai');
  const [selectedModel, setSelectedModel] = React.useState('');
  const [selectedEffort, setSelectedEffort] = React.useState<ReasoningEffort>('default');
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

  const canPost = canChat && isConversationOwner && !recentActivityWarning;
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
  const composerModelOptions = React.useMemo(() => buildComposerModelOptions(workspaceAiSettings), [workspaceAiSettings]);
  const hasReadyComposerModel = composerModelOptions.some((option) => option.ready);
  const selectedModelOption = React.useMemo(
    () => findComposerModelOption(composerModelOptions, selectedProvider, selectedModel),
    [composerModelOptions, selectedModel, selectedProvider]
  );
  const isComposerRuntimeBlocked = Boolean(workspaceAiSettings && !hasReadyComposerModel);
  const isComposerRuntimeUnavailable = Boolean(isWorkspaceAiSettingsLoading || workspaceAiSettingsError || (workspaceAiSettings && !selectedModelOption?.ready));
  const allowedReasoningOptions = React.useMemo(
    () => REASONING_OPTIONS.filter((option) => !workspaceAiSettings || workspaceAiSettings.allowedReasoningEfforts.includes(option.value as ReasoningEffort)),
    [workspaceAiSettings]
  );
  const selectedEffortOption = allowedReasoningOptions.find((option) => option.value === selectedEffort) || allowedReasoningOptions[0] || REASONING_OPTIONS[0];
  const selectedModelLabel = selectedModelOption?.model || (isWorkspaceAiSettingsLoading ? t('chat.modelLoading') : workspaceAiSettingsError ? t('chat.modelUnavailable') : t('chat.modelDefault'));
  const selectedEffortLabel = t(selectedEffortOption.labelKey);
  const composerRuntimeSelection: ChatRuntimeSelection | undefined = workspaceAiSettings && selectedModelOption?.ready
    ? {
        provider: selectedModelOption.provider,
        model: selectedModelOption.model,
        reasoningEffort: selectedEffortOption.value as ReasoningEffort
      }
    : undefined;
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
      const sendPromise = onSend(message, composerRuntimeSelection);
      releaseComposerSubmitLockSoon();
      await sendPromise;
      clearComposerAttachments();
    } catch (error) {
      isComposerSubmittingRef.current = false;
      throw error;
    }
  };
  const panelWindowControls = (
    <div className="flex shrink-0 items-center gap-1">
      {onMaximize && (
        <Tooltip content={t('chat.fullscreen')}>
          <button
            type="button"
            onClick={onMaximize}
            className="rounded-lg p-2 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
            aria-label={t('chat.fullscreen')}
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        </Tooltip>
      )}
      {onClose && (
        <Tooltip content={t('app.close')}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
            aria-label={t('app.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </Tooltip>
      )}
    </div>
  );

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
      const message = error instanceof Error ? error.message : t('chat.failedDelete');
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
      await onEditLastUserMessage(messageId, nextContent, composerRuntimeSelection);
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
      const sendPromise = onSend(message, composerRuntimeSelection);
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
    setSelectedEffort(value);
    setIsModelMenuOpen(false);
    setIsModelSubmenuOpen(false);
  };

  const handleModelChange = (option: ComposerModelOption) => {
    if (!option.ready) return;
    setSelectedProvider(option.provider);
    setSelectedModel(option.model);
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
    controlPlaneApi.getWorkspaceAiSettings(cluster.workspaceId)
      .then((settings) => {
        if (cancelled) return;
        setWorkspaceAiSettings(settings);
      })
      .catch((error) => {
        if (cancelled) return;
        setWorkspaceAiSettings(null);
        setWorkspaceAiSettingsError(error instanceof Error ? error.message : t('workspaceAiSettings.loadFailed'));
      })
      .finally(() => {
        if (cancelled) return;
        setIsWorkspaceAiSettingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cluster.workspaceId, t]);

  React.useEffect(() => {
    if (!workspaceAiSettings) return;

    const currentOption = findComposerModelOption(composerModelOptions, selectedProvider, selectedModel);
    const defaultOption = findComposerModelOption(
      composerModelOptions,
      workspaceAiSettings.defaultProvider,
      workspaceAiSettings.defaultModel
    );
    const nextOption = (currentOption?.ready ? currentOption : undefined)
      || (defaultOption?.ready ? defaultOption : undefined)
      || composerModelOptions.find((option) => option.ready)
      || currentOption
      || defaultOption
      || composerModelOptions[0];
    if (nextOption && (nextOption.provider !== selectedProvider || nextOption.model !== selectedModel)) {
      setSelectedProvider(nextOption.provider);
      setSelectedModel(nextOption.model);
    }

    const nextEffort = workspaceAiSettings.allowedReasoningEfforts.includes(selectedEffort)
      ? selectedEffort
      : workspaceAiSettings.allowedReasoningEfforts.includes(workspaceAiSettings.reasoningEffort)
        ? workspaceAiSettings.reasoningEffort
        : workspaceAiSettings.allowedReasoningEfforts[0] || 'default';
    if (nextEffort !== selectedEffort) {
      setSelectedEffort(nextEffort);
    }
  }, [composerModelOptions, selectedEffort, selectedModel, selectedProvider, workspaceAiSettings]);

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

  React.useEffect(() => {
    if (!isHistoryOpen) {
      return;
    }
    const usesOverlayHistory = window.matchMedia('(max-width: 1023px)').matches;
    const restoreTarget = usesOverlayHistory && document.activeElement instanceof HTMLElement ? document.activeElement : historyButtonRef.current;
    const focusTimer = usesOverlayHistory
      ? window.setTimeout(() => {
          historyPanelRef.current?.focus({ preventScroll: true });
        }, 0)
      : undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (usesOverlayHistory && event.key === 'Tab') {
        const panel = historyPanelRef.current;
        if (!panel) return;

        const focusableElements = getFocusableHistoryElements(panel);
        const targetIndex = getHistoryFocusWrapIndex(
          focusableElements.findIndex((element) => element === document.activeElement),
          focusableElements.length,
          event.shiftKey
        );

        if (targetIndex === null) return;
        event.preventDefault();
        event.stopPropagation();
        focusableElements[targetIndex]?.focus({ preventScroll: true });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (focusTimer !== undefined) window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      if (usesOverlayHistory && restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus({ preventScroll: true });
      }
    };
  }, [isHistoryOpen]);

  return (
    <div
      className="flex-1 flex min-w-0 overflow-hidden bg-ui-bg relative"
      onDragEnter={handleChatWindowDragEnter}
      onDragOver={handleChatWindowDragOver}
      onDragLeave={handleChatWindowDragLeave}
      onDrop={(event) => void handleChatWindowDrop(event)}
    >
      <AnimatePresence>
        {isFileDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute inset-0 z-[140] flex items-center justify-center bg-ui-bg/75 p-6 backdrop-blur-[2px]"
          >
            <div className="flex min-h-48 w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-dashed border-accent/50 bg-accent/10 px-8 py-10 text-center shadow-lg shadow-ui-text/5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-ui-surface text-accent-strong">
                <Upload className="h-5 w-5" />
              </div>
              <p className="mt-4 text-base font-semibold text-ui-text">
                {canPost && !isRunActive ? t('chat.dropFilesTitle') : t('chat.dropFilesUnavailableTitle')}
              </p>
              <p className="mt-2 max-w-md text-sm font-medium leading-6 text-ui-text-muted">
                {canPost && !isRunActive ? t('chat.dropFilesBody') : t(resolvedNoChatAccessKey)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!isPanel && !isHistoryOpen && (
        <Tooltip content={historyControlLabel} side="right" className="absolute left-0 top-1/2 z-20 -translate-y-1/2">
          <button
            ref={historyButtonRef}
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="inline-flex h-16 w-9 items-center justify-center rounded-r-lg border border-l-0 border-ui-border bg-ui-surface text-ui-text-muted shadow-sm transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
            aria-label={historyControlLabel}
            aria-controls={`${desktopHistoryPanelId} ${mobileHistoryPanelId}`}
            aria-expanded={isHistoryOpen}
            aria-pressed={isHistoryOpen}
          >
            <History className="h-4 w-4" />
          </button>
        </Tooltip>
      )}
      <AnimatePresence initial={false}>
        {!isPanel && isHistoryOpen && (
          <motion.aside
            id={desktopHistoryPanelId}
            aria-label={t('chat.history')}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden h-full shrink-0 overflow-visible border-r border-ui-border bg-ui-surface shadow-sm lg:flex"
          >
            <Tooltip content={historyControlLabel} side="right" className="absolute right-[-2.25rem] top-1/2 z-20 -translate-y-1/2">
              <button
                ref={historyButtonRef}
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="inline-flex h-16 w-9 items-center justify-center rounded-r-lg border border-l-0 border-ui-border bg-ui-surface text-ui-text-muted shadow-sm transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                aria-label={historyControlLabel}
                aria-controls={`${desktopHistoryPanelId} ${mobileHistoryPanelId}`}
                aria-expanded={isHistoryOpen}
                aria-pressed={isHistoryOpen}
              >
                <History className="h-4 w-4" />
              </button>
            </Tooltip>
            <div className="flex h-full w-80 shrink-0 flex-col overflow-hidden">
              <ConversationHistory
                appName={cluster.name}
                sessions={sessions}
                activeSessionId={activeSessionId}
                sessionAssistantStatuses={sessionAssistantStatuses}
                isSessionsLoading={isSessionsLoading}
                onSelectSession={selectSession}
                onDeleteSessionClick={openDeleteSessionModal}
                canDeleteSessions={canDeleteSessions}
                t={t}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden relative">
        <header className={`${isPanel ? 'sticky top-0 z-10 border-b border-ui-border bg-ui-surface px-5 py-4 sm:px-6' : 'bg-ui-bg px-4 py-6 sm:px-6 lg:px-10 lg:py-8'} transition-colors`}>
          {isPanel ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-semibold tracking-tight text-ui-text">{title}</h1>
                  <p className="mt-1 text-xs font-medium text-ui-text-muted">
                    {t('chat.panelDescription', { name: cluster.name })}
                  </p>
                </div>
                {panelWindowControls}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <h1 className="type-route-title">{title}</h1>
                <p className="type-body mt-2 max-w-2xl">{t(resolvedDescriptionKey, { name: cluster.name })}</p>
              </div>
              <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:max-w-2xl lg:justify-end">
                <Tooltip content={newChatUnavailableReason} disabled={!newChatUnavailableReason}>
                  <span className="inline-flex w-full sm:w-auto">
                    <Button
                      type="button"
                      onClick={handleCreateSessionClick}
                      disabled={!canChat}
                      variant="secondary"
                      size="md"
                      className="w-full whitespace-nowrap sm:w-auto"
                    >
                      <Plus className="h-4 w-4" />
                      {t('chat.newChat')}
                    </Button>
                  </span>
                </Tooltip>
              </div>
            </div>
          )}
        </header>

        <div
          ref={transcriptRef}
          onScroll={onChatScroll}
          className={`flex-1 scroll-pb-10 overflow-y-auto bg-ui-bg custom-scrollbar ${isPanel ? 'px-5 py-5 sm:px-6 sm:py-6' : 'stable-scrollbar-gutter px-4 py-6 sm:px-6 lg:px-10 lg:py-8'}`}
        >
          {shouldShowTranscriptSkeleton ? (
            <ChatTranscriptSkeleton isPanel={isPanel} label={t('chat.loadingConversation')} />
          ) : hasConversationLoadError ? (
            <ChatTranscriptLoadError
              isPanel={isPanel}
              title={t('chat.conversationLoadFailed')}
              body={t('chat.conversationLoadFailedBody')}
            />
          ) : visibleMessages.length === 0 ? (
            <ChatEmptyPrompt
              isPanel={isPanel}
              title={t(resolvedPromptTitleKey, { name: cluster.name })}
              body={t(resolvedPromptBodyKey)}
              suggestions={resolvedSuggestionKeys.map((suggestionKey) => ({ key: suggestionKey, label: t(suggestionKey) }))}
              canSendSuggestion={canPost && !isRunActive && !isComposerRuntimeUnavailable}
              onSendSuggestion={sendText}
            />
          ) : (
            <div className={`${isPanel ? 'max-w-3xl' : 'max-w-4xl'} mx-auto space-y-5 pb-2`}>
              {hasEarlierMessages && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => void onLoadEarlierMessages()}
                    disabled={isLoadingEarlierMessages}
                    className="type-label rounded-lg border border-ui-border bg-ui-surface px-4 py-2 text-ui-text-muted transition-colors hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoadingEarlierMessages ? t('chat.loadingEarlier') : t('chat.loadEarlier')}
                  </button>
                </div>
              )}
              {visibleMessages.map((message, messageIndex) => {
                const isUser = message.role === 'user';
                const isInFlightPlaceholder = !isUser && isInFlightAssistantPlaceholder(message);
                const messageTrace = !isUser && message.runId ? runTracesByRunId[message.runId] : undefined;
                const activeRunTrace = isInFlightPlaceholder && activeRunId ? runTracesByRunId[activeRunId] : undefined;
                const trace = activeRunTrace || messageTrace;
                const traceRunId = trace?.runId || message.runId || message.id;
                const previousMessage = messageIndex > 0 ? visibleMessages[messageIndex - 1] : undefined;
                const messageKey = !isUser && previousMessage?.role === 'user' ? `assistant-turn-${previousMessage.id}` : message.id;
                const hasLaterUserMessage = messageIndex < lastUserMessageIndex;
                const traceToRender: LiveRunTrace | undefined =
                  trace ||
                  (isInFlightPlaceholder
                    ? {
                        runId: traceRunId,
                        status: 'connecting',
                        steps: [
                          {
                            id: `${traceRunId}-pending`,
                            label: 'Preparing response',
                            detail: 'Waiting for the first progress update.',
                            status: 'info',
                            timestamp: message.timestamp
                          }
                        ],
                        toolCalls: []
                      }
                    : undefined);
                const isStaleCancelledAssistantStatus =
                  !isUser &&
                  hasLaterUserMessage &&
                  traceToRender?.status === 'cancelled';

                if (!isUser) {
                  return (
                    <div key={messageKey} className="flex w-full justify-start">
                      <AssistantTurn
                        timestampLabel={formatMessageTime(message.timestamp)}
                        content={message.content}
                        isInFlightPlaceholder={isInFlightPlaceholder}
                        markdownComponents={assistantMarkdownComponents}
                        approval={message.approval}
                        canApproveWriteActions={canApproveWriteActions}
                        onApprove={onApprove}
                        onReject={onReject}
                        trace={traceToRender}
                        traceRunId={traceRunId}
                        isTraceExpanded={traceExpandedByRunId[traceRunId] ?? false}
                        setTraceExpanded={(runId, expanded) => {
                          setTraceExpandedByRunId((current) => ({ ...current, [runId]: expanded }));
                        }}
                        compactStatusOnly={isStaleCancelledAssistantStatus}
                        t={t}
                      />
                    </div>
                  );
                }

                const userTurnRunId = userTurnRunIdsByIndex.get(messageIndex);
                const userTurnTrace = userTurnRunId ? runTracesByRunId[userTurnRunId] : undefined;
                const canEditUserMessage =
                  canPost &&
                  !isRunActive &&
                  !isComposerRuntimeUnavailable &&
                  messageIndex === lastUserMessageIndex &&
                  Boolean(userTurnRunId) &&
                  (userTurnTrace?.status === 'cancelled' || userTurnTrace?.status === 'failed');
                const isEditingMessage = editingMessageId === message.id;

                return (
                  <UserMessageTurn
                    key={message.id}
                    message={message}
                    markdownComponents={userMarkdownComponents}
                    timestampLabel={formatMessageTime(message.timestamp)}
                    canEdit={canEditUserMessage}
                    isEditing={isEditingMessage}
                    editValue={editingMessageValue}
                    isSubmittingEdit={isSubmittingEdit}
                    onEditValueChange={setEditingMessageValue}
                    onStartEdit={() => startEditingMessage(message.id, message.content)}
                    onCancelEdit={cancelEditingMessage}
                    onSubmitEdit={() => void submitEditedMessage(message.id)}
                    t={t}
                  />
                );
              })}
            </div>
          )}
        </div>

        <form
          className={`${isPanel ? 'px-5 py-4 sm:px-6 sm:py-5' : 'px-4 pb-4 pt-2 sm:px-5'} bg-ui-bg`}
          onSubmit={(event) => {
            event.preventDefault();
            void submitComposerMessage();
          }}
        >
          <ChatComposerNotice
            isPanel={isPanel}
            conversationNotice={conversationNotice}
            recentActivityWarning={recentActivityWarning}
            onDismissRecentActivityWarning={onDismissRecentActivityWarning}
            onOpenRecentActivitySession={onOpenRecentActivitySession}
            t={t}
          />
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
                  placeholder={canPost ? t(resolvedInputPlaceholderKey, { name: cluster.name }) : t(resolvedNoChatAccessKey)}
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
                <div ref={modelMenuRef} className="relative">
                  <button
                    type="button"
                    id={modelSelectorId}
                    onClick={() => {
                      setIsModelMenuOpen((current) => !current);
                      setIsModelSubmenuOpen(false);
                    }}
                    disabled={!canPost || isRunActive || isWorkspaceAiSettingsLoading || Boolean(workspaceAiSettingsError)}
                    className="inline-flex h-8 max-w-[15rem] items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={t('chat.modelAndEffortSelector')}
                    aria-controls={modelMenuPanelId}
                    aria-expanded={isModelMenuOpen}
                  >
                    <span className="truncate">{selectedModelLabel} {selectedEffortLabel}</span>
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
                        className="absolute bottom-full left-0 z-50 mb-3 w-64 rounded-2xl border border-ui-border bg-ui-surface-strong p-2 text-sm shadow-xl shadow-ui-text/10"
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
                                className="absolute bottom-[calc(100%+0.5rem)] left-0 z-50 w-56 rounded-2xl border border-ui-border bg-ui-surface-strong p-2 shadow-xl shadow-ui-text/10 sm:bottom-0 sm:left-[calc(100%+0.5rem)]"
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
                                      disabled={!option.ready}
                                      className="flex h-10 w-full items-center justify-between rounded-xl px-3 text-left font-medium text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent"
                                      aria-pressed={isSelected}
                                    >
                                      <span className="min-w-0">
                                        <span className="block truncate">{option.model}</span>
                                        <span className="block truncate text-xs text-ui-text-muted">
                                          {providerLabel(option.provider)}
                                          {!option.enabled
                                            ? ` · ${t('workspaceAiSettings.providerDisabled')}`
                                            : !option.configured
                                              ? ` · ${t('workspaceAiSettings.credentialMissingBadge')}`
                                              : ''}
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
                <span className="min-w-0 flex-1" aria-hidden="true" />
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
              {canPost ? composerSubmitUnavailableReason || t(resolvedFooterKey) : t(resolvedFooterNoAccessKey)}
            </p>
          </div>
        </form>
      </div>

      <AnimatePresence>
        {!isPanel && isHistoryOpen && (
          <motion.div
            className="absolute inset-0 z-[110] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="absolute inset-0 h-full w-full bg-ui-text/20 dark:bg-ui-bg/65" aria-hidden="true" />
            <motion.aside
              ref={historyPanelRef}
              id={mobileHistoryPanelId}
              role="dialog"
              aria-modal="true"
              aria-label={t('chat.history')}
              tabIndex={-1}
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 top-0 flex h-full w-[min(23rem,calc(100vw-2rem))] flex-col overflow-visible border-r border-ui-border bg-ui-surface shadow-xl outline-none"
            >
              <Tooltip content={historyControlLabel} side="right" className="absolute right-[-2.25rem] top-1/2 z-20 -translate-y-1/2">
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="inline-flex h-16 w-9 items-center justify-center rounded-r-lg border border-l-0 border-ui-border bg-ui-surface text-ui-text-muted shadow-sm transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                  aria-label={historyControlLabel}
                >
                  <History className="h-4 w-4" />
                </button>
              </Tooltip>
              <ConversationHistory
                appName={cluster.name}
                sessions={sessions}
                activeSessionId={activeSessionId}
                sessionAssistantStatuses={sessionAssistantStatuses}
                isSessionsLoading={isSessionsLoading}
                onSelectSession={selectSession}
                onDeleteSessionClick={openDeleteSessionModal}
                canDeleteSessions={canDeleteSessions}
                t={t}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {deleteTargetSession && (
        <DeleteConversationDialog
          sessionName={deleteTargetSession.name}
          isDeleting={Boolean(deletingSessionId)}
          error={deleteSessionError}
          onClose={closeDeleteSessionModal}
          onConfirm={confirmDeleteSession}
          t={t}
        />
      )}
    </div>
  );
};
