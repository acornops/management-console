import React from 'react';
import { Button } from '@acornops/ui';
import { Textarea, TextInput } from '@acornops/ui';
import type { WorkflowDefinition, WorkflowParameter } from '@/pages/workflows/workflowModel';
import { listPromptReferenceTypes, suggestPromptReferences, type PromptReferenceToken, type PromptReferenceTypeDescriptor, type PromptResourceCandidate, type WorkflowOptionsCatalog } from '@/services/control-plane/workflowApi';

export interface ActivePromptMention {
  start: number;
  end: number;
  type?: string;
  query: string;
}

export interface PromptParseResult {
  tokens: PromptReferenceToken[];
  parameters: WorkflowParameter[];
  errors: string[];
}

const REFERENCE_TYPE = /^[a-z][a-z0-9_-]{0,63}$/;
const PARAMETER_KEY = /^[a-z][a-z0-9_]{0,63}$/;
const PARAMETER_TYPES = [
  {
    type: 'text' as const,
    label: 'Text',
    description: 'Freeform operator text'
  },
  {
    type: 'target' as const,
    label: 'Target',
    description: 'A workspace target selected at run time'
  },
  {
    type: 'chat' as const,
    label: 'Chat',
    description: 'An active target chat selected at run time'
  }
];

export function humanizeWorkflowParameterKey(key: string): string {
  const words = key.replaceAll('_', ' ').trim();
  return words ? `${words[0].toUpperCase()}${words.slice(1)}` : key;
}

export function escapePromptReferenceLabel(label: string): string {
  return label.normalize('NFC').replaceAll('\\', '\\\\').replaceAll(']', '\\]');
}

export function formatPromptReference(type: string, label: string): string {
  return `@${type}[${escapePromptReferenceLabel(label)}]`;
}

export function parsePromptReferences(rawPrompt: string): {
  tokens: PromptReferenceToken[];
  errors: string[];
} {
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
    if (!REFERENCE_TYPE.test(type) || prompt[cursor] !== '[') continue;
    cursor += 1;
    let label = '';
    let closed = false;
    while (cursor < prompt.length) {
      if (prompt[cursor] === ']') {
        cursor += 1;
        closed = true;
        break;
      }
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
      if (/[\p{Cc}\p{Cf}]/u.test(prompt[cursor])) errors.push('Prompt reference labels cannot contain control characters.');
      label += prompt[cursor];
      cursor += 1;
    }
    if (!closed) {
      errors.push('Prompt reference is missing a closing bracket.');
      break;
    }
    const normalizedLabel = label.normalize('NFC').trim();
    if (!normalizedLabel) {
      errors.push('Prompt references must select a concrete resource. Use {{type:key}} for runtime input.');
      index = cursor - 1;
      continue;
    }
    tokens.push({ type, label: normalizedLabel, start, end: cursor });
    index = cursor - 1;
  }
  if (tokens.length > 64) errors.push('Prompt contains more than 64 resource references.');
  return { tokens: tokens.slice(0, 64), errors };
}

