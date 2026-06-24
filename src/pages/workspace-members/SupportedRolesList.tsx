import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { WorkspaceCapability, WorkspaceRoleCapabilityGroupKey, WorkspaceRoleTemplate } from '@/types';
import { formatRole } from './memberUtils';

interface SupportedRolesListProps {
  roleTemplates: WorkspaceRoleTemplate[];
}

const formatCapability = (capability: string) => capability.replaceAll('_', ' ');
const formatGroupLabel = (key: string) => key.replaceAll('_', ' ').replaceAll('-', ' ');

type DisplayCapabilityGroup = {
  key: WorkspaceRoleCapabilityGroupKey | 'permissions';
  capabilities: WorkspaceCapability[];
  sortOrder: number;
};

export function getRoleCapabilityGroups(role: WorkspaceRoleTemplate): DisplayCapabilityGroup[] {
  const fallbackGroup: DisplayCapabilityGroup = { key: 'permissions', capabilities: role.capabilities, sortOrder: 0 };
  return (role.capabilityGroups?.length
    ? [...role.capabilityGroups].sort((left, right) => left.sortOrder - right.sortOrder || left.key.localeCompare(right.key))
    : [fallbackGroup]
  )
    .filter((group) => group.capabilities.length > 0);
}

export const SupportedRolesList: React.FC<SupportedRolesListProps> = ({ roleTemplates }) => {
  const { t } = useTranslation();
  const [expandedRoleKey, setExpandedRoleKey] = useState('');

  if (roleTemplates.length === 0) {
    return (
      <div className="type-body px-5 py-8 text-center">
        {t('members.loadingRoles')}
      </div>
    );
  }

  return (
    <div className="divide-y divide-ui-border">
      {roleTemplates.map((role) => {
        const isExpanded = expandedRoleKey === role.key;
        const expandedPanelId = `supported-role-${role.key}-permissions`;
        const groupedCapabilities = getRoleCapabilityGroups(role);
        const roleSummary = t(`members.rolePermissionSummaries.${role.key}`, {
          defaultValue: role.capabilities.slice(0, 4).map(formatCapability).join(', ')
        });

        return (
          <section key={role.key} className={clsx('transition-colors', isExpanded && 'bg-ui-bg/60')}>
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls={expandedPanelId}
              onClick={() => setExpandedRoleKey(isExpanded ? '' : role.key)}
              className="grid w-full gap-4 px-5 py-4 text-left transition-colors hover:bg-ui-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.2fr)_auto] md:items-start md:gap-8"
            >
              <div className="min-w-0">
                <div className="type-row-title text-ui-text">{formatRole(role.key, role)}</div>
                <div className="type-caption mt-1 max-w-lg text-ui-text-muted">
                  {role.key === 'owner' ? t('members.requiredRole') : role.description}
                </div>
              </div>
              <p className="type-caption max-w-3xl text-ui-text-muted md:pt-0.5">
                {roleSummary}
              </p>
              <ChevronDown
                className={clsx('h-4 w-4 text-ui-text-muted transition-transform md:mt-1', isExpanded && 'rotate-180 text-ui-text')}
                aria-hidden="true"
              />
            </button>

            {isExpanded && (
              <div id={expandedPanelId} className="px-5 pb-5">
                <div className="grid gap-5 rounded-lg border border-ui-border bg-ui-surface px-5 py-4 md:grid-cols-2 xl:grid-cols-3">
                  {groupedCapabilities.map((group) => (
                    <div key={group.key} className="min-w-0">
                      <p className="type-label text-ui-text">
                        {t(`members.capabilityGroups.${group.key}`, { defaultValue: formatGroupLabel(group.key) })}
                      </p>
                      <ul className="mt-3 space-y-2">
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
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
