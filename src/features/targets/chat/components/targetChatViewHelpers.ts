import React from 'react';
import type { LlmProvider, ReasoningEffort, WorkspaceAiProviderStatus, WorkspaceAiSettings } from '@/types';
import { formatUserTime } from '@/utils/dateTime';

export const SUGGESTION_KEYS = ['chat.suggestions.podTermination', 'chat.suggestions.serviceDns', 'chat.suggestions.crashLooping', 'chat.suggestions.mcpConnectivity'];
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
export const MAX_ATTACHMENT_CONTEXT_CHARS = 12000;
export const MAX_ATTACHMENT_READ_BYTES = 64 * 1024;
export const MAX_ATTACHMENT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_TOTAL_ATTACHMENT_CONTEXT_CHARS = 24000;
export const MAX_COMPOSER_ATTACHMENTS = 5;
export const REASONING_OPTIONS = [
  { value: 'off', labelKey: 'chat.effortOff' },
  { value: 'low', labelKey: 'chat.effortLow' },
  { value: 'medium', labelKey: 'chat.effortMedium' },
  { value: 'high', labelKey: 'chat.effortHigh' }
];

export type ComposerAttachmentStatus = 'ready' | 'preview_only' | 'error';

export interface ComposerModelOption {
  provider: LlmProvider;
  model: string;
  configured: boolean;
  enabled: boolean;
  ready: boolean;
}

export interface ComposerAttachment {
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

export function formatMessageTime(timestamp: number): string {
  return formatUserTime(timestamp, { fallback: '-' });
}

export function getFocusableHistoryElements(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(historyFocusableSelector)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true' || element.hasAttribute('hidden')) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

export function getHistoryFocusWrapIndex(currentIndex: number, focusableCount: number, shiftKey: boolean): number | null {
  if (focusableCount <= 0) return null;
  if (currentIndex < 0) return shiftKey ? focusableCount - 1 : 0;
  if (shiftKey && currentIndex === 0) return focusableCount - 1;
  if (!shiftKey && currentIndex === focusableCount - 1) return 0;
  return null;
}

export function useTargetChatHistoryFocus(args: {
  isHistoryOpen: boolean;
  historyButtonRef: React.RefObject<HTMLButtonElement | null>;
  historyPanelRef: React.RefObject<HTMLElement | null>;
}): void {
  const { isHistoryOpen, historyButtonRef, historyPanelRef } = args;

  React.useEffect(() => {
    if (!isHistoryOpen) return;

    const usesOverlayHistory = window.matchMedia('(max-width: 1023px)').matches;
    const restoreTarget = usesOverlayHistory && document.activeElement instanceof HTMLElement ? document.activeElement : historyButtonRef.current;
    const focusTimer = usesOverlayHistory
      ? window.setTimeout(() => {
          historyPanelRef.current?.focus({ preventScroll: true });
        }, 0)
      : undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!usesOverlayHistory || event.key !== 'Tab') return;

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (focusTimer !== undefined) window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      if (usesOverlayHistory && restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus({ preventScroll: true });
      }
    };
  }, [historyButtonRef, historyPanelRef, isHistoryOpen]);
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

export function formatAttachmentSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function createComposerAttachmentId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
}

export function revokeAttachmentPreview(attachment: ComposerAttachment): void {
  if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
}

function markdownFenceFor(content: string): string {
  let fence = '```';
  while (content.includes(fence)) {
    fence += '`';
  }
  return fence;
}

export function fitAttachmentToRemainingContext(attachment: ComposerAttachment, remainingContextChars: number): ComposerAttachment {
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

export async function createComposerAttachment(file: File, remainingContextChars: number): Promise<ComposerAttachment> {
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

export function buildPromptWithComposerContext(prompt: string, attachments: ComposerAttachment[]): string {
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

export function isFileDragEvent(event: React.DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes('Files');
}

export function providerLabel(provider: LlmProvider): string {
  if (provider === 'openai') return 'OpenAI';
  if (provider === 'anthropic') return 'Anthropic';
  return 'Gemini';
}

function providerStatusFor(settings: WorkspaceAiSettings, provider: LlmProvider): WorkspaceAiProviderStatus | undefined {
  return settings.providers.find((status) => status.provider === provider);
}

function modelsForProvider(settings: WorkspaceAiSettings, provider: LlmProvider): string[] {
  return settings.allowedProviderModels[provider] || [];
}

export function buildComposerModelOptions(settings: WorkspaceAiSettings | null): ComposerModelOption[] {
  if (!settings) return [];
  return settings.allowedProviders.flatMap((provider) => {
    const providerStatus = providerStatusFor(settings, provider);
    const configured = providerStatus?.configured ?? false;
    const enabled = providerStatus?.enabled ?? true;
    return modelsForProvider(settings, provider).map((model) => ({
      provider,
      model,
      configured,
      enabled,
      ready: configured && enabled
    }));
  });
}

export function findComposerModelOption(
  options: ComposerModelOption[],
  provider: LlmProvider,
  model: string
): ComposerModelOption | undefined {
  return options.find((option) => option.provider === provider && option.model === model);
}

export type AiSettingsGateReason = 'not_configured' | 'unavailable' | null;

export function resolveAiSettingsGateReason(
  canChat: boolean,
  isLoading: boolean,
  error: string,
  isRuntimeBlocked: boolean
): AiSettingsGateReason {
  if (!canChat || isLoading) return null;
  if (error) return 'unavailable';
  return isRuntimeBlocked ? 'not_configured' : null;
}

export function resolveComposerReasoningEffort(
  settings: WorkspaceAiSettings,
  selectedEffort: ReasoningEffort,
  selectedEffortTouched: boolean
): ReasoningEffort {
  if (selectedEffortTouched && settings.allowedReasoningEfforts.includes(selectedEffort)) {
    return selectedEffort;
  }
  if (settings.allowedReasoningEfforts.includes(settings.reasoningEffort)) {
    return settings.reasoningEffort;
  }
  return settings.allowedReasoningEfforts.includes('low')
    ? 'low'
    : settings.allowedReasoningEfforts[0] || 'low';
}
