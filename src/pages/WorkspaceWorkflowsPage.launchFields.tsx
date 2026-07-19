import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Textarea } from '@/components/common/ComponentVocabulary';
import i18n from '@/i18n';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';
import type { WorkflowOption, WorkflowOptionsCatalog } from '@/services/control-plane/workflowApi';

type PromptReferenceKind = 'target' | 'cluster' | 'chat';
type WorkflowCapabilityAgent = { id: string; semanticCapabilityIds: string[] };

export interface ActivePromptMention {
  start: number;
  end: number;
  query: string;
}

interface ParsedPromptReference {
  kind: 'target' | 'cluster';
  label: string;
}

interface ParsedRepositoryPromptReference {
  provider: 'github' | 'gitlab';
  repository: string;
  changeRequest?: { type: 'pull_request' | 'merge_request'; number: number };
}

export const WORKFLOW_TARGET_PLACEHOLDER = '@target[Target name]';
const TARGET_BOUND_CAPABILITIES = new Set([
  'target.diagnostics.read',
  'target.remediation.write'
]);

function tr(key: string, fallback: string, values?: Record<string, unknown>): string {
  if (!i18n.isInitialized) return fallback;
  const translated = i18n.t(key, { ...values, defaultValue: fallback });
  return typeof translated === 'string' && translated.trim() ? translated : fallback;
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

function parseTargetReferences(message: string): ParsedPromptReference[] {
  return Array.from(message.matchAll(/@(target|cluster)\[((?:\\.|[^\]])+)\]/gi), (match) => ({
    kind: match[1].toLocaleLowerCase() as ParsedPromptReference['kind'],
    label: match[2].replace(/\\(.)/g, '$1').trim()
  }));
}

