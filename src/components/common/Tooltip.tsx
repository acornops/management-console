import React, { useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  side?: TooltipSide;
  disabled?: boolean;
  className?: string;
}

const sideClasses: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'left-1/2 top-full mt-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2'
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  disabled = false,
  className
}) => {
  const tooltipId = useId();
  const child = React.Children.only(children);
  const describedBy = [child.props['aria-describedby'], tooltipId].filter(Boolean).join(' ');
  const childWithDescription = disabled
    ? child
    : React.cloneElement(child, { 'aria-describedby': describedBy });

  return (
    <span className={twMerge(clsx('group/tooltip relative inline-flex', className))}>
      {childWithDescription}
      {!disabled && (
        <span
          id={tooltipId}
          role="tooltip"
          className={twMerge(clsx(
            'pointer-events-none absolute z-[180] max-w-xs whitespace-nowrap rounded-md border border-ui-border bg-ui-surface px-2 py-1 text-xs font-semibold text-ui-text opacity-0 shadow-lg shadow-ui-text/10 transition-opacity delay-150 duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100',
            sideClasses[side]
          ))}
        >
          {content}
        </span>
      )}
    </span>
  );
};
