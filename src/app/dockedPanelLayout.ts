import React from 'react';

export const appDockRootId = 'app-dock-root';
export const dockedPanelMediaQuery = '(min-width: 1280px)';
export const dockedPanelMinimumWidth = 380;
export const desktopSidebarWidth = 256;
export const minimumMainContentWidth = 560;
export const dockedPanelMotion = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
} as const;
export const dockedResourceCardLayoutTransition = {
  duration: 0.3,
  ease: [0.16, 1, 0.3, 1]
} as const;

export function getDockedPanelMaximumWidth(viewportWidth: number): number {
  return Math.max(
    dockedPanelMinimumWidth,
    Math.min(
      Math.floor(viewportWidth * 0.55),
      viewportWidth - desktopSidebarWidth - minimumMainContentWidth
    )
  );
}

export function getSidePanelMaximumWidth(viewportWidth: number, isDocked: boolean): number {
  return isDocked
    ? getDockedPanelMaximumWidth(viewportWidth)
    : Math.floor(viewportWidth * 0.82);
}

export function useDockedPanelLayout(): boolean {
  const [isDocked, setIsDocked] = React.useState(() =>
    typeof window !== 'undefined' && window.matchMedia(dockedPanelMediaQuery).matches
  );

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(dockedPanelMediaQuery);
    const handleChange = (event: MediaQueryListEvent) => setIsDocked(event.matches);
    setIsDocked(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDocked;
}
