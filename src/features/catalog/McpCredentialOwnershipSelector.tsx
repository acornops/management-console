import React from 'react';
import { useTranslation } from 'react-i18next';
import { Radio } from '@/components/common/FormControls';

export type McpCredentialMode = 'individual' | 'workspace';

export const McpCredentialOwnershipSelector: React.FC<{
  value: McpCredentialMode;
  modes?: McpCredentialMode[];
  name: string;
  onChange?: (mode: McpCredentialMode) => void;
}> = ({ value, modes = ['individual', 'workspace'], name, onChange }) => {
  const { t } = useTranslation();
  const selectable = modes.length > 1 && Boolean(onChange);
  return (
    <fieldset className="space-y-2">
      <legend className="type-label px-1">{t('mcpServers.credentialOwnership')}</legend>
      <div className={`grid gap-2 ${modes.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {modes.map((mode) => {
          const content = (
            <>
              {selectable && (
                <Radio
                  name={name}
                  value={mode}
                  checked={value === mode}
                  onChange={() => onChange?.(mode)}
                  className="mt-1"
                />
              )}
              <span className="min-w-0">
                <span className="type-label block">
                  {t(mode === 'individual' ? 'mcpServers.individualCredentials' : 'mcpServers.workspaceManagedCredential')}
                </span>
                <span className="type-caption mt-1 block text-ui-text-muted">
                  {t(mode === 'individual' ? 'mcpServers.individualCredentialsHelp' : 'mcpServers.workspaceManagedCredentialHelp')}
                </span>
                {!selectable && (
                  <span className="type-micro-label mt-2 block text-ui-text-muted">
                    {t('mcpServers.requiredByCatalogEndpoint')}
                  </span>
                )}
              </span>
            </>
          );
          const className = `flex items-start gap-3 rounded-lg border px-4 py-3 ${selectable ? 'cursor-pointer' : ''} ${value === mode ? 'border-accent bg-accent-soft/45' : 'border-ui-border bg-ui-surface'}`;
          return selectable
            ? <label key={mode} className={className}>{content}</label>
            : <div key={mode} className={className}>{content}</div>;
        })}
      </div>
    </fieldset>
  );
};
