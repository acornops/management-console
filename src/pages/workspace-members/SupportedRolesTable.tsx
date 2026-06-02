import React from 'react';
import { useTranslation } from 'react-i18next';
import { WorkspaceRoleTemplate } from '@/types';
import { formatRole } from './memberUtils';

interface SupportedRolesTableProps {
  roleTemplates: WorkspaceRoleTemplate[];
}

export const SupportedRolesTable: React.FC<SupportedRolesTableProps> = ({ roleTemplates }) => {
  const { t } = useTranslation();

  return (
    <div className="min-w-0">
      <table className="w-full table-fixed text-left" aria-label={t('members.supportedRoles')}>
        <thead>
          <tr className="border-b border-ui-border">
            <th className="type-label w-[22%] px-5 py-4">{t('members.role')}</th>
            <th className="type-label w-[14%] px-5 py-4">{t('members.roleType')}</th>
            <th className="type-label w-[18%] px-5 py-4">{t('members.roleKey')}</th>
            <th className="type-label px-5 py-4">{t('members.capabilitySummary')}</th>
          </tr>
        </thead>
        <tbody>
          {roleTemplates.map((role) => (
            <tr key={role.key} className="border-b border-ui-bg">
              <td className="px-5 py-4 align-top">
                <div className="type-row-title text-ui-text">{formatRole(role.key, role)}</div>
                <div className="type-caption mt-1 text-ui-text-muted">
                  {role.key === 'owner' ? t('members.requiredRole') : role.description}
                </div>
              </td>
              <td className="px-5 py-4 align-top">
                <span className="type-label rounded-full border border-ui-border bg-ui-bg px-2 py-1">
                  {role.kind === 'custom' ? t('members.deploymentDefinedRole') : t('members.builtInRole')}
                </span>
              </td>
              <td className="type-code break-words px-5 py-4 align-top text-ui-text-muted">{role.key}</td>
              <td className="type-caption px-5 py-4 align-top text-ui-text-muted">
                {role.capabilities.slice(0, 6).map((capability) => capability.replaceAll('_', ' ')).join(', ')}
                {role.capabilities.length > 6 ? ` +${role.capabilities.length - 6}` : ''}
              </td>
            </tr>
          ))}
          {roleTemplates.length === 0 && (
            <tr>
              <td colSpan={4} className="type-body px-5 py-8 text-center">
                {t('members.loadingRoles')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
