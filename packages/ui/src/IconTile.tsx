import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type IconTileTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'metric';
export type IconTileSize = 'xs' | 'sm' | 'md' | 'lg';

const toneClasses: Record<IconTileTone, string> = {
  neutral: 'bg-ui-text/[0.06] text-ui-text-muted',
  accent: 'bg-ui-text/[0.06] text-accent-strong',
  success: 'bg-status-success-soft text-status-success-text',
  warning: 'bg-status-warning-soft text-status-warning-text',
  danger: 'bg-status-danger-soft text-status-danger-text',
  metric: 'bg-metric-blue/10 text-metric-blue'
};

const sizeClasses: Record<IconTileSize, string> = {
  xs: 'h-8 w-8 rounded-md [&_svg]:h-4 [&_svg]:w-4',
  sm: 'h-9 w-9 rounded-md [&_svg]:h-4 [&_svg]:w-4',
  md: 'h-10 w-10 rounded-md [&_svg]:h-4 [&_svg]:w-4',
  lg: 'h-12 w-12 rounded-lg [&_svg]:h-5 [&_svg]:w-5'
};

export interface IconTileProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: IconTileSize;
  tone?: IconTileTone;
}

/** Flat, non-interactive context glyph. Use Button for icon actions. */
export const IconTile = React.forwardRef<HTMLSpanElement, IconTileProps>(({
  className,
  size = 'md',
  tone = 'neutral',
  ...props
}, ref) => (
  <span
    ref={ref}
    aria-hidden={props['aria-hidden'] ?? true}
    data-icon-tile="true"
    data-icon-tile-size={size}
    data-icon-tile-tone={tone}
    {...props}
    className={twMerge(clsx(
      'inline-flex shrink-0 items-center justify-center',
      sizeClasses[size],
      toneClasses[tone],
      className
    ))}
  />
));

IconTile.displayName = 'IconTile';
