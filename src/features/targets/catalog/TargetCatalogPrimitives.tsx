import React from 'react';
import { motion, type Transition } from 'framer-motion';
import { ChevronRight, MoreHorizontal } from 'lucide-react';

import { ActionMenu, Button, StatusBadge, type StatusBadgeTone } from '@acornops/ui';

export type TargetCatalogKind = 'cluster' | 'vm';

interface TargetCatalogCardProps {
  targetKind: TargetCatalogKind;
  actionLabel: string;
  disabled?: boolean;
  onActivate: () => void;
  children: React.ReactNode;
}

export const ResourceCatalogCard: React.FC<{
  actionLabel: string;
  disabled?: boolean;
  onActivate: () => void;
  cardAttribute?: Record<string, string>;
  actionAttribute?: Record<string, string>;
  layoutMotion?: boolean;
  layoutTransition?: Transition;
  children: React.ReactNode;
}> = ({
  actionLabel,
  disabled = false,
  onActivate,
  cardAttribute = {},
  actionAttribute = {},
  layoutMotion = false,
  layoutTransition,
  children
}) => {
  return (
    <motion.article
      {...cardAttribute}
      layout={layoutMotion ? 'position' : false}
      transition={layoutTransition}
      className="group relative flex min-w-0 flex-col overflow-visible rounded-lg border border-ui-border bg-ui-surface shadow-sm transition-colors hover:border-accent/25"
    >
      <Button
        {...actionAttribute}
        type="button"
        variant="tertiary"
        aria-label={actionLabel}
        disabled={disabled}
        onClick={onActivate}
        className="control-target absolute inset-0 z-0 cursor-pointer rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-control-boundary disabled:cursor-not-allowed"
      />
      <div className="pointer-events-none relative z-10 flex min-w-0 flex-col">{children}</div>
    </motion.article>
  );
};

export const TargetCatalogCard: React.FC<TargetCatalogCardProps> = ({ targetKind, ...props }) => (
  <ResourceCatalogCard
    {...props}
    cardAttribute={targetKind === 'cluster' ? { 'data-cluster-card': 'true' } : { 'data-vm-card': 'true' }}
    actionAttribute={targetKind === 'cluster' ? { 'data-cluster-card-primary-action': 'true' } : { 'data-vm-card-primary-action': 'true' }}
  />
);
export const TargetCatalogStatusPill: React.FC<{
  label: string;
  reason: string;
  tone: StatusBadgeTone;
}> = ({ label, reason, tone }) => (
  <StatusBadge tone={tone} className="max-w-[8.5rem]" aria-label={`${label}: ${reason}`}>
    <span className="truncate">{label}</span>
  </StatusBadge>
);

export const TargetCatalogActionHint: React.FC<{ label: string }> = ({ label }) => (
  <span
    aria-hidden="true"
    className="mt-1 inline-flex items-center gap-1 type-caption type-emphasis text-ui-text-muted transition-colors group-hover:text-accent-strong group-focus-within:text-accent-strong"
  >
    {label}
    <ChevronRight className="h-3.5 w-3.5" />
  </span>
);

interface TargetCatalogActionMenuProps {
  targetKind: TargetCatalogKind;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const ResourceCatalogActionMenu: React.FC<Omit<TargetCatalogActionMenuProps, 'targetKind'> & {
  triggerAttribute?: Record<string, string>;
}> = ({ triggerAttribute = {}, label, open, onOpenChange, children }) => (
  <span className="pointer-events-auto relative z-20">
    <ActionMenu
      label={label}
      open={open}
      onOpenChange={onOpenChange}
      className="type-body"
      trigger={(
        <Button
        {...triggerAttribute}
        type="button"
        variant="tertiary"
        size="icon"
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
        }}
        className={open ? 'bg-ui-bg text-ui-text' : undefined}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </Button>
      )}
    >
      {children}
    </ActionMenu>
  </span>
);

export const TargetCatalogActionMenu: React.FC<TargetCatalogActionMenuProps> = ({ targetKind, ...props }) => (
  <ResourceCatalogActionMenu
    {...props}
    triggerAttribute={targetKind === 'cluster' ? { 'data-cluster-overflow-action': 'toggle' } : { 'data-vm-overflow-action': 'toggle' }}
  />
);
