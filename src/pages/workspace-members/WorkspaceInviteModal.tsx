import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Link, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { FieldValidationMessage, fieldInvalidClass } from '@/components/common/FieldValidationMessage';
import { Select, SelectOption } from '@/components/common/Select';
import { formInputClassName } from '@/components/common/formControlStyles';
import { modalOverlayMotion, modalPanelMotion } from '@/lib/motion';
import { ProjectMember, WorkspaceInvitation, WorkspaceRoleTemplate } from '@/types';
import { formatMemberMutationError, formatRole } from '@/pages/workspace-members/memberUtils';
import { RoleTemplatePreview } from '@/pages/workspace-members/RoleTemplatePreview';

interface WorkspaceInviteModalProps {
  canManageOwners: boolean;
  roleTemplates: WorkspaceRoleTemplate[];
  onClose: () => void;
  onCreateInvitation?: (input: { email: string; role: ProjectMember['role'] }) => Promise<WorkspaceInvitation>;
}

function isValidInviteEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const WorkspaceInviteModal: React.FC<WorkspaceInviteModalProps> = ({
  canManageOwners,
  roleTemplates,
  onClose,
  onCreateInvitation
}) => {
  const { t } = useTranslation();
  const defaultRole = roleTemplates.find((role) => !role.protected)?.key || roleTemplates[0]?.key || '';
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ProjectMember['role']>(defaultRole);
  const [createdInvite, setCreatedInvite] = useState<WorkspaceInvitation | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteErrorMessage, setInviteErrorMessage] = useState<string | null>(null);
  const [inviteEmailError, setInviteEmailError] = useState<string | undefined>();
  const [hasCopiedInvite, setHasCopiedInvite] = useState(false);
  const roleOptions: Array<SelectOption<ProjectMember['role']>> = roleTemplates.map((role) => ({
    value: role.key,
    label: formatRole(role.key, role),
    disabled: role.protected && !canManageOwners
  }));
  const selectedInviteRoleTemplate = roleTemplates.find((role) => role.key === inviteRole);

  useEffect(() => {
    if (roleTemplates.some((role) => role.key === inviteRole)) return;
    const nextRole = roleTemplates.find((role) => !role.protected)?.key || roleTemplates[0]?.key;
    if (nextRole) {
      setInviteRole(nextRole);
    }
  }, [inviteRole, roleTemplates]);

  const createInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onCreateInvitation) return;
    const normalizedEmail = inviteEmail.trim();
    if (!normalizedEmail) {
      setInviteEmailError(t('members.emailRequired'));
      return;
    }
    if (!isValidInviteEmail(normalizedEmail)) {
      setInviteEmailError(t('members.emailInvalid'));
      return;
    }
    const selectedRole = roleTemplates.find((role) => role.key === inviteRole);
    if (!selectedRole) {
      setInviteErrorMessage(t('members.createInviteFailed'));
      return;
    }
    if (selectedRole.protected && !canManageOwners) {
      setInviteErrorMessage(t('members.ownerInviteOnly'));
      return;
    }
    setInviteEmailError(undefined);
    setIsCreatingInvite(true);
    setInviteErrorMessage(null);
    setCreatedInvite(null);
    setHasCopiedInvite(false);
    try {
      const invitation = await onCreateInvitation({ email: normalizedEmail, role: inviteRole });
      setCreatedInvite(invitation);
    } catch (error) {
      setInviteErrorMessage(formatMemberMutationError(error, t('members.createInviteFailed')));
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const copyInviteLink = async () => {
    if (!createdInvite?.inviteLink) return;
    try {
      await navigator.clipboard.writeText(createdInvite.inviteLink);
      setHasCopiedInvite(true);
      window.setTimeout(() => setHasCopiedInvite(false), 2200);
    } catch {
      setInviteErrorMessage(t('members.copyFailed'));
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-ui-text/40 p-6 dark:bg-ui-bg/75"
      {...modalOverlayMotion}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-member-title"
        className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
        {...modalPanelMotion}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ui-border px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 id="invite-member-title" className="text-lg font-bold tracking-tight text-ui-text">{t('members.inviteMember')}</h2>
            <p className="mt-1 text-xs font-medium text-ui-text-muted">{t('members.inviteBody')}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-accent-strong"
            aria-label={t('members.closeInvite')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(event) => void createInvite(event)} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 custom-scrollbar sm:p-6">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(12rem,0.8fr)]">
              <div className="space-y-2">
                <label htmlFor="workspace-invite-email" className="block text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('members.email')}</label>
                <input
                  id="workspace-invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => {
                    setInviteEmailError(undefined);
                    setInviteEmail(event.target.value);
                  }}
                  disabled={Boolean(createdInvite) || isCreatingInvite}
                  placeholder={t('members.emailPlaceholder')}
                  className={formInputClassName(`px-4 ${inviteEmailError ? fieldInvalidClass : ''}`)}
                  aria-invalid={Boolean(inviteEmailError)}
                  aria-describedby={inviteEmailError ? 'workspace-invite-email-error' : undefined}
                />
                <FieldValidationMessage id="workspace-invite-email-error" message={inviteEmailError} />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('members.role')}</label>
                <Select<ProjectMember['role']>
                  value={inviteRole}
                  options={roleOptions}
                  onChange={setInviteRole}
                  disabled={Boolean(createdInvite) || isCreatingInvite}
                />
              </div>
            </div>

            <RoleTemplatePreview
              roleTemplate={selectedInviteRoleTemplate}
              emptyMessage={t('members.rolePreviewUnavailable')}
            />

            <div className="border-t border-ui-border pt-4 text-xs font-medium leading-5 text-ui-text-muted">
              <p className="font-bold uppercase tracking-widest text-ui-text">{t('members.inviteHowItWorks')}</p>
              <p className="mt-1">{t('members.inviteHowItWorksBody')}</p>
            </div>

            {createdInvite && (
              <div className="space-y-3 rounded-lg border border-ui-border bg-ui-bg p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ui-text-muted">
                  <Link className="h-4 w-4 text-accent-strong" />
                  {t('members.inviteLink')}
                </div>
                {createdInvite.inviteLink ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      readOnly
                      value={createdInvite.inviteLink}
                      onFocus={(event) => event.currentTarget.select()}
                      className={formInputClassName('min-w-0 flex-1')}
                    />
                    <Button onClick={() => void copyInviteLink()} variant="secondary" size="sm" className="uppercase tracking-widest">
                      {hasCopiedInvite ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {hasCopiedInvite ? t('members.copied') : t('members.copy')}
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-status-warning/25 bg-status-warning-soft px-3 py-2 text-xs font-semibold leading-5 text-status-warning-text">
                    {t('members.linkReturnedOnce')}
                  </div>
                )}
                <p className="text-xs font-medium leading-5 text-ui-text-muted">
                  {t('members.recipientMustUseEmail', { email: createdInvite.email, time: new Date(createdInvite.expiresAt).toLocaleString() })}
                </p>
              </div>
            )}

            {inviteErrorMessage && (
              <div className="rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-xs font-semibold leading-5 text-status-danger-text">
                {inviteErrorMessage}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-ui-border bg-ui-surface px-5 py-4 sm:flex-row sm:justify-end sm:px-6 sm:py-5">
            <Button
              onClick={onClose}
              variant="secondary"
              size="lg"
              className="w-full text-xs uppercase tracking-widest sm:w-auto sm:min-w-36"
            >
              {t('members.close')}
            </Button>
            {!createdInvite && (
              <Button
                type="submit"
                disabled={isCreatingInvite || !roleTemplates.some((role) => role.key === inviteRole)}
                variant="primary"
                size="lg"
                className="w-full text-xs uppercase tracking-widest sm:w-auto sm:min-w-40"
              >
                {isCreatingInvite && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('members.createLink')}
              </Button>
            )}
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
