import React from 'react';
import { AnimatePresence } from 'framer-motion';

import { McpPatDialog } from '@/features/catalog/McpPatDialog';
import type { McpPersonalConnection } from '@/services/control-plane/catalogApi';
import type { TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';

interface TargetMcpPatDialogProps {
  server: TargetToolCatalogServer | null;
  connection?: McpPersonalConnection;
  retryAfterSeconds?: number;
  onClose: () => void;
  onSubmit: (credential: string) => Promise<void>;
}

export const TargetMcpPatDialog: React.FC<TargetMcpPatDialogProps> = ({
  server,
  connection,
  retryAfterSeconds,
  onClose,
  onSubmit
}) => (
  <AnimatePresence>
    {server && (
      <McpPatDialog
        serverName={server.name}
        serverUrl={server.url}
        authType={connection?.authType || server.authType}
        authHeaderName={server.authHeaderName}
        mode={connection?.status === 'missing' ? 'connect' : 'replace'}
        retryAfterSeconds={retryAfterSeconds}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    )}
  </AnimatePresence>
);
