import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineAlert, InlineConfirmation } from '@acornops/ui';
import { CloseButton } from '@acornops/ui';
import { DangerZone, DangerZoneRow } from '@acornops/ui';
import { DrawerFrame } from '@acornops/ui';
import { Select, SelectOption } from '@acornops/ui';
import { ProjectMember, WorkspaceRoleTemplate } from '@/types';
import { formatRole, getInitials } from './memberUtils';
import { RoleTemplatePreview } from './RoleTemplatePreview';
import { RoleChangeConfirmation } from './RoleChangeConfirmation';

interface WorkspaceMemberDetailsPanelProps {
  selectedMember: ProjectMember | null;
  selectedMemberRoleTemplate?: WorkspaceRoleTemplate;
  pendingRole: ProjectMember['role'];
  pendingRoleTemplate?: WorkspaceRoleTemplate;
  roleOptions: Array<SelectOption<ProjectMember['role']>>;
  hasPendingRoleChange: boolean;
  canEditSelectedMember: boolean;
  selectedMemberIsOnlyOwner: boolean;
  isSaving: boolean;
  isConfirmingRemove: boolean;
  errorMessage: string | null;
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onPendingRoleChange: (role: ProjectMember['role']) => void;
  onConfirmRemove: () => void;
  onCancelRemove: () => void;
  onRemoveMember: () => void;
  onCancelRoleChange: () => void;
  onConfirmRoleChange: () => void;
}

export const WorkspaceMemberDetailsPanel: React.FC<WorkspaceMemberDetailsPanelProps> = ({
  selectedMember,
  selectedMemberRoleTemplate,
  pendingRole,
  pendingRoleTemplate,
  roleOptions,
  hasPendingRoleChange,
  canEditSelectedMember,
  selectedMemberIsOnlyOwner,
  isSaving,
  isConfirmingRemove,
  errorMessage,
  closeButtonRef,
  onClose,
  onPendingRoleChange,
  onConfirmRemove,
  onCancelRemove,
  onRemoveMember,
  onCancelRoleChange,
  onConfirmRoleChange
}) => {
  const { t } = useTranslation();

  return (
    <DrawerFrame unframed isOpen={Boolean(selectedMember)} onClose={onClose} titleId="member-details-title" initialFocusRef={closeButtonRef}>
      {selectedMember && (
        <>
          <div className="flex items-center justify-between border-b border-ui-border px-8 py-6">
            <h2 id="member-details-title" className="type-section-title">
              {t('members.memberDetails')}
            </h2>
            <CloseButton ref={closeButtonRef} onClick={onClose} aria-label={t('members.closeMemberDetails')} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-5 border-b border-ui-border bg-ui-bg/60 px-8 py-6">
              <div className="type-section-title flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-ui-text text-ui-bg">{getInitials(selectedMember)}</div>
              <div className="min-w-0">
                <h3 className="type-section-title truncate">{selectedMember.name}</h3>
                <p className="type-body mt-1 truncate">{selectedMember.email}</p>
                <div className="type-label mt-3 w-fit rounded-full bg-ui-surface px-3 py-1 text-ui-text">{formatRole(selectedMember.role, selectedMemberRoleTemplate)}</div>
              </div>
            </div>

            <div className="space-y-3 border-b border-ui-border px-8 py-6">
              <label className="type-label block px-1">{t('members.role')}</label>
              <Select<ProjectMember['role']> value={pendingRole} options={roleOptions} onChange={onPendingRoleChange} disabled={!canEditSelectedMember || isSaving} />
              {!canEditSelectedMember && <p className="type-caption px-1">{t('members.noManageMemberAccess')}</p>}
              {selectedMemberIsOnlyOwner && <p className="type-caption px-1">{t('members.onlyOwnerWarning')}</p>}
              <RoleTemplatePreview roleTemplate={pendingRoleTemplate} emptyMessage={t('members.rolePreviewUnavailable')} />
              {hasPendingRoleChange && (
                <RoleChangeConfirmation
                  currentRoleTemplate={selectedMemberRoleTemplate}
                  pendingRoleTemplate={pendingRoleTemplate}
                  isSaving={isSaving}
                  disabled={!canEditSelectedMember || selectedMemberIsOnlyOwner}
                  onCancel={onCancelRoleChange}
                  onConfirm={onConfirmRoleChange}
                />
              )}
            </div>

            {errorMessage && <InlineAlert tone="danger" role="alert" className="rounded-none border-x-0 border-t-0 px-8 py-3">{errorMessage}</InlineAlert>}

            <DangerZone className="m-5">
              {isConfirmingRemove ? (
                <InlineConfirmation
                  id="member-remove-access-confirmation"
                  title={t('members.confirmRemoveAccess')}
                  description={t('members.confirmRemoveAccessBody', { name: selectedMember.name })}
                  tone="warning"
                  cancelLabel={t('app.cancel')}
                  confirmLabel={isSaving ? t('members.removing') : t('members.confirmRemove')}
                  confirmVariant="danger"
                  confirmDisabled={!canEditSelectedMember || isSaving}
                  onCancel={onCancelRemove}
                  onConfirm={onRemoveMember}
                />
              ) : (
                <DangerZoneRow
                  id="member-remove-access-title"
                  title={t('members.removeAccess')}
                  description={t('members.removeAccessBody')}
                  headingLevel="h3"
                  tone="danger"
                  actionClassName="sm:w-36"
                  action={
                    <Button type="button" variant="danger" size="sm" className="w-full" onClick={onConfirmRemove} disabled={!canEditSelectedMember || isSaving}>
                      {t('members.removeAccess')}
                    </Button>
                  }
                />
              )}
            </DangerZone>
          </div>
        </>
      )}
    </DrawerFrame>
  );
};
