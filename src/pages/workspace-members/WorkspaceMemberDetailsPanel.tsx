import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { CloseButton } from '@/components/common/ComponentVocabulary';
import { RightSidePanel } from '@/components/common/RightSidePanel';
import { Select, SelectOption } from '@/components/common/Select';
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
    <RightSidePanel
      isOpen={Boolean(selectedMember)}
      onClose={onClose}
      titleId="member-details-title"
      initialFocusRef={closeButtonRef}
    >
      {selectedMember && (
        <>
          <div className="flex items-center justify-between border-b border-ui-border px-8 py-6">
            <h2 id="member-details-title" className="type-section-title">{t('members.memberDetails')}</h2>
            <CloseButton
              ref={closeButtonRef}
              onClick={onClose}
              aria-label={t('members.closeMemberDetails')}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-5 border-b border-ui-border bg-ui-bg/60 px-8 py-6">
              <div className="type-data flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-ui-text text-xl text-ui-bg">
                {getInitials(selectedMember)}
              </div>
              <div className="min-w-0">
                <h3 className="type-section-title truncate">{selectedMember.name}</h3>
                <p className="type-body mt-1 truncate">{selectedMember.email}</p>
                <div className="type-label mt-3 w-fit rounded-full bg-ui-surface px-3 py-1 text-ui-text">
                  {formatRole(selectedMember.role, selectedMemberRoleTemplate)}
                </div>
              </div>
            </div>

            <div className="space-y-3 border-b border-ui-border px-8 py-6">
              <label className="type-label block px-1">{t('members.role')}</label>
              <Select<ProjectMember['role']>
                value={pendingRole}
                options={roleOptions}
                onChange={onPendingRoleChange}
                disabled={!canEditSelectedMember || isSaving}
              />
              {!canEditSelectedMember && (
                <p className="type-caption px-1">{t('members.noManageMemberAccess')}</p>
              )}
              {selectedMemberIsOnlyOwner && (
                <p className="type-caption px-1">{t('members.onlyOwnerWarning')}</p>
              )}
              <RoleTemplatePreview
                roleTemplate={pendingRoleTemplate}
                emptyMessage={t('members.rolePreviewUnavailable')}
              />
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

            {errorMessage && (
              <div className="type-caption border-b border-status-danger/20 bg-status-danger-soft px-8 py-3 text-status-danger-text">
                {errorMessage}
              </div>
            )}

            <div className="border-b border-status-danger/20 bg-status-danger-soft px-8 py-5">
              {isConfirmingRemove ? (
                <div className="space-y-4">
                  <div>
                    <p className="type-row-title text-status-danger-text">{t('members.confirmRemoveAccess')}</p>
                    <p className="type-caption mt-1 text-status-danger-text">{t('members.confirmRemoveAccessBody', { name: selectedMember.name })}</p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={onCancelRemove}
                      disabled={isSaving}
                      variant="secondary"
                      size="md"
                      className="flex-1"
                    >
                      {t('app.cancel')}
                    </Button>
                    <Button
                      onClick={onRemoveMember}
                      disabled={!canEditSelectedMember || isSaving}
                      variant="danger"
                      size="md"
                      className="flex-1"
                    >
                      {isSaving ? t('members.removing') : t('members.confirmRemove')}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onConfirmRemove}
                  disabled={!canEditSelectedMember || isSaving}
                  className="control-target type-ui w-full rounded-md px-1 py-1 text-left text-status-danger-text transition-colors hover:text-status-danger-text focus:outline-none focus-visible:ring-2 focus-visible:ring-status-danger/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t('members.removeAccess')}
                  <span className="type-caption mt-1 block text-status-danger-text">
                    {t('members.removeAccessBody')}
                  </span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </RightSidePanel>
  );
};
