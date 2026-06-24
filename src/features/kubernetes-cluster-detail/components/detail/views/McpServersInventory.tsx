import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/common/Select';
import type { SelectOption } from '@/components/common/Select';
import { TargetMcpServerTestConnectionResult } from '@/services/controlPlaneApi';
import { ClusterToolCatalogServer } from '@/types';
import { getMcpServerStatusDisplay, McpServerCard } from '@/features/kubernetes-cluster-detail/components/detail/views/McpServerCard';

interface McpServersInventoryProps {
  servers: ClusterToolCatalogServer[];
  canEditServers: boolean;
  pendingTestServerId: string | null;
  pendingToggleServerId: string | null;
  testResultsByServerId: Record<string, TargetMcpServerTestConnectionResult>;
  onManageTools: (serverId: string) => void;
  onTestConnection: (server: ClusterToolCatalogServer) => void;
  onToggleServer: (server: ClusterToolCatalogServer, enabled: boolean) => void;
  onEdit: (server: ClusterToolCatalogServer) => void;
  onDelete: (server: ClusterToolCatalogServer) => void;
}

export const McpServersInventory: React.FC<McpServersInventoryProps> = ({
  servers,
  canEditServers,
  pendingTestServerId,
  pendingToggleServerId,
  testResultsByServerId,
  onManageTools,
  onTestConnection,
  onToggleServer,
  onEdit,
  onDelete
}) => {
  const { t } = useTranslation();
  const [serverSearch, setServerSearch] = useState('');
  const [serverFilter, setServerFilter] = useState<'all' | 'connected' | 'attention' | 'disabled' | 'unchecked'>('all');
  const serverFilterOptions: Array<SelectOption<typeof serverFilter>> = [
    { value: 'all', label: t('mcpServers.filterAllServers') },
    { value: 'connected', label: t('mcpServers.statusConnected') },
    { value: 'attention', label: t('mcpServers.filterNeedsAttention') },
    { value: 'disabled', label: t('mcpServers.statusDisabled') },
    { value: 'unchecked', label: t('mcpServers.statusNotChecked') }
  ];

  const toolAccessSummary = useMemo(() => {
    const totalTools = servers.reduce((total, server) => total + server.toolCounts.total, 0);
    const enabledTools = servers.reduce((total, server) => total + server.toolCounts.enabledEffective, 0);
    const writeCapableTools = servers.reduce((total, server) => total + server.toolCounts.writeConfigured, 0);
    return {
      totalTools,
      enabledTools,
      readOnlyTools: Math.max(0, totalTools - writeCapableTools),
      writeCapableTools,
      serverCount: servers.length
    };
  }, [servers]);

  const filteredServers = useMemo(() => {
    const normalizedSearch = serverSearch.trim().toLowerCase();
    return servers.filter((server) => {
      const status = getMcpServerStatusDisplay(server);
      const matchesSearch = !normalizedSearch ||
        server.name.toLowerCase().includes(normalizedSearch) ||
        server.url.toLowerCase().includes(normalizedSearch);
      const matchesFilter =
        serverFilter === 'all' ||
        (serverFilter === 'connected' && status.labelKey === 'mcpServers.statusConnected') ||
        (serverFilter === 'attention' && (
          status.labelKey === 'mcpServers.statusNeedsAuth' ||
          status.labelKey === 'mcpServers.statusDiscoveryFailed'
        )) ||
        (serverFilter === 'disabled' && status.labelKey === 'mcpServers.statusDisabled') ||
        (serverFilter === 'unchecked' && status.labelKey === 'mcpServers.statusNotChecked');
      return matchesSearch && matchesFilter;
    });
  }, [serverFilter, serverSearch, servers]);

  return (
    <>
      <section data-mcp-server-access-summary="true" className="mb-6 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        <div className="grid grid-cols-1 divide-y divide-ui-border md:grid-cols-[minmax(15rem,1.35fr)_repeat(5,minmax(7rem,1fr))] md:divide-x md:divide-y-0">
          <div className="px-5 py-3.5">
            <h2 className="type-row-title">{t('mcpServers.serverInventoryTitle')}</h2>
            <p className="type-caption mt-1 text-ui-text-muted">{t('mcpServers.serverInventoryBody')}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="type-caption text-ui-text-muted">{t('mcpServers.serversMetric')}</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{toolAccessSummary.serverCount}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="type-caption text-ui-text-muted">{t('mcpServers.totalTools')}</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{toolAccessSummary.totalTools}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="type-caption text-ui-text-muted">{t('mcpServers.enabledToolsMetric')}</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{toolAccessSummary.enabledTools}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="type-caption text-ui-text-muted">{t('mcpServers.readOnlyTools')}</p>
            <p className="mt-0.5 inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ui-text">
              {toolAccessSummary.readOnlyTools}
              <span className="h-2 w-2 rounded-full bg-status-success" />
            </p>
          </div>
          <div className="px-5 py-3.5">
            <p className="type-caption text-ui-text-muted">{t('mcpServers.writeCapableTools')}</p>
            <p className="mt-0.5 inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ui-text">
              {toolAccessSummary.writeCapableTools}
              <span className="h-2 w-2 rounded-full bg-status-warning" />
            </p>
          </div>
        </div>
      </section>

      <section data-mcp-server-list="true" className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        <div className="flex flex-col gap-4 border-b border-ui-border px-6 py-6 sm:px-8 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <label htmlFor="mcp-server-search" className="sr-only">
              {t('mcpServers.searchServers')}
            </label>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
            <input
              id="mcp-server-search"
              type="text"
              value={serverSearch}
              onChange={(event) => setServerSearch(event.target.value)}
              placeholder={t('mcpServers.searchServers')}
              className="w-full rounded-lg border border-transparent bg-ui-bg py-3 pl-11 pr-4 text-sm text-ui-text outline-none transition-colors placeholder:text-ui-text-muted/60 focus-visible:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent/10"
            />
          </div>
          <Select<typeof serverFilter>
            value={serverFilter}
            options={serverFilterOptions}
            onChange={setServerFilter}
            className="min-w-48"
            ariaLabel={t('mcpServers.filterServers')}
          />
          <span className="type-label rounded-full border border-ui-border bg-ui-bg px-3 py-2 text-ui-text-muted">
            {t('mcpServers.showingServers', { count: filteredServers.length, total: servers.length })}
          </span>
        </div>
        <div className="min-w-0">
          <table className="w-full table-fixed text-left" aria-label={t('mcpServers.title')}>
            <caption className="sr-only">{t('mcpServers.title')}</caption>
            <colgroup>
              <col className="w-[31%]" />
              <col className="w-[17%]" />
              <col className="w-[11%]" />
              <col className="w-[18%]" />
              <col className="w-[12%]" />
              <col className="w-[11%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-ui-border">
                <th scope="col" className="type-label px-4 py-5 sm:px-6 lg:px-8">{t('mcpServers.server')}</th>
                <th scope="col" className="type-label px-4 py-5 sm:px-6 lg:px-8">{t('mcpServers.status')}</th>
                <th scope="col" className="type-label px-4 py-5 sm:px-6 lg:px-8">{t('mcpServers.enabled')}</th>
                <th scope="col" className="type-label hidden px-4 py-5 sm:px-6 md:table-cell lg:px-8">{t('mcpServers.tools')}</th>
                <th scope="col" className="type-label hidden px-4 py-5 sm:px-6 lg:table-cell lg:px-8">{t('mcpServers.lastDiscoveryColumn')}</th>
                <th scope="col" className="type-label px-4 py-5 text-right sm:px-6 lg:px-8">{t('mcpServers.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredServers.length > 0 ? (
                filteredServers.map((server) => (
                  <McpServerCard
                    key={server.id}
                    server={server}
                    canEditServers={canEditServers}
                    pendingTestServerId={pendingTestServerId}
                    pendingToggleServerId={pendingToggleServerId}
                    testResult={testResultsByServerId[server.id]}
                    onManageTools={onManageTools}
                    onTestConnection={onTestConnection}
                    onToggleServer={onToggleServer}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center">
                    <p className="type-body">{t('mcpServers.noServerMatches')}</p>
                    <p className="type-caption mt-1 text-ui-text-muted">{t('mcpServers.noServerMatchesHelp')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};
