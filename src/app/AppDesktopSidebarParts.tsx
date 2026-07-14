import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AssistantNavStatusIndicator } from '@/app/AssistantNavStatusIndicator';
import { NavCountBadge } from '@/app/NavCountBadge';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';

const navButtonClass = (
  active: boolean,
  disabled: boolean
) => `relative flex h-10 w-full items-center justify-between overflow-hidden rounded-md px-3 text-sm transition-colors duration-[160ms] motion-reduce:duration-0 group ${
  active
    ? 'bg-ui-bg text-ui-text font-semibold'
    : 'text-ui-text-muted font-medium hover:bg-ui-bg hover:text-ui-text'
} outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

export const navIconClass = (active: boolean) =>
  `h-[18px] w-[18px] transition-colors duration-[160ms] motion-reduce:duration-0 ${active ? 'text-accent-strong' : 'text-ui-text-muted/60 group-hover:text-ui-text'}`;

export const SidebarSection: React.FC<{
  title: string;
  children: React.ReactNode;
  compactAfter?: boolean;
}> = ({ title, children, compactAfter = false }) => (
  <div className={`${compactAfter ? 'pb-6' : 'pb-8'} px-3`}>
    {title && <div className="mb-3 flex items-center justify-between px-3">
      <div className="text-xs font-bold uppercase tracking-[0.08em] text-ui-text-muted opacity-70">{title}</div>
    </div>}
    <div className="space-y-2">{children}</div>
  </div>
);

export const TargetSettingsDivider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border-t border-ui-border px-3 pb-8 pt-4">
    <div className="space-y-2">{children}</div>
  </div>
);

export const SidebarNavButton: React.FC<{
  active: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: number;
  assistantStatus?: AssistantNavStatus;
  assistantStatusLabel?: string;
  title?: string;
}> = ({ active, disabled, icon, label, onClick, badge, assistantStatus = 'idle', assistantStatusLabel, title }) => {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.button
      whileTap={disabled || shouldReduceMotion ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={navButtonClass(active, disabled)}
      title={title}
      aria-current={active ? 'page' : undefined}
    >
      <div className="relative z-10 flex min-w-0 items-center gap-3">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="relative z-10 flex items-center gap-2">
        {typeof badge === 'number' ? <NavCountBadge count={badge} /> : null}
        <AssistantNavStatusIndicator status={assistantStatus} label={assistantStatusLabel} />
      </div>
    </motion.button>
  );
};

export const WorkspaceSidebarNavLink: React.FC<{
  active: boolean;
  current?: boolean;
  href: string;
  icon?: React.ReactNode;
  label: string;
  badge?: number;
  nested?: boolean;
  reserveBadgeSpace?: boolean;
  onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}> = ({ active, current = active, href, icon, label, badge, nested = false, reserveBadgeSpace = false, onClick }) => (
  <a
    href={href}
    onClick={onClick}
    className={nested && active
      ? `${navButtonClass(false, false)} bg-ui-surface font-semibold text-ui-text shadow-sm before:absolute before:left-3 before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:bg-accent-strong hover:bg-ui-surface`
      : navButtonClass(active, false)}
    aria-current={current ? 'page' : undefined}
  >
    <span className={`flex min-w-0 items-center gap-3 ${nested ? 'pl-4' : ''}`}>
      {icon}
      <span className="truncate">{label}</span>
    </span>
    {reserveBadgeSpace && (
      <span className="ml-2 inline-flex min-w-8 shrink-0 justify-end" aria-hidden={badge === undefined || badge <= 0 ? 'true' : undefined}>
        {typeof badge === 'number' ? <NavCountBadge count={badge} /> : null}
      </span>
    )}
  </a>
);
