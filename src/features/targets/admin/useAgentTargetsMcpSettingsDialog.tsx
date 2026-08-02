import React from 'react';
import { AnimatePresence } from 'framer-motion';
import type { TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';
import type { McpServersViewProps } from '@/features/targets/admin/McpServersView.data';
import { AgentTargetsMcpSettingsDialog } from '@/pages/agents/AgentTargetsMcpSettingsDialog';

export function useAgentTargetsMcpSettingsDialog(
  subject: { workspaceId: string; id: string },
  settings: McpServersViewProps['targetAccessSettings']
): [(server: TargetToolCatalogServer) => void, React.ReactNode] {
  const [server, setServer] = React.useState<TargetToolCatalogServer | null>(null);
  const settingsEnabled = Boolean(settings);
  React.useEffect(() => {
    setServer(null);
  }, [settingsEnabled, subject.id, subject.workspaceId]);
  const open = React.useCallback((nextServer: TargetToolCatalogServer) => {
    if (settingsEnabled) setServer(nextServer);
  }, [settingsEnabled]);
  return [open, (
    <AnimatePresence>
      {server && settings && (
        <AgentTargetsMcpSettingsDialog
          key={`${subject.workspaceId}:${subject.id}:${server.id}`}
          workspaceId={subject.workspaceId}
          agentId={subject.id}
          serverId={server.id}
          serverName={server.name}
          canEdit={settings.canEdit}
          load={settings.load}
          save={settings.save}
          onClose={() => setServer(null)}
        />
      )}
    </AnimatePresence>
  )];
}
