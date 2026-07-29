import React from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, TextInput } from '@acornops/ui';
import type { ProjectMember, WorkspaceInvitation } from '@/types';

interface CreateWorkspaceMemberResultProps {
  member?: ProjectMember;
  invitation?: WorkspaceInvitation;
  copied: boolean;
  onCopyInvitation: () => void;
}

export const CreateWorkspaceMemberResult: React.FC<CreateWorkspaceMemberResultProps> = ({
  member,
  invitation,
  copied,
  onCopyInvitation
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-4 space-y-3 border-t border-ui-border pt-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ui-text-muted">
        <Check className="h-4 w-4 text-status-success-text" aria-hidden="true" />
        {member ? t('workspaceCreate.memberAdded') : t('workspaceCreate.inviteCreated')}
      </div>
      {invitation && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <TextInput
            readOnly
            value={invitation.inviteLink || ''}
            onFocus={(event) => event.currentTarget.select()}
            className="min-w-0 flex-1"
          />
          <Button onClick={onCopyInvitation} variant="secondary" size="sm" className="uppercase tracking-widest">
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? t('members.copied') : t('members.copy')}
          </Button>
        </div>
      )}
    </div>
  );
};
