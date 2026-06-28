import React from 'react';
import { ArrowRight, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { WorkspaceCapability, WorkspaceRoleTemplate } from '@/types';
import { formatRole } from './memberUtils';
import { formatCapability } from './RoleTemplatePreview';

interface RoleChangeConfirmationProps {
  currentRoleTemplate?: WorkspaceRoleTemplate;
  pendingRoleTemplate?: WorkspaceRoleTemplate;
  isSaving: boolean;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

interface RoleCapabilityDiff {
  gained: WorkspaceCapability[];
  lost: WorkspaceCapability[];
}

export function getRoleCapabilityDiff(
  currentRoleTemplate?: WorkspaceRoleTemplate,
  pendingRoleTemplate?: WorkspaceRoleTemplate
): RoleCapabilityDiff {
  if (!currentRoleTemplate || !pendingRoleTemplate) return { gained: [], lost: [] };

  const currentCapabilities = new Set(currentRoleTemplate.capabilities);
  const pendingCapabilities = new Set(pendingRoleTemplate.capabilities);
  return {
    gained: pendingRoleTemplate.capabilities.filter((capability) => !currentCapabilities.has(capability)),
    lost: currentRoleTemplate.capabilities.filter((capability) => !pendingCapabilities.has(capability))
  };
}

export const RoleChangeConfirmation: React.FC<RoleChangeConfirmationProps> = ({
  currentRoleTemplate,
  pendingRoleTemplate,
  isSaving,
  disabled,
  onCancel,
  onConfirm
}) => {
  const { t } = useTranslation();
  const capabilityDiff = getRoleCapabilityDiff(currentRoleTemplate, pendingRoleTemplate);

  if (!pendingRoleTemplate || !currentRoleTemplate || currentRoleTemplate.key === pendingRoleTemplate.key) {
    return null;
  }

  return (
    <section className="rounded-lg border border-status-warning/30 bg-status-warning-soft px-4 py-4 text-status-warning-text">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="type-row-title">{t('members.reviewRoleChange')}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span className="rounded-md bg-ui-surface px-2 py-1 text-ui-text">{formatRole(currentRoleTemplate.key, currentRoleTemplate)}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            <span className="rounded-md bg-ui-surface px-2 py-1 text-ui-text">{formatRole(pendingRoleTemplate.key, pendingRoleTemplate)}</span>
          </div>
          <p className="type-caption mt-3 text-status-warning-text">{t('members.roleChangeConfirmationBody')}</p>

          {(capabilityDiff.gained.length > 0 || capabilityDiff.lost.length > 0) && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <CapabilityDiffList title={t('members.roleChangeGains')} capabilities={capabilityDiff.gained} emptyLabel={t('members.roleChangeNoGains')} />
              <CapabilityDiffList title={t('members.roleChangeLoses')} capabilities={capabilityDiff.lost} emptyLabel={t('members.roleChangeNoLosses')} />
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button onClick={onCancel} disabled={isSaving} variant="secondary" size="md" className="flex-1">
              {t('app.cancel')}
            </Button>
            <Button onClick={onConfirm} disabled={disabled || isSaving} variant="primary" size="md" className="flex-1">
              {isSaving ? t('members.saving') : t('members.confirmRoleChange')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

const CapabilityDiffList: React.FC<{
  title: string;
  capabilities: WorkspaceCapability[];
  emptyLabel: string;
}> = ({ title, capabilities, emptyLabel }) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-md border border-status-warning/20 bg-ui-surface px-3 py-3">
      <p className="type-label text-ui-text">{title}</p>
      {capabilities.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {capabilities.slice(0, 4).map((capability) => (
            <li key={capability} className="type-caption text-ui-text-muted">
              {t(`members.capabilityLabels.${capability}`, { defaultValue: formatCapability(capability) })}
            </li>
          ))}
        </ul>
      ) : (
        <p className="type-caption mt-2 text-ui-text-muted">{emptyLabel}</p>
      )}
    </div>
  );
};
