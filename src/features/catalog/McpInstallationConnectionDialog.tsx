import React from 'react';
import { AnimatePresence } from 'framer-motion';

import { McpCredentialDialog } from '@/features/catalog/McpCredentialDialog';
import { McpOAuthDialog } from '@/features/catalog/McpOAuthDialog';
import type {
  McpConnection,
  McpOAuthPreparation
} from '@/services/control-plane/catalogApi';

interface McpDialogInstallation {
  id: string;
  name: string;
  url?: string;
  authType?: string;
  authHeaderName?: string;
  credentialMode: 'none' | 'workspace' | 'individual';
}

interface McpInstallationConnectionDialogProps {
  installation: McpDialogInstallation | null;
  connection?: McpConnection;
  returnPath: string;
  retryAfterSeconds?: number;
  onClose: () => void;
  onCredentialSubmit: (credential: string) => Promise<void>;
  onPrepareOAuth: (returnPath: string) => Promise<McpOAuthPreparation | undefined>;
  onStartOAuth: (preparationHandle: string, issuer?: string) => Promise<string | undefined>;
}

export const McpInstallationConnectionDialog: React.FC<McpInstallationConnectionDialogProps> = ({
  installation,
  connection,
  returnPath,
  retryAfterSeconds = 0,
  onClose,
  onCredentialSubmit,
  onPrepareOAuth,
  onStartOAuth
}) => (
  <AnimatePresence>
    {installation && (
      installation.authType === 'oauth'
        ? (
            <McpOAuthDialog
              key={installation.id}
              serverName={installation.name}
              returnPath={returnPath}
              mode={connection?.status === 'reauthorization_required' ? 'reauthorize' : 'authorize'}
              retryAfterSeconds={retryAfterSeconds}
              onClose={onClose}
              onPrepare={onPrepareOAuth}
              onStart={onStartOAuth}
            />
          )
        : (
            <McpCredentialDialog
              serverName={installation.name}
              serverUrl={installation.url}
              authType={connection?.authType || installation.authType}
              authHeaderName={installation.authHeaderName}
              credentialMode={installation.credentialMode === 'workspace' ? 'workspace' : 'individual'}
              mode={connection?.status === 'missing' ? 'connect' : 'replace'}
              retryAfterSeconds={retryAfterSeconds}
              onClose={onClose}
              onSubmit={onCredentialSubmit}
            />
          )
    )}
  </AnimatePresence>
);
