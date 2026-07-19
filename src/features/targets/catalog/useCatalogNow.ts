import React from 'react';

export const CATALOG_RELATIVE_TIME_REFRESH_MS = 60_000;

export function useCatalogNow(): number {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'hidden') return;
      setNow(Date.now());
    };
    const intervalId = window.setInterval(refreshWhenVisible, CATALOG_RELATIVE_TIME_REFRESH_MS);
    window.addEventListener('focus', refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, []);

  return now;
}
