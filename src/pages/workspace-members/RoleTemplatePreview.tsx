import React, { useState } from 'react';
import { Check, ChevronDown, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { WorkspaceCapability, WorkspaceRoleCapabilityGroupKey, WorkspaceRoleTemplate } from '@/types';
import { formatRole } from './memberUtils';

interface RoleTemplatePreviewProps {
  roleTemplate?: WorkspaceRoleTemplate;
  emptyMessage?: React.ReactNode;
  className?: string;
}

export type RoleKindLabelKey = 'protectedRole' | 'systemRole' | 'customRole';

export type DisplayCapabilityGroup = {
  key: WorkspaceRoleCapabilityGroupKey | 'permissions';
  capabilities: WorkspaceCapability[];
  sortOrder: number;
};

export const formatCapability = (capability: string) => capability.replaceAll('_', ' ');
export const formatGroupLabel = (key: string) => key.replaceAll('_', ' ').replaceAll('-', ' ');

export function getRoleCapabilityGroups(role: WorkspaceRoleTemplate): DisplayCapabilityGroup[] {
  const fallbackGroup: DisplayCapabilityGroup = { key: 'permissions', capabilities: role.capabilities, sortOrder: 0 };
  return (role.capabilityGroups?.length
    ? [...role.capabilityGroups].sort((left, right) => left.sortOrder - right.sortOrder || left.key.localeCompare(right.key))
    : [fallbackGroup]
  )
    .filter((group) => group.capabilities.length > 0);
}

export function getRoleKindLabels(role: WorkspaceRoleTemplate): RoleKindLabelKey[] {
  const labels: RoleKindLabelKey[] = [];
  if (role.protected) labels.push('protectedRole');
  labels.push(role.kind === 'custom' ? 'customRole' : 'systemRole');
  return labels;
}

export const RoleTemplatePreview: React.FC<RoleTemplatePreviewProps> = ({
  roleTemplate,
  emptyMessage,
  className
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!roleTemplate) {
    return (
      <div className={clsx('type-caption rounded-lg border border-ui-border bg-ui-bg px-4 py-3 text-ui-text-muted', className)}>
        {emptyMessage || t('members.rolePreviewUnavailable')}
      </div>
    );
  }

  const groupedCapabilities = getRoleCapabilityGroups(roleTemplate);
  const roleSummary = t(`members.rolePermissionSummaries.${roleTemplate.key}`, {
    defaultValue: roleTemplate.capabilities.slice(0, 4).map(formatCapability).join(', ')
  });
  const expandedPanelId = `role-template-preview-${roleTemplate.key}-permissions`;

  return (
    <section className={clsx('rounded-lg border border-ui-border bg-ui-bg px-4 py-4', className)} aria-label={t('members.rolePreviewTitle')}>
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ui-surface text-accent-strong">
          <Shield className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h4 className="type-row-title min-w-0 break-words text-ui-text">{formatRole(roleTemplate.key, roleTemplate)}</h4>
            {getRoleKindLabels(roleTemplate).map((labelKey) => (
              <span key={labelKey} className="type-label rounded-full border border-ui-border bg-ui-surface px-2 py-0.5 text-ui-text-muted">
                {t(`members.rolePreviewBadges.${labelKey}`)}
              </span>
            ))}
          </div>
          <p className="type-caption mt-2 text-ui-text-muted">{roleTemplate.description}</p>
          <p className="type-caption mt-3 font-semibold text-ui-text">{roleSummary}</p>
        </div>
      </div>

      {groupedCapabilities.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={expandedPanelId}
            onClick={() => setIsExpanded((expanded) => !expanded)}
            className="control-target type-label inline-flex items-center gap-2 rounded-md px-1 py-1 text-ui-text-muted transition-colors hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          >
            {t('members.rolePreviewCapabilities')}
            <ChevronDown className={clsx('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} aria-hidden="true" />
          </button>

          {isExpanded && (
            <div id={expandedPanelId} className="mt-3 grid gap-4 border-t border-ui-border pt-4 sm:grid-cols-2">
              {groupedCapabilities.map((group) => (
                <div key={group.key} className="min-w-0">
                  <p className="type-label text-ui-text">
                    {t(`members.capabilityGroups.${group.key}`, { defaultValue: formatGroupLabel(group.key) })}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {group.capabilities.map((capability) => (
                      <li key={capability} className="type-caption flex items-start gap-2 text-ui-text-muted">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-success" aria-hidden="true" />
                        <span>{t(`members.capabilityLabels.${capability}`, { defaultValue: formatCapability(capability) })}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
