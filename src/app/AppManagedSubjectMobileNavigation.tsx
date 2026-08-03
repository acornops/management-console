import React from 'react';

import { Button } from '@acornops/ui';
import { AssistantNavStatusIndicator } from '@/app/AssistantNavStatusIndicator';
import type { ManagedSubjectNavigationItem, ManagedSubjectNavigationModel } from '@/app/managedSubjectNavigation';
import { NavCountBadge } from '@/app/NavCountBadge';

const itemClassName = (active: boolean) => `min-h-11 rounded-md px-3 py-2 text-left transition-colors ${
  active ? 'bg-accent-soft text-accent-strong' : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
}`;

const MobileSubjectNavigationItem: React.FC<{
  item: ManagedSubjectNavigationItem;
  navigate: (path: string) => void;
}> = ({ item, navigate }) => {
  const Icon = item.icon;
  return (
    <Button
      type="button"
      variant="tertiary"
      onClick={() => navigate(item.path)}
      className={itemClassName(item.active)}
    >
      <span className="flex w-full items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.label}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {item.badge && item.badge > 0 ? <NavCountBadge count={item.badge} /> : null}
          <AssistantNavStatusIndicator
            status={item.assistantStatus || 'idle'}
            label={item.assistantStatusLabel}
            withTooltip={false}
          />
        </span>
      </span>
    </Button>
  );
};

export const AppManagedSubjectMobileNavigation: React.FC<{
  model: ManagedSubjectNavigationModel;
  navigate: (path: string) => void;
}> = ({ model, navigate }) => (
  <>
    <p className="mb-2 type-label tracking-normal">{model.destinationLabel}</p>
    <div className="grid grid-cols-1 gap-1">
      <Button
        type="button"
        variant="tertiary"
        onClick={() => navigate(model.backPath)}
        className="min-h-11 rounded-md px-3 py-2 text-left text-ui-text-muted hover:bg-ui-bg hover:text-accent-strong"
      >
        {model.backLabel}
      </Button>

      <div className="mt-3 border-t border-ui-border pt-3">
        <p className="mb-2 type-label tracking-normal">{model.operationsLabel}</p>
        <div className="grid grid-cols-1 gap-1">
          {model.operations.map((item) => (
            <MobileSubjectNavigationItem key={item.id} item={item} navigate={navigate} />
          ))}
        </div>
      </div>

      <div className="mt-3 border-t border-ui-border pt-3">
        <p className="mb-2 type-label tracking-normal">{model.capabilitiesLabel}</p>
        <div className="grid grid-cols-1 gap-1">
          {model.capabilities.map((item) => (
            <MobileSubjectNavigationItem key={item.id} item={item} navigate={navigate} />
          ))}
        </div>
      </div>

      <div className="mt-3 border-t border-ui-border pt-3">
        <MobileSubjectNavigationItem item={model.settings} navigate={navigate} />
      </div>
    </div>
  </>
);
