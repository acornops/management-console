import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DialogFrame } from '@acornops/ui';

import { McpCredentialDialog } from '@/features/catalog/McpCredentialDialog';
import { McpOAuthDialog } from '@/features/catalog/McpOAuthDialog';
import { useMcpConnections } from '@/features/catalog/useMcpConnections';
import {
  mcpOAuthVerificationMessages,
  useMcpOAuthReturnFeedback
} from '@/features/catalog/useMcpOAuthReturnFeedback';
import { mcpConnectionApi } from '@/services/control-plane/mcpConnectionApi';
import type { WorkflowMcpRequirementPreview } from '@/services/control-plane/workflowApi';

export type WorkflowMcpOAuthFeedback = {
  tone: 'success' | 'warning' | 'danger';
  message: string;
} | null;

export function workflowMcpCredentialMode(
  requirement: WorkflowMcpRequirementPreview
): 'connect' | 'replace' {
  return requirement.connectionState === 'connection_error' ? 'replace' : 'connect';
}

export function findWorkflowMcpOAuthRequirement(
  requirements: WorkflowMcpRequirementPreview[],
  callbackServerId: string | null
): WorkflowMcpRequirementPreview | null {
  return callbackServerId
    ? requirements.find((requirement) => requirement.serverId === callbackServerId) || null
    : null;
}

export function workflowMcpOAuthCallbackMatchesRequirement(
  callbackServerId: string | null,
  requirement: WorkflowMcpRequirementPreview | null
): boolean {
  return Boolean(callbackServerId && requirement?.serverId === callbackServerId);
}

export async function refreshWorkflowMcpOAuth(options: {
  requirements: WorkflowMcpRequirementPreview[];
  callbackServerId: string | null;
  reloadConnection: (requirement: WorkflowMcpRequirementPreview) => Promise<unknown>;
  reloadReadiness: () => void | Promise<void>;
  onRefreshError: (error: unknown) => void;
}): Promise<void> {
  const requirement = findWorkflowMcpOAuthRequirement(
    options.requirements,
    options.callbackServerId
  );
  let refreshError: unknown = null;
  if (requirement) {
    try {
      await options.reloadConnection(requirement);
    } catch (error) {
      refreshError = error;
    }
  }
  try {
    await options.reloadReadiness();
  } catch (error) {
    refreshError ??= error;
  }
  if (refreshError) options.onRefreshError(refreshError);
}

export function useWorkflowMcpOAuthFeedback(options: {
  workspaceId: string;
  requirements: WorkflowMcpRequirementPreview[];
  openRequirement: WorkflowMcpRequirementPreview | null;
  closeOpenRequirement: () => void;
  reloadReadiness: () => void | Promise<void>;
}): { feedback: WorkflowMcpOAuthFeedback; returnPath: string } {
  const { t } = useTranslation();
  const [feedback, setFeedback] = React.useState<WorkflowMcpOAuthFeedback>(null);
  const requirements = React.useMemo(() => {
    if (!options.openRequirement) return options.requirements;
    return options.requirements.some((item) => item.serverId === options.openRequirement?.serverId)
      ? options.requirements
      : [...options.requirements, options.openRequirement];
  }, [options.openRequirement, options.requirements]);
  const refresh = React.useCallback((callbackServerId: string | null) => refreshWorkflowMcpOAuth({
    requirements,
    callbackServerId,
    reloadConnection: (requirement) => mcpConnectionApi.getAgentMcpConnection(
      options.workspaceId,
      requirement.owningAgent.id,
      requirement.serverId
    ),
    reloadReadiness: options.reloadReadiness,
    onRefreshError: () => setFeedback({
      tone: 'warning',
      message: t('mcpServers.workflowOAuthRefreshFailed')
    })
  }), [options.reloadReadiness, options.workspaceId, requirements, t]);
  const returnPath = useMcpOAuthReturnFeedback({
    result: null,
    serverId: null,
    successMessage: t('mcpServers.oauthConnected'),
    failureMessage: t('mcpServers.oauthAuthorizationFailed'),
    verificationMessages: mcpOAuthVerificationMessages(t),
    setNotice: (message) => {
      if (message) setFeedback({ tone: 'success', message });
    },
    setError: (message, callbackServerId) => {
      if (!message) return;
      setFeedback({ tone: 'danger', message });
      if (workflowMcpOAuthCallbackMatchesRequirement(callbackServerId, options.openRequirement)) {
        options.closeOpenRequirement();
      }
    },
    onConnected: (callbackServerId) => {
      if (workflowMcpOAuthCallbackMatchesRequirement(callbackServerId, options.openRequirement)) {
        options.closeOpenRequirement();
      }
      return refresh(callbackServerId);
    },
    onVerificationFailed: refresh
  });
  return { feedback, returnPath };
}

