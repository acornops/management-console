import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { twMerge } from 'tailwind-merge';

export interface ResourceCategoryTabModel<T extends string> {
  value: T;
  label: string;
  count?: number;
  isActive: boolean;
  ariaPressed: boolean;
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
    isActive: active === category,
    ariaPressed: active === category
  }));
}

export const ResourceCategoryTabs = <T extends string,>({
  categories,
  active,
  counts,
  labelPrefix,
  onSelect,
  className
}: {
  categories: ReadonlyArray<T>;
  active: T;
  counts?: Partial<Record<T, number>>;
  labelPrefix: string;
  onSelect: (category: T) => void;
  className?: string;
}) => {
  const { t } = useTranslation();
  const tabs = getResourceCategoryTabModel({
    categories,
    active,
    counts,
    labelPrefix,
    translate: (key) => t(key)
  });

  return (
    <div className={twMerge(clsx('flex w-full max-w-full items-center gap-1 overflow-x-auto border-b border-ui-border bg-ui-bg/60 px-1 py-1', className))}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          aria-pressed={tab.ariaPressed}
          onClick={() => onSelect(tab.value)}
          className={twMerge(clsx(
            'inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.04em] text-ui-text-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25',
            tab.isActive
              ? 'bg-ui-surface text-accent-strong shadow-sm'
              : 'hover:bg-ui-surface hover:text-ui-text'
          ))}
        >
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
