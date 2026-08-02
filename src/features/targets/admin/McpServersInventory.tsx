import React, { useMemo, useState } from 'react';
import { Search, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CollectionResultSummary, DataTableFrame, DataTableHeader, DataTableHeaderCell } from '@acornops/ui';
import { EmptyState } from '@acornops/ui';
import { Select } from '@acornops/ui';
import type { SelectOption } from '@acornops/ui';
import { formInputClassName } from '@acornops/ui';
import { TargetMcpServerTestConnectionResult } from '@/services/controlPlaneApi';
import type { TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';
import type { McpConnection } from '@/services/control-plane/catalogApi';
import { getMcpServerStatusDisplay, McpServerCard } from '@/features/targets/admin/McpServerCard';
import { TextInput } from '@acornops/ui';
import { DataTable, DataTableBody, DataTableRow } from '@acornops/ui';

interface McpServersInventoryProps {
  servers: TargetToolCatalogServer[];
  canEditServers: boolean;
  pendingTestServerId: string | null;
  pendingToggleServerId: string | null;
  testResultsByServerId: Record<string, TargetMcpServerTestConnectionResult>;
  connections: Record<string, McpConnection>;
  connectionErrors: Record<string, string>;
  pendingConnectionServerId: string | null;
  retryAfterSecondsFor: (serverId: string) => number;
  recoveryServerId: string | null;
  recoveryAction?: 'connect_mcp_server' | 'authorize_mcp_server' | 'select_authorization_server' | 'reauthorize_mcp_server' | 'verify_mcp_server';
  onManageTools: (serverId: string) => void;
  onTestConnection: (server: TargetToolCatalogServer) => void;
  onToggleServer: (server: TargetToolCatalogServer, enabled: boolean) => void;
  onEdit: (server: TargetToolCatalogServer) => void;
  onDelete: (server: TargetToolCatalogServer) => void;
  onConnect: (server: TargetToolCatalogServer) => void;
  onVerify: (server: TargetToolCatalogServer) => void;
  onDisconnect: (server: TargetToolCatalogServer) => void;
  onRetry: (server: TargetToolCatalogServer) => void;
}

const mcpServerSearchInputClassName = formInputClassName('py-3 pl-11 pr-4 type-body');

export const McpServersInventory: React.FC<McpServersInventoryProps> = ({
  servers,
  canEditServers,
  pendingTestServerId,
  pendingToggleServerId,
  testResultsByServerId,
  connections,
  connectionErrors,
  pendingConnectionServerId,
  retryAfterSecondsFor,
  recoveryServerId,
  recoveryAction,
  onManageTools,
  onTestConnection,
  onToggleServer,
  onEdit,
  onDelete,
  onConnect,
  onVerify,
  onDisconnect,
  onRetry
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
  const hasActiveFilters = Boolean(serverSearch.trim()) || serverFilter !== 'all';

  return (
    <>
      <section data-mcp-server-access-summary="true" className="mb-6 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-6 xl:grid-cols-[minmax(15rem,1.35fr)_repeat(5,minmax(7rem,1fr))]">
          <div className="col-span-2 border-b border-ui-border px-5 py-3.5 sm:col-span-6 xl:col-span-1 xl:border-b-0 xl:border-r">
            <h2 className="type-row-title">{t('mcpServers.serverInventoryTitle')}</h2>
            <p className="type-caption mt-1 min-h-10 text-ui-text-muted">{t('mcpServers.serverInventoryBody')}</p>
          </div>
          <div className="border-b border-r border-ui-border px-5 py-3.5 sm:col-span-2 xl:col-span-1 xl:border-b-0">
            <p className="type-caption text-ui-text-muted">{t('mcpServers.serversMetric')}</p>
            <p className="type-data mt-0.5">{toolAccessSummary.serverCount}</p>
          </div>
          <div className="border-b border-ui-border px-5 py-3.5 sm:col-span-2 sm:border-r xl:col-span-1 xl:border-b-0">
            <p className="type-caption text-ui-text-muted">{t('mcpServers.totalTools')}</p>
            <p className="type-data mt-0.5">{toolAccessSummary.totalTools}</p>
          </div>
          <div className="border-b border-r border-ui-border px-5 py-3.5 sm:col-span-2 sm:border-r-0 xl:col-span-1 xl:border-b-0 xl:border-r">
            <p className="type-caption text-ui-text-muted">{t('mcpServers.enabledToolsMetric')}</p>
            <p className="type-data mt-0.5">{toolAccessSummary.enabledTools}</p>
          </div>
          <div className="border-b border-ui-border px-5 py-3.5 sm:col-span-3 sm:border-b-0 sm:border-r xl:col-span-1">
            <p className="type-caption text-ui-text-muted">{t('mcpServers.readOnlyTools')}</p>
            <p className="type-data mt-0.5 inline-flex items-center gap-2">
              {toolAccessSummary.readOnlyTools}
              <span className="h-2 w-2 rounded-full bg-status-success" />
            </p>
          </div>
          <div className="col-span-2 px-5 py-3.5 sm:col-span-3 xl:col-span-1">
            <p className="type-caption text-ui-text-muted">{t('mcpServers.writeCapableTools')}</p>
            <p className="type-data mt-0.5 inline-flex items-center gap-2">
              {toolAccessSummary.writeCapableTools}
              <span className="h-2 w-2 rounded-full bg-status-warning" />
            </p>
          </div>
        </div>
      </section>

      <section data-mcp-server-list="true" className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        {(servers.length > 0 || hasActiveFilters) && (
          <div className="grid gap-4 border-b border-ui-border px-6 py-6 sm:px-8 xl:grid-cols-[minmax(0,1fr)_12rem_9.5rem] xl:items-center">
            <div className="relative min-w-0">
              <label htmlFor="mcp-server-search" className="sr-only">
                {t('mcpServers.searchServers')}
              </label>
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
              <TextInput
                id="mcp-server-search"
                type="text"
                value={serverSearch}
                onChange={(event) => setServerSearch(event.target.value)}
                placeholder={t('mcpServers.searchServers')}
                className={mcpServerSearchInputClassName}
              />
            </div>
            <Select<typeof serverFilter>
              value={serverFilter}
              options={serverFilterOptions}
              onChange={setServerFilter}
              className="w-full"
              ariaLabel={t('mcpServers.filterServers')}
            />
            <CollectionResultSummary className="xl:justify-end">
              {t('mcpServers.showingServers', { count: filteredServers.length, total: servers.length })}
            </CollectionResultSummary>
          </div>
        )}
        <div className="min-w-0">
          {filteredServers.length === 0 ? (
            <EmptyState
              embedded
              headingLevel={3}
              icon={hasActiveFilters ? <Search /> : <Server />}
              title={t(hasActiveFilters ? 'mcpServers.noServerMatches' : 'mcpServers.empty')}
              description={t(hasActiveFilters ? 'mcpServers.noServerMatchesHelp' : 'mcpServers.emptyHelp')}
            />
          ) : (
            <DataTableFrame data-target-capability-table-frame="true" className="rounded-none border-0 shadow-none custom-scrollbar">
              <DataTable caption={t('mcpServers.title')} className="w-full table-fixed text-left" aria-label={t('mcpServers.title')}>
                <colgroup>
                  <col className="w-[34%]" />
                  <col className="w-[23%]" />
                  <col className="w-[11%]" />
                  <col className="w-[21%]" />
                  <col className="w-[11%]" />
                </colgroup>
                <DataTableHeader collectionState={{ phase: 'ready', itemCount: filteredServers.length }}>
                  <DataTableRow>
                    <DataTableHeaderCell>{t('mcpServers.server')}</DataTableHeaderCell>
                    <DataTableHeaderCell>{t('mcpServers.status')}</DataTableHeaderCell>
                    <DataTableHeaderCell>{t('mcpServers.enabled')}</DataTableHeaderCell>
                    <DataTableHeaderCell className="hidden md:table-cell">{t('mcpServers.tools')}</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>{t('mcpServers.actions')}</DataTableHeaderCell>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {filteredServers.map((server) => (
                    <McpServerCard
                      key={server.id}
                      server={server}
                      canEditServers={canEditServers}
                      pendingTestServerId={pendingTestServerId}
                      pendingToggleServerId={pendingToggleServerId}
                      testResult={testResultsByServerId[server.id]}
                      connection={connections[server.id]}
                      connectionLoadError={connectionErrors[server.id]}
                      pendingConnection={pendingConnectionServerId === server.id}
                      retryAfterSeconds={retryAfterSecondsFor(server.id)}
                      recoveryAction={recoveryServerId === server.id ? recoveryAction : undefined}
                      onManageTools={onManageTools}
                      onTestConnection={onTestConnection}
                      onToggleServer={onToggleServer}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onConnect={onConnect}
                      onVerify={onVerify}
                      onDisconnect={onDisconnect}
                      onRetry={onRetry}
                    />
                  ))}
                </DataTableBody>
              </DataTable>
            </DataTableFrame>
          )}
        </div>
      </section>
    </>
  );
};
