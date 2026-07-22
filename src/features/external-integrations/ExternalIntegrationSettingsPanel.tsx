import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { InlineConfirmation } from '@/components/common/InlineConfirmation';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import {
  controlPlaneApi,
  type ControlPlaneExternalIntegrationGrantableWorkspace,
  type ControlPlaneExternalIntegrationLinkSummary,
  type ControlPlaneWorkspaceCapability
} from '@/services/controlPlaneApi';
import {
  buildExternalIntegrationWorkspaceGrants,
  formatExternalIntegrationCapability,
  normalizeExternalIntegrationCapabilities
} from './externalIntegrationGrants';

function draftFromLinks(
  links: ControlPlaneExternalIntegrationLinkSummary[]
): Record<string, Record<string, ControlPlaneWorkspaceCapability[]>> {
  return Object.fromEntries(links.map((link) => [
    link.id,
    Object.fromEntries((link.grantableWorkspaces || []).map((workspace) => [
      workspace.workspaceId,
      normalizeExternalIntegrationCapabilities(workspace.grantedCapabilities, workspace.grantableCapabilities)
    ]))
  ]));
}

interface GrantEditorProps {
  link: ControlPlaneExternalIntegrationLinkSummary;
  draft: Record<string, ControlPlaneWorkspaceCapability[]>;
  isSaving: boolean;
  isUnlinking: boolean;
  pendingUnlink: boolean;
  onToggleWorkspace: (workspace: ControlPlaneExternalIntegrationGrantableWorkspace, enabled: boolean) => void;
  onToggleCapability: (
    workspace: ControlPlaneExternalIntegrationGrantableWorkspace,
    capability: ControlPlaneWorkspaceCapability,
    enabled: boolean
  ) => void;
  onSave: () => void;
  onRequestUnlink: () => void;
  onCancelUnlink: () => void;
  onConfirmUnlink: () => void;
}

