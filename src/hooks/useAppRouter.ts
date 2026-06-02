import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppRoute, parseAppRoute } from '@/utils/routes';

function normalizeBasePath(baseUrl: string): string {
  if (!baseUrl || baseUrl === '/') return '/';
  const normalized = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function stripBasePath(pathname: string, basePath: string): string {
  if (basePath === '/') return pathname || '/';
  if (!pathname.startsWith(basePath)) return pathname || '/';
  const stripped = pathname.slice(basePath.length);
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

function attachBasePath(path: string, basePath: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (basePath === '/') return normalizedPath;
  return `${basePath}${normalizedPath}`;
}

function getCurrentAppPath(basePath: string): string {
  if (window.location.hash.startsWith('#/')) {
    return window.location.hash.slice(1) || '/';
  }
  const raw = stripBasePath(window.location.pathname, basePath) || '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export interface NavigateOptions {
  replace?: boolean;
}

/**
 * Lightweight browser-history router for environments where we avoid external routing deps.
 */
export function useAppRouter(): {
  appPath: string;
  route: AppRoute;
  navigate: (path: string, options?: NavigateOptions) => void;
} {
  const basePath = normalizeBasePath(import.meta.env.BASE_URL || '/');
  const [appPath, setAppPath] = useState<string>(() => getCurrentAppPath(basePath));

  useEffect(() => {
    const handlePopstate = () => {
      setAppPath(getCurrentAppPath(basePath));
    };

    window.addEventListener('popstate', handlePopstate);
    window.addEventListener('hashchange', handlePopstate);
    return () => {
      window.removeEventListener('popstate', handlePopstate);
      window.removeEventListener('hashchange', handlePopstate);
    };
  }, [basePath]);

  const navigate = useCallback(
    (path: string, options?: NavigateOptions) => {
      const targetPath = path.startsWith('/') ? path : `/${path}`;
      const targetUrl = attachBasePath(targetPath, basePath);
      if (options?.replace) {
        window.history.replaceState({}, '', targetUrl);
      } else {
        window.history.pushState({}, '', targetUrl);
      }
      setAppPath(targetPath);
    },
    [basePath]
  );

  const route = useMemo(() => parseAppRoute(appPath), [appPath]);

  return {
    appPath,
    route,
    navigate
  };
}
