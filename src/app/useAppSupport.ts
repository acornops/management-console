import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { TFunction } from 'i18next';
import { AppToast } from '@/components/common/ToastViewport';
import { workspaceLandingPath } from '@/app/appNavigationGuards';
import { canManageWorkspaceMembers, canReadWorkspaceData } from '@/app/workspacePermissions';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { ControlPlaneWorkspaceInvitation, controlPlaneApi } from '@/services/controlPlaneApi';
import { EmailVerificationRequiredError } from '@/services/control-plane/authApi';
import { AppRoute, AppPaths } from '@/utils/routes';
import { KubernetesCluster, PasswordAuthResult, User, Workspace, WorkspaceInvitation } from '@/types';

export function parseNamespaceList(value: string): string[] {
  const seen = new Set<string>();
  const namespaces: string[] = [];
  for (const item of value.split(',')) {
    const namespace = item.trim();
    if (!namespace || seen.has(namespace)) continue;
    seen.add(namespace);
    namespaces.push(namespace);
  }
  return namespaces;
}

function attachClusterIds(workspaces: Workspace[], kubernetesClusters: KubernetesCluster[]): Workspace[] {
  const clusterIdsByWorkspace = new Map<string, string[]>();
  for (const cluster of kubernetesClusters) {
    const ids = clusterIdsByWorkspace.get(cluster.workspaceId) || [];
    ids.push(cluster.id);
    clusterIdsByWorkspace.set(cluster.workspaceId, ids);
  }
  return workspaces.map((workspace) => ({
    ...workspace,
    clusterIds: Array.from(new Set([...(workspace.clusterIds || []), ...(clusterIdsByWorkspace.get(workspace.id) || [])])),
    clusterCount: workspace.clusterCount ?? clusterIdsByWorkspace.get(workspace.id)?.length ?? 0
  }));
}

