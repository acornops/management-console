import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Select';
import { McpCredentialOwnershipSelector } from '@/features/catalog/McpCredentialOwnershipSelector';

export interface ManualAgentMcpServerForm {
  name: string;
  url: string;
  authType: 'none' | 'bearer_token' | 'custom_header' | 'oauth';
  credentialMode: 'none' | 'workspace' | 'individual';
  authHeaderName: string;
}

interface AgentMcpServerCreateFormProps {
  value: ManualAgentMcpServerForm;
  onChange: React.Dispatch<React.SetStateAction<ManualAgentMcpServerForm>>;
  onClose: () => void;
  onSubmit: () => void;
  writable: boolean;
  busy: boolean;
}

const inputClass = 'min-h-11 w-full rounded-md border border-ui-border bg-ui-surface px-3 text-sm text-ui-text focus-visible:ring-2 focus-visible:ring-accent';

export function AgentMcpServerCreateForm({
  value,
  onChange,
  onClose,
  onSubmit,
  writable,
  busy
}: AgentMcpServerCreateFormProps) {
  const { t } = useTranslation();
  const canSubmit = writable
    && value.name.trim().length > 0
    && value.url.trim().startsWith('https://')
    && (value.authType !== 'custom_header' || value.authHeaderName.trim().length > 0)
    && !busy;

  return (
    <section aria-labelledby="connect-agent-mcp-title" className="rounded-md border border-ui-border bg-ui-bg p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="connect-agent-mcp-title" className="text-sm font-semibold">Connect by URL</h3>
          <p className="type-caption mt-1 text-ui-text-muted">
            Enter the actual remote Streamable HTTP endpoint. Registry, package, container, and stdio locations are not supported.
          </p>
        </div>
        <Button size="sm" variant="tertiary" onClick={onClose}>Close</Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Name
          <input value={value.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} className={`mt-2 ${inputClass}`} />
        </label>
        <label className="text-sm font-semibold">
          HTTPS endpoint
          <input type="url" pattern="https://.*" value={value.url} onChange={(event) => onChange((current) => ({ ...current, url: event.target.value }))} className={`mt-2 ${inputClass}`} />
        </label>
        <label className="text-sm font-semibold">
          Authentication
          <Select
            ariaLabel="Authentication"
            className="mt-2"
            value={value.authType}
            options={[
              { value: 'none' as const, label: 'None' },
              { value: 'bearer_token' as const, label: 'Bearer token' },
              { value: 'custom_header' as const, label: 'Custom header' },
              { value: 'oauth' as const, label: 'OAuth' }
            ]}
            onChange={(authType) => onChange((current) => ({
              ...current,
              authType,
              credentialMode: authType === 'none'
                ? 'none'
                : authType === 'oauth'
                  ? 'individual'
                  : current.credentialMode === 'none' ? 'individual' : current.credentialMode
            }))}
          />
        </label>
        {value.authType !== 'none' && value.authType !== 'oauth' && (
          <div className="sm:col-span-2">
            <McpCredentialOwnershipSelector
              name="agent-mcp-credential-mode"
              value={value.credentialMode === 'workspace' ? 'workspace' : 'individual'}
              onChange={(credentialMode) => onChange((current) => ({ ...current, credentialMode }))}
            />
          </div>
        )}
        {value.authType === 'custom_header' && (
          <label className="text-sm font-semibold">
            Header name
            <input value={value.authHeaderName} onChange={(event) => onChange((current) => ({ ...current, authHeaderName: event.target.value }))} className={`mt-2 ${inputClass}`} />
          </label>
        )}
        {value.authType === 'oauth' && (
          <p className="type-caption sm:col-span-2 rounded-md border border-ui-border bg-ui-surface px-3 py-2 text-ui-text-muted">
            {t('mcpServers.oauthCredentialSetupHelp')}
          </p>
        )}
        <Button disabled={!canSubmit} onClick={onSubmit}>Add server</Button>
      </div>
    </section>
  );
}
