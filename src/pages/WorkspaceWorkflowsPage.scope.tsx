import React from 'react';
import { Checkbox } from '@/components/common/Checkbox';
import { TextInput } from '@/components/common/ComponentVocabulary';
import { ICONS } from '@/constants';
import type { WorkflowOptionsCatalog } from '@/services/control-plane/workflowApi';
import { splitLines } from '@/pages/workflows/workflowPageHelpers';

export type WorkflowScopeOption = WorkflowOptionsCatalog['mcpServers'][number];
export type WorkflowScopeOptions = {
  semanticCapabilities: WorkflowScopeOption[];
};

export function keepAvailableLineValues(value: string, options: WorkflowScopeOption[]): string {
  const availableValues = new Set(options.map((option) => option.value));
  return splitLines(value).filter((item) => availableValues.has(item)).join('\n');
}

export const WorkflowScopeMultiSelect: React.FC<{
  label: string;
  value: string;
  options: WorkflowScopeOption[];
  searchPlaceholder: string;
  emptyMessage: string;
  selectedEmptyLabel: string;
  onToggle: (option: WorkflowScopeOption, checked: boolean) => void;
}> = ({
  label,
  value,
  options,
  searchPlaceholder,
  emptyMessage,
  selectedEmptyLabel,
  onToggle
}) => {
  const [query, setQuery] = React.useState('');
  const selectedValues = splitLines(value);
  const selectedValueSet = React.useMemo(() => new Set(selectedValues), [selectedValues]);
  const optionByValue = React.useMemo(() => new Map(options.map((option) => [option.value, option])), [options]);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((option) => {
    if (!normalizedQuery) return true;
    return [option.value, option.label, option.description].some((item) => item?.toLowerCase().includes(normalizedQuery));
  });
  const selectedLabel = selectedValues.length === 0 ? selectedEmptyLabel : `${selectedValues.length} selected`;

  return (
    <fieldset className="min-w-0">
      <legend className="type-micro-label">{label}</legend>
      <details className="group mt-2 rounded-md border border-ui-border bg-ui-surface">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">{selectedLabel}</span>
          <ICONS.ChevronDown className="h-4 w-4 shrink-0 text-ui-text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-ui-border bg-ui-bg p-3">
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} aria-label={`Search ${label.toLowerCase()}`} aria-disabled={options.length === 0} disabled={options.length === 0} className="h-9 text-xs" />
          <div className="mt-3 max-h-52 overflow-y-auto rounded-md border border-ui-border bg-ui-surface custom-scrollbar">
            {filteredOptions.length > 0 ? filteredOptions.map((option) => (
              <label key={option.value} className="flex min-h-11 items-start gap-3 border-b border-ui-border/70 px-3 py-2 last:border-b-0">
                <Checkbox checked={selectedValueSet.has(option.value)} disabled={option.disabled} onChange={(event) => onToggle(option, event.target.checked)} />
                <span className="min-w-0">
                  <span className="block break-words text-sm font-semibold text-ui-text [overflow-wrap:anywhere]">{option.label}</span>
                  {(option.description || option.disabledReason || option.value !== option.label) && (
                    <span className="type-caption mt-0.5 block break-words text-ui-text-muted [overflow-wrap:anywhere]">{option.disabledReason || option.description || option.value}</span>
                  )}
                </span>
              </label>
            )) : (
              <div className="px-3 py-4 text-sm font-semibold text-ui-text-muted">{emptyMessage}</div>
            )}
          </div>
          {selectedValues.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedValues.map((selectedValue) => {
                const selectedOption = optionByValue.get(selectedValue);
                const chipLabel = selectedOption?.label || selectedValue;
                return (
                  <button key={selectedValue} type="button" onClick={() => onToggle(selectedOption || { value: selectedValue, label: selectedValue }, false)} className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-full border border-ui-border bg-ui-surface px-2.5 py-1 text-xs font-bold text-ui-text-muted transition-colors hover:border-accent/40 hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 sm:min-h-8">
                    <span className="min-w-0 truncate">{chipLabel}</span>
                    <ICONS.X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </details>
    </fieldset>
  );
};
