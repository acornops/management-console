import { useCallback, useEffect, useRef } from 'react';
import type { MouseEventHandler, MutableRefObject } from 'react';

const THEME_REVEAL_CLASS = 'theme-reveal-ripple';
// Failsafe far beyond the ~420ms reveal: if `animationend` never fires (e.g. the
// tab is backgrounded mid-reveal) the overlay still tears itself down instead of
// staying pinned over the app.
const THEME_REVEAL_FAILSAFE_MS = 1500;

export interface ThemeRevealGeometry {
  originX: number;
  originY: number;
  radius: number;
}

export interface ActiveThemeReveal {
  overlay: HTMLElement;
  dispose: () => void;
}

export function getThemeRevealGeometry(
  bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  viewport: { width: number; height: number }
): ThemeRevealGeometry {
  const originX = bounds.left + bounds.width / 2;
  const originY = bounds.top + bounds.height / 2;

  return {
    originX,
    originY,
    radius: Math.hypot(
      Math.max(originX, viewport.width - originX),
      Math.max(originY, viewport.height - originY)
    )
  };
}

/**
 * Toggles the theme and plays one decorative reveal. The theme flips in place
 * immediately, so the live DOM — including the login illustration's animation
 * clock — never pauses or gets snapshotted; the circular ripple is a purely
 * decorative, non-occluding overlay layered on top. Kept separate from the hook
 * so geometry, the reduced-motion path, and cleanup stay testable.
 */
export function startThemeTransition({
  button,
  onToggleTheme,
  activeReveal
}: {
  button: HTMLButtonElement;
  onToggleTheme: () => void;
  activeReveal: MutableRefObject<ActiveThemeReveal | null>;
}): HTMLElement | null {
  // Tear down any in-flight reveal first so rapid toggles never stack overlays.
  if (activeReveal.current) {
    activeReveal.current.dispose();
    activeReveal.current = null;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Recolour in place. No View Transition snapshot, so nothing on screen freezes.
  onToggleTheme();

  // Under reduced motion the flip is the whole interaction — no decorative reveal.
  if (prefersReducedMotion) {
    return null;
  }

  const { originX, originY, radius } = getThemeRevealGeometry(button.getBoundingClientRect(), {
    width: window.innerWidth,
    height: window.innerHeight
  });

  const overlay = document.createElement('div');
  overlay.className = THEME_REVEAL_CLASS;
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.setProperty('--theme-reveal-x', `${originX}px`);
  overlay.style.setProperty('--theme-reveal-y', `${originY}px`);
  overlay.style.setProperty('--theme-reveal-radius', `${radius}px`);

  let failsafe: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (failsafe !== undefined) clearTimeout(failsafe);
    overlay.removeEventListener('animationend', dispose);
    overlay.remove();
    if (activeReveal.current?.overlay === overlay) {
      activeReveal.current = null;
    }
  };

  overlay.addEventListener('animationend', dispose);
  failsafe = setTimeout(dispose, THEME_REVEAL_FAILSAFE_MS);
  document.body.appendChild(overlay);
  activeReveal.current = { overlay, dispose };

  return overlay;
}

export function useThemeTransition(onToggleTheme: () => void): MouseEventHandler<HTMLButtonElement> {
  const activeReveal = useRef<ActiveThemeReveal | null>(null);

  useEffect(() => () => {
    activeReveal.current?.dispose();
    activeReveal.current = null;
  }, []);

  return useCallback((event) => {
    startThemeTransition({
      button: event.currentTarget,
      onToggleTheme,
      activeReveal
    });
  }, [onToggleTheme]);
}
