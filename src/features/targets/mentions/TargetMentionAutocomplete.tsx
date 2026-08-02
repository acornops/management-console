import React from 'react';
import { AtSign, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ComboboxListbox, ComboboxOption, Textarea } from '@acornops/ui';
import { listTargetsForWorkspace } from '@/services/control-plane/targetApi';
import type { TargetSummary } from '@/services/control-plane/types';
import {
  completeTargetMentionType,
  insertTargetMention,
  resolveTargetMentionKeyboardAction,
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
    if (!enabled || mentionQuery?.stage !== 'target') {
      requestSequence.current += 1;
      setTargets([]);
      setActiveIndex(0);
      setLoading(false);
      setError(false);
      return;
    }
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
  }, [enabled, mentionQuery?.query, mentionQuery?.stage, workspaceId]);

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

  const selectMentionType = React.useCallback(() => {
    if (mentionQuery?.stage !== 'type') return;
    const insertion = completeTargetMentionType(value, mentionQuery);
    onValueChange(insertion.value, insertion.cursor);
    setMentionQuery(resolveTargetMentionQuery(insertion.value, insertion.cursor));
    setActiveIndex(0);
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.setSelectionRange(insertion.cursor, insertion.cursor);
    });
  }, [inputRef, mentionQuery, onValueChange, value]);

  const selectTarget = React.useCallback((target: TargetSummary) => {
    if (mentionQuery?.stage !== 'target') return;
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
    const action = resolveTargetMentionKeyboardAction(
      mentionQuery.stage,
      event.key,
      event.shiftKey,
      Boolean(targets[activeIndex])
    );
    if (action === 'none') return false;
    event.preventDefault();
    if (action === 'complete_type') selectMentionType();
    if (action === 'dismiss') dismiss();
    if (action === 'select_target' && targets[activeIndex]) selectTarget(targets[activeIndex]);
    if (action === 'move_next' || action === 'move_previous') {
      const direction = action === 'move_next' ? 1 : -1;
      setActiveIndex((current) => targets.length === 0
        ? 0
        : (current + direction + targets.length) % targets.length);
    }
    return true;
  }, [activeIndex, dismiss, mentionQuery, selectMentionType, selectTarget, targets]);

  return {
    activeIndex,
    dismiss,
    error,
    handleInputChange,
    handleKeyDown,
    loading,
    mentionQuery,
    menuId,
    selectMentionType,
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
  mentionQuery: TargetMentionQuery;
  onActiveIndexChange: (index: number) => void;
  onSelectMentionType: () => void;
  onSelect: (target: TargetSummary) => void;
  targets: TargetSummary[];
}

export const TargetMentionMenu: React.FC<TargetMentionMenuProps> = ({
  activeIndex,
  className = 'absolute left-0 right-0 top-full z-50 mt-2',
  error,
  id,
  loading,
  mentionQuery,
  onActiveIndexChange,
  onSelectMentionType,
  onSelect,
  targets
}) => {
  const { t } = useTranslation();
  const menuClassName = `${className} max-h-64 overflow-y-auto rounded-xl border border-ui-border bg-ui-surface-strong p-1.5 shadow-xl shadow-ui-text/10 custom-scrollbar`;
  if (mentionQuery.stage === 'type') {
    return (
      <ComboboxListbox
        id={id}
        label={t('chat.targetMentionTypePickerLabel')}
        className={menuClassName}
      >
        <ComboboxOption
          id={`${id}-type-option`}
          active
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onSelectMentionType}
          className="control-target items-start gap-2 rounded-lg"
        >
          <AtSign className="mt-0.5 h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate type-body type-emphasis">{t('chat.targetMentionTypeLabel')}</span>
            <span className="mt-0.5 block type-caption text-ui-text-muted">{t('chat.targetMentionTypeDescription')}</span>
          </span>
        </ComboboxOption>
      </ComboboxListbox>
    );
  }
  const emptyMessage = error
    ? t('chat.targetMentionLoadFailed')
    : loading
      ? t('chat.targetMentionLoading')
      : t('chat.targetMentionNoMatches');
  return (
    <ComboboxListbox
      id={id}
      label={t('chat.targetMentionPickerLabel')}
      className={menuClassName}
    >
      {targets.length === 0 ? (
        <p className="px-3 py-3 type-ui text-ui-text-muted" role="status">{emptyMessage}</p>
      ) : targets.map((target, index) => (
        <ComboboxOption
          key={target.id}
          id={`${id}-option-${index}`}
          active={index === activeIndex}
          tabIndex={-1}
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
        aria-controls={autocomplete.mentionQuery ? autocomplete.menuId : undefined}
        aria-expanded={Boolean(autocomplete.mentionQuery)}
        aria-autocomplete="list"
        aria-activedescendant={autocomplete.mentionQuery?.stage === 'type'
          ? `${autocomplete.menuId}-type-option`
          : autocomplete.mentionQuery && autocomplete.targets[autocomplete.activeIndex]
            ? `${autocomplete.menuId}-option-${autocomplete.activeIndex}`
            : undefined}
      />
      {autocomplete.mentionQuery && (
        <TargetMentionMenu
          id={autocomplete.menuId}
          activeIndex={autocomplete.activeIndex}
          error={autocomplete.error}
          loading={autocomplete.loading}
          mentionQuery={autocomplete.mentionQuery}
          targets={autocomplete.targets}
          onActiveIndexChange={autocomplete.setActiveIndex}
          onSelectMentionType={autocomplete.selectMentionType}
          onSelect={autocomplete.selectTarget}
        />
      )}
    </div>
  );
});

TargetMentionTextarea.displayName = 'TargetMentionTextarea';
