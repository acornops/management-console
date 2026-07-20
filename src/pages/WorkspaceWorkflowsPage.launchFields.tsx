import React from 'react';
import { Button } from '@/components/common/Button';
import { Textarea } from '@/components/common/ComponentVocabulary';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';
import {
  listPromptReferenceTypes,
  suggestPromptReferences,
  type PromptReferenceToken,
  type PromptReferenceTypeDescriptor,
  type PromptResourceCandidate,
  type WorkflowOptionsCatalog
} from '@/services/control-plane/workflowApi';

export interface ActivePromptMention {
  start: number;
  end: number;
  type?: string;
  query: string;
}

export interface PromptParseResult {
  tokens: PromptReferenceToken[];
  errors: string[];
}

const TYPE = /^[a-z][a-z0-9_-]{0,63}$/;

export function escapePromptReferenceLabel(label: string): string {
  return label.normalize('NFC').replaceAll('\\', '\\\\').replaceAll(']', '\\]');
}

export function formatPromptReference(type: string, label = ''): string {
  return `@${type}[${escapePromptReferenceLabel(label)}]`;
}

export function parsePromptReferences(rawPrompt: string): PromptParseResult {
  const prompt = rawPrompt.normalize('NFC');
  const tokens: PromptReferenceToken[] = [];
  const errors: string[] = [];
  if (prompt.length > 32_768) return { tokens, errors: ['Prompt exceeds the 32768 character limit.'] };
  for (let index = 0; index < prompt.length; index += 1) {
    if (prompt[index] !== '@' || !/[a-z]/.test(prompt[index + 1] || '')) continue;
    const start = index;
    let cursor = index + 1;
    while (/[a-z0-9_-]/.test(prompt[cursor] || '')) cursor += 1;
    const type = prompt.slice(index + 1, cursor);
    if (type.length > 64) {
      errors.push('Prompt reference type exceeds 64 characters.');
      index = cursor - 1;
      continue;
    }
    if (!TYPE.test(type) || prompt[cursor] !== '[') continue;
    cursor += 1;
    let label = '';
    let closed = false;
    while (cursor < prompt.length) {
      if (prompt[cursor] === ']') { cursor += 1; closed = true; break; }
      if (prompt[cursor] === '\\') {
        const escaped = prompt[cursor + 1];
        if (escaped !== '\\' && escaped !== ']') {
          errors.push('Only \\\\ and \\] escapes are valid in prompt references.');
          cursor += escaped === undefined ? 1 : 2;
          continue;
        }
        label += escaped;
        cursor += 2;
        continue;
      }
      if (prompt[cursor] === '\n' || prompt[cursor] === '\r' || prompt[cursor] === '\u0000') {
        errors.push('Prompt reference labels cannot contain control characters.');
      }
      label += prompt[cursor];
      cursor += 1;
    }
    if (!closed) { errors.push('Prompt reference is missing a closing bracket.'); break; }
    const normalizedLabel = label.normalize('NFC').trim();
    tokens.push({ type, label: normalizedLabel, start, end: cursor, state: normalizedLabel ? 'concrete' : 'placeholder' });
    index = cursor - 1;
  }
  if (tokens.length > 64) errors.push('Prompt contains more than 64 resource references.');
  return { tokens: tokens.slice(0, 64), errors };
}

export function findActivePromptMention(message: string, cursor: number): ActivePromptMention | null {
  const end = Math.max(0, Math.min(cursor, message.length));
  const start = message.lastIndexOf('@', end - 1);
  if (start < 0) return null;
  const fragment = message.slice(start + 1, end);
  if (fragment.includes(']') || fragment.includes('\n') || fragment.length > 180) return null;
  const bracket = fragment.indexOf('[');
  if (bracket < 0) {
    if (!/^[a-z0-9_-]*$/i.test(fragment)) return null;
    return { start, end, query: fragment.toLocaleLowerCase() };
  }
  const type = fragment.slice(0, bracket).toLocaleLowerCase();
  if (!TYPE.test(type)) return null;
  return { start, end, type, query: fragment.slice(bracket + 1).normalize('NFC').toLocaleLowerCase() };
}

