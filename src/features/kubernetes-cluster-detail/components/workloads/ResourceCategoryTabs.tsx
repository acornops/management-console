import { useTranslation } from 'react-i18next';
import { classNames } from '@/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts';

export const ResourceCategoryTabs = <T extends string,>({
  categories,
  active,
  counts,
  labelPrefix,
  onSelect
}: {
  categories: ReadonlyArray<T>;
  active: T;
  counts?: Partial<Record<T, number>>;
  labelPrefix: string;
  onSelect: (category: T) => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex w-full max-w-full items-center gap-1 overflow-x-auto border-y border-ui-border bg-ui-bg/60 px-1 py-1">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={classNames(
            'rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all',
            active === category
              ? 'bg-ui-surface text-accent-strong'
              : 'text-ui-text-muted hover:text-ui-text'
          )}
        >
          {t(`${labelPrefix}.${category}`)}
          {typeof counts?.[category] === 'number' && (
            <span className="ml-2 text-[10px] text-ui-text-muted">{counts[category]}</span>
          )}
        </button>
      ))}
    </div>
  );
};
