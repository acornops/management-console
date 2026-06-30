import React from 'react';
import type { Transition } from 'framer-motion';
import { motion, useReducedMotion } from 'framer-motion';
import { AssistantNavStatusIndicator } from '@/app/AssistantNavStatusIndicator';
import { NavCountBadge } from '@/app/NavCountBadge';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';

const navButtonClass = (
  active: boolean,
  disabled: boolean
) => `w-full relative overflow-hidden flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors group ${
  active
    ? 'text-ui-text font-bold'
    : 'text-ui-text-muted font-medium hover:bg-accent-soft/30 hover:text-accent-strong'
} outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

export const navIconClass = (active: boolean) =>
  `w-5 h-5 transition-colors ${active ? 'text-ui-text' : 'text-ui-text-muted/60 group-hover:text-ui-text'}`;

export const SidebarSection: React.FC<{
  title: string;
  children: React.ReactNode;
  compactAfter?: boolean;
}> = ({ title, children, compactAfter = false }) => (
  <div className={`${compactAfter ? 'pb-4' : 'pb-10'} px-4`}>
    <div className="flex items-center justify-between px-4 mb-4">
      <div className="text-xs font-bold uppercase tracking-[0.08em] text-ui-text-muted opacity-70">{title}</div>
    </div>
    <div className="space-y-0.5">{children}</div>
  </div>
);

export const TargetSettingsDivider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border-t border-ui-border px-4 pb-8 pt-4">
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
  const activeMarkerTransition: Transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <motion.button
      whileTap={disabled || shouldReduceMotion ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={navButtonClass(active, disabled)}
      title={title}
      aria-current={active ? 'page' : undefined}
    >
      {active && (
        <motion.div
          layoutId="desktop-sidebar-active-tab"
          transition={activeMarkerTransition}
          className="absolute inset-0 rounded-lg border border-accent/30 bg-accent-soft"
        />
      )}
      <div className="relative z-10 flex items-center gap-4">
        {icon}
        <span>{label}</span>
      </div>
      <div className="relative z-10 flex items-center gap-2">
        {typeof badge === 'number' ? <NavCountBadge count={badge} /> : null}
        <AssistantNavStatusIndicator status={assistantStatus} label={assistantStatusLabel} />
      </div>
    </motion.button>
  );
};