export function applyPromptReference(
  message: string,
  mention: ActivePromptMention,
  type: string,
  label: string
): { message: string; cursor: number } {
  const token = formatPromptReference(type, label);
  const suffix = message.slice(mention.end);
  const separator = suffix.length === 0 ? ' ' : /^[\s.,;:!?)]/.test(suffix) ? '' : ' ';
  const next = `${message.slice(0, mention.start)}${token}${separator}${suffix}`;
  return { message: next, cursor: mention.start + token.length + separator.length };
}

export function getWorkflowLaunchInputState(
  workflow: WorkflowDefinition | undefined,
  _catalog: WorkflowOptionsCatalog,
  message: string,
  _agents: unknown[] = [],
  _runInputs: Record<string, unknown> = {}
) {
  const parsed = parsePromptReferences(message);
  const counts = new Map<string, number>();
  parsed.tokens.forEach((token) => counts.set(token.type, (counts.get(token.type) || 0) + 1));
  const cardinalityBlocker = workflow?.resourceRequirements.find((requirement) => {
    const count = counts.get(requirement.type) || 0;
    return count < requirement.minimum || count > requirement.maximum;
  });
  const blocker = parsed.errors[0]
    || (parsed.tokens.some((token) => token.state === 'placeholder') ? 'Complete every prompt resource slot before launching.' : null)
    || (cardinalityBlocker
      ? `Add between ${cardinalityBlocker.minimum} and ${cardinalityBlocker.maximum} ${cardinalityBlocker.type} references.`
      : null);
  return { blocker, inputs: {}, targetRequired: false, effectiveCapabilityIds: workflow?.semanticCapabilityIds || [] };
}

