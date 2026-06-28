import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getTooltipCoordinates } from './Tooltip';

const root = resolve(__dirname, '../../..');
const tooltipSource = readFileSync(resolve(root, 'src/components/common/Tooltip.tsx'), 'utf8');

describe('Tooltip clipping behavior', () => {
  it('renders tooltip content through a body portal with fixed viewport positioning', () => {
    expect(tooltipSource).toContain("import { createPortal } from 'react-dom'");
    expect(tooltipSource).toContain('createPortal(');
    expect(tooltipSource).toContain('document.body');
    expect(tooltipSource).toContain('getBoundingClientRect()');
    expect(tooltipSource).toContain('position: \'fixed\'');
  });

  it('keeps the accessibility description on the trigger', () => {
    expect(tooltipSource).toContain("'aria-describedby': describedBy");
  });

  it('allows long tooltip content to wrap within the viewport', () => {
    expect(tooltipSource).toContain('max-w-[min(20rem,calc(100vw-1rem))]');
    expect(tooltipSource).toContain('whitespace-normal');
    expect(tooltipSource).toContain('break-words');
    expect(tooltipSource).toContain('[overflow-wrap:anywhere]');
    expect(tooltipSource).not.toContain('whitespace-nowrap');
  });
});

describe('getTooltipCoordinates', () => {
  it('keeps the preferred side when it fits in the viewport', () => {
    expect(getTooltipCoordinates({
      side: 'top',
      triggerRect: { top: 80, right: 130, bottom: 110, left: 90, width: 40, height: 30 },
      tooltipSize: { width: 100, height: 32 },
      viewportSize: { width: 320, height: 240 }
    })).toEqual({ side: 'top', top: 40, left: 60 });
  });

  it('flips to the opposite side when the preferred side would overflow', () => {
    expect(getTooltipCoordinates({
      side: 'top',
      triggerRect: { top: 12, right: 130, bottom: 42, left: 90, width: 40, height: 30 },
      tooltipSize: { width: 100, height: 32 },
      viewportSize: { width: 320, height: 240 }
    })).toEqual({ side: 'bottom', top: 50, left: 60 });
  });

  it('clamps coordinates to viewport padding', () => {
    expect(getTooltipCoordinates({
      side: 'right',
      triggerRect: { top: 84, right: 314, bottom: 116, left: 282, width: 32, height: 32 },
      tooltipSize: { width: 120, height: 48 },
      viewportSize: { width: 320, height: 180 }
    })).toEqual({ side: 'left', top: 76, left: 154 });
  });
});
