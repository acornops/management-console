import React from 'react';
import { useTranslation } from 'react-i18next';
import { SegmentedTabs } from '@acornops/ui';

export interface ResourceCategoryTabModel<T extends string> {
  value: T;
  label: string;
  count?: number;
  controlsId?: string;
  isActive: boolean;
}

export function getResourceCategoryTabModel<T extends string>({
  categories,
  active,
  counts,
  labelPrefix,
  getLabel,
  controlsId,
  translate
}: {
  categories: ReadonlyArray<T>;
  active: T;
  counts?: Partial<Record<T, number>>;
  labelPrefix: string;
  getLabel?: (category: T) => string;
  controlsId?: string | ((category: T) => string);
  translate: (key: string) => string;
}): Array<ResourceCategoryTabModel<T>> {
  return categories.map((category) => ({
    value: category,
    label: getLabel ? getLabel(category) : translate(`${labelPrefix}.${category}`),
    count: counts?.[category],
    controlsId: typeof controlsId === 'function' ? controlsId(category) : controlsId,
    isActive: active === category
  }));
}

export const ResourceCategoryTabs = <T extends string>({
  categories,
  active,
  counts,
  labelPrefix,
  getLabel,
  onSelect,
  className,
  ariaLabel,
  idBase,
  controlsId
}: {
  categories: ReadonlyArray<T>;
  active: T;
  counts?: Partial<Record<T, number>>;
  labelPrefix: string;
  getLabel?: (category: T) => string;
  onSelect: (category: T) => void;
  className?: string;
  ariaLabel?: string;
  idBase: string;
  controlsId: string | ((category: T) => string);
}) => {
  const { t } = useTranslation();
  const tabs = getResourceCategoryTabModel({
    categories,
    active,
    counts,
    labelPrefix,
    getLabel,
    controlsId,
    translate: (key) => t(key)
  });

  return (
    <SegmentedTabs
      activeValue={active}
      allPanelsMounted={false}
      ariaLabel={ariaLabel ?? labelPrefix}
      className={className}
      idBase={idBase}
      items={tabs}
      onValueChange={onSelect}
    />
  );
};
