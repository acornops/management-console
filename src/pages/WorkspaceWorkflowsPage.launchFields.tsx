import React from 'react';
import { Button } from '@/components/common/Button';
import { Textarea } from '@/components/common/ComponentVocabulary';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';
import type { WorkflowOption, WorkflowOptionsCatalog } from '@/services/control-plane/workflowApi';

type PromptReferenceKind = 'cluster' | 'chat';

export interface ActivePromptMention {
  start: number;
  end: number;
  query: string;
}

function promptReferenceLabel(label: string): string {
  return label.replaceAll('\\', '\\\\').replaceAll(']', '\\]');
}

export function workflowPromptReference(kind: PromptReferenceKind, label: string): string {
  return `@${kind}[${promptReferenceLabel(label)}]`;
}

function referencedOptions(message: string, kind: PromptReferenceKind, options: WorkflowOption[]): WorkflowOption[] {
  const normalizedMessage = message.toLocaleLowerCase();
  return options.filter((option) => (
    normalizedMessage.includes(workflowPromptReference(kind, option.label).toLocaleLowerCase())
  ));
}

export function getWorkflowLaunchInputState(
  workflow: WorkflowDefinition | undefined,
  catalog: WorkflowOptionsCatalog,
  message: string
) {
  const clusterWorkflow = workflow?.category === 'cluster-triage';
  const clusterMatches = clusterWorkflow ? referencedOptions(message, 'cluster', catalog.clusters) : [];
  const clusterBlocker = clusterWorkflow
    ? catalog.clusters.every((option) => option.disabled)
      ? 'No online Kubernetes clusters are available.'
      : clusterMatches.length === 0
        ? 'Mention one Kubernetes cluster in the control message.'
        : clusterMatches.length > 1
          ? 'Mention exactly one Kubernetes cluster in the control message.'
          : clusterMatches[0].disabled
            ? clusterMatches[0].disabledReason || 'The referenced Kubernetes cluster is unavailable.'
            : null
    : null;
  const chatInput = workflow?.inputs.find((input) => input.type === 'chat_session_list');
  const chatMatches = chatInput ? referencedOptions(message, 'chat', catalog.chatSessions) : [];
  const chatBlocker = chatInput?.required
    ? catalog.chatSessions.length === 0
      ? 'No active incident chats are available.'
      : chatMatches.length === 0
        ? 'Mention at least one incident chat in the control message.'
        : chatMatches.some((option) => option.disabled)
          ? 'One or more referenced incident chats are unavailable.'
          : null
    : null;
  return {
    blocker: clusterBlocker || chatBlocker,
    targetId: clusterMatches.length === 1 ? clusterMatches[0].value : undefined,
    targetType: clusterMatches.length === 1 ? 'kubernetes' as const : undefined,
    inputs: chatInput ? { [chatInput.name]: chatMatches.map((option) => option.value) } : {},
    kind: clusterWorkflow ? 'cluster' as const : chatInput ? 'chat' as const : undefined,
    options: clusterWorkflow ? catalog.clusters : chatInput ? catalog.chatSessions : []
  };
}

function mentionQuery(fragment: string, kind: PromptReferenceKind): string | null {
  if (fragment.includes(']') || fragment.includes('\n') || fragment.length > 100) return null;
  const normalized = fragment.trim().toLocaleLowerCase();
  if (kind.startsWith(normalized)) return '';
  if (normalized.startsWith(kind)) return normalized.slice(kind.length).replace(/^\[/, '').trim();
  return normalized;
}

export function findActivePromptMention(
  message: string,
  cursor: number,
  kind: PromptReferenceKind
): ActivePromptMention | null {
  const boundedCursor = Math.max(0, Math.min(cursor, message.length));
  const start = message.lastIndexOf('@', boundedCursor - 1);
  if (start < 0) return null;
  const query = mentionQuery(message.slice(start + 1, boundedCursor), kind);
  return query === null ? null : { start, end: boundedCursor, query };
}

function promptPlaceholder(kind: PromptReferenceKind): string {
  return kind === 'cluster' ? '@cluster[Cluster name]' : '@chat[Incident chat title]';
}

export function beginWorkflowPromptReference(
  message: string,
  kind: PromptReferenceKind,
  selectionStart = message.length,
  selectionEnd = selectionStart
): { message: string; mention: ActivePromptMention; cursor: number } {
  const placeholder = promptPlaceholder(kind);
  const placeholderStart = message.indexOf(placeholder);
  const start = placeholderStart >= 0 ? placeholderStart : selectionStart;
  const end = placeholderStart >= 0 ? placeholderStart + placeholder.length : selectionEnd;
  const nextMessage = `${message.slice(0, start)}@${message.slice(end)}`;
  return { message: nextMessage, mention: { start, end: start + 1, query: '' }, cursor: start + 1 };
}

export function applyWorkflowPromptReference(
  message: string,
  mention: ActivePromptMention,
  kind: PromptReferenceKind,
  label: string
): { message: string; cursor: number } {
  const token = workflowPromptReference(kind, label);
  const suffix = message.slice(mention.end);
  const separator = suffix.length === 0 ? ' ' : /^[\s.,;:!?)]/.test(suffix) ? '' : ' ';
  const nextMessage = `${message.slice(0, mention.start)}${token}${separator}${suffix}`;
  return { message: nextMessage, cursor: mention.start + token.length + separator.length };
}