function parseRepositoryPromptReferences(message: string): ParsedRepositoryPromptReference[] {
  const references: ParsedRepositoryPromptReference[] = [];
  const add = (provider: 'github' | 'gitlab', repository: string, changeRequestNumber?: string) => {
    const normalizedRepository = repository.replace(/\.git$/i, '').replace(/^\/+|\/+$/g, '');
    if (!/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(normalizedRepository)) return;
    const number = changeRequestNumber ? Number(changeRequestNumber) : undefined;
    references.push({
      provider,
      repository: normalizedRepository,
      ...(number ? { changeRequest: { type: provider === 'github' ? 'pull_request' : 'merge_request', number } } : {})
    });
  };

  for (const match of message.matchAll(/@repository\[(github|gitlab):([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+?)(?:([#!])(\d+))?\]/gi)) {
    const provider = match[1].toLocaleLowerCase() as 'github' | 'gitlab';
    const marker = match[3];
    if (marker && ((provider === 'github' && marker !== '#') || (provider === 'gitlab' && marker !== '!'))) continue;
    add(provider, match[2], match[4]);
  }
  for (const match of message.matchAll(/https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/pull\/(\d+))?/gi)) {
    add('github', `${match[1]}/${match[2]}`, match[3]);
  }
  for (const match of message.matchAll(/https?:\/\/(?:www\.)?gitlab\.com\/([^\s?#]+)/gi)) {
    const path = match[1].replace(/[.,;:!?)]+$/g, '').replace(/\/$/, '');
    const mergeRequest = path.match(/^(.+?)\/-\/merge_requests\/(\d+)$/i);
    add('gitlab', mergeRequest?.[1] || path, mergeRequest?.[2]);
  }

  return references.filter((reference, index, values) => values.findIndex((candidate) => (
    candidate.provider === reference.provider
    && candidate.repository.toLocaleLowerCase() === reference.repository.toLocaleLowerCase()
    && candidate.changeRequest?.number === reference.changeRequest?.number
  )) === index);
}

function optionTargetType(option: WorkflowOption, catalog: WorkflowOptionsCatalog): 'kubernetes' | 'virtual_machine' | undefined {
  return option.provenance?.targetType
    || (catalog.clusters.some((cluster) => cluster.value === option.value) ? 'kubernetes' : undefined);
}

function targetAllowedByWorkflow(
  option: WorkflowOption,
  workflow: WorkflowDefinition | undefined,
  catalog: WorkflowOptionsCatalog
): boolean {
  const constraints = workflow?.targetConstraints;
  const targetType = optionTargetType(option, catalog);
  return (!constraints?.targetIds.length || constraints.targetIds.includes(option.value))
    && (!constraints?.targetTypes.length || Boolean(targetType && constraints.targetTypes.includes(targetType)));
}

export function getEffectiveWorkflowCapabilityIds(
  workflow: WorkflowDefinition | undefined,
  agents: WorkflowCapabilityAgent[] = []
): string[] {
  if (!workflow) return [];
  const restrictionMode = workflow.capabilityRestrictionMode;
  const capabilityIds = restrictionMode === 'inherit'
    ? agents.filter((agent) => workflow.agentIds.includes(agent.id)).flatMap((agent) => agent.semanticCapabilityIds)
    : workflow.semanticCapabilityIds;
  return Array.from(new Set(capabilityIds));
}

function resolveTargetReference(
  workflow: WorkflowDefinition,
  catalog: WorkflowOptionsCatalog,
  reference: ParsedPromptReference,
  allTargets: WorkflowOption[]
): { option?: WorkflowOption; blocker?: string } {
  const source = reference.kind === 'cluster' ? catalog.clusters : allTargets;
  const matches = source.filter((option) => option.label.trim().localeCompare(reference.label, undefined, { sensitivity: 'accent' }) === 0);
  if (matches.length === 0) {
    return { blocker: tr('workflowPrompt.unknownTarget', 'The referenced target is not in this workspace.') };
  }
  if (matches.length > 1) {
    return { blocker: tr('workflowPrompt.ambiguousTarget', 'The referenced target name is ambiguous. Choose one exact target.') };
  }
  const option = matches[0];
  if (!targetAllowedByWorkflow(option, workflow, catalog)) {
    return { blocker: tr('workflowPrompt.outOfScopeTarget', 'The referenced target is outside this workflow\'s allowed target scope.') };
  }
  if (option.disabled) {
    return {
      blocker: tr('workflowPrompt.unavailableTarget', 'The referenced target is unavailable. {{reason}}', {
        reason: option.disabledReason || tr('workflowPrompt.unavailableTargetFallback', 'Check the target connection and try again.')
      })
    };
  }
  return { option };
}

export function getWorkflowLaunchInputState(
  workflow: WorkflowDefinition | undefined,
  catalog: WorkflowOptionsCatalog,
  message: string,
  agents: WorkflowCapabilityAgent[] = [],
  runInputs: Record<string, unknown> = {}
) {
  const allTargets = catalog.targets?.length ? catalog.targets : catalog.clusters;
  const eligibleTargets = allTargets.filter((option) => targetAllowedByWorkflow(option, workflow, catalog));
  const effectiveCapabilityIds = getEffectiveWorkflowCapabilityIds(workflow, agents);
  const targetRequired = Boolean(
    effectiveCapabilityIds.some((capabilityId) => TARGET_BOUND_CAPABILITIES.has(capabilityId))
    || workflow?.targetConstraints?.targetIds.length
    || workflow?.targetConstraints?.targetTypes.length
    || workflow?.inputs.some((input) => input.type === 'cluster')
  );
  const targetReferences = targetRequired ? parseTargetReferences(message) : [];
  let selectedTarget: WorkflowOption | undefined;
  let targetBlocker: string | null = null;
  if (targetRequired) {
    if (targetReferences.length === 0) {
      targetBlocker = eligibleTargets.length === 0
        ? tr('workflowPrompt.noEligibleTargets', 'No targets are available in this workflow\'s allowed scope.')
        : tr('workflowPrompt.targetRequired', 'Add one target to the control message.')
    } else if (targetReferences.length > 1) {
      targetBlocker = tr('workflowPrompt.multipleTargets', 'Reference exactly one target in the control message.')
    } else {
      const resolution = resolveTargetReference(workflow, catalog, targetReferences[0], allTargets);
      selectedTarget = resolution.option;
      targetBlocker = resolution.blocker || null;
    }
  }
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
  const repositoryInput = workflow?.inputs.find((input) => input.type === 'repository');
  const repositoryReferences = repositoryInput ? parseRepositoryPromptReferences(message) : [];
  const repository = repositoryReferences[0];
  const repositoryBlocker = repositoryInput?.required
    ? repositoryReferences.length === 0
      ? tr('workflowPrompt.repositoryRequired', 'Name one exact repository in the prompt, for example @repository[github:owner/repository].')
      : repositoryReferences.length > 1
        ? tr('workflowPrompt.multipleRepositories', 'Reference exactly one repository in the prompt.')
        : null
    : null;
  const textInputs = (workflow?.inputs || []).filter((input) => input.type === 'text');
  const promptDerivedInputNames = new Set([
    ...textInputs.map((input) => input.name),
    ...(repositoryInput ? [repositoryInput.name] : [])
  ]);
  const structuredInputs = Object.fromEntries(
    Object.entries(runInputs).filter(([name]) => !promptDerivedInputNames.has(name))
  );
  const compatibilityPromptInputs = Object.fromEntries(
    textInputs
      .filter((input) => input.required)
      .map((input) => [input.name, message.trim()])
  );
  return {
    blocker: targetBlocker || chatBlocker || repositoryBlocker,
    targetId: selectedTarget?.value,
    targetType: selectedTarget ? optionTargetType(selectedTarget, catalog) : undefined,
    inputs: {
      ...structuredInputs,
      ...compatibilityPromptInputs,
      ...(repositoryInput && repository ? { [repositoryInput.name]: repository } : {}),
      ...(chatInput ? { [chatInput.name]: chatMatches.map((option) => option.value) } : {})
    },
    kind: targetRequired ? 'target' as const : chatInput ? 'chat' as const : undefined,
    options: targetRequired ? eligibleTargets : chatInput ? catalog.chatSessions : [],
    targetRequired,
    effectiveCapabilityIds
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
  if (kind === 'target') return WORKFLOW_TARGET_PLACEHOLDER;
  return kind === 'cluster' ? '@cluster[Cluster name]' : '@chat[Incident chat title]';
}

export function insertWorkflowTargetPlaceholder(message: string): string {
  if (parseTargetReferences(message).some((reference) => reference.kind === 'target')) return message;
  const trimmedEnd = message.trimEnd();
  const separator = trimmedEnd.length === 0 || /\s$/.test(message) ? '' : ' ';
  return `${trimmedEnd}${separator}${WORKFLOW_TARGET_PLACEHOLDER}`;
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
  agents = [],
  message,
  onChange
}: {
  workflow: WorkflowDefinition;
  catalog: WorkflowOptionsCatalog;
  agents?: WorkflowCapabilityAgent[];
  message: string;
  onChange: (message: string) => void;
}) {
  const { t } = useTranslation();
  const state = getWorkflowLaunchInputState(workflow, catalog, message, agents);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = React.useState<ActivePromptMention | null>(null);
  const [activeSuggestion, setActiveSuggestion] = React.useState(0);
  const suggestions = mention && state.kind
    ? state.options.filter((option) => option.label.toLocaleLowerCase().includes(mention.query)).slice(0, 8)
    : [];
  const enabledSuggestionIndexes = suggestions.map((_, index) => index);
  const referenceLabel = state.kind === 'target'
    ? t('workflowPrompt.targetReferenceLabel')
    : t('workflowPrompt.chatReferenceLabel');
  const listboxId = `workflow-prompt-${workflow.id}-suggestions`;
  const activeOptionId = suggestions[activeSuggestion] ? `${listboxId}-${activeSuggestion}` : undefined;
  const focusAt = (cursor: number) => window.requestAnimationFrame(() => {
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(cursor, cursor);
  });
  const updateMentionAtCursor = (target: HTMLTextAreaElement) => {
    if (!state.kind) return setMention(null);
    const nextMention = findActivePromptMention(target.value, target.selectionStart ?? target.value.length, state.kind);
    setMention(nextMention);
    setActiveSuggestion(0);
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
    setActiveSuggestion(0);
    focusAt(result.cursor);
  };
  const insertReference = (option: WorkflowOption) => {
    if (!state.kind || !mention || option.disabled) return;
    const result = applyWorkflowPromptReference(message, mention, state.kind, option.label);
    onChange(result.message);
    setMention(null);
    setActiveSuggestion(0);
    focusAt(result.cursor);
  };
  const moveActiveSuggestion = (direction: 1 | -1) => {
    if (enabledSuggestionIndexes.length === 0) return;
    const currentPosition = enabledSuggestionIndexes.indexOf(activeSuggestion);
    const nextPosition = currentPosition < 0
      ? direction === 1 ? 0 : enabledSuggestionIndexes.length - 1
      : (currentPosition + direction + enabledSuggestionIndexes.length) % enabledSuggestionIndexes.length;
    setActiveSuggestion(enabledSuggestionIndexes[nextPosition]);
  };

  React.useEffect(() => {
    if (!mention || suggestions[activeSuggestion]) return;
    setActiveSuggestion(enabledSuggestionIndexes[0] || 0);
  }, [activeSuggestion, enabledSuggestionIndexes.join(','), mention, suggestions]);

  return (
    <div className="relative mt-3">
      <Textarea
        ref={textareaRef}
        aria-label={t('workflowPrompt.controlMessage')}
        aria-autocomplete={mention ? 'list' : undefined}
        aria-controls={mention ? listboxId : undefined}
        aria-activedescendant={mention ? activeOptionId : undefined}
        value={message}
        onChange={(event) => {
          onChange(event.target.value);
          updateMentionAtCursor(event.currentTarget);
        }}
        onClick={(event) => updateMentionAtCursor(event.currentTarget)}
        onKeyDown={(event) => {
          if (!mention) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            moveActiveSuggestion(event.key === 'ArrowDown' ? 1 : -1);
          } else if (event.key === 'Enter' && suggestions[activeSuggestion]) {
            event.preventDefault();
            insertReference(suggestions[activeSuggestion]);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            setMention(null);
          }
        }}
        className="min-h-32"
      />
      {state.kind && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="type-caption text-ui-text-muted">
            {state.kind === 'target'
              ? t('workflowPrompt.targetGuidance')
              : t('workflowPrompt.chatGuidance')}
          </p>
          {!mention && state.kind === 'chat' && (
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              onClick={beginReference}
            >
              {t('workflowPrompt.addChatReference')}
            </Button>
          )}
        </div>
      )}
      {mention && state.kind && (
        <div
          id={listboxId}
          role="listbox"
          className="mt-2 grid max-h-64 gap-1 overflow-y-auto rounded-md border border-ui-border bg-ui-surface p-1.5 shadow-lg"
          aria-label={t('workflowPrompt.suggestionsLabel', { reference: referenceLabel })}
        >
          {suggestions.length > 0 ? suggestions.map((option, index) => (
            <Button
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === activeSuggestion}
              key={option.value}
              type="button"
              variant="tertiary"
              size="sm"
              className={`h-auto min-h-10 justify-start px-2.5 text-left ${option.disabled ? 'cursor-not-allowed opacity-60' : ''} ${index === activeSuggestion ? 'ring-2 ring-brand-orange/30' : ''}`}
              aria-disabled={option.disabled || undefined}
              title={option.disabledReason}
              aria-label={`${t('workflowPrompt.referenceOption', { label: option.label })}${option.disabledReason ? `. ${option.disabledReason}` : ''}`}
              onMouseMove={() => setActiveSuggestion(index)}
              onClick={() => insertReference(option)}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate">{option.label}</span>
                {option.disabledReason && <span className="type-caption mt-0.5 block truncate text-status-warning-text">{option.disabledReason}</span>}
              </span>
              {option.description && <span className="ml-auto truncate text-ui-text-muted">{option.description}</span>}
            </Button>
          )) : (
            <p className="px-2.5 py-2 text-xs font-semibold text-ui-text-muted">{t('workflowPrompt.noMatches', { reference: referenceLabel })}</p>
          )}
        </div>
      )}
    </div>
  );
}
