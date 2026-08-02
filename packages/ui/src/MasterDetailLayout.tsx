import React from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { CollectionLoadingSkeleton } from './Loading';

export interface MasterDetailLayoutProps {
  boundedOnDesktop?: boolean;
  listWidth?: 'default' | 'compact';
  list: React.ReactNode;
  detail: React.ReactNode;
  showDetailOnCompact: boolean;
  compactBackLabel: string;
  onCompactBack: () => void;
}

export const masterDetailGridClass = 'grid min-h-[32rem] min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]';
export const compactMasterDetailGridClass = 'lg:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)]';
export const masterDetailDiscoverySpacingClass = 'mb-6';

export interface MasterDetailRowProps {
  title: React.ReactNode;
  description: React.ReactNode;
  metadata: React.ReactNode;
  status: React.ReactNode;
  selected: boolean;
  ariaLabel?: string;
  buttonRef?: React.Ref<HTMLButtonElement>;
  onClick: () => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>;
}

export const MasterDetailListHeader: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <div data-master-detail-list-header="true" className="sticky top-0 z-10 border-b border-ui-border bg-ui-surface px-4 py-3">
    <h2 className="type-panel-title">{children}</h2>
  </div>
);

export const MasterDetailRow: React.FC<MasterDetailRowProps> = ({ title, description, metadata, status, selected, ariaLabel, buttonRef, onClick, onKeyDown }) => {
  const descriptionId = React.useId();
  const statusId = React.useId();
  const metadataId = React.useId();
  const describedBy = ariaLabel ? `${descriptionId} ${statusId} ${metadataId}` : undefined;

  return (
    <button
      data-master-detail-row="true"
      ref={buttonRef}
      type="button"
      aria-current={selected ? 'true' : undefined}
      aria-pressed={selected}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`control-target min-h-24 w-full px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
        selected ? 'bg-accent-soft/45' : 'hover:bg-ui-bg/70'
      }`}
    >
      <span className="flex items-start gap-3">
        <span className="min-w-0 flex-1">
          <span className="type-row-title block break-words text-ui-text [overflow-wrap:anywhere]">{title}</span>
          <span id={descriptionId} className="type-caption mt-1 block whitespace-normal leading-5 text-ui-text-muted">
            {description}
          </span>
        </span>
        <span id={statusId} className="shrink-0">
          {status}
        </span>
      </span>
      <span id={metadataId} className="type-caption type-emphasis mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-ui-text-muted">
        {metadata}
      </span>
    </button>
  );
};

export const MasterDetailLoading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div data-master-detail-loading="true">
    <CollectionLoadingSkeleton label={String(children)} rows={4} />
  </div>
);

export const MasterDetailEmptyState: React.FC<{
  title: React.ReactNode;
  description: React.ReactNode;
}> = ({ title, description }) => (
  <div data-master-detail-empty="true">
    <EmptyState embedded headingLevel={3} icon={<Search className="h-4 w-4" />} title={title} description={description} />
  </div>
);

export interface MasterDetailPaneHeaderProps {
  badges: React.ReactNode;
  density?: 'default' | 'compact';
  title: React.ReactNode;
  description: React.ReactNode;
  actions?: React.ReactNode;
}

export const MasterDetailPaneHeader: React.FC<MasterDetailPaneHeaderProps> = ({ badges, density = 'default', title, description, actions }) => {
  const compact = density === 'compact';

  if (compact) {
    return (
      <div data-master-detail-pane-header="true" data-density={density} className="shrink-0 border-b border-ui-border bg-ui-bg">
        <div className="px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">{badges}</div>
          <div className="mt-2 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end xl:gap-5">
            <div className="min-w-0">
              <h2 className="type-section-title break-words [overflow-wrap:anywhere]">{title}</h2>
              <p className="type-body mt-1 line-clamp-2 max-w-3xl break-words text-ui-text-muted [overflow-wrap:anywhere] xl:line-clamp-1">{description}</p>
            </div>
            {actions && <div className="min-w-0 xl:self-end">{actions}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-master-detail-pane-header="true" data-density={density} className="shrink-0 border-b border-ui-border bg-ui-bg">
      <div className="px-5 py-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">{badges}</div>
          <h2 className="type-section-title mt-3 break-words [overflow-wrap:anywhere]">{title}</h2>
          <p className="type-body mt-2 max-w-3xl break-words text-ui-text-muted [overflow-wrap:anywhere]">{description}</p>
        </div>
        {actions}
      </div>
    </div>
  );
};

export const MasterDetailPaneBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ children, className, ...props }, ref) => (
  <div ref={ref} data-master-detail-pane-body="true" className={twMerge('grid gap-5 bg-ui-bg/45 p-4 sm:p-5', className)} {...props}>
    {children}
  </div>
));
MasterDetailPaneBody.displayName = 'MasterDetailPaneBody';

export const MasterDetailLayout: React.FC<MasterDetailLayoutProps> = ({ boundedOnDesktop = false, listWidth = 'default', list, detail, showDetailOnCompact, compactBackLabel, onCompactBack }) => (
  <div data-master-detail-layout="true" data-bounded-on-desktop={boundedOnDesktop ? 'true' : undefined} data-list-width={listWidth} className={twMerge(masterDetailGridClass, listWidth === 'compact' && compactMasterDetailGridClass, boundedOnDesktop && 'lg:h-full lg:min-h-0')}>
    <div data-master-detail-list="true" className={twMerge(`${showDetailOnCompact ? 'hidden lg:block' : 'block'} min-w-0 lg:border-r lg:border-ui-border`, boundedOnDesktop && 'lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:custom-scrollbar lg:stable-scrollbar-gutter')}>
      {list}
    </div>
    <div data-master-detail-detail="true" className={twMerge(`${showDetailOnCompact ? 'block' : 'hidden lg:block'} min-w-0`, boundedOnDesktop && 'lg:min-h-0 lg:overflow-hidden')}>
      {showDetailOnCompact && (
        <Button variant="tertiary" size="sm" className="m-4 mb-0 lg:hidden" onClick={onCompactBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {compactBackLabel}
        </Button>
      )}
      {detail}
    </div>
  </div>
);
