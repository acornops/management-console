import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Button, buttonClassName, type ButtonProps } from '@/components/common/Button';
import { formInputClassName, formTextareaClassName } from '@/components/common/formControlStyles';
import { ICONS } from '@/constants';

export function closeButtonClassName(className?: string): string {
  return buttonClassName({ variant: 'icon', size: 'icon', className });
}

export interface CloseButtonProps extends Omit<ButtonProps, 'variant' | 'size' | 'children'> {
  label?: string;
}

export const CloseButton = React.forwardRef<HTMLButtonElement, CloseButtonProps>(
  ({ label = 'Close', className, type = 'button', ...props }, ref) => (
    <Button
      ref={ref}
      type={type}
      variant="icon"
      size="icon"
      className={twMerge('shrink-0', className)}
      aria-label={props['aria-label'] || label}
      {...props}
    >
      <ICONS.X className="h-4 w-4" aria-hidden="true" />
    </Button>
  )
);

CloseButton.displayName = 'CloseButton';

export function textInputClassName(className?: string): string {
  return formInputClassName(className);
}

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input ref={ref} type={type} className={textInputClassName(className)} {...props} />
  )
);

TextInput.displayName = 'TextInput';

export function textareaClassName(className?: string): string {
  return formTextareaClassName(className);
}

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={textareaClassName(className)} {...props} />
  )
);

Textarea.displayName = 'Textarea';

export interface CompactControlItem<T extends string> {
  value: T;
  label: React.ReactNode;
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedTabModel<T extends string> extends CompactControlItem<T> {
  isActive: boolean;
  ariaSelected: boolean;
}

export function getSegmentedTabModel<T extends string>({
  items,
  activeValue
}: {
  items: ReadonlyArray<CompactControlItem<T>>;
  activeValue: T;
}): Array<SegmentedTabModel<T>> {
  return items.map((item) => ({
    ...item,
    count: item.count,
    icon: item.icon,
    isActive: item.value === activeValue,
    ariaSelected: item.value === activeValue
  }));
}

export function segmentedTabButtonClassName({
  isActive,
  className
}: {
  isActive: boolean;
  className?: string;
}): string {
  return twMerge(clsx(
    '-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25',
    isActive
      ? 'border-accent text-accent-strong'
      : 'border-transparent text-ui-text-muted hover:border-ui-border hover:text-ui-text',
    className
  ));
}

export interface SegmentedTabsProps<T extends string> {
  activeValue: T;
  ariaLabel: string;
  className?: string;
  idBase?: string;
  items: ReadonlyArray<CompactControlItem<T>>;
  onValueChange: (value: T) => void;
}

export const SegmentedTabs = <T extends string,>({
  activeValue,
  ariaLabel,
  className,
  idBase,
  items,
  onValueChange
}: SegmentedTabsProps<T>) => {
  const tabs = getSegmentedTabModel({ items, activeValue });
  const enabledTabs = tabs.filter((tab) => !tab.disabled);
  const selectRelativeTab = (value: T, offset: number) => {
    const index = enabledTabs.findIndex((tab) => tab.value === value);
    if (index < 0 || enabledTabs.length === 0) return;
    const nextTab = enabledTabs[(index + offset + enabledTabs.length) % enabledTabs.length];
    if (nextTab) onValueChange(nextTab.value);
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className={twMerge('flex gap-2 overflow-x-auto border-b border-ui-border', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          id={idBase ? `${idBase}-${tab.value}-tab` : undefined}
          type="button"
          role="tab"
          aria-controls={idBase ? `${idBase}-${tab.value}-panel` : undefined}
          aria-selected={tab.ariaSelected}
          disabled={tab.disabled}
          tabIndex={tab.isActive ? 0 : -1}
          onClick={() => onValueChange(tab.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
              event.preventDefault();
              selectRelativeTab(tab.value, 1);
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
              event.preventDefault();
              selectRelativeTab(tab.value, -1);
            } else if (event.key === 'Home') {
              event.preventDefault();
              if (enabledTabs[0]) onValueChange(enabledTabs[0].value);
            } else if (event.key === 'End') {
              event.preventDefault();
              const lastTab = enabledTabs[enabledTabs.length - 1];
              if (lastTab) onValueChange(lastTab.value);
            }
          }}
          className={segmentedTabButtonClassName({ isActive: tab.isActive })}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {typeof tab.count === 'number' && (
            <span className="rounded-full border border-ui-border bg-ui-bg px-1.5 py-0.5 text-[10px] leading-none text-ui-text-muted">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export interface FilterToggleModel<T extends string> extends CompactControlItem<T> {
  isActive: boolean;
  ariaPressed: boolean;
}

export function getFilterToggleModel<T extends string>({
  items,
  activeValue
}: {
  items: ReadonlyArray<CompactControlItem<T>>;
  activeValue: T;
}): Array<FilterToggleModel<T>> {
  return items.map((item) => ({
    ...item,
    count: item.count,
    icon: item.icon,
    isActive: item.value === activeValue,
    ariaPressed: item.value === activeValue
  }));
}

export function filterToggleButtonClassName({
  isActive,
  className
}: {
  isActive: boolean;
  className?: string;
}): string {
  return twMerge(clsx(
    'type-ui inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50',
    isActive
      ? 'border-accent/35 bg-ui-surface text-accent-strong shadow-sm'
      : 'border-ui-border bg-ui-bg text-ui-text-muted hover:bg-ui-surface hover:text-ui-text',
    className
  ));
}

export interface FilterToggleGroupProps<T extends string> {
  activeValue: T;
  ariaLabel: string;
  className?: string;
  items: ReadonlyArray<CompactControlItem<T>>;
  onValueChange: (value: T) => void;
}

export const FilterToggleGroup = <T extends string,>({
  activeValue,
  ariaLabel,
  className,
  items,
  onValueChange
}: FilterToggleGroupProps<T>) => {
  const filters = getFilterToggleModel({ items, activeValue });

  return (
    <div role="group" aria-label={ariaLabel} className={twMerge('flex max-w-full flex-wrap items-center gap-2 overflow-visible', className)}>
      {filters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          aria-pressed={filter.ariaPressed}
          disabled={filter.disabled}
          onClick={() => onValueChange(filter.value)}
          className={filterToggleButtonClassName({ isActive: filter.isActive })}
        >
          {filter.icon}
          <span>{filter.label}</span>
          {typeof filter.count === 'number' && (
            <span className="rounded-full border border-ui-border bg-ui-surface px-1.5 py-0.5 text-[10px] leading-none text-ui-text-muted">
              {filter.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
