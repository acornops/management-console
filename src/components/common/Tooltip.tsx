import React, { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

interface TooltipTriggerRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipSize {
  width: number;
  height: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

interface TooltipCoordinates {
  side: TooltipSide;
  top: number;
  left: number;
}

interface TooltipCoordinateOptions {
  side: TooltipSide;
  triggerRect: TooltipTriggerRect;
  tooltipSize: TooltipSize;
  viewportSize: ViewportSize;
  gap?: number;
  padding?: number;
}

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  side?: TooltipSide;
  disabled?: boolean;
  className?: string;
}

const oppositeSide: Record<TooltipSide, TooltipSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left'
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

const getRawCoordinates = (
  side: TooltipSide,
  triggerRect: TooltipTriggerRect,
  tooltipSize: TooltipSize,
  gap: number
): Omit<TooltipCoordinates, 'side'> => {
  switch (side) {
    case 'bottom':
      return {
        top: triggerRect.bottom + gap,
        left: triggerRect.left + (triggerRect.width - tooltipSize.width) / 2
      };
    case 'left':
      return {
        top: triggerRect.top + (triggerRect.height - tooltipSize.height) / 2,
        left: triggerRect.left - gap - tooltipSize.width
      };
    case 'right':
      return {
        top: triggerRect.top + (triggerRect.height - tooltipSize.height) / 2,
        left: triggerRect.right + gap
      };
    case 'top':
    default:
      return {
        top: triggerRect.top - gap - tooltipSize.height,
        left: triggerRect.left + (triggerRect.width - tooltipSize.width) / 2
      };
  }
};

const coordinatesFitViewport = (
  coordinates: Omit<TooltipCoordinates, 'side'>,
  tooltipSize: TooltipSize,
  viewportSize: ViewportSize,
  padding: number
) => (
  coordinates.top >= padding &&
  coordinates.left >= padding &&
  coordinates.top + tooltipSize.height <= viewportSize.height - padding &&
  coordinates.left + tooltipSize.width <= viewportSize.width - padding
);

export const getTooltipCoordinates = ({
  side,
  triggerRect,
  tooltipSize,
  viewportSize,
  gap = 8,
  padding = 8
}: TooltipCoordinateOptions): TooltipCoordinates => {
  const preferredCoordinates = getRawCoordinates(side, triggerRect, tooltipSize, gap);
  const flippedSide = oppositeSide[side];
  const flippedCoordinates = getRawCoordinates(flippedSide, triggerRect, tooltipSize, gap);
  const preferredFits = coordinatesFitViewport(preferredCoordinates, tooltipSize, viewportSize, padding);
  const flippedFits = coordinatesFitViewport(flippedCoordinates, tooltipSize, viewportSize, padding);
  const resolvedSide = preferredFits || !flippedFits ? side : flippedSide;
  const rawCoordinates = resolvedSide === side ? preferredCoordinates : flippedCoordinates;

  return {
    side: resolvedSide,
    top: clamp(rawCoordinates.top, padding, viewportSize.height - padding - tooltipSize.height),
    left: clamp(rawCoordinates.left, padding, viewportSize.width - padding - tooltipSize.width)
  };
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  disabled = false,
  className
}) => {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [coordinates, setCoordinates] = useState<TooltipCoordinates | null>(null);
  const child = React.Children.only(children);
  const describedBy = [child.props['aria-describedby'], tooltipId].filter(Boolean).join(' ');
  const childWithDescription = disabled
    ? child
    : React.cloneElement(child, { 'aria-describedby': describedBy });
  const canUseDOM = typeof document !== 'undefined' && typeof window !== 'undefined';

  const updatePosition = useCallback(() => {
    if (!canUseDOM || !triggerRef.current || !tooltipRef.current) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    setCoordinates(getTooltipCoordinates({
      side,
      triggerRect,
      tooltipSize: {
        width: tooltipRect.width,
        height: tooltipRect.height
      },
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }));
  }, [canUseDOM, side]);

  useLayoutEffect(() => {
    if (!isVisible || disabled || !canUseDOM) {
      return undefined;
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [canUseDOM, content, disabled, isVisible, updatePosition]);

  const showTooltip = () => {
    setCoordinates(null);
    setIsVisible(true);
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  const tooltipContent = !disabled && isVisible && canUseDOM
    ? createPortal(
      <span
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none z-[180] max-w-[min(20rem,calc(100vw-1rem))] whitespace-normal break-words rounded-md border border-ui-border bg-ui-surface px-2 py-1 text-xs font-semibold text-ui-text opacity-100 shadow-lg shadow-ui-text/10 transition-opacity delay-150 duration-150 [overflow-wrap:anywhere]"
        style={{
          position: 'fixed',
          top: coordinates?.top ?? 0,
          left: coordinates?.left ?? 0,
          visibility: coordinates ? 'visible' : 'hidden'
        }}
      >
        {content}
      </span>,
      document.body
    )
    : null;

  return (
    <span
      ref={triggerRef}
      className={twMerge(clsx('inline-flex', className))}
      onBlur={disabled ? undefined : hideTooltip}
      onFocus={disabled ? undefined : showTooltip}
      onMouseEnter={disabled ? undefined : showTooltip}
      onMouseLeave={disabled ? undefined : hideTooltip}
    >
      {childWithDescription}
      {tooltipContent}
    </span>
  );
};
