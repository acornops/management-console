import React from 'react';
import { twMerge } from 'tailwind-merge';

export const DangerZone: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div
    className={twMerge(
      'divide-y divide-ui-border overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm',
      className
    )}
    data-danger-zone="true"
  >
    {children}
  </div>
);

export const DangerZoneRow: React.FC<{
  action: React.ReactNode;
  actionClassName?: string;
  description: React.ReactNode;
  detail?: React.ReactNode;
  headingLevel?: 'h2' | 'h3' | 'h4';
  id: string;
  title: React.ReactNode;
  tone?: 'neutral' | 'danger';
}> = ({
  action,
  actionClassName,
  description,
  detail,
  headingLevel = 'h2',
  id,
  title,
  tone = 'neutral'
}) => {
  const Heading = headingLevel;

  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-6"
      data-danger-zone-row={tone}
    >
      <div className="min-w-0">
        <Heading id={id} className={`mb-1 text-sm font-bold ${tone === 'danger' ? 'text-status-danger-text' : 'text-ui-text'}`}>
          {title}
        </Heading>
        <p className="max-w-2xl text-xs leading-5 text-ui-text-muted">{description}</p>
        {detail}
      </div>
      <div className={twMerge('w-full shrink-0 sm:w-64', actionClassName)}>{action}</div>
    </section>
  );
};
