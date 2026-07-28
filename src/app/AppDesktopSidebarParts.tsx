import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  NavigationItem,
  NavigationLink,
  NavigationSection
} from '@acornops/ui';

import { AssistantNavStatusIndicator } from '@/app/AssistantNavStatusIndicator';
import { NavCountBadge } from '@/app/NavCountBadge';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';
import { WorkspaceNavigationGroupBadge } from '@/app/WorkspaceNavigationGroupBadge';

const MotionNavigationItem = motion.create(NavigationItem);

export const navIconClass = (active: boolean) =>
  `h-[18px] w-[18px] transition-colors duration-[160ms] motion-reduce:duration-0 ${active ? 'text-accent-strong' : 'text-ui-text-muted/60 group-hover:text-ui-text'}`;

export const SidebarSection: React.FC<{
  title: string;
  badge?: string;
  children: React.ReactNode;
  compactAfter?: boolean;
}> = ({ title, badge, children, compactAfter = false }) => (
  <NavigationSection
    title={title}
    badge={badge ? <WorkspaceNavigationGroupBadge>{badge}</WorkspaceNavigationGroupBadge> : undefined}
    compactAfter={compactAfter}
  >
    {children}
  </NavigationSection>
);

export const TargetSettingsDivider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border-t border-ui-border px-3 pb-5 pt-3">
    <div className="space-y-0.5">{children}</div>
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
    <MotionNavigationItem
      whileTap={disabled || shouldReduceMotion ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      active={active}
      title={title}
      leading={icon}
      trailing={(
        <>
          {typeof badge === 'number' ? <NavCountBadge count={badge} /> : null}
          <AssistantNavStatusIndicator status={assistantStatus} label={assistantStatusLabel} />
        </>
      )}
    >
      {label}
    </MotionNavigationItem>
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
  <NavigationLink
    href={href}
    onClick={onClick}
    active={!nested && active}
    className={nested && active
      ? 'bg-ui-surface font-semibold text-ui-text shadow-sm before:absolute before:left-3 before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:bg-accent-strong hover:bg-ui-surface [&>span:first-child]:pl-4'
      : nested
        ? '[&>span:first-child]:pl-4'
        : undefined}
    aria-current={current ? 'page' : undefined}
    leading={icon}
    trailing={reserveBadgeSpace ? (
      <span className="ml-2 inline-flex min-w-8 shrink-0 justify-end" aria-hidden={badge === undefined || badge <= 0 ? 'true' : undefined}>
        {typeof badge === 'number' ? <NavCountBadge count={badge} /> : null}
      </span>
    ) : undefined}
  >
    {label}
  </NavigationLink>
);
