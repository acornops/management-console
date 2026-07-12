import { clsx } from 'clsx';
import React, { useRef } from 'react';
import { LayoutGroup } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { twMerge } from 'tailwind-merge';
import { ActiveTabIndicator } from '@/components/common/ActiveTabIndicator';

export interface ResourceCategoryTabModel<T extends string> {
  value: T;
  label: string;
  count?: number;
  isActive: boolean;
}

export function getResourceCategoryTabModel<T extends string>({
  categories,
  active,
  counts,
  labelPrefix,
  translate
}: {
  categories: ReadonlyArray<T>;
  active: T;
  counts?: Partial<Record<T, number>>;
  labelPrefix: string;
  translate: (key: string) => string;
}): Array<ResourceCategoryTabModel<T>> {
  return categories.map((category) => ({
    value: category,
    label: translate(`${labelPrefix}.${category}`),
    count: counts?.[category],
    isActive: active === category
  }));
}

export const ResourceCategoryTabs = <T extends string,>({
  categories,
  active,
  counts,
  labelPrefix,
  onSelect,
  className,
  ariaLabel
}: {
  categories: ReadonlyArray<T>;
  active: T;
  counts?: Partial<Record<T, number>>;
  labelPrefix: string;
  onSelect: (category: T) => void;
  className?: string;
  ariaLabel?: string;
}) => {
  const { t } = useTranslation();
  const layoutGroupId = React.useId();
  const tabs = getResourceCategoryTabModel({
    categories,
    active,
    counts,
    labelPrefix,
    translate: (key) => t(key)
  });
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusTab = (index: number) => {
    const nextTab = tabs[index];
    if (!nextTab) return;
    onSelect(nextTab.value);
    tabRefs.current[index]?.focus();
  };
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusTab((index + 1) % tabs.length);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTab((index - 1 + tabs.length) % tabs.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTab(tabs.length - 1);
    }
  };

  return (
    <LayoutGroup id={layoutGroupId}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={twMerge(clsx('flex w-full max-w-full items-center overflow-x-auto border-b border-ui-border', className))}
      >
        {tabs.map((tab, index) => (
        <button
          key={tab.value}
          ref={(element) => { tabRefs.current[index] = element; }}
          type="button"
          role="tab"
          aria-selected={tab.isActive}
          tabIndex={tab.isActive ? 0 : -1}
          onClick={() => onSelect(tab.value)}
          onKeyDown={(event) => handleTabKeyDown(event, index)}
          className={twMerge(clsx(
            'relative inline-flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 text-xs font-bold uppercase tracking-[0.04em] text-ui-text-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/25',
            tab.isActive
              ? 'border-transparent text-accent-strong'
              : 'border-transparent hover:text-ui-text'
          ))}
        >
          <span>{tab.label}</span>
          {typeof tab.count === 'number' && (
            <span className="type-data text-xs text-ui-text-muted">
              {tab.count}
            </span>
          )}
          {tab.isActive && <ActiveTabIndicator />}
        </button>
        ))}
      </div>
    </LayoutGroup>
  );
};
