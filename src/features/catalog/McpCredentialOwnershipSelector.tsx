import React from 'react';
import { useTranslation } from 'react-i18next';
import { Radio } from '@acornops/ui';

export type McpCredentialMode = 'individual' | 'workspace';

export const McpCredentialOwnershipSelector: React.FC<{
  value: McpCredentialMode;
  name: string;
  onChange: (mode: McpCredentialMode) => void;
}> = ({ value, name, onChange }) => {
  const { t } = useTranslation();
  const modes: McpCredentialMode[] = ['individual', 'workspace'];
  return (
    <fieldset className="space-y-2">
      <legend className="type-label px-1">{t('mcpServers.credentialOwnership')}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {modes.map((mode) => {
          const content = (
            <>
              <Radio
                name={name}
                value={mode}
                checked={value === mode}
                onChange={() => onChange(mode)}
                className="mt-1"
              />
              <span className="min-w-0">
                <span className="type-label block">
                  {t(mode === 'individual' ? 'mcpServers.individualCredentials' : 'mcpServers.workspaceManagedCredential')}
                </span>
                <span className="type-caption mt-1 block text-ui-text-muted">
                  {t(mode === 'individual' ? 'mcpServers.individualCredentialsHelp' : 'mcpServers.workspaceManagedCredentialHelp')}
                </span>
              </span>
            </>
          );
          const className = `flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${value === mode ? 'border-accent bg-accent-soft/45' : 'border-ui-border bg-ui-surface'}`;
          return <label key={mode} className={className}>{content}</label>;
        })}
      </div>
    </fieldset>
  );
};