export function WorkflowPromptEditor({
  workflow,
  message,
  onChange,
  mode = 'launch'
}: {
  workflow: Pick<WorkflowDefinition, 'id' | 'workspaceId'>;
  catalog?: WorkflowOptionsCatalog;
  agents?: unknown[];
  message: string;
  onChange: (message: string) => void;
  mode?: 'authoring' | 'launch';
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [descriptors, setDescriptors] = React.useState<PromptReferenceTypeDescriptor[]>([]);
  const [descriptorError, setDescriptorError] = React.useState('');
  const [mention, setMention] = React.useState<ActivePromptMention | null>(null);
  const [candidates, setCandidates] = React.useState<PromptResourceCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = React.useState(false);
  const parsed = React.useMemo(() => parsePromptReferences(message), [message]);

  React.useEffect(() => {
    let active = true;
    setDescriptorError('');
    listPromptReferenceTypes(workflow.workspaceId)
      .then((items) => { if (active) setDescriptors(items); })
      .catch((error) => { if (active) setDescriptorError(error instanceof Error ? error.message : 'Reference types are unavailable.'); });
    return () => { active = false; };
  }, [workflow.workspaceId]);

  React.useEffect(() => {
    if (!mention?.type) { setCandidates([]); return; }
    const descriptor = descriptors.find((item) => item.type === mention.type);
    if (!descriptor || descriptor.availability === 'unavailable') { setCandidates([]); return; }
    let active = true;
    setLoadingCandidates(true);
    const timeout = window.setTimeout(() => {
      suggestPromptReferences(workflow.workspaceId, mention.type!, mention.query, workflow.id)
        .then((items) => { if (active) setCandidates(items); })
        .catch(() => { if (active) setCandidates([]); })
        .finally(() => { if (active) setLoadingCandidates(false); });
    }, 150);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [descriptors, mention?.type, mention?.query, workflow.id, workflow.workspaceId]);

  const focusAt = (cursor: number) => window.requestAnimationFrame(() => {
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(cursor, cursor);
  });
  const updateMention = (target: HTMLTextAreaElement) => {
    setMention(findActivePromptMention(target.value, target.selectionStart ?? target.value.length));
  };
  const beginPalette = () => {
    const target = textareaRef.current;
    const start = target?.selectionStart ?? message.length;
    const end = target?.selectionEnd ?? start;
    const next = `${message.slice(0, start)}@${message.slice(end)}`;
    onChange(next);
    setMention({ start, end: start + 1, query: '' });
    focusAt(start + 1);
  };
  const chooseType = (descriptor: PromptReferenceTypeDescriptor) => {
    if (!mention || descriptor.availability === 'unavailable') return;
    const next = `${message.slice(0, mention.start)}@${descriptor.type}[${message.slice(mention.end)}`;
    const cursor = mention.start + descriptor.type.length + 2;
    onChange(next);
    setMention({ start: mention.start, end: cursor, type: descriptor.type, query: '' });
    focusAt(cursor);
  };
  const insertSlot = (descriptor: PromptReferenceTypeDescriptor) => {
    if (!mention) return;
    const result = applyPromptReference(message, mention, descriptor.type, '');
    onChange(result.message);
    setMention(null);
    focusAt(result.cursor);
  };
  const insertCandidate = (candidate: PromptResourceCandidate) => {
    if (!mention || candidate.availability === 'unavailable') return;
    const result = applyPromptReference(message, mention, candidate.type, candidate.label);
    onChange(result.message);
    setMention(null);
    focusAt(result.cursor);
  };
  const visibleDescriptors = descriptors.filter((descriptor) => (
    !mention?.query || descriptor.type.includes(mention.query) || descriptor.displayName.toLocaleLowerCase().includes(mention.query)
  ));

  return (
    <div className="relative mt-3">
      <Textarea
        ref={textareaRef}
        aria-label="Workflow control message"
        aria-autocomplete={mention ? 'list' : undefined}
        aria-controls={mention ? `prompt-reference-${workflow.id}` : undefined}
        value={message}
        onChange={(event) => { onChange(event.target.value); updateMention(event.currentTarget); }}
        onClick={(event) => updateMention(event.currentTarget)}
        onKeyDown={(event) => { if (event.key === 'Escape') setMention(null); }}
        className="min-h-32"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button type="button" variant="tertiary" size="sm" onClick={beginPalette}>Insert reference</Button>
        {parsed.tokens.map((token, index) => (
          <code key={`${token.start}-${index}`} className="rounded bg-ui-surface-subtle px-2 py-1 text-xs" aria-label={`${token.type} reference ${token.state}`}>
            @{token.type}[{token.label || 'slot'}]
          </code>
        ))}
      </div>
      {(descriptorError || parsed.errors[0]) && <p role="alert" className="mt-2 text-xs text-status-danger-text">{descriptorError || parsed.errors[0]}</p>}
      {mention && (
        <div id={`prompt-reference-${workflow.id}`} role="listbox" className="mt-2 grid max-h-72 gap-1 overflow-y-auto rounded-md border border-ui-border bg-ui-surface p-1.5 shadow-lg">
          {!mention.type ? visibleDescriptors.map((descriptor) => (
            <div key={descriptor.type} className="flex items-center gap-2 rounded px-1">
              <Button type="button" variant="tertiary" size="sm" className="h-auto flex-1 justify-start text-left" disabled={descriptor.availability === 'unavailable'} title={descriptor.unavailableReason} onClick={() => chooseType(descriptor)}>
                <span><span className="block">{descriptor.displayName}</span><span className="block text-xs text-ui-text-muted">@{descriptor.type} · {descriptor.description}</span>{descriptor.unavailableReason && <span className="block text-xs text-status-warning-text">{descriptor.unavailableReason}</span>}</span>
              </Button>
              {mode === 'authoring' && <Button type="button" variant="secondary" size="sm" onClick={() => insertSlot(descriptor)}>Insert slot</Button>}
            </div>
          )) : loadingCandidates ? (
            <p className="px-3 py-2 text-xs text-ui-text-muted">Loading references…</p>
          ) : candidates.length > 0 ? candidates.map((candidate) => (
            <Button key={`${candidate.provider}:${candidate.id}`} role="option" type="button" variant="tertiary" size="sm" className="h-auto justify-start text-left" disabled={candidate.availability === 'unavailable'} title={candidate.unavailableReason} onClick={() => insertCandidate(candidate)}>
              <span><span className="block">{candidate.label}</span><span className="block text-xs text-ui-text-muted">{candidate.type} · {candidate.provider}{candidate.description ? ` · ${candidate.description}` : ''}</span>{candidate.unavailableReason && <span className="block text-xs text-status-warning-text">{candidate.unavailableReason}</span>}</span>
            </Button>
          )) : <p className="px-3 py-2 text-xs text-ui-text-muted">No matching references.</p>}
        </div>
      )}
    </div>
  );
}
