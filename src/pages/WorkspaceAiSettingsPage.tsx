import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { InlineAlert } from '@/components/common/InlineAlert';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { Select, SelectOption } from '@/components/common/Select';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formInputClassName } from '@/components/common/formControlStyles';
import { ICONS } from '@/constants';
import { headerMotion } from '@/lib/motion';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { LlmProvider, ReasoningEffort, ReasoningSummaryMode, Workspace, WorkspaceAiSettings } from '@/types';
import {
  behaviorDraftChanged,
  behaviorDraftFromSettings,
  DEFAULT_BEHAVIOR_DRAFT,
  EMPTY_CREDENTIAL_ERRORS,
  EMPTY_PROVIDER_KEYS,
  modelsForProvider,
  PROVIDERS,
  providerLabel,
  reasoningEffortLabel,
  reasoningModeLabel,
  reasoningPolicyDisabled,
  REASONING_EFFORTS,
  REASONING_SUMMARY_MODES,
  SettingSection,
  type BehaviorDraft
} from '@/pages/WorkspaceAiSettingsPage.helpers';

interface WorkspaceAiSettingsPageProps {
  workspace: Workspace;
  canManageAiSettings: boolean;
  showToast: (message: string) => void;
  embedded?: boolean;
}

const credentialInputClassName = formInputClassName('h-10 min-h-10 font-medium');

