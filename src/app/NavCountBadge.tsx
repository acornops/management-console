import React from 'react';

const MAX_NAV_BADGE_COUNT = 99;

interface NavCountBadgeProps {
  count: number;
  compact?: boolean;
}

export const NavCountBadge: React.FC<NavCountBadgeProps> = ({ count, compact = false }) => {
  if (count <= 0) return null;
  const displayCount = compact
    ? count > 9 ? '9+' : String(count)
    : count > MAX_NAV_BADGE_COUNT ? `${MAX_NAV_BADGE_COUNT}+` : String(count);

  return (
    <span
      data-nav-count-badge={compact ? 'compact' : 'default'}
      className={compact
        ? 'inline-flex h-4 w-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-status-danger p-0 font-mono text-[9px] font-bold leading-none tabular-nums text-ui-bg'
        : 'inline-flex h-5 min-w-8 shrink-0 items-center justify-center rounded-full bg-status-danger px-1 type-micro-label leading-none tabular-nums text-ui-bg'}
      title={(compact && count > 9) || count > MAX_NAV_BADGE_COUNT ? String(count) : undefined}
      aria-label={String(count)}
    >
      {displayCount}
    </span>
  );
};
