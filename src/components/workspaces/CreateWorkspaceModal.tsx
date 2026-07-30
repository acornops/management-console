import React from 'react';
import { BotMessageSquare, Check, KeyRound, Loader2, MailPlus, Plus, Trash2, Users, Workflow } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, CloseButton, DialogFrame, FieldValidationMessage, fieldInvalidClass, ModalStepIndicator, Select, TextInput } from '@acornops/ui';
import type { SelectOption } from '@acornops/ui';
import { CreateWorkspaceMemberResult } from '@/components/workspaces/CreateWorkspaceMemberResult';
import { formatMemberMutationError, formatRole } from '@/pages/workspace-members/memberUtils';
import {
  ProjectMember,
  Workspace,
  WorkspaceAiSettings,
  WorkspaceInvitation,
  WorkspaceMemberAccessResult,
  WorkspaceRoleTemplate
} from '@/types';
import {
  type CreateWorkspaceInviteRow,
  getDuplicateInviteEmailKeys,
  getSubmittableInviteRows,
  hasInheritedPlatformLlmCredential,
  isSelfInviteEmail,
  isValidWorkspaceInviteEmail,
  MAX_CREATE_WORKSPACE_INVITE_ROWS,
  normalizeInviteEmail
} from '@/components/workspaces/CreateWorkspaceModal.helpers';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  currentUserEmail: string;
  onClose: () => void;
  onCreateWorkspace: (name: string) => Promise<Workspace>;
  onLoadWorkspaceAiSettings: (workspaceId: string) => Promise<WorkspaceAiSettings>;
  onOpenAiSettings: (workspaceId: string) => void;
  onLoadWorkspaceRoles: (workspaceId: string) => Promise<WorkspaceRoleTemplate[]>;
  onAddOrInviteWorkspaceMember: (
    workspaceId: string,
    input: { email: string; role: ProjectMember['role'] }
  ) => Promise<WorkspaceMemberAccessResult>;
}