export const WorkspaceAiSettingsPage: React.FC<WorkspaceAiSettingsPageProps> = ({
  workspace,
  canManageAiSettings,
  showToast,
  embedded = false
}) => {
  const { t } = useTranslation();
  const [aiSettings, setAiSettings] = useState<WorkspaceAiSettings | null>(null);
  const [loadError, setLoadError] = useState('');
  const [behaviorError, setBehaviorError] = useState('');
  const [isLoadingAiSettings, setIsLoadingAiSettings] = useState(false);
  const [behaviorDraft, setBehaviorDraft] = useState<BehaviorDraft>(DEFAULT_BEHAVIOR_DRAFT);
  const [providerKeys, setProviderKeys] = useState<Record<LlmProvider, string>>(EMPTY_PROVIDER_KEYS);
  const [credentialErrors, setCredentialErrors] = useState<Record<LlmProvider, string>>(EMPTY_CREDENTIAL_ERRORS);
  const [savingAction, setSavingAction] = useState('');
  const [credentialEditorProvider, setCredentialEditorProvider] = useState<LlmProvider | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<LlmProvider | null>(null);
  const workspaceIdRef = useRef(workspace.id);
  const behaviorSectionRef = useRef<HTMLElement>(null);
  const credentialsSectionRef = useRef<HTMLElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    workspaceIdRef.current = workspace.id;
    setAiSettings(null);
    setIsLoadingAiSettings(true);
    setLoadError('');
    setBehaviorError('');
    setBehaviorDraft(DEFAULT_BEHAVIOR_DRAFT);
    setProviderKeys(EMPTY_PROVIDER_KEYS);
    setCredentialErrors(EMPTY_CREDENTIAL_ERRORS);
    setCredentialEditorProvider(null);
    setDeleteCandidate(null);
    setSavingAction('');
    controlPlaneApi.getWorkspaceAiSettings(workspace.id)
      .then((settings) => {
        if (cancelled) return;
        setAiSettings(settings);
        setBehaviorDraft(behaviorDraftFromSettings(settings));
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(formatControlPlaneError(error, t('workspaceAiSettings.loadFailed'), { area: 'aiSettings' }));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAiSettings(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace.id]);

  const currentAiSettings = aiSettings?.workspaceId === workspace.id ? aiSettings : null;

  const providerModels = useMemo(() => {
    return modelsForProvider(currentAiSettings, behaviorDraft.defaultProvider);
  }, [behaviorDraft.defaultProvider, currentAiSettings]);

  const selectableModels = useMemo(() => {
    return providerModels.includes(behaviorDraft.defaultModel) ? providerModels : [behaviorDraft.defaultModel, ...providerModels];
  }, [behaviorDraft.defaultModel, providerModels]);

  const selectableProviders = useMemo(() => {
    const allowedProviders = currentAiSettings?.allowedProviders || PROVIDERS;
    return allowedProviders.includes(behaviorDraft.defaultProvider) ? allowedProviders : [behaviorDraft.defaultProvider, ...allowedProviders];
  }, [behaviorDraft.defaultProvider, currentAiSettings?.allowedProviders]);
  const providerOptions = useMemo<Array<SelectOption<LlmProvider>>>(
    () => selectableProviders.map((provider) => ({
      value: provider,
      label: providerLabel(provider),
      disabled: currentAiSettings ? !currentAiSettings.allowedProviders.includes(provider) : false
    })),
    [currentAiSettings, selectableProviders]
  );
  const modelOptions = useMemo<Array<SelectOption<string>>>(
    () => selectableModels.map((model) => ({
      value: model,
      label: model,
      disabled: !providerModels.includes(model)
    })),
    [providerModels, selectableModels]
  );
  const reasoningSummaryModeOptions = useMemo<Array<SelectOption<ReasoningSummaryMode>>>(
    () => REASONING_SUMMARY_MODES.map((mode) => ({
      value: mode,
      label: t(reasoningModeLabel(mode)),
      disabled: currentAiSettings ? !currentAiSettings.allowedReasoningSummaryModes.includes(mode) : false
    })),
    [currentAiSettings, t]
  );
  const reasoningEffortOptions = useMemo<Array<SelectOption<ReasoningEffort>>>(
    () => REASONING_EFFORTS.map((effort) => ({
      value: effort,
      label: t(reasoningEffortLabel(effort)),
      disabled: currentAiSettings ? !currentAiSettings.allowedReasoningEfforts.includes(effort) : false
    })),
    [currentAiSettings, t]
  );

  const hasBehaviorChanges = Boolean(currentAiSettings && behaviorDraftChanged(currentAiSettings, behaviorDraft));
  const isReasoningPolicyDisabled = reasoningPolicyDisabled(currentAiSettings);
  const canSaveBehavior = Boolean(
    canManageAiSettings
      && currentAiSettings
      && hasBehaviorChanges
      && currentAiSettings.allowedProviders.includes(behaviorDraft.defaultProvider)
      && providerModels.includes(behaviorDraft.defaultModel)
      && currentAiSettings.allowedReasoningSummaryModes.includes(behaviorDraft.reasoningSummaryMode)
      && currentAiSettings.allowedReasoningEfforts.includes(behaviorDraft.reasoningEffort)
  );
  const isSaving = Boolean(savingAction);
  const displayedProviderStatuses = currentAiSettings?.providers || PROVIDERS.map((provider) => ({
    provider,
    configured: false,
    enabled: false
  }));
  const providerStatusByProvider = useMemo(() => {
    return new Map(displayedProviderStatuses.map((status) => [status.provider, status]));
  }, [displayedProviderStatuses]);
  const savedDefaultProvider = currentAiSettings?.defaultProvider ?? behaviorDraft.defaultProvider;
  const savedDefaultModel = currentAiSettings?.defaultModel ?? behaviorDraft.defaultModel;
  const savedReasoningSummaryMode = currentAiSettings?.reasoningSummaryMode ?? behaviorDraft.reasoningSummaryMode;
  const savedReasoningEffort = currentAiSettings?.reasoningEffort ?? behaviorDraft.reasoningEffort;
  const savedDefaultProviderStatus = providerStatusByProvider.get(savedDefaultProvider);
  const savedDefaultProviderConfigured = Boolean(savedDefaultProviderStatus?.configured);
  const savedDefaultProviderEnabled = Boolean(savedDefaultProviderStatus?.enabled);
  const savedDefaultProviderMissingCredential = Boolean(currentAiSettings && savedDefaultProviderStatus && savedDefaultProviderEnabled && !savedDefaultProviderConfigured);
  const savedDefaultProviderDisabled = Boolean(currentAiSettings && savedDefaultProviderStatus && !savedDefaultProviderEnabled);
  const isCurrentWorkspaceRequest = () => isMountedRef.current && workspaceIdRef.current === workspace.id;
  const readinessNotice = !canManageAiSettings
    ? { tone: 'neutral' as const, message: t('workspaceAiSettings.noAccess') }
    : savedDefaultProviderDisabled
      ? {
          tone: 'danger' as const,
          message: t('workspaceAiSettings.defaultProviderDisabledWarning', { provider: providerLabel(savedDefaultProvider) })
        }
      : savedDefaultProviderMissingCredential
        ? {
            tone: 'warning' as const,
            message: t('workspaceAiSettings.defaultCredentialMissingWarning', { provider: providerLabel(savedDefaultProvider) })
          }
        : { tone: 'neutral' as const, message: t('workspaceAiSettings.readinessReady') };
  const readinessAction = savedDefaultProviderMissingCredential
    ? {
        label: t('workspaceAiSettings.readinessAddCredentialAction', { provider: providerLabel(savedDefaultProvider) }),
        onClick: () => {
          setCredentialEditorProvider(savedDefaultProvider);
          setDeleteCandidate(null);
          setCredentialErrors((current) => ({ ...current, [savedDefaultProvider]: '' }));
          setProviderKeys((current) => ({ ...current, [savedDefaultProvider]: '' }));
          credentialsSectionRef.current?.scrollIntoView({ block: 'start' });
        }
      }
    : savedDefaultProviderDisabled
      ? {
          label: t('workspaceAiSettings.readinessChooseProviderAction'),
          onClick: () => {
            const nextProvider = currentAiSettings?.allowedProviders[0];
            if (nextProvider) handleDefaultProviderChange(nextProvider);
            behaviorSectionRef.current?.scrollIntoView({ block: 'start' });
          }
        }
      : {
          label: t('workspaceAiSettings.readinessReviewCredentialsAction'),
          onClick: () => credentialsSectionRef.current?.scrollIntoView({ block: 'start' })
        };

  const handleDefaultProviderChange = (provider: LlmProvider) => {
    setBehaviorError('');
    const nextProviderModels = modelsForProvider(currentAiSettings, provider);
    setBehaviorDraft((current) => ({
      ...current,
      defaultProvider: provider,
      defaultModel: nextProviderModels.length > 0 && !nextProviderModels.includes(current.defaultModel)
        ? nextProviderModels[0]
        : current.defaultModel
    }));
  };

  const handleSaveBehavior = async () => {
    if (!canSaveBehavior || isSaving) return;
    setSavingAction('behavior');
    setBehaviorError('');
    try {
      const updated = await controlPlaneApi.updateWorkspaceAiSettings(workspace.id, {
        defaultProvider: behaviorDraft.defaultProvider,
        defaultModel: behaviorDraft.defaultModel,
        reasoningSummaryMode: behaviorDraft.reasoningSummaryMode,
        reasoningEffort: behaviorDraft.reasoningEffort
      });
      if (!isCurrentWorkspaceRequest()) return;
      setAiSettings(updated);
      setBehaviorDraft(behaviorDraftFromSettings(updated));
      showToast(t('workspaceAiSettings.settingsSaved'));
    } catch (error) {
      if (!isCurrentWorkspaceRequest()) return;
      setBehaviorError(formatControlPlaneError(error, t('workspaceAiSettings.saveFailed'), { area: 'aiSettings' }));
    } finally {
      if (isCurrentWorkspaceRequest()) setSavingAction('');
    }
  };

  const openCredentialEditor = (provider: LlmProvider) => {
    setCredentialEditorProvider(provider);
    setDeleteCandidate(null);
    setCredentialErrors((current) => ({ ...current, [provider]: '' }));
    setProviderKeys((current) => ({ ...current, [provider]: '' }));
  };

  const closeCredentialEditor = (provider: LlmProvider) => {
    setCredentialEditorProvider(null);
    setCredentialErrors((current) => ({ ...current, [provider]: '' }));
    setProviderKeys((current) => ({ ...current, [provider]: '' }));
  };

  const handleSaveProviderKey = async (provider: LlmProvider) => {
    const apiKey = providerKeys[provider].trim();
    if (!apiKey || !canManageAiSettings || !currentAiSettings || isSaving) return;
    setSavingAction(`save:${provider}`);
    setCredentialErrors((current) => ({ ...current, [provider]: '' }));
    try {
      const wasConfigured = currentAiSettings.providers.some((status) => status.provider === provider && status.configured);
      const updated = await controlPlaneApi.saveWorkspaceAiProviderCredential(workspace.id, provider, apiKey);
      if (!isCurrentWorkspaceRequest()) return;
      setAiSettings(updated);
      setProviderKeys((current) => ({ ...current, [provider]: '' }));
      setCredentialEditorProvider(null);
      showToast(t(wasConfigured ? 'workspaceAiSettings.keyRotated' : 'workspaceAiSettings.keyAdded', {
        provider: providerLabel(provider)
      }));
    } catch (error) {
      if (!isCurrentWorkspaceRequest()) return;
      setCredentialErrors((current) => ({
        ...current,
        [provider]: formatControlPlaneError(error, t('workspaceAiSettings.saveFailed'), { area: 'aiSettings' })
      }));
    } finally {
      if (isCurrentWorkspaceRequest()) setSavingAction('');
    }
  };

  const handleDeleteProviderKey = async (provider: LlmProvider) => {
    if (!canManageAiSettings || !currentAiSettings || isSaving) return;
    setSavingAction(`delete:${provider}`);
    setCredentialErrors((current) => ({ ...current, [provider]: '' }));
    try {
      const updated = await controlPlaneApi.deleteWorkspaceAiProviderCredential(workspace.id, provider);
      if (!isCurrentWorkspaceRequest()) return;
      setAiSettings(updated);
      setDeleteCandidate(null);
      setCredentialEditorProvider(null);
      setProviderKeys((current) => ({ ...current, [provider]: '' }));
      showToast(t('workspaceAiSettings.keyDeleted', { provider: providerLabel(provider) }));
    } catch (error) {
      if (!isCurrentWorkspaceRequest()) return;
      setCredentialErrors((current) => ({
        ...current,
        [provider]: formatControlPlaneError(error, t('workspaceAiSettings.saveFailed'), { area: 'aiSettings' })
      }));
    } finally {
      if (isCurrentWorkspaceRequest()) setSavingAction('');
    }
  };

  return (
    <div className={embedded ? '' : 'min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8'}>
      {!embedded && (
        <motion.header {...headerMotion} className="mb-12">
          <h1 className="type-route-title">{t('workspaceAiSettings.title')}</h1>
          <p className="type-body mt-2 max-w-2xl">
            {t('workspaceAiSettings.subtitle')}
          </p>
        </motion.header>
      )}

      <div className="max-w-4xl">
        {isLoadingAiSettings && (
          <InlineLoadingIndicator label={t('workspaceAiSettings.loading')} className="mb-8" />
        )}

        {!isLoadingAiSettings && loadError && (
          <InlineAlert tone="danger" className="mb-8">{loadError}</InlineAlert>
        )}

        {!isLoadingAiSettings && currentAiSettings && (
          <>
            <SettingSection
              title={t('workspaceAiSettings.readinessTitle')}
              description={t('workspaceAiSettings.readinessBody')}
            >
              <div className="grid gap-px bg-ui-border sm:grid-cols-3">
                <div className="bg-ui-surface p-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('workspaceAiSettings.defaultRuntime')}</p>
                  <p className="min-w-0 truncate text-sm font-bold text-ui-text">
                    {providerLabel(savedDefaultProvider)} / {savedDefaultModel}
                  </p>
                </div>
                <div className="bg-ui-surface p-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('workspaceAiSettings.defaultCredential')}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={savedDefaultProviderConfigured ? 'success' : savedDefaultProviderDisabled ? 'warning' : 'neutral'}>
                      {savedDefaultProviderConfigured ? t('workspaceAiSettings.credentialConfiguredBadge') : t('workspaceAiSettings.credentialMissingBadge')}
                    </StatusBadge>
                    {savedDefaultProviderDisabled && (
                      <StatusBadge tone="warning">{t('workspaceAiSettings.providerDisabled')}</StatusBadge>
                    )}
                  </div>
                </div>
                <div className="bg-ui-surface p-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('workspaceAiSettings.reasoningReadiness')}</p>
                  <p className="text-sm font-bold text-ui-text">
                    {t('workspaceAiSettings.reasoningSummaryStatus', {
                      mode: isReasoningPolicyDisabled
                        ? t('workspaceAiSettings.reasoningSummaryUnavailable')
                        : t(reasoningModeLabel(savedReasoningSummaryMode))
                    })}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ui-text-muted">
                    {t('workspaceAiSettings.reasoningEffortStatus', { effort: t(reasoningEffortLabel(savedReasoningEffort)) })}
                  </p>
                </div>
              </div>
              <div className="border-t border-ui-border bg-ui-bg/35 p-5">
                <InlineAlert tone={readinessNotice.tone} className="min-h-14">{readinessNotice.message}</InlineAlert>
                {canManageAiSettings && (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="type-caption">{t('workspaceAiSettings.nextAction')}</p>
                    <Button
                      type="button"
                      variant={savedDefaultProviderMissingCredential || savedDefaultProviderDisabled ? 'secondary' : 'tertiary'}
                      size="sm"
                      onClick={() => readinessAction.onClick()}
                      className="w-full sm:w-auto"
                    >
                      <ICONS.ArrowRight className="h-4 w-4" aria-hidden="true" />
                      {readinessAction.label}
                    </Button>
                  </div>
                )}
              </div>
            </SettingSection>

            <SettingSection
              title={t('workspaceAiSettings.behaviorTitle')}
              description={t('workspaceAiSettings.behaviorBody')}
              sectionRef={behaviorSectionRef}
              className="scroll-mt-8"
            >
              <div className="p-6">
                <div className="mb-5 flex min-w-0 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong shadow-sm">
                    <ICONS.Zap className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="mb-0.5 text-sm font-bold text-ui-text">{t('workspaceAiSettings.behavior')}</p>
                    <p className="text-xs leading-5 text-ui-text-muted">{t('workspaceAiSettings.behaviorDescription')}</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('workspaceAiSettings.provider')}</span>
                    <Select<LlmProvider>
                      value={behaviorDraft.defaultProvider}
                      options={providerOptions}
                      onChange={handleDefaultProviderChange}
                      disabled={!canManageAiSettings || !currentAiSettings || isSaving}
                      ariaLabel={t('workspaceAiSettings.provider')}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('workspaceAiSettings.model')}</span>
                    <Select<string>
                      value={behaviorDraft.defaultModel}
                      options={modelOptions}
                      onChange={(defaultModel) => {
                        setBehaviorError('');
                        setBehaviorDraft((current) => ({ ...current, defaultModel }));
                      }}
                      disabled={!canManageAiSettings || !currentAiSettings || isSaving}
                      ariaLabel={t('workspaceAiSettings.model')}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-ui-text-muted">
                      {t('workspaceAiSettings.reasoningSummaryMode')}
                    </span>
                    <Select<ReasoningSummaryMode>
                      value={behaviorDraft.reasoningSummaryMode}
                      options={reasoningSummaryModeOptions}
                      onChange={(reasoningSummaryMode) => {
                        setBehaviorError('');
                        setBehaviorDraft((current) => ({ ...current, reasoningSummaryMode }));
                      }}
                      disabled={!canManageAiSettings || !currentAiSettings || isReasoningPolicyDisabled || isSaving}
                      ariaLabel={t('workspaceAiSettings.reasoningSummaryMode')}
                    />
                    <p className="mt-2 text-xs font-medium leading-5 text-ui-text-muted">
                      {isReasoningPolicyDisabled
                        ? t('workspaceAiSettings.reasoningPolicyDisabled')
                        : t('workspaceAiSettings.reasoningDescription')}
                    </p>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-ui-text-muted">
                      {t('workspaceAiSettings.reasoningEffortLabel')}
                    </span>
                    <Select<ReasoningEffort>
                      value={behaviorDraft.reasoningEffort}
                      options={reasoningEffortOptions}
                      onChange={(reasoningEffort) => {
                        setBehaviorError('');
                        setBehaviorDraft((current) => ({ ...current, reasoningEffort }));
                      }}
                      disabled={!canManageAiSettings || !currentAiSettings || isSaving}
                      ariaLabel={t('workspaceAiSettings.reasoningEffortLabel')}
                    />
                    <p className="mt-2 min-h-10 text-xs font-medium leading-5 text-ui-text-muted">
                      {behaviorDraft.reasoningSummaryMode === 'off'
                        ? t('workspaceAiSettings.reasoningEffortOffHelp')
                        : t('workspaceAiSettings.reasoningEffortHelp')}
                    </p>
                  </label>
                </div>
                {behaviorError && <InlineAlert tone="danger" className="mt-5">{behaviorError}</InlineAlert>}
              </div>
              <div className="flex flex-col gap-3 border-t border-ui-border bg-ui-bg/35 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium leading-5 text-ui-text-muted">
                  {hasBehaviorChanges ? t('workspaceAiSettings.behaviorUnsavedFooter') : t('workspaceAiSettings.behaviorSavedFooter')}
                </p>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveBehavior}
                  disabled={!canSaveBehavior || isSaving}
                  className="w-full sm:w-36"
                >
                  {savingAction === 'behavior' ? <ICONS.RefreshCw className="h-4 w-4 animate-spin" /> : <ICONS.CheckCircle2 className="h-4 w-4" />}
                  {savingAction === 'behavior' ? t('workspaceAiSettings.saving') : t('workspaceAiSettings.saveBehavior')}
                </Button>
              </div>
            </SettingSection>

            <SettingSection
              title={t('workspaceAiSettings.credentialsTitle')}
              description={t('workspaceAiSettings.credentialsBody')}
              sectionRef={credentialsSectionRef}
              className="scroll-mt-8"
            >
              {displayedProviderStatuses.map((providerStatus) => {
                const provider = providerStatus.provider;
                const isDeleteConfirming = deleteCandidate === provider;
                const isEditingCredential = credentialEditorProvider === provider;
                const credentialError = credentialErrors[provider];
                return (
                  <div key={provider} className="border-b border-ui-border p-6 last:border-0">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong shadow-sm">
                          <ICONS.Lock className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-ui-text">{providerLabel(provider)}</p>
                            <StatusBadge tone={providerStatus.configured ? 'success' : 'neutral'}>
                              {providerStatus.configured ? t('workspaceAiSettings.credentialConfiguredBadge') : t('workspaceAiSettings.credentialMissingBadge')}
                            </StatusBadge>
                            {!providerStatus.enabled && (
                              <StatusBadge tone="warning">{t('workspaceAiSettings.providerDisabled')}</StatusBadge>
                            )}
                          </div>
                          <p className="text-xs leading-5 text-ui-text-muted">
                            {!providerStatus.enabled
                              ? t('workspaceAiSettings.credentialDisabledDescription')
                              : providerStatus.configured
                                ? t('workspaceAiSettings.credentialConfigured')
                                : t('workspaceAiSettings.credentialMissing')}
                          </p>
                        </div>
                      </div>
                      {(canManageAiSettings || isEditingCredential || credentialError) && (
                        <div className="flex w-full flex-col gap-3 lg:w-[28rem]">
                          {!isEditingCredential && canManageAiSettings && (
                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => openCredentialEditor(provider)}
                                disabled={!currentAiSettings || isSaving || !providerStatus.enabled}
                                className="w-full sm:w-28"
                                aria-label={t(
                                  providerStatus.configured
                                    ? 'workspaceAiSettings.rotateKeyForProvider'
                                    : 'workspaceAiSettings.addKeyForProvider',
                                  { provider: providerLabel(provider) }
                                )}
                              >
                                <ICONS.CheckCircle2 className="h-4 w-4" />
                                {providerStatus.configured ? t('workspaceAiSettings.rotateKey') : t('workspaceAiSettings.addKey')}
                              </Button>
                              {isDeleteConfirming ? (
                                <>
                                  <Button
                                    type="button"
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDeleteProviderKey(provider)}
                                    disabled={!currentAiSettings || isSaving}
                                    aria-label={t('workspaceAiSettings.confirmDeleteForProvider', { provider: providerLabel(provider) })}
                                  >
                                    <ICONS.Trash2 className="h-4 w-4" />
                                    {t('workspaceAiSettings.confirmDelete')}
                                  </Button>
                                  <Button type="button" variant="secondary" size="sm" onClick={() => setDeleteCandidate(null)} disabled={isSaving}>
                                    {t('app.cancel')}
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => {
                                    setCredentialErrors((current) => ({ ...current, [provider]: '' }));
                                    setDeleteCandidate(provider);
                                  }}
                                  disabled={!currentAiSettings || isSaving || !providerStatus.configured}
                                  aria-label={t('workspaceAiSettings.deleteKeyForProvider', { provider: providerLabel(provider) })}
                                >
                                  <ICONS.Trash2 className="h-4 w-4" />
                                  {t('workspaceAiSettings.deleteKey')}
                                </Button>
                              )}
                            </div>
                          )}
                          {isEditingCredential && (
                            <div className="rounded-lg border border-ui-border bg-ui-bg p-4">
                              <label className="block">
                                <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-ui-text-muted">
                                  {providerStatus.configured ? t('workspaceAiSettings.rotateKey') : t('workspaceAiSettings.addKey')}
                                </span>
                                <input
                                  type="password"
                                  value={providerKeys[provider]}
                                  onChange={(event) => setProviderKeys((current) => ({ ...current, [provider]: event.target.value }))}
                                  disabled={!canManageAiSettings || !currentAiSettings || !providerStatus.enabled || isSaving}
                                  aria-label={t(
                                    providerStatus.configured
                                      ? 'workspaceAiSettings.rotateKeyForProvider'
                                      : 'workspaceAiSettings.addKeyForProvider',
                                    { provider: providerLabel(provider) }
                                  )}
                                  placeholder={providerStatus.configured ? t('workspaceAiSettings.apiKeyRotatePlaceholder') : t('workspaceAiSettings.apiKeyAddPlaceholder')}
                                  className={credentialInputClassName}
                                  autoComplete="off"
                                />
                              </label>
                              <p className="mt-2 text-xs font-medium leading-5 text-ui-text-muted">
                                {t('workspaceAiSettings.credentialEditorHelp')}
                              </p>
                              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleSaveProviderKey(provider)}
                                  disabled={!canManageAiSettings || !currentAiSettings || !providerKeys[provider].trim() || isSaving || !providerStatus.enabled}
                                  className="w-full sm:w-28"
                                  aria-label={t(
                                    providerStatus.configured
                                      ? 'workspaceAiSettings.rotateKeyForProvider'
                                      : 'workspaceAiSettings.addKeyForProvider',
                                    { provider: providerLabel(provider) }
                                  )}
                                >
                                  <ICONS.CheckCircle2 className="h-4 w-4" />
                                  {savingAction === `save:${provider}` ? t('workspaceAiSettings.saving') : providerStatus.configured ? t('workspaceAiSettings.rotateKey') : t('workspaceAiSettings.addKey')}
                                </Button>
                                <Button type="button" variant="secondary" size="sm" onClick={() => closeCredentialEditor(provider)} disabled={isSaving}>
                                  {t('app.cancel')}
                                </Button>
                              </div>
                            </div>
                          )}
                          {credentialError && <InlineAlert tone="danger">{credentialError}</InlineAlert>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </SettingSection>
          </>
        )}
      </div>
    </div>
  );
};