export function parseWorkflowTemplate(rawPrompt: string): PromptParseResult {
  const prompt = rawPrompt.normalize('NFC');
  const references = parsePromptReferences(prompt);
  const parameters: WorkflowParameter[] = [];
  const errors = [...references.errors];
  const typesByKey = new Map<string, WorkflowParameter['type']>();
  for (let cursor = 0; cursor < prompt.length; ) {
    if (prompt[cursor] === '\\' && prompt.slice(cursor + 1, cursor + 3) === '{{') {
      cursor += 3;
      continue;
    }
    if (prompt.slice(cursor, cursor + 2) !== '{{') {
      cursor += 1;
      continue;
    }
    const close = prompt.indexOf('}}', cursor + 2);
    if (close < 0) {
      errors.push('Workflow parameter expression is missing a closing }}.');
      break;
    }
    const expression = prompt.slice(cursor + 2, close);
    const separator = expression.indexOf(':');
    const type = separator < 0 ? '' : expression.slice(0, separator);
    const key = separator < 0 ? '' : expression.slice(separator + 1);
    if (separator <= 0 || separator !== expression.lastIndexOf(':') || !PARAMETER_TYPES.some((option) => option.type === type) || !PARAMETER_KEY.test(key) || /\s/.test(expression)) {
      errors.push('Workflow parameters must use {{text:key}}, {{target:key}}, or {{chat:key}} with a lowercase snake_case key.');
      cursor = close + 2;
      continue;
    }
    const parameterType = type as WorkflowParameter['type'];
    const existingType = typesByKey.get(key);
    if (existingType && existingType !== parameterType) {
      errors.push(`Workflow parameter ${key} is used as both ${existingType} and ${parameterType}.`);
    } else if (!existingType) {
      typesByKey.set(key, parameterType);
      parameters.push({ key, type: parameterType, required: true });
    }
    cursor = close + 2;
  }
  return { tokens: references.tokens, parameters, errors };
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
  if (!REFERENCE_TYPE.test(type)) return null;
  return {
    start,
    end,
    type,
    query: fragment
      .slice(bracket + 1)
      .normalize('NFC')
      .toLocaleLowerCase()
  };
}

function activeParameterExpression(message: string, cursor: number): { start: number; type?: WorkflowParameter['type']; key?: string } | null {
  const start = message.lastIndexOf('{{', cursor - 1);
  if (start < 0 || message.slice(start, cursor).includes('}}') || (start > 0 && message[start - 1] === '\\')) return null;
  const fragment = message.slice(start + 2, cursor);
  if (!fragment.includes(':')) return { start };
  const [type, key, extra] = fragment.split(':');
  if (extra !== undefined || !PARAMETER_TYPES.some((option) => option.type === type)) return null;
  return { start, type: type as WorkflowParameter['type'], key };
}

export function applyPromptReference(message: string, mention: ActivePromptMention, type: string, label: string): { message: string; cursor: number } {
  const token = formatPromptReference(type, label);
  const suffix = message.slice(mention.end);
  const separator = suffix.length === 0 ? ' ' : /^[\s.,;:!?)]/.test(suffix) ? '' : ' ';
  const next = `${message.slice(0, mention.start)}${token}${separator}${suffix}`;
  return {
    message: next,
    cursor: mention.start + token.length + separator.length
  };
}

export function getWorkflowLaunchInputState(workflow: WorkflowDefinition | undefined, _catalog: WorkflowOptionsCatalog, _message: string, _agents: unknown[] = [], runInputs: Record<string, unknown> = {}) {
  const missing = workflow?.parameters.find((parameter) => typeof runInputs[parameter.key] !== 'string' || !(runInputs[parameter.key] as string).trim());
  return {
    blocker: missing ? `${humanizeWorkflowParameterKey(missing.key)} is required.` : null,
    inputs: runInputs,
    targetRequired: Boolean(workflow?.parameters.some((parameter) => parameter.type === 'target')),
    effectiveCapabilityIds: workflow?.semanticCapabilityIds || []
  };
}

