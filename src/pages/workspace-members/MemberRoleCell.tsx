import React from 'react';
import { Shield } from 'lucide-react';
import { ProjectMember, WorkspaceRoleTemplate } from '@/types';
import { formatRole } from './memberUtils';

interface MemberRoleCellProps {
  member: ProjectMember;
  roleTemplate?: WorkspaceRoleTemplate;
}

export const MemberRoleCell: React.FC<MemberRoleCellProps> = ({
  member,
  roleTemplate
}) => {
  const highlightRole = roleTemplate?.protected || roleTemplate?.capabilities.includes('manage_members');

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Shield className={`h-4 w-4 shrink-0 ${highlightRole ? 'text-accent-strong' : 'text-ui-text-muted'}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <span className="type-ui min-w-0 break-words text-ui-text">{formatRole(member.role, roleTemplate)}</span>
      </div>
    </div>
  );
};