export function WorkflowPromptEditor({
  workflow,
  catalog,
  message,
  onChange
}: {
  workflow: WorkflowDefinition;
  catalog: WorkflowOptionsCatalog;
  message: string;
  onChange: (message: string) => void;
}) {
  const state = getWorkflowLaunchInputState(workflow, catalog, message);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = React.useState<ActivePromptMention | null>(null);
  const suggestions = mention && state.kind
    ? state.options.filter((option) => option.label.toLocaleLowerCase().includes(mention.query)).slice(0, 8)
    : [];
  const referenceLabel = state.kind === 'cluster' ? 'cluster' : 'incident chat';
  const focusAt = (cursor: number) => window.requestAnimationFrame(() => {
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(cursor, cursor);
  });
  const updateMentionAtCursor = (target: HTMLTextAreaElement) => {
    if (!state.kind) return setMention(null);
    setMention(findActivePromptMention(target.value, target.selectionStart ?? target.value.length, state.kind));
  };
  const beginReference = () => {
    if (!state.kind) return;
    const target = textareaRef.current;
    const result = beginWorkflowPromptReference(
      message,
      state.kind,
      target?.selectionStart ?? message.length,
      target?.selectionEnd ?? message.length
    );
    onChange(result.message);
    setMention(result.mention);
    focusAt(result.cursor);
  };
  const insertReference = (option: WorkflowOption) => {
    if (!state.kind || !mention) return;
    const result = applyWorkflowPromptReference(message, mention, state.kind, option.label);
    onChange(result.message);
    setMention(null);
    focusAt(result.cursor);
  };

  return (
    <div className="relative mt-3">
      <Textarea
        ref={textareaRef}
        aria-label="Control message"
        value={message}
        onChange={(event) => {
          onChange(event.target.value);
          updateMentionAtCursor(event.currentTarget);
        }}
        onClick={(event) => updateMentionAtCursor(event.currentTarget)}
        onKeyUp={(event) => updateMentionAtCursor(event.currentTarget)}
        className="min-h-32"
      />
      {state.kind && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="type-caption text-ui-text-muted">
            Type <span className="font-bold text-ui-text">@</span> to reference a {referenceLabel}. The exact resource is bound to the run.
          </p>
          {!mention && (
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              onClick={beginReference}
            >
              Add {referenceLabel} reference
            </Button>
          )}
        </div>
      )}
      {mention && state.kind && (
        <div className="mt-2 grid max-h-64 gap-1 overflow-y-auto rounded-md border border-ui-border bg-ui-surface p-1.5 shadow-lg" aria-label={`${referenceLabel} mention suggestions`}>
          {suggestions.length > 0 ? suggestions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant="tertiary"
              size="sm"
              className="h-auto min-h-10 justify-start px-2.5 text-left"
              disabled={option.disabled}
              title={option.disabledReason}
              aria-label={`Reference ${option.label}`}
              onClick={() => insertReference(option)}
            >
              <span className="min-w-0 truncate">{option.label}</span>
              {option.description && <span className="ml-auto truncate text-ui-text-muted">{option.description}</span>}
            </Button>
          )) : (
            <p className="px-2.5 py-2 text-xs font-semibold text-ui-text-muted">No matching {referenceLabel}s.</p>
          )}
        </div>
      )}
    </div>
  );
}
