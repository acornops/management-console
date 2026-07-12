import React from 'react';

const MAX_NAV_BADGE_COUNT = 99;

interface NavCountBadgeProps {
  count: number;
}

export const NavCountBadge: React.FC<NavCountBadgeProps> = ({ count }) => {
  if (count <= 0) return null;
  const displayCount = count > MAX_NAV_BADGE_COUNT ? `${MAX_NAV_BADGE_COUNT}+` : String(count);

  return (
    <span
      className="inline-flex h-5 min-w-8 shrink-0 items-center justify-center rounded-full bg-status-danger px-1 text-[9px] font-bold leading-none tabular-nums text-ui-bg"
      title={count > MAX_NAV_BADGE_COUNT ? String(count) : undefined}
      aria-label={String(count)}
    >
      {displayCount}
    </span>
  );
};