export const WorkflowMcpOAuthResultBridge: React.FC = () => {
  const { t } = useTranslation();
  const urlSearch = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
  useMcpOAuthReturnFeedback({
    result: urlSearch.get('mcpOAuthResult'),
    serverId: urlSearch.get('mcpOAuthServerId'),
    successMessage: t('mcpServers.oauthConnected'),
    failureMessage: t('mcpServers.oauthAuthorizationFailed'),
    verificationMessages: mcpOAuthVerificationMessages(t),
    setNotice: () => undefined,
    setError: () => undefined
  });
  return null;
};

export const WorkflowMcpCredentialDialog: React.FC<{
  workspaceId: string;
  requirement: WorkflowMcpRequirementPreview;
  oauthReturnPath?: string;
  onClose: () => void;
  onConnected: () => void;
}> = ({ workspaceId, requirement, oauthReturnPath, onClose, onConnected }) => {
  const { t } = useTranslation();
  const installation = React.useMemo(
    () => ({
      id: requirement.serverId,
      credentialMode: requirement.authRequirement.scope,
      authType: requirement.authType
    }),
    [requirement.authRequirement.scope, requirement.authType, requirement.serverId]
  );
  const installations = React.useMemo(() => [installation], [installation]);
  const resolvedOAuthReturnPath = React.useMemo(() => {
    if (oauthReturnPath || typeof window === 'undefined') return oauthReturnPath || '/';
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.delete('mcpOAuthResult');
    returnUrl.searchParams.delete('mcpOAuthServerId');
    return `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;
  }, [oauthReturnPath]);
  const titleId = React.useId();
  const {
    connections,
    loadingByServerId,
    connect,
    prepareOAuth,
    startOAuth,
    retryAfterSecondsFor
  } = useMcpConnections({
    workspaceId,
    destination: { kind: 'agent', id: requirement.owningAgent.id },
    installations
  });
  const connection = connections[requirement.serverId];
  if (loadingByServerId[requirement.serverId] || !connection) {
    return (
      <DialogFrame unframed titleId={titleId} onClose={onClose} className="w-full max-w-md rounded-lg border border-ui-border bg-ui-surface p-6 shadow-2xl">
        <h2 id={titleId} className="type-section-title">
          {t('mcpServers.loadingCredentialStatus')}
        </h2>
      </DialogFrame>
    );
  }
  if (!connection.canManage) {
    return (
      <DialogFrame unframed titleId={titleId} onClose={onClose} className="w-full max-w-md rounded-lg border border-ui-border bg-ui-surface p-6 shadow-2xl">
        <h2 id={titleId} className="type-section-title">
          {t('mcpServers.workspaceCredentialRequired')}
        </h2>
        <p className="type-caption mt-2 text-ui-text-muted">{t('mcpServers.askWorkspaceAdmin')}</p>
        <div className="mt-5 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </DialogFrame>
    );
  }
  if (requirement.authType === 'oauth') {
    return <McpOAuthDialog
      serverName={requirement.serverName}
      returnPath={resolvedOAuthReturnPath}
      mode={connection.status === 'reauthorization_required' ? 'reauthorize' : 'authorize'}
      retryAfterSeconds={retryAfterSecondsFor(requirement.serverId)}
      onClose={onClose}
      onPrepare={(returnPath) => prepareOAuth(installation, returnPath)}
      onStart={(preparationHandle, issuer) => startOAuth(installation, preparationHandle, issuer)}
    />;
  }
  return <McpCredentialDialog
    serverName={requirement.serverName}
    authType={requirement.authType}
    credentialLabel={requirement.authRequirement.credentialLabel}
    credentialMode={requirement.authRequirement.scope}
    mode={workflowMcpCredentialMode(requirement)}
    retryAfterSeconds={retryAfterSecondsFor(requirement.serverId)}
    onClose={onClose}
    onSubmit={async (credential) => {
      const next = await connect(installation, credential);
      if (next?.status === 'connected') {
        onClose();
        onConnected();
      }
    }}
  />;
};
