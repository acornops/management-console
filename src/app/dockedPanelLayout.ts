import React from 'react';

export const appDockRootId = 'app-dock-root';
export const dockedPanelMediaQuery = '(min-width: 1280px)';
export const dockedPanelMinimumWidth = 300;
export const resourceCardGridGap = 16;
export const resourceCardMinimumWidth = 432;
export const expandedDesktopSidebarWidth = 256;
export const collapsedDesktopSidebarWidth = 64;
export const minimumMainContentWidth = 560;
export const dockedPanelMotion = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
} as const;

export function getResourceCardPreservingDockWidth(
  dockedGridWidth: number,
  currentDockWidth: number,
  columnGap: number
): number {
  const fullGridWidth = dockedGridWidth + currentDockWidth;
  const availableColumnCount = Math.max(
    1,
    Math.floor((fullGridWidth + columnGap) / (resourceCardMinimumWidth + columnGap))
  );
  const fullCardWidth = (
    fullGridWidth - ((availableColumnCount - 1) * columnGap)
  ) / availableColumnCount;
  return Math.round(fullCardWidth + columnGap);
}

export function getDockedPanelMaximumWidth(
  viewportWidth: number,
  sidebarWidth = expandedDesktopSidebarWidth
): number {
  return Math.max(
    dockedPanelMinimumWidth,
    Math.min(
      Math.floor(viewportWidth * 0.55),
      viewportWidth - sidebarWidth - minimumMainContentWidth
    )
  );
}

export function getSidePanelMaximumWidth(
  viewportWidth: number,
  isDocked: boolean,
  sidebarWidth = expandedDesktopSidebarWidth
): number {
  return isDocked
    ? getDockedPanelMaximumWidth(viewportWidth, sidebarWidth)
    : Math.floor(viewportWidth * 0.82);
}

const DesktopSidebarWidthContext = React.createContext(expandedDesktopSidebarWidth);

export const DesktopSidebarWidthProvider = DesktopSidebarWidthContext.Provider;

export function useDesktopSidebarWidth(): number {
  return React.useContext(DesktopSidebarWidthContext);
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
