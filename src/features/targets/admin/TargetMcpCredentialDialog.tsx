import React from 'react';
import { AnimatePresence } from 'framer-motion';

import { McpCredentialDialog } from '@/features/catalog/McpCredentialDialog';
import type { McpConnection } from '@/services/control-plane/catalogApi';
import type { TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';

interface TargetMcpCredentialDialogProps {
  server: TargetToolCatalogServer | null;
  connection?: McpConnection;
  retryAfterSeconds?: number;
  onClose: () => void;
  onSubmit: (credential: string) => Promise<void>;
}

export const TargetMcpCredentialDialog: React.FC<TargetMcpCredentialDialogProps> = ({
  server,
  connection,
  retryAfterSeconds,
  onClose,
  onSubmit
}) => (
  <AnimatePresence>
    {server && (
      <McpCredentialDialog
        serverName={server.name}
        serverUrl={server.url}
        authType={connection?.authType || server.authType}
        authHeaderName={server.authHeaderName}
        credentialMode={server.credentialMode === 'workspace' ? 'workspace' : 'individual'}
        mode={connection?.status === 'missing' ? 'connect' : 'replace'}
        retryAfterSeconds={retryAfterSeconds}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    )}
  </AnimatePresence>
);
