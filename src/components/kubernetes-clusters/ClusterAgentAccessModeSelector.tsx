import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AgentAccessMode } from '@/services/control-plane/types';
import { Radio } from '@/components/common/FormControls';

interface ClusterAgentAccessModeSelectorProps {
  value: AgentAccessMode;
  onChange: (value: AgentAccessMode) => void;
  idPrefix: string;
  disabled?: boolean;
}

const accessModes: Array<{
  value: AgentAccessMode;
  labelKey: string;
  descriptionKey: string;
}> = [
  {
    value: 'read_only',
    labelKey: 'clusterSetup.accessModeReadOnly',
    descriptionKey: 'clusterSetup.accessModeReadOnlyBody'
  },
  {
    value: 'read_write',
    labelKey: 'clusterSetup.accessModeReadWrite',
    descriptionKey: 'clusterSetup.accessModeReadWriteBody'
  }
];

export const ClusterAgentAccessModeSelector: React.FC<ClusterAgentAccessModeSelectorProps> = ({
  value,
  onChange,
  idPrefix,
  disabled = false
}) => {
  const { t } = useTranslation();
  const labelId = `${idPrefix}-agent-access-mode-label`;

  return (
    <fieldset aria-labelledby={labelId} className="rounded-lg border border-ui-border bg-ui-bg p-4">
      <div id={labelId} className="px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ui-text-muted">
        {t('clusterSetup.accessMode')}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {accessModes.map((mode) => {
          const checked = value === mode.value;
          const inputId = `${idPrefix}-${mode.value}`;

          return (
            <label
              key={mode.value}
              htmlFor={inputId}
              className={[
                'flex min-h-[4.25rem] cursor-pointer gap-3 rounded-md border px-3 py-2.5 transition-all',
                checked
                  ? 'border-accent/45 bg-accent-soft/60 text-ui-text'
                  : 'border-ui-border bg-ui-surface text-ui-text hover:bg-ui-bg',
                disabled ? 'cursor-not-allowed opacity-60' : ''
              ].join(' ')}
            >
              <Radio
                id={inputId}
                name={`${idPrefix}-agent-access-mode`}
                value={mode.value}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(mode.value)}
                className="mt-1"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ui-text">{t(mode.labelKey)}</span>
                <span className="mt-0.5 block text-xs font-medium leading-5 text-ui-text-muted">{t(mode.descriptionKey)}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};
