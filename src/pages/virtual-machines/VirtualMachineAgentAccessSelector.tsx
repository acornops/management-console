import React from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Radio, TextInput } from '@acornops/ui';
import { isValidAgentVRestartService, type AgentVAccessMode } from '@/services/control-plane/virtualMachineTypes';

interface VirtualMachineAgentAccessSelectorProps {
  value: AgentVAccessMode;
  restartServices: string[];
  onChange: (value: AgentVAccessMode, restartServices: string[]) => void;
  disabled?: boolean;
  idPrefix?: string;
}

export const VirtualMachineAgentAccessSelector: React.FC<VirtualMachineAgentAccessSelectorProps> = ({
  value,
  restartServices,
  onChange,
  disabled = false,
  idPrefix = 'agentv-access'
}) => {
  const { t } = useTranslation();
  const [serviceInput, setServiceInput] = React.useState('');
  const [serviceError, setServiceError] = React.useState<string | null>(null);

  const addService = () => {
    const service = serviceInput.trim();
    if (!isValidAgentVRestartService(service)) {
      setServiceError(t('virtualMachines.list.restartServiceInvalid'));
      return;
    }
    if (restartServices.includes(service)) {
      setServiceError(t('virtualMachines.list.restartServiceDuplicate'));
      return;
    }
    if (restartServices.length >= 32) {
      setServiceError(t('virtualMachines.list.restartServiceLimit'));
      return;
    }
    onChange('read_write', [...restartServices, service]);
    setServiceInput('');
    setServiceError(null);
  };

  return (
    <fieldset aria-disabled={disabled} className="rounded-lg border border-ui-border bg-ui-bg p-4">
      <legend className="px-1 type-micro-label">{t('virtualMachines.list.agentAccess')}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {(['read_only', 'read_write'] as const).map((mode) => {
          const checked = value === mode;
          const inputId = `${idPrefix}-${mode}`;
          return (
            <label
              key={mode}
              htmlFor={inputId}
              className={[
                'flex min-h-[4.5rem] gap-3 rounded-md border px-3 py-2.5 transition-colors',
                checked ? 'border-accent/45 bg-accent-soft/60' : 'border-ui-border bg-ui-surface hover:bg-ui-bg',
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              ].join(' ')}
            >
              <Radio
                id={inputId}
                name={`${idPrefix}-mode`}
                value={mode}
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  setServiceError(null);
                  onChange(mode, mode === 'read_only' ? [] : restartServices);
                }}
                className="mt-1"
              />
              <span>
                <span className="block type-row-title">{t(`virtualMachines.list.agentAccess${mode === 'read_only' ? 'ReadOnly' : 'ReadWrite'}`)}</span>
                <span className="mt-0.5 block type-caption leading-5 text-ui-text-muted">
                  {t(`virtualMachines.list.agentAccess${mode === 'read_only' ? 'ReadOnlyBody' : 'ReadWriteBody'}`)}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {value === 'read_write' && (
        <div className="mt-4 rounded-md border border-ui-border bg-ui-surface p-3">
          <label htmlFor={`${idPrefix}-restart-service`} className="block type-label">
            {t('virtualMachines.list.restartServices')}
          </label>
          <p className="mt-1 type-caption leading-5 text-ui-text-muted">{t('virtualMachines.list.restartServicesBody')}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <TextInput
              id={`${idPrefix}-restart-service`}
              value={serviceInput}
              disabled={disabled}
              placeholder={t('virtualMachines.list.restartServicePlaceholder')}
              aria-invalid={Boolean(serviceError)}
              aria-describedby={serviceError ? `${idPrefix}-restart-service-error` : undefined}
              className="min-w-0 flex-1"
              onChange={(event) => {
                setServiceInput(event.target.value);
                setServiceError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addService();
                }
              }}
            />
            <Button type="button" variant="secondary" size="sm" disabled={disabled || !serviceInput.trim()} onClick={addService} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              {t('virtualMachines.list.addRestartService')}
            </Button>
          </div>
          {serviceError && <p id={`${idPrefix}-restart-service-error`} role="alert" className="mt-2 type-caption text-status-danger-text">{serviceError}</p>}
          {!serviceError && restartServices.length === 0 && (
            <p className="mt-2 type-caption text-status-warning-text">{t('virtualMachines.list.restartServiceRequired')}</p>
          )}
          {restartServices.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label={t('virtualMachines.list.restartServices')}>
              {restartServices.map((service) => (
                <li key={service} className="flex items-center gap-1 rounded-md border border-ui-border bg-ui-bg py-1 pl-2.5 pr-1 font-mono type-caption text-ui-text">
                  <span>{service}</span>
                  <Button
                    type="button"
                    variant="icon"
                    size="icon"
                    disabled={disabled}
                    onClick={() => onChange('read_write', restartServices.filter((item) => item !== service))}
                    aria-label={t('virtualMachines.list.removeRestartService', { service })}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 type-caption leading-5 text-ui-text-muted">{t('virtualMachines.list.restartApprovalRequired')}</p>
        </div>
      )}
    </fieldset>
  );
};
