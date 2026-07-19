import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { SessionBootstrapState } from '@/app/useAppBootstrap';
import { clearControlPlaneCsrfState } from '@/services/control-plane/http';
import {
  clearSessionReturnPath,
  consumeSessionReturnPath,
  preserveSessionReturnPath,
  setAuthenticatedSession,
  subscribeToSessionExpiry
} from '@/services/control-plane/sessionLifecycle';
import type { KubernetesCluster, User, Workspace } from '@/types';

export function useAuthenticatedSessionLifecycle(args: {
  navigate: (path: string, options?: { replace?: boolean }) => void;
  user: User | null;
  resetVirtualMachineCache: () => void;
  setKubernetesClusters: Dispatch<SetStateAction<KubernetesCluster[]>>;
  setSessionBootstrapState: (value: SessionBootstrapState) => void;
  setSelectedWorkspaceId: Dispatch<SetStateAction<string | null>>;
  setUser: Dispatch<SetStateAction<User | null>>;
  setWorkspaces: Dispatch<SetStateAction<Workspace[]>>;
  closeNavigation: () => void;
}) {
  const [sessionExpired, setSessionExpired] = useState(false);
  const clearApplicationState = useCallback(() => {
    args.closeNavigation();
    args.setUser(null);
    args.setKubernetesClusters([]);
    args.resetVirtualMachineCache();
    args.setWorkspaces([]);
    args.setSelectedWorkspaceId(null);
  }, [args]);

  useEffect(() => subscribeToSessionExpiry(() => {
    preserveSessionReturnPath(window.location);
    clearControlPlaneCsrfState();
    setSessionExpired(true);
    args.setSessionBootstrapState('anonymous');
    clearApplicationState();
  }), [args.setSessionBootstrapState, clearApplicationState]);

  useEffect(() => {
    setAuthenticatedSession(Boolean(args.user));
    if (!args.user) return;
    setSessionExpired(false);
    const returnPath = consumeSessionReturnPath();
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (returnPath && returnPath !== currentPath) args.navigate(returnPath, { replace: true });
  }, [args.navigate, args.user]);

  const clearSessionForLogout = useCallback(() => {
    setAuthenticatedSession(false);
    clearControlPlaneCsrfState();
    clearSessionReturnPath();
    setSessionExpired(false);
    args.setSessionBootstrapState('anonymous');
    clearApplicationState();
  }, [args.setSessionBootstrapState, clearApplicationState]);

  return { sessionExpired, clearSessionForLogout };
}
