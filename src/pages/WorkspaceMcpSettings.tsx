import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { Select } from '@/components/common/Select';
import {
  createWorkflowMcpServer,
  deleteWorkflowMcpServer,
  listWorkflowMcpServers,
  testWorkflowMcpServerConnection,
  updateWorkflowMcpServer,
  updateWorkflowMcpTool,
  type WorkflowMcpServer
} from '@/services/control-plane/workflowApi';

interface WorkspaceMcpSettingsProps {
  workspaceId: string;
  canManage: boolean;
}

export const WorkspaceMcpSettings: React.FC<WorkspaceMcpSettingsProps> = ({ workspaceId, canManage }) => {
  const { t } = useTranslation();
  const [servers, setServers] = React.useState<WorkflowMcpServer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState('');
  const [name, setName] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [authType, setAuthType] = React.useState<WorkflowMcpServer['authType']>('none');
  const [credential, setCredential] = React.useState('');
  const [headerName, setHeaderName] = React.useState('');
  const [rotationCredentials, setRotationCredentials] = React.useState<Record<string, string>>({});

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setServers(await listWorkflowMcpServers(workspaceId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('workspaceMcp.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t, workspaceId]);

  React.useEffect(() => { void reload(); }, [reload]);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError('');
    try {
      await action();
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('workspaceMcp.actionFailed'));
    } finally {
      setBusy('');
    }
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    await run('create', async () => {
      await createWorkflowMcpServer(workspaceId, {
        name,
        url,
        auth: {
          type: authType,
          credential: authType === 'none' ? undefined : credential,
          headerName: authType === 'custom_header' ? headerName : undefined
        }
      });
      setName('');
      setUrl('');
      setCredential('');
      setHeaderName('');
      setAuthType('none');
    });
  };

  return (
    <section aria-labelledby="workspace-mcp-title" className="mb-10">
      <div className="mb-6 px-1">
        <h2 id="workspace-mcp-title" className="mb-1 text-xl font-bold tracking-tight text-ui-text">{t('workspaceMcp.title')}</h2>
        <p className="max-w-3xl text-sm leading-6 text-ui-text-muted">{t('workspaceMcp.description')}</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">
        {error && (
          <div role="alert" className="flex flex-col gap-3 border-b border-status-danger/25 bg-status-danger-soft p-4 text-sm text-status-danger-text sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button type="button" variant="secondary" size="sm" onClick={() => void reload()}>{t('common.retry')}</Button>
          </div>
        )}
        {canManage && (
          <form onSubmit={(event) => void create(event)} className="grid gap-4 border-b border-ui-border p-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ui-text">
              {t('workspaceMcp.name')}
              <input required value={name} onChange={(event) => setName(event.target.value)} className="min-h-11 rounded-md border border-ui-border bg-ui-bg px-3 text-ui-text outline-none focus-visible:ring-2 focus-visible:ring-accent" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ui-text">
              {t('workspaceMcp.url')}
              <input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} className="min-h-11 rounded-md border border-ui-border bg-ui-bg px-3 text-ui-text outline-none focus-visible:ring-2 focus-visible:ring-accent" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ui-text">
              {t('workspaceMcp.auth')}
              <Select<WorkflowMcpServer['authType']> value={authType} onChange={setAuthType} options={[
                { value: 'none', label: t('workspaceMcp.authNone') },
                { value: 'bearer_token', label: t('workspaceMcp.authBearer') },
                { value: 'custom_header', label: t('workspaceMcp.authHeader') }
              ]} ariaLabel={t('workspaceMcp.auth')} />
            </label>
            {authType !== 'none' && (
              <label className="grid gap-1.5 text-sm font-semibold text-ui-text">
                {t('workspaceMcp.credential')}
                <input required type="password" autoComplete="new-password" value={credential} onChange={(event) => setCredential(event.target.value)} className="min-h-11 rounded-md border border-ui-border bg-ui-bg px-3 text-ui-text focus-visible:ring-2 focus-visible:ring-accent" />
                <span className="text-xs font-normal text-ui-text-muted">{t('workspaceMcp.credentialHelp')}</span>
              </label>
            )}
            {authType === 'custom_header' && (
              <label className="grid gap-1.5 text-sm font-semibold text-ui-text">
                {t('workspaceMcp.headerName')}
                <input required value={headerName} onChange={(event) => setHeaderName(event.target.value)} className="min-h-11 rounded-md border border-ui-border bg-ui-bg px-3 text-ui-text focus-visible:ring-2 focus-visible:ring-accent" />
              </label>
            )}
            <div className="sm:col-span-2"><Button type="submit" variant="primary" disabled={busy === 'create'}>{t('workspaceMcp.add')}</Button></div>
          </form>
        )}
        {!canManage && <p className="border-b border-ui-border p-4 text-sm text-ui-text-muted">{t('workspaceMcp.readOnly')}</p>}
        {loading ? (
          <p role="status" className="p-5 text-sm text-ui-text-muted">{t('workspaceMcp.loading')}</p>
        ) : servers.length === 0 ? (
          <p className="p-5 text-sm text-ui-text-muted">{t('workspaceMcp.empty')}</p>
        ) : (
          <div className="divide-y divide-ui-border">
            {servers.map((server) => (
              <article key={server.id} className="min-w-0 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-bold text-ui-text">{server.name}</h3>
                    <p className="break-all text-xs text-ui-text-muted">{server.url}</p>
                    <p className="mt-1 text-xs text-ui-text-muted">{t('workspaceMcp.status', { status: server.status })} · {server.credentialConfigured ? t('workspaceMcp.credentialSet') : t('workspaceMcp.credentialNotSet')}</p>
                    {server.discoveryError && <p className="mt-2 text-xs text-status-danger-text">{server.discoveryError}</p>}
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" size="sm" disabled={Boolean(busy)} onClick={() => void run(`test:${server.id}`, async () => { await testWorkflowMcpServerConnection(workspaceId, server.id); })}>{t('workspaceMcp.test')}</Button>
                      <Button type="button" variant="secondary" size="sm" disabled={Boolean(busy)} onClick={() => void run(`toggle:${server.id}`, async () => { await updateWorkflowMcpServer(workspaceId, server.id, { enabled: !server.enabled }); })}>{server.enabled ? t('workspaceMcp.disable') : t('workspaceMcp.enable')}</Button>
                      <Button type="button" variant="danger" size="sm" disabled={Boolean(busy)} onClick={() => void run(`delete:${server.id}`, async () => { await deleteWorkflowMcpServer(workspaceId, server.id); })}>{t('workspaceMcp.delete')}</Button>
                    </div>
                  )}
                </div>
                <div className="mt-4 grid gap-2">
                  {canManage && server.authType !== 'none' && (
                    <form
                      className="flex flex-col gap-2 rounded-md border border-ui-border bg-ui-bg p-3 sm:flex-row sm:items-end"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const nextCredential = rotationCredentials[server.id] || '';
                        if (!nextCredential) return;
                        void run(`rotate:${server.id}`, async () => {
                          await updateWorkflowMcpServer(workspaceId, server.id, {
                            auth: {
                              type: server.authType,
                              credential: nextCredential,
                              headerName: server.authHeaderName
                            }
                          });
                          setRotationCredentials((current) => ({ ...current, [server.id]: '' }));
                        });
                      }}
                    >
                      <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-semibold text-ui-text">
                        {t('workspaceMcp.rotateCredential')}
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={rotationCredentials[server.id] || ''}
                          onChange={(event) => setRotationCredentials((current) => ({ ...current, [server.id]: event.target.value }))}
                          className="min-h-11 rounded-md border border-ui-border bg-ui-surface px-3 text-ui-text focus-visible:ring-2 focus-visible:ring-accent"
                        />
                      </label>
                      <Button type="submit" variant="secondary" size="sm" disabled={Boolean(busy) || !(rotationCredentials[server.id] || '')}>{t('workspaceMcp.rotate')}</Button>
                    </form>
                  )}
                  {server.tools.length === 0 ? <p className="text-xs text-ui-text-muted">{t('workspaceMcp.noTools')}</p> : server.tools.map((tool) => (
                    <div key={tool.name} className="flex flex-col gap-2 rounded-md border border-ui-border bg-ui-bg p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div><p className="text-sm font-semibold text-ui-text">{tool.title}</p><p className="text-xs text-ui-text-muted">{tool.name}</p></div>
                      <div className="flex items-center gap-3">
                        <Select<'read' | 'write'>
                          value={tool.capability}
                          disabled={!canManage || Boolean(busy)}
                          onChange={(capability) => void run(`tool:${server.id}:${tool.name}`, async () => {
                            await updateWorkflowMcpTool(workspaceId, server.id, tool.name, {
                              enabled: tool.enabled,
                              capability
                            });
                          })}
                          options={[
                            { value: 'read', label: t('workspaceMcp.read') },
                            { value: 'write', label: t('workspaceMcp.write') }
                          ]}
                          size="sm"
                          ariaLabel={t('workspaceMcp.capabilityFor', { name: tool.title })}
                        />
                        <label className="flex min-h-11 items-center gap-2 text-sm text-ui-text">
                          <Checkbox checked={tool.enabled} disabled={!canManage || Boolean(busy)} onChange={(event) => void run(`tool:${server.id}:${tool.name}`, async () => { await updateWorkflowMcpTool(workspaceId, server.id, tool.name, { enabled: event.target.checked, capability: tool.capability }); })} />
                          {t('workspaceMcp.enabled')}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
