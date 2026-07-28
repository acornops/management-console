import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  actions?: React.ReactNode;
  description: React.ReactNode;
  details?: React.ReactNode;
  embedded?: boolean;
  eyebrow?: React.ReactNode;
  footer?: React.ReactNode;
  headingLevel?: 1 | 2 | 3;
  icon: React.ReactNode;
  title: React.ReactNode;
}

/** Canonical empty and no-results anatomy for route-level collections. */
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

  return (
    <section
      data-empty-state="true"
      data-empty-state-surface={embedded ? 'embedded' : 'framed'}
      role={role}
      className={twMerge(clsx(
        'flex min-h-48 shrink-0 items-center justify-center px-5 py-10 text-center',
        embedded
          ? 'bg-transparent'
          : 'rounded-lg border border-dashed border-ui-border bg-ui-surface',
        className
      ))}
      {...props}
    >
      <div className={embedded ? 'w-full max-w-md' : 'w-full max-w-2xl'}>
        {embedded ? (
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-ui-text-muted [&_svg]:h-4 [&_svg]:w-4" aria-hidden="true">
            {icon}
          </div>
        ) : (
          <div className="relative mx-auto mb-4 h-16 w-20" aria-hidden="true" data-empty-state-illustration="ledger">
            <span className="absolute left-1 top-2 h-11 w-14 -rotate-3 rounded-md border border-ui-border bg-ui-bg" />
            <span className="absolute bottom-1 right-1 h-12 w-14 rotate-2 rounded-md border border-ui-border bg-ui-surface shadow-sm" />
            <span className="absolute inset-x-0 top-2.5 mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-accent-strong [&_svg]:h-5 [&_svg]:w-5">
              {icon}
            </span>
          </div>
        )}
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