export function useAppSupport(args: {
  bootstrapSession: () => Promise<void>;
  isAccountMenuOpen: boolean;
  isMobileNavOpen: boolean;
  isSidebarWorkspaceMenuOpen: boolean;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  route: AppRoute;
  sidebarAccountMenuRef: RefObject<HTMLDivElement | null>;
  sidebarWorkspaceMenuRef: RefObject<HTMLDivElement | null>;
  t: TFunction;
  workspaces: Workspace[];
  setKubernetesClusters: Dispatch<SetStateAction<KubernetesCluster[]>>;
  setIsAccountMenuOpen: Dispatch<SetStateAction<boolean>>;
  setIsAuthLoading: Dispatch<SetStateAction<boolean>>;
  setIsMobileNavOpen: Dispatch<SetStateAction<boolean>>;
  setIsSidebarWorkspaceMenuOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedWorkspaceId: Dispatch<SetStateAction<string | null>>;
  setTheme: Dispatch<SetStateAction<'light' | 'dark'>>;
  setUser: Dispatch<SetStateAction<User | null>>;
  setWorkspaces: Dispatch<SetStateAction<Workspace[]>>;
}): {
  dismissToast: (id: string) => void;
  handleLogin: () => Promise<void>;
  handlePasswordLogin: (identifier: string, password: string) => Promise<PasswordAuthResult>;
  handlePasswordSignup: (input: { email: string; username: string; password: string; displayName?: string }) => Promise<PasswordAuthResult>;
  handleVerifyEmail: (token: string) => Promise<void>;
  handleResendVerification: (email: string) => Promise<{ resendAfterSeconds?: number }>;
  handleRequestPasswordReset: (email: string) => Promise<{ resendAfterSeconds?: number }>;
  handleResetPassword: (token: string, password: string) => Promise<void>;
  loadWorkspaceInvitation: (token: string) => ReturnType<typeof controlPlaneApi.getWorkspaceInvitation>;
  acceptWorkspaceInvitation: (token: string) => Promise<void>;
  refreshWorkspaceInvitations: (workspaceId: string) => Promise<void>;
  refreshWorkspaceMembers: (workspaceId: string) => Promise<void>;
  showToast: (message: string) => void;
  toWorkspaceInvitation: (invitation: ControlPlaneWorkspaceInvitation) => WorkspaceInvitation;
  toasts: AppToast[];
  toggleTheme: () => void;
  updateKubernetesCluster: (clusterId: string, updates: Partial<KubernetesCluster>) => void;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
} {
  const {
    bootstrapSession,
    isAccountMenuOpen,
    isMobileNavOpen,
    isSidebarWorkspaceMenuOpen,
    navigate,
    route,
    sidebarAccountMenuRef,
    sidebarWorkspaceMenuRef,
    t,
    workspaces,
    setKubernetesClusters,
    setIsAccountMenuOpen,
    setIsAuthLoading,
    setIsMobileNavOpen,
    setIsSidebarWorkspaceMenuOpen,
    setSelectedWorkspaceId,
    setTheme,
    setUser,
    setWorkspaces
  } = args;
  const [toasts, setToasts] = useState<AppToast[]>([]);

  useEffect(() => {
    if (!isAccountMenuOpen && !isSidebarWorkspaceMenuOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!sidebarAccountMenuRef.current?.contains(target)) {
        setIsAccountMenuOpen(false);
      }
      if (sidebarWorkspaceMenuRef.current && !sidebarWorkspaceMenuRef.current.contains(target)) {
        setIsSidebarWorkspaceMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
        setIsSidebarWorkspaceMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [
    isAccountMenuOpen,
    isSidebarWorkspaceMenuOpen,
    setIsAccountMenuOpen,
    setIsSidebarWorkspaceMenuOpen,
    sidebarAccountMenuRef,
    sidebarWorkspaceMenuRef
  ]);

  useEffect(() => {
    if (!isMobileNavOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileNavOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileNavOpen, setIsMobileNavOpen]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const showToast = (message: string) => {
    const id = globalThis.crypto?.randomUUID?.() || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3800);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const updateKubernetesCluster = (clusterId: string, updates: Partial<KubernetesCluster>) => {
    setKubernetesClusters((prev) => prev.map((cluster) => (cluster.id === clusterId ? { ...cluster, ...updates } : cluster)));
  };

  const updateWorkspace = (workspaceId: string, updates: Partial<Workspace>) => {
    setWorkspaces((prev) => prev.map((workspace) => (workspace.id === workspaceId ? { ...workspace, ...updates } : workspace)));
  };

  const refreshWorkspaceMembers = async (workspaceId: string) => {
    const [members, workspaceSummary] = await Promise.all([
      controlPlaneApi.getWorkspaceMembers(workspaceId),
      controlPlaneApi.getWorkspace(workspaceId)
    ]);
    const { clusterIds: _clusterIds, ...summaryUpdates } = workspaceSummary;
    updateWorkspace(workspaceId, { ...summaryUpdates, members });
  };

  const toWorkspaceInvitation = (invitation: ControlPlaneWorkspaceInvitation): WorkspaceInvitation => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    roleTemplate: invitation.roleTemplate,
    status: invitation.status,
    invitedBy: invitation.invitedBy,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    revokedAt: invitation.revokedAt,
    inviteLink: invitation.token ? AppPaths.workspaceInvitationShareUrl(invitation.token) : undefined
  });

  const refreshWorkspaceInvitations = async (workspaceId: string) => {
    const invitations = await controlPlaneApi.listWorkspaceInvitations(workspaceId);
    updateWorkspace(workspaceId, { invitations: invitations.map(toWorkspaceInvitation) });
  };

  useEffect(() => {
    if (route.kind !== 'workspaceMembers') {
      return;
    }
    const workspace = workspaces.find((item) => item.id === route.workspaceId);
    if (!canManageWorkspaceMembers(workspace)) {
      return;
    }
    void refreshWorkspaceInvitations(route.workspaceId).catch((error) => {
      console.error('Failed loading workspace invitations', error);
    });
  }, [route.kind, 'workspaceId' in route ? route.workspaceId : undefined, workspaces]);

  const loadWorkspaceInvitation = useCallback((token: string) => {
    return controlPlaneApi.getWorkspaceInvitation(token);
  }, []);

  const acceptWorkspaceInvitation = useCallback(async (token: string) => {
    const result = await controlPlaneApi.acceptWorkspaceInvitation(token);
    const currentUser = await controlPlaneApi.getCurrentUser();
    let fetchedWorkspaces = await controlPlaneApi.getWorkspaces(currentUser);
    if (!fetchedWorkspaces.some((workspace) => workspace.id === result.workspaceId)) {
      const acceptedWorkspace = await controlPlaneApi.getWorkspace(result.workspaceId, currentUser);
      fetchedWorkspaces = [acceptedWorkspace, ...fetchedWorkspaces];
    }
    const acceptedWorkspace = fetchedWorkspaces.find((workspace) => workspace.id === result.workspaceId);
    const fetchedClusters = canReadWorkspaceData(acceptedWorkspace)
      ? await controlPlaneApi.getClustersForWorkspace(result.workspaceId)
      : [];

    setUser(currentUser);
    setKubernetesClusters(fetchedClusters);
    setWorkspaces(attachClusterIds(fetchedWorkspaces, fetchedClusters));
    setSelectedWorkspaceId(result.workspaceId);
    navigate(acceptedWorkspace ? workspaceLandingPath(acceptedWorkspace) : AppPaths.workspaceSettings(result.workspaceId), { replace: true });
    showToast(t('app.invitationAccepted'));
  }, [navigate, setKubernetesClusters, setSelectedWorkspaceId, setUser, setWorkspaces, t]);

  const handleLogin = async () => {
    setIsAuthLoading(true);
    try {
      await controlPlaneApi.initiateLogin(window.location.href, {
        externalIntegrationLinkToken: route.kind === 'externalIntegrationLink' ? route.token : undefined
      });
    } catch (err) {
      console.error('Login failed', err);
      showToast(formatControlPlaneError(err, 'Login failed.', { area: 'auth' }));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handlePasswordLogin = async (identifier: string, password: string) => {
    setIsAuthLoading(true);
    try {
      await controlPlaneApi.loginWithPassword(identifier, password);
      await bootstrapSession();
      return { status: 'signed_in' as const };
    } catch (error) {
      if (error instanceof EmailVerificationRequiredError) {
        return {
          status: 'verification_required' as const,
          email: error.email,
          resendAfterSeconds: error.resendAfterSeconds
        };
      }
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handlePasswordSignup = async (input: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) => {
    setIsAuthLoading(true);
    try {
      const result = await controlPlaneApi.signupWithPassword(input);
      if (result.status === 'verification_required') {
        return result;
      }
      await bootstrapSession();
      return { status: 'signed_in' as const };
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleVerifyEmail = async (token: string) => {
    setIsAuthLoading(true);
    try {
      await controlPlaneApi.verifyPasswordEmail(token);
      await bootstrapSession();
      navigate(AppPaths.workspaces(), { replace: true });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleResendVerification = async (email: string) => {
    setIsAuthLoading(true);
    try {
      const result = await controlPlaneApi.resendPasswordVerification(email);
      return { resendAfterSeconds: result.resendAfterSeconds };
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRequestPasswordReset = async (email: string) => {
    setIsAuthLoading(true);
    try {
      const result = await controlPlaneApi.requestPasswordReset(email);
      return { resendAfterSeconds: result.resendAfterSeconds };
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleResetPassword = async (token: string, password: string) => {
    setIsAuthLoading(true);
    try {
      await controlPlaneApi.resetPassword(token, password);
    } finally {
      setIsAuthLoading(false);
    }
  };

  return {
    dismissToast,
    handleLogin,
    handlePasswordLogin,
    handlePasswordSignup,
    handleVerifyEmail,
    handleResendVerification,
    handleRequestPasswordReset,
    handleResetPassword,
    loadWorkspaceInvitation,
    acceptWorkspaceInvitation,
    refreshWorkspaceInvitations,
    refreshWorkspaceMembers,
    showToast,
    toWorkspaceInvitation,
    toasts,
    toggleTheme,
    updateKubernetesCluster,
    updateWorkspace
  };
}
