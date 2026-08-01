import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  NavigationItem,
  NavigationLink,
  NavigationSection,
  IconTile,
  Tooltip
} from '@acornops/ui';

import { AssistantNavStatusIndicator } from '@/app/AssistantNavStatusIndicator';
import { NavCountBadge } from '@/app/NavCountBadge';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';
import { ExperimentalBadge } from '@/components/common/ExperimentalBadge';

const MotionNavigationItem = motion.create(NavigationItem);

export const navIconClass = (active: boolean) =>
  `h-[18px] w-[18px] transition-colors duration-[160ms] motion-reduce:duration-0 ${active ? 'text-accent-strong' : 'text-ui-text-muted/60 group-hover:text-ui-text'}`;

const railIconSlot = (icon: React.ReactNode) => (
  <span data-rail-icon-slot="true" className="flex h-10 w-10 shrink-0 items-center justify-center">
    {icon}
  </span>
);

export const SidebarSection: React.FC<{
  title: string;
  badge?: string;
  children: React.ReactNode;
  compactAfter?: boolean;
  collapsed?: boolean;
}> = ({ title, badge, children, compactAfter = false, collapsed = false }) => (
  <NavigationSection
    data-sidebar-section="true"
    data-sidebar-section-titled={title && !collapsed ? 'true' : undefined}
    title={title}
    badge={badge ? <ExperimentalBadge>{badge}</ExperimentalBadge> : undefined}
    compactAfter={compactAfter}
    className={collapsed
      ? `px-3 pb-0.5 [&>div:last-child]:space-y-0.5 ${title ? '[&>div:first-child]:sr-only' : ''}`
      : undefined}
  >
    {children}
  </NavigationSection>
);

export const TargetSettingsDivider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div data-sidebar-settings-divider="true" className="border-t border-ui-border px-3 pb-5 pt-3">
    <div className="space-y-0.5">{children}</div>
  </div>
);

const identityInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}`.toLocaleUpperCase();
  }
  return name.trim().slice(0, 2).toLocaleUpperCase();
};

export const SidebarTargetIdentity: React.FC<{
  collapsed: boolean;
  label: string;
  name: string;
  testId: string;
}> = ({ collapsed, label, name, testId }) => {
  const identity = (
    <div
      className={collapsed
        ? 'flex h-10 w-full items-center justify-center'
        : 'border-y border-ui-border bg-ui-surface px-2 py-3'}
      aria-label={collapsed ? `${label}: ${name}` : undefined}
    >
      <div className={collapsed ? 'sr-only' : 'type-micro-label mb-1'}>{label}</div>
      {collapsed ? (
        <IconTile
          size="xs"
          data-desktop-sidebar-active-identity={testId}
          data-rail-align="true"
          className="type-caption type-emphasis text-ui-text"
        >
          {identityInitials(name)}
        </IconTile>
      ) : (
        <div data-desktop-sidebar-active-identity={testId} className="type-row-title line-clamp-2 break-words">
          {name}
        </div>
      )}
    </div>
  );

  return collapsed
    ? <Tooltip content={name} side="right" className="w-full">{identity}</Tooltip>
    : identity;
};

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
  collapsed?: boolean;
  href?: string;
}> = ({ active, disabled, icon, label, onClick, badge, assistantStatus = 'idle', assistantStatusLabel, title, collapsed = false, href }) => {
  const shouldReduceMotion = useReducedMotion();
  const trailing = (
    <>
      {typeof badge === 'number' ? <NavCountBadge count={badge} compact={collapsed} /> : null}
      <AssistantNavStatusIndicator status={assistantStatus} label={assistantStatusLabel} />
    </>
  );
  const sharedClassName = collapsed
    ? 'justify-center px-0 [&>span:first-child]:justify-center [&>span:first-child>span:last-child]:sr-only [&>span+span]:absolute [&>span+span]:right-0.5 [&>span+span]:top-0.5'
    : undefined;
  const control = href && !disabled ? (
    <NavigationLink
      href={href}
      active={active}
      className={sharedClassName}
      title={collapsed ? undefined : title}
      leading={collapsed ? railIconSlot(icon) : icon}
      trailing={trailing}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onClick();
      }}
    >
      {label}
    </NavigationLink>
  ) : (
    <MotionNavigationItem
      whileTap={disabled || shouldReduceMotion ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      active={active}
      title={collapsed ? undefined : title}
      className={sharedClassName}
      leading={collapsed ? railIconSlot(icon) : icon}
      trailing={trailing}
    >
      {label}
    </MotionNavigationItem>
  );
  return collapsed ? <Tooltip content={label} side="right" className="w-full">{control}</Tooltip> : control;
};

export const WorkspaceSidebarNavLink: React.FC<{
  active: boolean;
  current?: boolean;
  href: string;
  icon?: React.ReactNode;
  label: string;
  badge?: number;
  experimentalBadge?: string;
  nested?: boolean;
  reserveBadgeSpace?: boolean;
  onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  collapsed?: boolean;
}> = ({ active, current = active, href, icon, label, badge, experimentalBadge, nested = false, reserveBadgeSpace = false, onClick, collapsed = false }) => {
  const link = <NavigationLink
    href={href}
    onClick={onClick}
    active={!nested && active}
    className={collapsed
      ? 'justify-center px-0 [&>span:first-child]:justify-center [&>span:first-child>span:last-child]:sr-only [&>span+span]:absolute [&>span+span]:right-0.5 [&>span+span]:top-0.5'
      : nested && active
      ? 'bg-ui-surface type-emphasis text-ui-text shadow-sm before:absolute before:left-3 before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:bg-accent-strong hover:bg-ui-surface [&>span:first-child]:pl-4'
      : nested
        ? '[&>span:first-child]:pl-4'
        : undefined}
    aria-current={current ? 'page' : undefined}
    leading={collapsed ? railIconSlot(icon) : icon}
    trailing={reserveBadgeSpace ? (
      <span className="ml-2 inline-flex min-w-8 shrink-0 justify-end" aria-hidden={!experimentalBadge && (badge === undefined || badge <= 0) ? 'true' : undefined}>
        {experimentalBadge && !collapsed ? <ExperimentalBadge>{experimentalBadge}</ExperimentalBadge> : null}
        {typeof badge === 'number' ? <NavCountBadge count={badge} compact={collapsed} /> : null}
      </span>
    ) : undefined}
  >
    {label}
  </NavigationLink>;
  return collapsed ? <Tooltip content={experimentalBadge ? `${label} · ${experimentalBadge}` : label} side="right" className="w-full">{link}</Tooltip> : link;
};
