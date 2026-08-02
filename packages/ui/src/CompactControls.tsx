import React from 'react';
import { clsx } from 'clsx';
import { LayoutGroup } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

import { ActiveTabIndicator } from './ActiveTabIndicator';

export interface CompactControlItem<T extends string> {
  value: T;
  label: React.ReactNode;
  count?: number;
  controlsId?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedTabModel<T extends string> extends CompactControlItem<T> {
  isActive: boolean;
  ariaSelected: boolean;
}

export function getSegmentedTabModel<T extends string>({ items, activeValue }: { items: ReadonlyArray<CompactControlItem<T>>; activeValue: T }): Array<SegmentedTabModel<T>> {
  return items.map((item) => ({
    ...item,
    count: item.count,
    icon: item.icon,
    isActive: item.value === activeValue,
    ariaSelected: item.value === activeValue
  }));
}

export function segmentedTabButtonClassName({ isActive, className }: { isActive: boolean; className?: string }): string {
  return twMerge(
    clsx(
      'type-ui relative -mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25',
      isActive ? 'border-transparent text-ui-text' : 'border-transparent text-ui-text-muted hover:border-ui-border hover:text-ui-text',
      className
    )
  );
}

export interface SegmentedTabsProps<T extends string> {
  activeValue: T;
  allPanelsMounted?: boolean;
  ariaLabel: string;
  className?: string;
  idBase?: string;
  items: ReadonlyArray<CompactControlItem<T>>;
  onValueChange: (value: T) => void;
}

export const SegmentedTabs = <T extends string>({ activeValue, allPanelsMounted = true, ariaLabel, className, idBase, items, onValueChange }: SegmentedTabsProps<T>) => {
  const layoutGroupId = React.useId();
  const tablistRef = React.useRef<HTMLDivElement>(null);
  const tabs = getSegmentedTabModel({ items, activeValue });
  const enabledTabs = tabs.filter((tab) => !tab.disabled);

  React.useEffect(() => {
    if (!idBase) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const activeTab = tablistRef.current?.querySelector<HTMLElement>(`#${CSS.escape(`${idBase}-${activeValue}-tab`)}`);
      const viewportX = window.scrollX;
      const viewportY = window.scrollY;
      activeTab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      window.scrollTo(viewportX, viewportY);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeValue, idBase]);

  const focusSegmentedTab = (value: T) => {
    if (!idBase) return;
    window.requestAnimationFrame(() => {
      const tab = document.getElementById(`${idBase}-${value}-tab`);
      tab?.focus();
      tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  };

  const selectRelativeTab = (value: T, offset: number) => {
    const index = enabledTabs.findIndex((tab) => tab.value === value);
    if (index < 0 || enabledTabs.length === 0) return;
    const nextTab = enabledTabs[(index + offset + enabledTabs.length) % enabledTabs.length];
    if (nextTab) {
      onValueChange(nextTab.value);
      focusSegmentedTab(nextTab.value);
    }
  };

  return (
    <LayoutGroup id={layoutGroupId}>
      <div ref={tablistRef} role="tablist" aria-label={ariaLabel} className={twMerge('no-scrollbar flex gap-2 overflow-x-auto border-b border-ui-border', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            id={idBase ? `${idBase}-${tab.value}-tab` : undefined}
            type="button"
            role="tab"
            aria-controls={tab.controlsId ?? (idBase && (allPanelsMounted || tab.isActive) ? `${idBase}-${tab.value}-panel` : undefined)}
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
                if (enabledTabs[0]) {
                  onValueChange(enabledTabs[0].value);
                  focusSegmentedTab(enabledTabs[0].value);
                }
              } else if (event.key === 'End') {
                event.preventDefault();
                const lastTab = enabledTabs[enabledTabs.length - 1];
                if (lastTab) {
                  onValueChange(lastTab.value);
                  focusSegmentedTab(lastTab.value);
                }
              }
            }}
            className={segmentedTabButtonClassName({
              isActive: tab.isActive
            })}
          >
            {tab.icon && (
              <span className={clsx('inline-flex shrink-0', tab.isActive && 'text-accent-strong')}>
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className="rounded-full border border-ui-border bg-ui-bg px-1.5 py-0.5 type-caption leading-none text-ui-text-muted">{tab.count}</span>
            )}
            {tab.isActive && <ActiveTabIndicator />}
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
};

export interface FilterToggleModel<T extends string> extends CompactControlItem<T> {
  isActive: boolean;
  ariaPressed: boolean;
}

export function getFilterToggleModel<T extends string>({ items, activeValue }: { items: ReadonlyArray<CompactControlItem<T>>; activeValue: T }): Array<FilterToggleModel<T>> {
  return items.map((item) => ({
    ...item,
    count: item.count,
    icon: item.icon,
    isActive: item.value === activeValue,
    ariaPressed: item.value === activeValue
  }));
}

export function filterToggleButtonClassName({ isActive, className }: { isActive: boolean; className?: string }): string {
  return twMerge(
    clsx(
      'type-caption inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-3 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50',
      isActive ? 'border-accent/35 bg-ui-surface text-ui-text shadow-sm' : 'border-ui-border bg-ui-bg text-ui-text-muted hover:bg-ui-surface hover:text-ui-text',
      className
    )
  );
}

export interface FilterToggleGroupProps<T extends string> {
  activeValue: T;
  ariaLabel: string;
  className?: string;
  items: ReadonlyArray<CompactControlItem<T>>;
  onValueChange: (value: T) => void;
}

export const FilterToggleGroup = <T extends string>({ activeValue, ariaLabel, className, items, onValueChange }: FilterToggleGroupProps<T>) => {
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
          className={filterToggleButtonClassName({
            isActive: filter.isActive
          })}
        >
          {filter.icon}
          <span>{filter.label}</span>
          {typeof filter.count === 'number' && (
            <span className="rounded-full border border-ui-border bg-ui-surface px-1.5 py-0.5 type-caption leading-none text-ui-text-muted">{filter.count}</span>
          )}
        </button>
      ))}
    </div>
  );
};
