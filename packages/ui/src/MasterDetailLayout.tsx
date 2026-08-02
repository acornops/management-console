import React from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { CollectionLoadingSkeleton } from './Loading';

export interface MasterDetailLayoutProps {
  boundedOnDesktop?: boolean;
  desktopBreakpoint?: 'lg' | 'wide';
  listWidth?: 'default' | 'compact' | 'wide';
  list: React.ReactNode;
  detail: React.ReactNode;
  showDetailOnCompact: boolean;
  compactBackLabel: string;
  onCompactBack: () => void;
}

const masterDetailBaseGridClass = 'grid min-h-[32rem] min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface';
export const masterDetailGridClass = `${masterDetailBaseGridClass} lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]`;
export const compactMasterDetailGridClass = 'lg:grid-cols-[minmax(17rem,20rem)_minmax(0,1fr)]';
export const wideMasterDetailGridClass = 'lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]';
export const wideBreakpointMasterDetailGridClass = `${masterDetailBaseGridClass} min-[1440px]:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]`;
export const wideBreakpointCompactMasterDetailGridClass = 'min-[1440px]:grid-cols-[minmax(17rem,20rem)_minmax(0,1fr)]';
export const wideBreakpointLibraryMasterDetailGridClass = 'min-[1440px]:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]';
export const masterDetailDiscoverySpacingClass = 'mb-6';

export interface MasterDetailRowProps {
  title: React.ReactNode;
  description: React.ReactNode;
  metadata: React.ReactNode;
  status: React.ReactNode;
  selected: boolean;
  previewed?: boolean;
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

export const MasterDetailRow: React.FC<MasterDetailRowProps> = ({ title, description, metadata, status, selected, previewed = false, ariaLabel, buttonRef, onClick, onKeyDown }) => {
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
      aria-keyshortcuts="ArrowUp ArrowDown Home End"
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`control-target min-h-24 w-full px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
        selected ? 'bg-accent-soft/45' : previewed ? 'hover:bg-ui-bg/70 lg:bg-accent-soft/45' : 'hover:bg-ui-bg/70'
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
  badges?: React.ReactNode;
  density?: 'default' | 'compact';
  title: React.ReactNode;
  titleMeta?: React.ReactNode;
  description: React.ReactNode;
  actions?: React.ReactNode;
}

export const MasterDetailPaneHeader: React.FC<MasterDetailPaneHeaderProps> = ({ badges, density = 'default', title, titleMeta, description, actions }) => {
  const compact = density === 'compact';

  if (compact) {
    return (
      <div data-master-detail-pane-header="true" data-density={density} className="shrink-0 border-b border-ui-border bg-ui-bg">
        <div className="px-4 py-3 sm:px-5">
          {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
          <div className={`${badges ? 'mt-2 ' : ''}grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end xl:gap-5`}>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <h2 className="min-w-0 type-section-title break-words [overflow-wrap:anywhere]">{title}</h2>
                {titleMeta && <div className="shrink-0">{titleMeta}</div>}
              </div>
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
          {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
          <div className={`${badges ? 'mt-3 ' : ''}flex min-w-0 items-center justify-between gap-2`}>
            <h2 className="min-w-0 type-section-title break-words [overflow-wrap:anywhere]">{title}</h2>
            {titleMeta && <div className="shrink-0">{titleMeta}</div>}
          </div>
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

export const MasterDetailLayout: React.FC<MasterDetailLayoutProps> = ({ boundedOnDesktop = false, desktopBreakpoint = 'lg', listWidth = 'default', list, detail, showDetailOnCompact, compactBackLabel, onCompactBack }) => {
  const usesWideDesktop = desktopBreakpoint === 'wide';
  const gridClass = usesWideDesktop ? wideBreakpointMasterDetailGridClass : masterDetailGridClass;
  const compactGridClass = usesWideDesktop ? wideBreakpointCompactMasterDetailGridClass : compactMasterDetailGridClass;
  const wideGridClass = usesWideDesktop ? wideBreakpointLibraryMasterDetailGridClass : wideMasterDetailGridClass;
  const desktopClasses = usesWideDesktop
    ? {
        bounded: 'min-[1440px]:h-full min-[1440px]:min-h-0',
        list: 'min-[1440px]:border-r min-[1440px]:border-ui-border',
        listBounded: 'min-[1440px]:min-h-0 min-[1440px]:overflow-y-auto min-[1440px]:overscroll-contain min-[1440px]:custom-scrollbar min-[1440px]:stable-scrollbar-gutter',
        detailBounded: 'min-[1440px]:min-h-0 min-[1440px]:overflow-hidden',
        showList: showDetailOnCompact ? 'hidden min-[1440px]:block' : 'block',
        showDetail: showDetailOnCompact ? 'block' : 'hidden min-[1440px]:block',
        hideBack: 'min-[1440px]:hidden'
      }
    : {
        bounded: 'lg:h-full lg:min-h-0',
        list: 'lg:border-r lg:border-ui-border',
        listBounded: 'lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:custom-scrollbar lg:stable-scrollbar-gutter',
        detailBounded: 'lg:min-h-0 lg:overflow-hidden',
        showList: showDetailOnCompact ? 'hidden lg:block' : 'block',
        showDetail: showDetailOnCompact ? 'block' : 'hidden lg:block',
        hideBack: 'lg:hidden'
      };

  return (
    <div
      data-master-detail-layout="true"
      data-bounded-on-desktop={boundedOnDesktop ? 'true' : undefined}
      data-desktop-breakpoint={desktopBreakpoint}
      data-list-width={listWidth}
      className={twMerge(gridClass, listWidth === 'compact' && compactGridClass, listWidth === 'wide' && wideGridClass, boundedOnDesktop && desktopClasses.bounded)}
    >
      <div data-master-detail-list="true" className={twMerge(desktopClasses.showList, 'min-w-0', desktopClasses.list, boundedOnDesktop && desktopClasses.listBounded)}>
        {list}
      </div>
      <div data-master-detail-detail="true" className={twMerge(desktopClasses.showDetail, 'min-w-0', boundedOnDesktop && desktopClasses.detailBounded)}>
        {showDetailOnCompact && (
          <Button variant="tertiary" size="sm" className={twMerge('m-4 mb-0', desktopClasses.hideBack)} onClick={onCompactBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {compactBackLabel}
          </Button>
        )}
        {detail}
      </div>
    </div>
  );
};