const ExternalIntegrationGrantEditor: React.FC<GrantEditorProps> = ({
  link,
  draft,
  isSaving,
  isUnlinking,
  pendingUnlink,
  onToggleWorkspace,
  onToggleCapability,
  onSave,
  onRequestUnlink,
  onCancelUnlink,
  onConfirmUnlink
}) => {
  const { t } = useTranslation();
  const capabilityLabels: Partial<Record<ControlPlaneWorkspaceCapability, string>> = {
    read_workspace_data: t('settings.externalIntegrationsReadWorkspace'),
    create_sessions: t('settings.externalIntegrationsCreateSessions'),
    create_read_only_runs: t('settings.externalIntegrationsCreateReadOnlyRuns'),
    create_read_write_runs: t('settings.externalIntegrationsCreateReadWriteRuns')
  };

  return (
    <div className="border-b border-ui-border p-6 last:border-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-ui-text">{link.clientDisplayName}</p>
          <p className="mt-1 break-words text-xs text-ui-text-muted">
            {link.provider} · {link.externalDisplayName || link.externalUserId}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="sm" disabled={isSaving || isUnlinking} onClick={onSave}>
            {isSaving ? t('settings.externalIntegrationsSaving') : t('settings.externalIntegrationsSave')}
          </Button>
          <Button size="sm" variant="danger" disabled={isSaving || isUnlinking} onClick={onRequestUnlink}>
            {isUnlinking ? t('settings.externalIntegrationsUnlinking') : t('settings.externalIntegrationsUnlink')}
          </Button>
        </div>
      </div>
      {pendingUnlink && (
        <InlineConfirmation
          id={`unlink-external-integration-${link.id}`}
          title={t('settings.externalIntegrationsUnlinkTitle', { name: link.clientDisplayName })}
          description={t('settings.externalIntegrationsUnlinkDescription')}
          tone="danger"
          confirmLabel={t('settings.externalIntegrationsUnlink')}
          confirmVariant="danger"
          confirmDisabled={isUnlinking}
          cancelLabel={t('settings.cancel')}
          onCancel={onCancelUnlink}
          onConfirm={onConfirmUnlink}
          className="mt-4 rounded-lg"
        />
      )}
      <div className="mt-4 grid gap-3">
        {(link.grantableWorkspaces || []).map((workspace) => {
          const selectedCapabilities = draft[workspace.workspaceId] || [];
          const workspaceEnabled = selectedCapabilities.length > 0;
          return (
            <div key={workspace.workspaceId} className="rounded-lg border border-ui-border bg-ui-bg px-4 py-3">
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={workspaceEnabled}
                  onChange={(event) => onToggleWorkspace(workspace, event.target.checked)}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ui-text">{workspace.workspaceName}</span>
                  <span className="block text-xs text-ui-text-muted">{workspace.role}</span>
                </span>
              </label>
              {workspaceEnabled && (
                <div className="mt-3 grid gap-2 pl-6">
                  {workspace.grantableCapabilities.map((capability) => (
                    <label key={capability} className="flex items-center gap-2 text-xs font-medium text-ui-text-muted">
                      <Checkbox
                        checked={selectedCapabilities.includes(capability)}
                        onChange={(event) => onToggleCapability(workspace, capability, event.target.checked)}
                      />
                      {capabilityLabels[capability] || formatExternalIntegrationCapability(capability)}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!link.grantableWorkspaces?.length && (
          <p className="text-sm text-ui-text-muted">{t('settings.externalIntegrationsNoWorkspaces')}</p>
        )}
      </div>
    </div>
  );
};

export const ExternalIntegrationSettingsPanel: React.FC = () => {
  const { t } = useTranslation();
  const [links, setLinks] = React.useState<ControlPlaneExternalIntegrationLinkSummary[] | null>(null);
  const [drafts, setDrafts] = React.useState<Record<string, Record<string, ControlPlaneWorkspaceCapability[]>>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [savingLinkId, setSavingLinkId] = React.useState<string | null>(null);
  const [unlinkingLinkId, setUnlinkingLinkId] = React.useState<string | null>(null);
  const [pendingUnlinkLinkId, setPendingUnlinkLinkId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const nextLinks = await controlPlaneApi.listExternalIntegrationLinks();
      setLinks(nextLinks);
      setDrafts(draftFromLinks(nextLinks));
      setError(null);
    } catch (refreshError) {
      setError(formatControlPlaneError(refreshError, t('settings.externalIntegrationsLoadFailed'), { area: 'auth' }));
    }
  }, [t]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateDraft = (
    link: ControlPlaneExternalIntegrationLinkSummary,
    workspace: ControlPlaneExternalIntegrationGrantableWorkspace,
    capabilities: ControlPlaneWorkspaceCapability[]
  ) => {
    setDrafts((current) => ({
      ...current,
      [link.id]: {
        ...(current[link.id] || {}),
        [workspace.workspaceId]: normalizeExternalIntegrationCapabilities(capabilities, workspace.grantableCapabilities)
      }
    }));
  };

  const save = async (link: ControlPlaneExternalIntegrationLinkSummary) => {
    setSavingLinkId(link.id);
    setError(null);
    setNotice(null);
    try {
      await controlPlaneApi.updateExternalIntegrationLinkGrants(
        link.id,
        buildExternalIntegrationWorkspaceGrants(drafts[link.id] || {})
      );
      await refresh();
      setNotice(t('settings.externalIntegrationsSaved', { name: link.clientDisplayName }));
    } catch (saveError) {
      setError(formatControlPlaneError(saveError, t('settings.externalIntegrationsSaveFailed'), { area: 'auth' }));
    } finally {
      setSavingLinkId(null);
    }
  };

  const unlink = async (link: ControlPlaneExternalIntegrationLinkSummary) => {
    setUnlinkingLinkId(link.id);
    setError(null);
    setNotice(null);
    try {
      await controlPlaneApi.unlinkExternalIntegration(link);
      setPendingUnlinkLinkId(null);
      await refresh();
      setNotice(t('settings.externalIntegrationsUnlinked', { name: link.clientDisplayName }));
    } catch (unlinkError) {
      setError(formatControlPlaneError(unlinkError, t('settings.externalIntegrationsUnlinkFailed', { name: link.clientDisplayName }), { area: 'auth' }));
    } finally {
      setUnlinkingLinkId(null);
    }
  };

  if (links === null && !error) {
    return <div className="p-6 text-sm text-ui-text-muted" role="status">{t('settings.externalIntegrationsLoading')}</div>;
  }

  return (
    <>
      {error && (
        <div className="flex flex-col gap-3 border-b border-ui-border bg-status-danger-soft px-6 py-3 text-sm text-status-danger-text sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>{error}</span>
          <Button size="sm" variant="tertiary" onClick={() => void refresh()}>{t('settings.externalIntegrationsRetry')}</Button>
        </div>
      )}
      {notice && (
        <div className="border-b border-ui-border bg-status-success-soft px-6 py-3 text-sm text-status-success-text" role="status">
          {notice}
        </div>
      )}
      {links?.length ? links.map((link) => (
        <ExternalIntegrationGrantEditor
          key={link.id}
          link={link}
          draft={drafts[link.id] || {}}
          isSaving={savingLinkId === link.id}
          isUnlinking={unlinkingLinkId === link.id}
          pendingUnlink={pendingUnlinkLinkId === link.id}
          onToggleWorkspace={(workspace, enabled) => updateDraft(
            link,
            workspace,
            enabled && workspace.grantableCapabilities.includes('read_workspace_data') ? ['read_workspace_data'] : []
          )}
          onToggleCapability={(workspace, capability, enabled) => {
            const selected = new Set(drafts[link.id]?.[workspace.workspaceId] || []);
            if (enabled) selected.add(capability);
            else selected.delete(capability);
            updateDraft(link, workspace, [...selected]);
          }}
          onSave={() => void save(link)}
          onRequestUnlink={() => setPendingUnlinkLinkId(link.id)}
          onCancelUnlink={() => setPendingUnlinkLinkId(null)}
          onConfirmUnlink={() => void unlink(link)}
        />
      )) : (
        <div className="p-6 text-sm text-ui-text-muted">{t('settings.externalIntegrationsEmpty')}</div>
      )}
    </>
  );
};