type CreateWorkspaceStep = 'details' | 'members' | 'ai';
function createRowId(): string {
  return globalThis.crypto?.randomUUID?.() || `invite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createInviteRow(role: ProjectMember['role'] = ''): CreateWorkspaceInviteRow {
  return {
    id: createRowId(),
    email: '',
    role,
    status: 'idle'
  };
}

function defaultInviteRole(roles: WorkspaceRoleTemplate[]): ProjectMember['role'] {
  return roles.find((role) => !role.protected)?.key || roles[0]?.key || '';
}

function formatWorkspaceCreationError(error: unknown, fallback: string): string {
  return formatMemberMutationError(error, fallback);
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  currentUserEmail,
  onClose,
  onCreateWorkspace,
  onLoadWorkspaceAiSettings,
  onOpenAiSettings,
  onLoadWorkspaceRoles,
  onAddOrInviteWorkspaceMember
}) => {
  const { t } = useTranslation();
  const workspaceNameInputRef = React.useRef<HTMLInputElement>(null);
  const [step, setStep] = React.useState<CreateWorkspaceStep>('details');
  const [workspaceName, setWorkspaceName] = React.useState('');
  const [createdWorkspace, setCreatedWorkspace] = React.useState<Workspace | null>(null);
  const [hasInheritedLlmCredential, setHasInheritedLlmCredential] = React.useState(false);
  const [isLoadingAiDefaults, setIsLoadingAiDefaults] = React.useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [roleTemplates, setRoleTemplates] = React.useState<WorkspaceRoleTemplate[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = React.useState(false);
  const [roleLoadError, setRoleLoadError] = React.useState<string | null>(null);
  const [inviteRows, setInviteRows] = React.useState<CreateWorkspaceInviteRow[]>([createInviteRow()]);
  const [isCreatingInvites, setIsCreatingInvites] = React.useState(false);
  const [inviteSummaryError, setInviteSummaryError] = React.useState<string | null>(null);
  const [copiedInviteRowId, setCopiedInviteRowId] = React.useState<string | null>(null);
  const copiedInviteTimerRef = React.useRef<number | null>(null);

  const createSteps = React.useMemo(() => [
      { id: 'details', label: t('workspaceCreate.stepWorkspace') },
      { id: 'members', label: t('workspaceCreate.stepInviteMembers') },
      ...(!hasInheritedLlmCredential ? [{ id: 'ai', label: t('workspaceCreate.stepAiProvider') }] : [])
    ],
    [hasInheritedLlmCredential, t]
  );
  const roleOptions: Array<SelectOption<ProjectMember['role']>> = React.useMemo(
    () =>
      roleTemplates.map((role) => ({
        value: role.key,
        label: formatRole(role.key, role)
      })),
    [roleTemplates]
  );
  const hasCompletedMemberSetup = inviteRows.some((row) => row.status === 'created');
  const hasRowsToSubmit = getSubmittableInviteRows(inviteRows).length > 0;
  const closeDisabled = isCreatingWorkspace || isCreatingInvites;

  React.useEffect(
    () => () => {
      if (copiedInviteTimerRef.current) {
        window.clearTimeout(copiedInviteTimerRef.current);
      }
    },
    []
  );

  React.useEffect(() => {
    if (isOpen) return;
    if (copiedInviteTimerRef.current) {
      window.clearTimeout(copiedInviteTimerRef.current);
      copiedInviteTimerRef.current = null;
    }
    setStep('details');
    setWorkspaceName('');
    setCreatedWorkspace(null);
    setHasInheritedLlmCredential(false);
    setIsLoadingAiDefaults(false);
    setIsCreatingWorkspace(false);
    setCreateError(null);
    setRoleTemplates([]);
    setIsLoadingRoles(false);
    setRoleLoadError(null);
    setInviteRows([createInviteRow()]);
    setIsCreatingInvites(false);
    setInviteSummaryError(null);
    setCopiedInviteRowId(null);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || step !== 'members' || !createdWorkspace) return undefined;

    let cancelled = false;
    setIsLoadingRoles(true);
    setRoleLoadError(null);
    void onLoadWorkspaceRoles(createdWorkspace.id)
      .then((roles) => {
        if (cancelled) return;
        const nextDefaultRole = defaultInviteRole(roles);
        setRoleTemplates(roles);
        setInviteRows((current) =>
          current.map((row) => ({
            ...row,
            role: row.role && roles.some((role) => role.key === row.role) ? row.role : nextDefaultRole
          }))
        );
      })
      .catch(() => {
        if (!cancelled) {
          setRoleLoadError(t('workspaceCreate.rolesLoadFailed'));
          setRoleTemplates([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingRoles(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [createdWorkspace, isOpen, onLoadWorkspaceRoles, step, t]);

  React.useEffect(() => {
    if (!isOpen || !createdWorkspace) return undefined;
    let cancelled = false;
    setIsLoadingAiDefaults(true);
    void onLoadWorkspaceAiSettings(createdWorkspace.id)
      .then((settings) => {
        if (!cancelled) {
          setHasInheritedLlmCredential(hasInheritedPlatformLlmCredential(settings));
        }
      })
      .catch(() => {
        if (!cancelled) setHasInheritedLlmCredential(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAiDefaults(false);
      });
    return () => {
      cancelled = true;
    };
  }, [createdWorkspace, isOpen, onLoadWorkspaceAiSettings]);

  if (!isOpen) {
    return null;
  }

  const updateInviteRow = (rowId: string, updates: Partial<CreateWorkspaceInviteRow>) => {
    setInviteRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          ...updates,
          status: row.status === 'created' ? row.status : 'idle',
          error: undefined
        };
      })
    );
  };

  const addInviteRow = () => {
    const nextRole = defaultInviteRole(roleTemplates);
    setInviteRows((current) => (current.length >= MAX_CREATE_WORKSPACE_INVITE_ROWS ? current : [...current, createInviteRow(nextRole)]));
  };

  const removeInviteRow = (rowId: string) => {
    setInviteRows((current) => {
      const nextRows = current.filter((row) => row.id !== rowId);
      return nextRows.length > 0 ? nextRows : [createInviteRow(defaultInviteRole(roleTemplates))];
    });
  };

  const createWorkspace = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = workspaceName.trim();
    if (!name || isCreatingWorkspace) return;

    setIsCreatingWorkspace(true);
    setCreateError(null);
    try {
      const workspace = await onCreateWorkspace(name);
      // Block the members-step actions before the effect-driven lookup starts.
      // Otherwise a fast click can enter the AI step during the render between
      // creating the workspace and beginning the inherited-default request.
      setIsLoadingAiDefaults(true);
      setCreatedWorkspace(workspace);
      setStep('members');
    } catch (error) {
      setCreateError(formatWorkspaceCreationError(error, t('app.failedCreateWorkspace')));
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const markValidationErrors = (rows: CreateWorkspaceInviteRow[]): boolean => {
    const duplicateEmails = getDuplicateInviteEmailKeys(rows);
    const errorsByRowId = new Map<string, string>();
    for (const row of rows) {
      if (row.status === 'created') continue;
      const trimmedEmail = row.email.trim();
      if (!trimmedEmail) continue;
      if (!isValidWorkspaceInviteEmail(trimmedEmail)) {
        errorsByRowId.set(row.id, t('members.emailInvalid'));
      } else if (isSelfInviteEmail(trimmedEmail, currentUserEmail)) {
        errorsByRowId.set(row.id, t('workspaceCreate.selfInvite'));
      } else if (duplicateEmails.has(normalizeInviteEmail(trimmedEmail))) {
        errorsByRowId.set(row.id, t('workspaceCreate.duplicateEmail'));
      } else if (!roleTemplates.some((role) => role.key === row.role)) {
        errorsByRowId.set(row.id, t('workspaceCreate.roleRequired'));
      }
    }
    setInviteRows((current) =>
      current.map((row) => {
        if (row.status === 'created') return row;
        const trimmedEmail = row.email.trim();
        if (!trimmedEmail) {
          return { ...row, status: 'idle', error: undefined };
        }
        const error = errorsByRowId.get(row.id);
        if (error) {
          return { ...row, status: 'failed', error };
        }
        return { ...row, status: 'idle', error: undefined };
      })
    );
    return errorsByRowId.size > 0;
  };

  const addOrInviteMembers = async () => {
    if (!createdWorkspace || isCreatingInvites || isLoadingAiDefaults) return;
    const rowsToSubmit = getSubmittableInviteRows(inviteRows);
    if (rowsToSubmit.length === 0) {
      if (hasInheritedLlmCredential) {
        onClose();
      } else {
        setStep('ai');
      }
      return;
    }
    if (roleLoadError || roleTemplates.length === 0) {
      setInviteSummaryError(roleLoadError || t('workspaceCreate.rolesLoadFailed'));
      return;
    }
    if (markValidationErrors(inviteRows)) {
      setInviteSummaryError(t('workspaceCreate.fixMemberAccessErrors'));
      return;
    }

    setIsCreatingInvites(true);
    setInviteSummaryError(null);
    const rowIds = new Set(rowsToSubmit.map((row) => row.id));
    setInviteRows((current) => current.map((row) => (rowIds.has(row.id) ? { ...row, status: 'creating', error: undefined } : row)));

    const results = await Promise.allSettled(
      rowsToSubmit.map(async (row) => {
        const access = await onAddOrInviteWorkspaceMember(createdWorkspace.id, {
          email: normalizeInviteEmail(row.email),
          role: row.role
        });
        return { rowId: row.id, access };
      })
    );

    const successes = new Map<string, WorkspaceMemberAccessResult>();
    const failures = new Map<string, string>();
    results.forEach((result, index) => {
      const row = rowsToSubmit[index];
      if (!row) return;
      if (result.status === 'fulfilled') {
        successes.set(result.value.rowId, result.value.access);
      } else {
        failures.set(row.id, formatWorkspaceCreationError(result.reason, t('members.createInviteFailed')));
      }
    });

    setInviteRows((current) =>
      current.map((row) => {
        const access = successes.get(row.id);
        if (access?.kind === 'member') {
          return {
            ...row,
            email: access.member.email,
            role: access.member.role,
            status: 'created',
            member: access.member,
            invitation: undefined,
            error: undefined
          };
        }
        if (access?.kind === 'invitation') {
          return {
            ...row,
            email: access.invitation.email,
            role: access.invitation.role,
            status: 'created',
            member: undefined,
            invitation: access.invitation,
            error: undefined
          };
        }
        const error = failures.get(row.id);
        if (error) {
          return { ...row, status: 'failed', error };
        }
        return row;
      })
    );
    setInviteSummaryError(failures.size > 0 ? t('workspaceCreate.partialMemberAccessFailure') : null);
    setIsCreatingInvites(false);
  };

  const copyInviteLink = async (row: CreateWorkspaceInviteRow) => {
    if (!row.invitation?.inviteLink) return;
    try {
      await navigator.clipboard.writeText(row.invitation.inviteLink);
      if (copiedInviteTimerRef.current) {
        window.clearTimeout(copiedInviteTimerRef.current);
      }
      setCopiedInviteRowId(row.id);
      copiedInviteTimerRef.current = window.setTimeout(() => {
        setCopiedInviteRowId((current) => (current === row.id ? null : current));
        copiedInviteTimerRef.current = null;
      }, 2200);
    } catch {
      setInviteSummaryError(t('members.copyFailed'));
    }
  };

  return (
    <DialogFrame unframed
      titleId="create-workspace-title"
      initialFocusRef={workspaceNameInputRef}
      closeDisabled={closeDisabled}
      className="relative flex max-h-[min(92vh,44rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
      onClose={onClose}
    >
      <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-4">
        <div>
          <h3 id="create-workspace-title" className="type-panel-title">
            {t('app.createWorkspace')}
          </h3>
          <ModalStepIndicator steps={createSteps} currentStepId={step} compactOnMobile className="mt-4" />
        </div>
        <CloseButton onClick={onClose} disabled={closeDisabled} aria-label={t('app.closeCreateWorkspaceDialog')} />
      </div>

      {step === 'details' ? (
        <form onSubmit={(event) => void createWorkspace(event)} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-6 custom-scrollbar md:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-5 rounded-lg border border-ui-border bg-ui-bg p-5">
              <section className="space-y-3">
                <label htmlFor="create-workspace-name-input" className="block px-1 type-micro-label">
                  {t('app.workspaceName')}
                </label>
                <TextInput
                  id="create-workspace-name-input"
                  ref={workspaceNameInputRef}
                  value={workspaceName}
                  onChange={(event) => {
                    setCreateError(null);
                    setWorkspaceName(event.target.value);
                  }}
                  disabled={isCreatingWorkspace}
                  placeholder={t('app.workspaceNamePlaceholder')}
                  className="px-4 type-ui"
                />
              </section>
              {createError && (
                <div className="rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 type-caption type-emphasis leading-5 text-status-danger-text">
                  {createError}
                </div>
              )}
            </div>
            <aside className="rounded-lg border border-ui-border bg-ui-surface p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-strong">
                  <Users className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h4 className="type-row-title">{t('workspaceCreate.ownerAccessTitle')}</h4>
                  <p className="type-caption mt-2 text-ui-text-muted">{t('workspaceCreate.ownerAccessBody')}</p>
                </div>
              </div>
            </aside>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
            <Button onClick={onClose} disabled={isCreatingWorkspace} variant="secondary" size="sm" className="rounded-lg">
              {t('app.cancel')}
            </Button>
            <Button type="submit" disabled={!workspaceName.trim() || isCreatingWorkspace} variant="primary" size="sm" className="rounded-lg">
              {isCreatingWorkspace ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              {isCreatingWorkspace ? t('workspaceCreate.creating') : t('workspaceCreate.createAndContinue')}
            </Button>
          </div>
        </form>
      ) : step === 'members' ? (
        <>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6 custom-scrollbar">
            <div className="rounded-lg border border-ui-border bg-ui-bg px-4 py-4 type-ui leading-6 text-ui-text-muted">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-accent-strong">
                  <MailPlus className="h-4 w-4" aria-hidden="true" />
                </span>
                <p>{t('workspaceCreate.memberAccessBody')}</p>
              </div>
            </div>

            {isLoadingRoles && (
              <div className="rounded-lg border border-ui-border bg-ui-surface px-4 py-3 type-caption type-emphasis leading-5 text-ui-text-muted">
                {t('workspaceCreate.loadingRoles')}
              </div>
            )}

            {roleLoadError && (
              <div className="rounded-lg border border-status-warning/25 bg-status-warning-soft px-4 py-3 type-caption type-emphasis leading-5 text-status-warning-text">
                {roleLoadError}
              </div>
            )}

            <div className="space-y-3">
              {inviteRows.map((row, index) => {
                const rowDisabled = isCreatingInvites || row.status === 'created' || Boolean(roleLoadError) || roleTemplates.length === 0;
                const emailErrorId = `create-workspace-invite-${row.id}-error`;
                return (
                  <div key={row.id} className="rounded-lg border border-ui-border bg-ui-surface p-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-start">
                      <div className="space-y-2">
                        <label htmlFor={`create-workspace-invite-${row.id}-email`} className="block type-label">
                          {t('workspaceCreate.memberEmailLabel', { number: index + 1 })}
                        </label>
                        <TextInput
                          id={`create-workspace-invite-${row.id}-email`}
                          type="email"
                          value={row.email}
                          onChange={(event) =>
                            updateInviteRow(row.id, {
                              email: event.target.value
                            })
                          }
                          disabled={rowDisabled}
                          placeholder={t('members.emailPlaceholder')}
                          className={`px-4 ${row.error ? fieldInvalidClass : ''}`}
                          aria-invalid={Boolean(row.error)}
                          aria-describedby={row.error ? emailErrorId : undefined}
                        />
                        <FieldValidationMessage id={emailErrorId} message={row.error} />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor={`create-workspace-invite-${row.id}-role`} className="block type-label">
                          {t('members.role')}
                        </label>
                        <Select<ProjectMember['role']>
                          id={`create-workspace-invite-${row.id}-role`}
                          value={row.role}
                          options={roleOptions}
                          onChange={(role) => updateInviteRow(row.id, { role })}
                          disabled={rowDisabled}
                          ariaLabel={t('members.role')}
                          size="md"
                        />
                      </div>

                      <div className="flex justify-end md:items-start md:pt-6">
                        <Button
                          onClick={() => removeInviteRow(row.id)}
                          disabled={isCreatingInvites || row.status === 'created' || inviteRows.length === 1}
                          variant="icon"
                          size="icon"
                          className="sm:h-11 sm:w-11"
                          aria-label={t('workspaceCreate.removeMemberRow')}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>

                    {row.status === 'created' && (row.member || row.invitation) && (
                      <CreateWorkspaceMemberResult
                        member={row.member}
                        invitation={row.invitation}
                        copied={copiedInviteRowId === row.id}
                        onCopyInvitation={() => void copyInviteLink(row)}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                onClick={addInviteRow}
                disabled={isCreatingInvites || inviteRows.length >= MAX_CREATE_WORKSPACE_INVITE_ROWS || Boolean(roleLoadError) || roleTemplates.length === 0}
                variant="secondary"
                size="sm"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('workspaceCreate.addMemberRow')}
              </Button>
              <span className="type-caption type-emphasis text-ui-text-muted">
                {t('workspaceCreate.memberRowLimit', { count: inviteRows.length, max: MAX_CREATE_WORKSPACE_INVITE_ROWS })}
              </span>
            </div>

            {inviteSummaryError && (
              <div className="rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 type-caption type-emphasis leading-5 text-status-danger-text">
                {inviteSummaryError}
              </div>
            )}
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-ui-border bg-ui-bg px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              onClick={() => hasInheritedLlmCredential ? onClose() : setStep('ai')}
              disabled={isCreatingInvites || isLoadingAiDefaults}
              variant="secondary"
              size="sm"
              className="rounded-lg"
            >
              {isLoadingAiDefaults && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isLoadingAiDefaults
                ? t('workspaceCreate.checkingAiDefaults')
                : hasInheritedLlmCredential
                  ? t('workspaceCreate.done')
                  : hasCompletedMemberSetup
                    ? t('workspaceCreate.continue')
                    : t('workspaceCreate.skipMembers')}
            </Button>
            {(hasRowsToSubmit || !hasCompletedMemberSetup) && (
              <Button
                onClick={() => void addOrInviteMembers()}
                disabled={isCreatingInvites || isLoadingAiDefaults || isLoadingRoles || Boolean(roleLoadError) || roleTemplates.length === 0 || (!hasRowsToSubmit && !hasCompletedMemberSetup)}
                variant="primary"
                size="sm"
                className="rounded-lg"
              >
                {isCreatingInvites && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {hasCompletedMemberSetup ? t('workspaceCreate.retryFailedMembers') : t('workspaceCreate.addOrInviteMembers')}
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="mx-auto max-w-2xl py-3 sm:py-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-accent/20 bg-accent-soft text-accent-strong">
                <KeyRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="type-micro-label mt-5 text-accent-strong">{t('workspaceCreate.aiSetupKicker')}</p>
              <h4 className="type-section-title mt-2 text-ui-text">{t('workspaceCreate.aiSetupTitle')}</h4>
              <p className="type-body mt-2 max-w-[65ch] text-ui-text-muted">{t('workspaceCreate.aiSetupBody')}</p>

              <div className="mt-6 divide-y divide-ui-border border-y border-ui-border">
                <div className="flex items-start gap-3 py-4">
                  <BotMessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-accent-strong" aria-hidden="true" />
                  <div>
                    <p className="type-row-title text-ui-text">{t('workspaceCreate.aiSetupAssistantTitle')}</p>
                    <p className="type-caption mt-1 text-ui-text-muted">{t('workspaceCreate.aiSetupAssistantBody')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 py-4">
                  <Workflow className="mt-0.5 h-4 w-4 shrink-0 text-accent-strong" aria-hidden="true" />
                  <div>
                    <p className="type-row-title text-ui-text">{t('workspaceCreate.aiSetupAutomationTitle')}</p>
                    <p className="type-caption mt-1 text-ui-text-muted">{t('workspaceCreate.aiSetupAutomationBody')}</p>
                  </div>
                </div>
              </div>

              <p className="type-caption mt-5 text-ui-text-muted">{t('workspaceCreate.aiSetupOptionalNote')}</p>
              <p className="type-caption mt-3 type-emphasis text-ui-text-muted">{t('workspaceCreate.aiSettingsTransition')}</p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-ui-border bg-ui-bg px-6 py-4 sm:flex-row sm:justify-end">
            <Button onClick={onClose} variant="secondary" size="sm" className="rounded-lg">
              {t('workspaceCreate.skipForNow')}
            </Button>
            <Button
              onClick={() => {
                if (createdWorkspace) {
                  onOpenAiSettings(createdWorkspace.id);
                }
              }}
              disabled={!createdWorkspace}
              variant="primary"
              size="sm"
              className="rounded-lg"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {t('workspaceCreate.openAiSettings')}
            </Button>
          </div>
        </>
      )}
    </DialogFrame>
  );
};
