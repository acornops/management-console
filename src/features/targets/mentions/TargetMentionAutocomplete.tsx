import React from 'react';
import { Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ComboboxListbox, ComboboxOption, Textarea } from '@acornops/ui';
import { listTargetsForWorkspace } from '@/services/control-plane/targetApi';
import type { TargetSummary } from '@/services/control-plane/types';
import {
  insertTargetMention,
  resolveTargetMentionQuery,
  type TargetMentionQuery
} from '@/features/targets/mentions/targetMentionModel';

interface UseTargetMentionAutocompleteOptions {
  enabled: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onValueChange: (value: string, cursor: number) => void;
  value: string;
  workspaceId: string;
}

export function useTargetMentionAutocomplete({
  enabled,
  inputRef,
  onValueChange,
  value,
  workspaceId
}: UseTargetMentionAutocompleteOptions) {
  const [mentionQuery, setMentionQuery] = React.useState<TargetMentionQuery | null>(null);
  const [targets, setTargets] = React.useState<TargetSummary[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const menuId = React.useId();
  const requestSequence = React.useRef(0);

  const dismiss = React.useCallback(() => {
    requestSequence.current += 1;
    setMentionQuery(null);
    setTargets([]);
    setActiveIndex(0);
    setLoading(false);
    setError(false);
  }, []);

  React.useEffect(() => {
    if (!enabled || !mentionQuery) return;
    const sequence = ++requestSequence.current;
    setTargets([]);
    setActiveIndex(0);
    setLoading(true);
    setError(false);
    void listTargetsForWorkspace(workspaceId, {
      limit: 50,
      ...(mentionQuery.query.trim() ? { q: mentionQuery.query.trim() } : {})
    }).then((page) => {
      if (requestSequence.current !== sequence) return;
      setTargets([...page.items].sort((left, right) => left.name.localeCompare(right.name)));
      setActiveIndex(0);
    }).catch(() => {
      if (requestSequence.current !== sequence) return;
      setTargets([]);
      setError(true);
    }).finally(() => {
      if (requestSequence.current === sequence) setLoading(false);
    });
  }, [enabled, mentionQuery?.query, workspaceId]);

  const handleInputChange = React.useCallback((nextValue: string, cursor: number) => {
    onValueChange(nextValue, cursor);
    if (!enabled) return;
    const nextMentionQuery = resolveTargetMentionQuery(nextValue, cursor);
    if (!nextMentionQuery) {
      dismiss();
      return;
    }
    setMentionQuery(nextMentionQuery);
    setActiveIndex(0);
  }, [dismiss, enabled, onValueChange]);

  const selectTarget = React.useCallback((target: TargetSummary) => {
    if (!mentionQuery) return;
    const insertion = insertTargetMention(value, mentionQuery, target.name);
    dismiss();
    onValueChange(insertion.value, insertion.cursor);
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.setSelectionRange(insertion.cursor, insertion.cursor);
    });
  }, [dismiss, inputRef, mentionQuery, onValueChange, value]);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionQuery) return false;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => targets.length === 0
        ? 0
        : (current + direction + targets.length) % targets.length);
      return true;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
      return true;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (targets[activeIndex]) selectTarget(targets[activeIndex]);
      return true;
    }
    return false;
  }, [activeIndex, dismiss, mentionQuery, selectTarget, targets]);

  return {
    activeIndex,
    dismiss,
    error,
    handleInputChange,
    handleKeyDown,
    loading,
    mentionQuery,
    menuId,
    selectTarget,
    setActiveIndex,
    targets
  };
}

interface TargetMentionMenuProps {
  activeIndex: number;
  className?: string;
  error: boolean;
  id: string;
  loading: boolean;
  onActiveIndexChange: (index: number) => void;
  onSelect: (target: TargetSummary) => void;
  targets: TargetSummary[];
}

export const TargetMentionMenu: React.FC<TargetMentionMenuProps> = ({
  activeIndex,
  className = 'absolute left-0 right-0 top-full z-50 mt-2',
  error,
  id,
  loading,
  onActiveIndexChange,
  onSelect,
  targets
}) => {
  const { t } = useTranslation();
  const emptyMessage = error
    ? t('chat.targetMentionLoadFailed')
    : loading
      ? t('chat.targetMentionLoading')
      : t('chat.targetMentionNoMatches');
  return (
    <ComboboxListbox
      id={id}
      label={t('chat.targetMentionPickerLabel')}
      className={`${className} max-h-64 overflow-y-auto rounded-xl border border-ui-border bg-ui-surface-strong p-1.5 shadow-xl shadow-ui-text/10 custom-scrollbar`}
    >
      {targets.length === 0 ? (
        <p className="px-3 py-3 type-ui text-ui-text-muted" role="status">{emptyMessage}</p>
      ) : targets.map((target, index) => (
        <ComboboxOption
          key={target.id}
          id={`${id}-option-${index}`}
          active={index === activeIndex}
          onMouseEnter={() => onActiveIndexChange(index)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(target)}
          className="control-target items-start gap-2 rounded-lg"
        >
          <Server className="mt-0.5 h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate type-body type-emphasis">{target.name}</span>
            <span className="mt-0.5 block type-caption text-ui-text-muted">
              {t(`chat.targetMentionTypes.${target.targetType}`)} · {t(`chat.targetMentionStatuses.${target.status}`)}
            </span>
          </span>
        </ComboboxOption>
      ))}
    </ComboboxListbox>
  );
};

type TextareaProps = React.ComponentPropsWithoutRef<typeof Textarea>;

interface TargetMentionTextareaProps extends Omit<TextareaProps, 'onChange' | 'value'> {
  onValueChange: (value: string) => void;
  value: string;
  workspaceId: string;
  wrapperClassName?: string;
}

export const TargetMentionTextarea = React.forwardRef<HTMLTextAreaElement, TargetMentionTextareaProps>(({
  onBlur,
  onKeyDown,
  onValueChange,
  value,
  workspaceId,
  wrapperClassName = 'relative',
  ...textareaProps
}, forwardedRef) => {
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const setInputRef = React.useCallback((node: HTMLTextAreaElement | null) => {
    inputRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  const autocomplete = useTargetMentionAutocomplete({
    enabled: true,
    inputRef,
    onValueChange: (nextValue) => onValueChange(nextValue),
    value,
    workspaceId
  });

  return (
    <div className={wrapperClassName}>
      <Textarea
        {...textareaProps}
        ref={setInputRef}
        value={value}
        onChange={(event) => autocomplete.handleInputChange(event.target.value, event.target.selectionStart)}
        onKeyDown={(event) => {
          if (!autocomplete.handleKeyDown(event)) onKeyDown?.(event);
        }}
        onBlur={(event) => {
          onBlur?.(event);
          autocomplete.dismiss();
        }}
        role="combobox"
        aria-controls={autocomplete.menuId}
        aria-expanded={Boolean(autocomplete.mentionQuery)}
        aria-autocomplete="list"
        aria-activedescendant={autocomplete.mentionQuery && autocomplete.targets[autocomplete.activeIndex]
          ? `${autocomplete.menuId}-option-${autocomplete.activeIndex}`
          : undefined}
      />
      {autocomplete.mentionQuery && (
        <TargetMentionMenu
          id={autocomplete.menuId}
          activeIndex={autocomplete.activeIndex}
          error={autocomplete.error}
          loading={autocomplete.loading}
          targets={autocomplete.targets}
          onActiveIndexChange={autocomplete.setActiveIndex}
          onSelect={autocomplete.selectTarget}
        />
      )}
    </div>
  );
});

TargetMentionTextarea.displayName = 'TargetMentionTextarea';
