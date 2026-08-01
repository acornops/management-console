import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { IconTile } from './IconTile';

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  actions?: React.ReactNode;
  description: React.ReactNode;
  details?: React.ReactNode;
  /** @deprecated EmptyState now has one canonical presentation. */
  embedded?: boolean;
  eyebrow?: React.ReactNode;
  footer?: React.ReactNode;
  headingLevel?: 1 | 2 | 3;
  icon: React.ReactNode;
  title: React.ReactNode;
}

/** Canonical empty and no-results anatomy for collection surfaces. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  actions,
  className,
  description,
  details,
  embedded = false,
  eyebrow,
  footer,
  headingLevel = 2,
  icon,
  role = 'status',
  title,
  ...props
}) => {
  const Heading = headingLevel === 1 ? 'h1' : headingLevel === 3 ? 'h3' : 'h2';
  // Retain the former variant prop for source compatibility while every caller
  // converges on the same quiet, neutral presentation.
  void embedded;

  return (
    <section
      data-empty-state="true"
      data-empty-state-surface="embedded"
      role={role}
      className={twMerge(clsx(
        'flex min-h-48 shrink-0 items-center justify-center bg-transparent px-5 py-10 text-center',
        className
      ))}
      {...props}
    >
      <div className="w-full max-w-md">
        <IconTile className="mx-auto mb-3">
          {icon}
        </IconTile>
        {eyebrow && <div className="type-label mb-2 text-ui-text-muted">{eyebrow}</div>}
        <Heading className="type-panel-title text-ui-text">{title}</Heading>
        <div className="type-body mx-auto mt-1.5 max-w-lg text-ui-text-muted">{description}</div>
        {details && <div className="mt-7">{details}</div>}
        {actions && <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
        {footer && <div className="type-caption mx-auto mt-4 max-w-lg text-ui-text-muted">{footer}</div>}
      </div>
    </section>
  );
};
