import React from 'react';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/common/Button';
import { CollectionState } from '@/components/common/CollectionState';
import { EmptyState } from '@/components/common/EmptyState';
import { Select } from '@/components/common/Select';
import {
  catalogApi,
  type CatalogSource,
  type CatalogSourceMutationInput
} from '@/services/control-plane/catalogApi';
import { resourcePhaseForRequest, type CursorCollectionPhase } from '@/hooks/resourceLifecycle';

interface WorkspaceCatalogSourcesProps {
  workspaceId: string;
  canManage: boolean;
}

const emptyCapabilities = {
  workspaceManagedSourcesEnabled: false,
  supportedNetworkRoutes: ['direct'] as ['direct']
};

export const WorkspaceCatalogSources: React.FC<WorkspaceCatalogSourcesProps> = ({
  workspaceId,
  canManage
}) => {
  const { t } = useTranslation();
  const [sources, setSources] = React.useState<CatalogSource[]>([]);
  const sourcesRef = React.useRef<CatalogSource[]>([]);
  const [capabilities, setCapabilities] = React.useState(emptyCapabilities);
  const [phase, setPhase] = React.useState<CursorCollectionPhase>('loading');
  const [busy, setBusy] = React.useState('');
  const [error, setError] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);
  const [editingSourceId, setEditingSourceId] = React.useState<string>();
  const [displayName, setDisplayName] = React.useState('');
  const [baseUrl, setBaseUrl] = React.useState('');
  const [authType, setAuthType] = React.useState<'none' | 'bearer_token' | 'custom_header'>('none');
  const [credential, setCredential] = React.useState('');
  const [headerName, setHeaderName] = React.useState('');

  const load = React.useCallback(async () => {
    setPhase(resourcePhaseForRequest(sourcesRef.current.length > 0));
    setError('');
    try {
      const response = await catalogApi.listCatalogSources(workspaceId);
      sourcesRef.current = response.items;
      setSources(response.items);
      setCapabilities(response.capabilities);
      setPhase('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('catalogSources.loadFailed'));
      setPhase('error');
    }
  }, [t, workspaceId]);

  React.useEffect(() => void load(), [load]);

  const resetForm = () => {
    setShowForm(false);
    setEditingSourceId(undefined);
    setDisplayName('');
    setBaseUrl('');
    setAuthType('none');
    setCredential('');
    setHeaderName('');
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (source: CatalogSource) => {
    setEditingSourceId(source.id);
    setDisplayName(source.displayName);
    setBaseUrl(source.baseUrl);
    setAuthType(source.authType);
    setCredential('');
    setHeaderName(source.authHeaderName || '');
    setShowForm(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const existing = sources.find((source) => source.id === editingSourceId);
    const authIsUnchanged = Boolean(
      existing
      && existing.authType === authType
      && (authType !== 'custom_header' || (existing.authHeaderName || '') === headerName.trim())
      && !credential
    );
    const auth: CatalogSourceMutationInput['auth'] = authIsUnchanged
      ? undefined
      : authType === 'none'
        ? { type: 'none' }
        : { type: authType, credential, headerName: authType === 'custom_header' ? headerName.trim() : undefined };
    setBusy(editingSourceId ? `edit:${editingSourceId}` : 'create');
    setError('');
    try {
      if (editingSourceId) {
        await catalogApi.updateCatalogSource(workspaceId, editingSourceId, {
          displayName: displayName.trim(),
          baseUrl: baseUrl.trim(),
          networkRoute: 'direct',
          auth
        });
      } else {
        await catalogApi.createCatalogSource(workspaceId, {
          displayName: displayName.trim(),
          baseUrl: baseUrl.trim(),
          networkRoute: 'direct',
          auth
        });
      }
      resetForm();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('catalogSources.saveFailed'));
    } finally {
      setBusy('');
    }
  };

  const mutate = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError('');
    try {
      await action();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('catalogSources.mutationFailed'));
    } finally {
      setBusy('');
    }
  };

  const canAddWorkspaceSource = canManage && capabilities.workspaceManagedSourcesEnabled;
  const editingSource = sources.find((source) => source.id === editingSourceId);
  const credentialRequired = authType !== 'none' && Boolean(
    !editingSource
    || editingSource.authType !== authType
    || (authType === 'custom_header' && (editingSource.authHeaderName || '') !== headerName.trim())
  );

  return (
    <section id="mcp-registries" aria-labelledby="mcp-registries-title" className="mb-10 scroll-mt-6">
      <div className="mb-6 flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="mcp-registries-title" className="mb-1 text-xl font-bold tracking-tight text-ui-text">{t('catalogSources.title')}</h2>
          <p className="max-w-3xl text-sm leading-6 text-ui-text-muted">{t('catalogSources.description')}</p>
        </div>
        {canAddWorkspaceSource && (
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0 whitespace-nowrap"
            onClick={showForm ? resetForm : openCreate}
          >
            {!showForm && <Plus className="h-4 w-4" aria-hidden="true" />}
            {showForm ? t('common.cancel') : t('catalogSources.add')}
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">
        {error && phase !== 'error' && <div role="alert" className="border-b border-status-danger/25 bg-status-danger-soft px-5 py-3 text-sm text-status-danger-text">{error}</div>}
        {canManage && !capabilities.workspaceManagedSourcesEnabled && (
          <p className="border-b border-ui-border p-4 text-sm text-ui-text-muted">{t('catalogSources.policyDisabled')}</p>
        )}
        {showForm && canAddWorkspaceSource && (
          <form onSubmit={(event) => void save(event)} className="grid gap-4 border-b border-ui-border bg-ui-bg/40 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h3 className="type-panel-title">{editingSourceId ? t('catalogSources.editTitle') : t('catalogSources.addTitle')}</h3>
              <p className="type-caption mt-1 text-ui-text-muted">{t('catalogSources.probeHelp')}</p>
            </div>
            <label className="grid gap-1.5 text-sm font-semibold text-ui-text">
              {t('catalogSources.name')}
              <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="min-h-11 rounded-md border border-ui-border bg-ui-surface px-3 text-ui-text focus-visible:ring-2 focus-visible:ring-accent" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ui-text">
              {t('catalogSources.baseUrl')}
              <input required type="url" pattern="https://.*" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://registry.example.com" className="min-h-11 rounded-md border border-ui-border bg-ui-surface px-3 text-ui-text focus-visible:ring-2 focus-visible:ring-accent" />
              <span className="type-caption font-normal text-ui-text-muted">{t('catalogSources.baseUrlHelp')}</span>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ui-text">
              {t('catalogSources.route')}
              <Select<'direct'> value="direct" disabled onChange={() => undefined} options={[{ value: 'direct', label: t('catalogSources.direct') }]} ariaLabel={t('catalogSources.route')} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ui-text">
              {t('catalogSources.auth')}
              <Select<'none' | 'bearer_token' | 'custom_header'> value={authType} onChange={setAuthType} options={[
                { value: 'none', label: t('catalogSources.authNone') },
                { value: 'bearer_token', label: t('catalogSources.authBearer') },
                { value: 'custom_header', label: t('catalogSources.authHeader') }
              ]} ariaLabel={t('catalogSources.auth')} />
            </label>
            {authType !== 'none' && (
              <label className="grid gap-1.5 text-sm font-semibold text-ui-text">
                {t('catalogSources.credential')}
                <input required={credentialRequired} type="password" autoComplete="new-password" value={credential} onChange={(event) => setCredential(event.target.value)} className="min-h-11 rounded-md border border-ui-border bg-ui-surface px-3 text-ui-text focus-visible:ring-2 focus-visible:ring-accent" />
                <span className="text-xs font-normal text-ui-text-muted">{editingSourceId ? t('catalogSources.credentialEditHelp') : t('catalogSources.credentialHelp')}</span>
              </label>
            )}
            {authType === 'custom_header' && (
              <label className="grid gap-1.5 text-sm font-semibold text-ui-text">
                {t('catalogSources.headerName')}
                <input required value={headerName} onChange={(event) => setHeaderName(event.target.value)} className="min-h-11 rounded-md border border-ui-border bg-ui-surface px-3 text-ui-text focus-visible:ring-2 focus-visible:ring-accent" />
              </label>
            )}
            <div className="sm:col-span-2"><Button type="submit" variant="primary" disabled={Boolean(busy) || (credentialRequired && !credential)}>{busy ? t('catalogSources.saving') : editingSourceId ? t('catalogSources.saveAndProbe') : t('catalogSources.addAndProbe')}</Button></div>
          </form>
        )}

        {!canManage && <p className="border-b border-ui-border p-4 text-sm text-ui-text-muted">{t('catalogSources.readOnly')}</p>}
        <CollectionState
          phase={phase}
          itemCount={sources.length}
          loading={<p role="status" className="p-5 text-sm text-ui-text-muted">{t('catalogSources.loading')}</p>}
          empty={<EmptyState embedded headingLevel={3} icon={<RefreshCw />} title={t('catalogSources.emptyTitle')} description={canManage ? t('catalogSources.emptyAdmin') : t('catalogSources.emptyMember')} />}
          error={<div role="alert" className="border-b border-status-danger/25 bg-status-danger-soft px-5 py-3 text-sm text-status-danger-text">{error}</div>}
          feedback={error ? <div role="alert" className="border-t border-status-danger/25 bg-status-danger-soft px-5 py-3 text-sm text-status-danger-text">{error}</div> : <span className="sr-only">{t('catalogSources.loading')}</span>}
        >
          <div className="divide-y divide-ui-border">
            {sources.map((source) => {
              const binding = source.bindings.find((candidate) => candidate.artifactKind === 'mcp_server');
              const workspaceManaged = source.managementMode === 'workspace';
              return (
                <article key={source.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-ui-text">{source.displayName}</h3>
                      <span className="rounded-full border border-ui-border bg-ui-bg px-2 py-0.5 text-[11px] font-semibold text-ui-text-muted">{workspaceManaged ? t('catalogSources.workspaceManaged') : t('catalogSources.deploymentManaged')}</span>
                      <span className={`text-xs font-semibold ${source.enabled ? 'text-status-success-text' : 'text-ui-text-muted'}`}>{source.enabled ? t('catalogSources.enabled') : t('catalogSources.disabled')}</span>
                    </div>
                    <p className="type-code mt-1 break-all text-ui-text-muted">{source.baseUrl}</p>
                    <p className="mt-2 text-xs text-ui-text-muted">{t('catalogSources.status', { status: binding?.syncStatus || 'pending' })} · {t('catalogSources.direct')} · {source.credentialConfigured ? t('catalogSources.credentialSet') : t('catalogSources.noCredential')}</p>
                    {binding?.lastSyncError && <p className="mt-2 text-xs text-status-danger-text">{binding.lastSyncError}</p>}
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" disabled={Boolean(busy) || !source.enabled} onClick={() => void mutate(`sync:${source.id}`, () => catalogApi.synchronizeCatalogSource(workspaceId, source.id))}><RefreshCw className={`h-3.5 w-3.5 ${busy === `sync:${source.id}` ? 'animate-spin' : ''}`} />{t('catalogSources.synchronize')}</Button>
                      {workspaceManaged && <Button size="sm" variant="secondary" disabled={Boolean(busy)} onClick={() => openEdit(source)}><Pencil className="h-3.5 w-3.5" />{t('catalogSources.edit')}</Button>}
                      {workspaceManaged && <Button size="sm" variant="secondary" disabled={Boolean(busy)} onClick={() => void mutate(`toggle:${source.id}`, () => catalogApi.updateCatalogSource(workspaceId, source.id, { enabled: !source.enabled }))}>{source.enabled ? t('catalogSources.disable') : t('catalogSources.enable')}</Button>}
                      {workspaceManaged && <Button size="sm" variant="danger" disabled={Boolean(busy)} onClick={() => window.confirm(t('catalogSources.deleteConfirm', { name: source.displayName })) && void mutate(`delete:${source.id}`, () => catalogApi.deleteCatalogSource(workspaceId, source.id))}><Trash2 className="h-3.5 w-3.5" />{t('catalogSources.delete')}</Button>}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </CollectionState>
      </div>
    </section>
  );
};