export function WorkflowPromptEditor({ workflow, message, onChange }: { workflow: Pick<WorkflowDefinition, 'id' | 'workspaceId'>; catalog?: WorkflowOptionsCatalog; agents?: unknown[]; message: string; onChange: (message: string) => void; mode?: 'authoring' | 'launch' }) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [descriptors, setDescriptors] = React.useState<PromptReferenceTypeDescriptor[]>([]);
  const [descriptorError, setDescriptorError] = React.useState('');
  const [mention, setMention] = React.useState<ActivePromptMention | null>(null);
  const [parameterStart, setParameterStart] = React.useState<number | null>(null);
  const [parameterOptionIndex, setParameterOptionIndex] = React.useState(0);
  const [candidates, setCandidates] = React.useState<PromptResourceCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = React.useState(false);
  const parsed = React.useMemo(() => parseWorkflowTemplate(message), [message]);
  const promptError = descriptorError || parsed.errors[0] || '';

  React.useEffect(() => {
    let active = true;
    setDescriptorError('');
    listPromptReferenceTypes(workflow.workspaceId)
      .then((items) => {
        if (active) setDescriptors(items);
      })
      .catch((error) => {
        if (active) setDescriptorError(error instanceof Error ? error.message : 'Reference types are unavailable.');
      });
    return () => {
      active = false;
    };
  }, [workflow.workspaceId]);

  React.useEffect(() => {
    if (!mention?.type) {
      setCandidates([]);
      return;
    }
    const descriptor = descriptors.find((item) => item.type === mention.type);
    if (!descriptor || descriptor.availability === 'unavailable') {
      setCandidates([]);
      return;
    }
    let active = true;
    setLoadingCandidates(true);
    const timeout = window.setTimeout(() => {
      suggestPromptReferences(workflow.workspaceId, mention.type!, mention.query, workflow.id)
        .then((items) => {
          if (active) setCandidates(items);
        })
        .catch(() => {
          if (active) setCandidates([]);
        })
        .finally(() => {
          if (active) setLoadingCandidates(false);
        });
    }, 150);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [descriptors, mention?.type, mention?.query, workflow.id, workflow.workspaceId]);

  const focusAt = (cursor: number) =>
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(cursor, cursor);
    });
  const updateAutocomplete = (target: HTMLTextAreaElement) => {
    const cursor = target.selectionStart ?? target.value.length;
    const parameter = activeParameterExpression(target.value, cursor);
    const nextParameterStart = parameter && !parameter.type ? parameter.start : null;
    setParameterStart((current) => {
      if (nextParameterStart !== null && current !== nextParameterStart) setParameterOptionIndex(0);
      return nextParameterStart;
    });
    setMention(parameter ? null : findActivePromptMention(target.value, cursor));
  };
  const beginReferencePalette = () => {
    const target = textareaRef.current;
    const start = target?.selectionStart ?? message.length;
    const end = target?.selectionEnd ?? start;
    const next = `${message.slice(0, start)}@${message.slice(end)}`;
    onChange(next);
    setMention({ start, end: start + 1, query: '' });
    setParameterStart(null);
    focusAt(start + 1);
  };
  const chooseReferenceType = (descriptor: PromptReferenceTypeDescriptor) => {
    if (!mention || descriptor.availability === 'unavailable') return;
    const next = `${message.slice(0, mention.start)}@${descriptor.type}[${message.slice(mention.end)}`;
    const cursor = mention.start + descriptor.type.length + 2;
    onChange(next);
    setMention({
      start: mention.start,
      end: cursor,
      type: descriptor.type,
      query: ''
    });
    focusAt(cursor);
  };
  const chooseParameterType = (type: WorkflowParameter['type']) => {
    if (parameterStart === null) return;
    const cursor = textareaRef.current?.selectionStart ?? parameterStart + 2;
    const insertion = `{{${type}:`;
    const next = `${message.slice(0, parameterStart)}${insertion}${message.slice(cursor)}`;
    onChange(next);
    setParameterStart(null);
    focusAt(parameterStart + insertion.length);
  };
  const insertCandidate = (candidate: PromptResourceCandidate) => {
    if (!mention || candidate.availability === 'unavailable') return;
    const result = applyPromptReference(message, mention, candidate.type, candidate.label);
    onChange(result.message);
    setMention(null);
    focusAt(result.cursor);
  };
  const visibleDescriptors = descriptors.filter((descriptor) => !mention?.query || descriptor.type.includes(mention.query) || descriptor.displayName.toLocaleLowerCase().includes(mention.query));
  const listboxId = parameterStart !== null ? `workflow-parameter-types-${workflow.id}` : `prompt-reference-${workflow.id}`;
  const parameterOptionId = (index: number) => `${listboxId}-option-${index}`;
  const promptErrorId = `workflow-prompt-error-${workflow.id}`;

  return (
    <div className="relative mt-3">
      <Textarea
        ref={textareaRef}
        role="combobox"
        aria-label="Workflow prompt"
        aria-autocomplete={mention || parameterStart !== null ? 'list' : undefined}
        aria-controls={mention || parameterStart !== null ? listboxId : undefined}
        aria-expanded={Boolean(mention || parameterStart !== null)}
        aria-haspopup="listbox"
        aria-activedescendant={parameterStart !== null ? parameterOptionId(parameterOptionIndex) : undefined}
        aria-invalid={Boolean(promptError)}
        aria-describedby={promptError ? promptErrorId : undefined}
        value={message}
        onChange={(event) => {
          onChange(event.target.value);
          updateAutocomplete(event.currentTarget);
        }}
        onClick={(event) => updateAutocomplete(event.currentTarget)}
        onKeyDown={(event) => {
          const cursor = event.currentTarget.selectionStart ?? message.length;
          const activeParameter = activeParameterExpression(message, cursor);
          if (parameterStart !== null && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            setParameterOptionIndex((current) => (current + (event.key === 'ArrowDown' ? 1 : -1) + PARAMETER_TYPES.length) % PARAMETER_TYPES.length);
          } else if (parameterStart !== null && event.key === 'Enter') {
            event.preventDefault();
            chooseParameterType(PARAMETER_TYPES[parameterOptionIndex].type);
          } else if (activeParameter?.type && activeParameter.key && PARAMETER_KEY.test(activeParameter.key) && (event.key === 'Tab' || event.key === 'Enter')) {
            event.preventDefault();
            const next = `${message.slice(0, cursor)}}}${message.slice(cursor)}`;
            onChange(next);
            setMention(null);
            setParameterStart(null);
            focusAt(cursor + 2);
          } else if (event.key === 'Escape' && (mention || parameterStart !== null)) {
            event.preventDefault();
            event.stopPropagation();
            setMention(null);
            setParameterStart(null);
          }
        }}
        className="min-h-32"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button type="button" variant="tertiary" size="sm" onClick={beginReferencePalette}>
          Insert reference
        </Button>
        {parsed.parameters.map((parameter) => (
          <code key={`${parameter.type}:${parameter.key}`} className="rounded bg-ui-surface-subtle px-2 py-1 text-xs">
            {`{{${parameter.type}:${parameter.key}}}`}
          </code>
        ))}
        {parsed.tokens.map((token, index) => (
          <code key={`${token.start}-${index}`} className="rounded bg-ui-surface-subtle px-2 py-1 text-xs">
            @{token.type}[{token.label}]
          </code>
        ))}
      </div>
      {promptError && (
        <p id={promptErrorId} role="alert" className="mt-2 text-xs text-status-danger-text">
          {promptError}
        </p>
      )}
      {parameterStart !== null && (
        <div id={listboxId} role="listbox" aria-label="Workflow parameter types" className="mt-2 grid gap-1 rounded-md border border-ui-border bg-ui-surface p-1.5 shadow-lg">
          {PARAMETER_TYPES.map((option, index) => (
            <Button id={parameterOptionId(index)} key={option.type} role="option" aria-selected={index === parameterOptionIndex} tabIndex={-1} type="button" variant="tertiary" size="sm" className={`h-auto justify-start text-left ${index === parameterOptionIndex ? 'bg-accent-soft' : ''}`} onMouseEnter={() => setParameterOptionIndex(index)} onClick={() => chooseParameterType(option.type)}>
              <span>
                <span className="block">{option.label}</span>
                <span className="block text-xs text-ui-text-muted">{option.description}</span>
              </span>
            </Button>
          ))}
        </div>
      )}
      {mention && (
        <div id={listboxId} role="listbox" className="mt-2 grid max-h-72 gap-1 overflow-y-auto rounded-md border border-ui-border bg-ui-surface p-1.5 shadow-lg">
          {!mention.type ? (
            visibleDescriptors.map((descriptor) => (
              <Button key={descriptor.type} role="option" type="button" variant="tertiary" size="sm" className="h-auto justify-start text-left" disabled={descriptor.availability === 'unavailable'} title={descriptor.unavailableReason} onClick={() => chooseReferenceType(descriptor)}>
                <span>
                  <span className="block">{descriptor.displayName}</span>
                  <span className="block text-xs text-ui-text-muted">
                    @{descriptor.type} · {descriptor.description}
                  </span>
                  {descriptor.unavailableReason && <span className="block text-xs text-status-warning-text">{descriptor.unavailableReason}</span>}
                </span>
              </Button>
            ))
          ) : loadingCandidates ? (
            <p className="px-3 py-2 text-xs text-ui-text-muted">Loading references…</p>
          ) : candidates.length > 0 ? (
            candidates.map((candidate) => (
              <Button key={`${candidate.provider}:${candidate.id}`} role="option" type="button" variant="tertiary" size="sm" className="h-auto justify-start text-left" disabled={candidate.availability === 'unavailable'} title={candidate.unavailableReason} onClick={() => insertCandidate(candidate)}>
                <span>
                  <span className="block">{candidate.label}</span>
                  <span className="block text-xs text-ui-text-muted">
                    {candidate.type} · {candidate.provider}
                    {candidate.description ? ` · ${candidate.description}` : ''}
                  </span>
                  {candidate.unavailableReason && <span className="block text-xs text-status-warning-text">{candidate.unavailableReason}</span>}
                </span>
              </Button>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-ui-text-muted">No matching references.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ResourceParameterField({ workflow, parameter, value, onChange, error }: { workflow: Pick<WorkflowDefinition, 'id' | 'workspaceId' | 'parameters'>; parameter: WorkflowParameter; value: string; onChange: (value: string) => void; error?: string }) {
  const [query, setQuery] = React.useState('');
  const [displayValue, setDisplayValue] = React.useState(value);
  const selectedValueRef = React.useRef(value);
  const [items, setItems] = React.useState<PromptResourceCandidate[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const listboxId = `workflow-parameter-${workflow.id}-${parameter.key}`;
  const inputId = `${listboxId}-input`;
  const errorId = `${listboxId}-error`;
  const optionId = (index: number) => `${listboxId}-option-${index}`;
  const selectableIndexes = items.flatMap((candidate, index) => (candidate.availability === 'unavailable' ? [] : [index]));

  const selectCandidate = (candidate: PromptResourceCandidate) => {
    if (candidate.availability === 'unavailable') return;
    selectedValueRef.current = candidate.id;
    setDisplayValue(candidate.label);
    onChange(candidate.id);
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
  };

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setActiveIndex(-1);
    const timer = window.setTimeout(() => {
      suggestPromptReferences(workflow.workspaceId, parameter.type, query, workflow.id)
        .then((candidates) => {
          if (!active) return;
          setItems(candidates);
          setActiveIndex(candidates.findIndex((candidate) => candidate.availability !== 'unavailable'));
          const selected = candidates.find((candidate) => candidate.id === value);
          if (selected && selectedValueRef.current === value) setDisplayValue(selected.label);
        })
        .catch(() => {
          if (!active) return;
          setItems([]);
          setActiveIndex(-1);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, parameter.type, query, workflow.id, workflow.workspaceId]);

  React.useEffect(() => {
    if (value === selectedValueRef.current) return;
    selectedValueRef.current = value;
    setDisplayValue(value);
    setQuery('');
  }, [value]);

  return (
    <div className="block text-sm font-semibold text-ui-text">
      <label htmlFor={inputId}>{humanizeWorkflowParameterKey(parameter.key)}</label>
      <TextInput
        id={inputId}
        className="mt-2 w-full"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        value={displayValue}
        placeholder={`Search ${parameter.type}s`}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          selectedValueRef.current = '';
          setDisplayValue(event.target.value);
          setQuery(event.target.value);
          onChange('');
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
            setActiveIndex(-1);
            return;
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) {
              setOpen(true);
              return;
            }
            if (selectableIndexes.length === 0) return;
            const currentPosition = selectableIndexes.indexOf(activeIndex);
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            const nextPosition = currentPosition < 0 ? (direction > 0 ? 0 : selectableIndexes.length - 1) : (currentPosition + direction + selectableIndexes.length) % selectableIndexes.length;
            setActiveIndex(selectableIndexes[nextPosition]);
            return;
          }
          if (event.key === 'Enter' && open && activeIndex >= 0) {
            event.preventDefault();
            const candidate = items[activeIndex];
            if (candidate) selectCandidate(candidate);
          }
        }}
      />
      {open && (
        <div id={listboxId} role="listbox" className="mt-1 grid max-h-56 gap-1 overflow-y-auto rounded-md border border-ui-border bg-ui-surface p-1.5 shadow-lg">
          {loading ? (
            <span className="px-3 py-2 text-xs text-ui-text-muted">Loading…</span>
          ) : items.length > 0 ? (
            items.map((candidate, index) => (
              <button
                key={candidate.id}
                id={optionId(index)}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={candidate.id === value}
                disabled={candidate.availability === 'unavailable'}
                className={`min-h-11 rounded px-3 py-2 text-left text-sm hover:bg-ui-surface-subtle disabled:cursor-not-allowed disabled:opacity-60 ${activeIndex === index ? 'bg-accent-soft' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => {
                  if (candidate.availability !== 'unavailable') setActiveIndex(index);
                }}
                onClick={() => selectCandidate(candidate)}
              >
                <span className="block font-semibold">{candidate.label}</span>
                <span className="type-caption block text-ui-text-muted">{candidate.description || candidate.provider}</span>
                {candidate.unavailableReason && <span className="type-caption block text-status-warning-text">{candidate.unavailableReason}</span>}
              </button>
            ))
          ) : (
            <span className="px-3 py-2 text-xs text-ui-text-muted">No matching {parameter.type}s.</span>
          )}
        </div>
      )}
      {error && (
        <span id={errorId} role="alert" className="type-caption mt-1 block text-status-danger-text">
          {error}
        </span>
      )}
    </div>
  );
}

export function WorkflowParameterFields({ workflow, values, onChange, errors = {} }: { workflow: Pick<WorkflowDefinition, 'id' | 'workspaceId' | 'parameters'>; values: Record<string, string>; onChange: (values: Record<string, string>) => void; errors?: Record<string, string> }) {
  const setValue = (key: string, value: string) => onChange({ ...values, [key]: value });
  return (
    <div className="grid gap-4">
      {workflow.parameters.map((parameter) => {
        if (parameter.type !== 'text') {
          return <ResourceParameterField key={parameter.key} workflow={workflow} parameter={parameter} value={values[parameter.key] || ''} onChange={(value) => setValue(parameter.key, value)} error={errors[parameter.key]} />;
        }
        const inputId = `workflow-parameter-${workflow.id}-${parameter.key}-input`;
        const errorId = `workflow-parameter-${workflow.id}-${parameter.key}-error`;
        const error = errors[parameter.key];
        return (
          <div key={parameter.key} className="block text-sm font-semibold text-ui-text">
            <label htmlFor={inputId}>{humanizeWorkflowParameterKey(parameter.key)}</label>
            <Textarea id={inputId} className="mt-2 min-h-24 w-full" value={values[parameter.key] || ''} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} onChange={(event) => setValue(parameter.key, event.target.value)} />
            {error && (
              <span id={errorId} role="alert" className="type-caption mt-1 block text-status-danger-text">
                {error}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
