import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DestructiveConfirmationDialog, SettingsSection } from '@acornops/ui';
import { InlineAlert } from '@acornops/ui';
import { IconTile } from '@acornops/ui';
import { PageHeader, PageShell } from '@acornops/ui';
import { Select, SelectOption } from '@acornops/ui';
import { StatusBadge } from '@acornops/ui';
import { ICONS } from '@/constants';
import { isAiRuntimeReady, resolveAiRuntimeReadiness } from '@/features/ai/aiRuntimeReadiness';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { LlmProvider, ReasoningEffort, ReasoningSummaryMode } from '@/types';
import {
  behaviorDraftChanged,
  behaviorDraftFromSettings,
  credentialInputClassName,
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
  WorkspaceAiSettingsSkeleton,
  type BehaviorDraft,
  type WorkspaceAiSettingsPageProps
} from '@/pages/WorkspaceAiSettingsPage.helpers';
import { TextInput } from '@acornops/ui';
export const WorkspaceAiSettingsPage: React.FC<WorkspaceAiSettingsPageProps> = ({
  workspace, canManageAiSettings, aiSettingsResource, showToast, returnTo, onReturnToAssistant,
  embedded = false
}) => {
  const { t } = useTranslation();
  const currentAiSettings = aiSettingsResource.settings?.workspaceId === workspace.id ? aiSettingsResource.settings : null;
  const [behaviorError, setBehaviorError] = useState('');
  const [behaviorDraft, setBehaviorDraft] = useState<BehaviorDraft | null>(() => (currentAiSettings ? behaviorDraftFromSettings(currentAiSettings) : null));
  const [providerKeys, setProviderKeys] = useState<Record<LlmProvider, string>>(EMPTY_PROVIDER_KEYS);
  const [credentialErrors, setCredentialErrors] = useState<Record<LlmProvider, string>>(EMPTY_CREDENTIAL_ERRORS);
  const [savingAction, setSavingAction] = useState('');
  const [credentialEditorProvider, setCredentialEditorProvider] = useState<LlmProvider | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<LlmProvider | null>(null);
  const workspaceIdRef = useRef(workspace.id);
  const behaviorSectionRef = useRef<HTMLElement>(null);
  const credentialsSectionRef = useRef<HTMLElement>(null);
  const isMountedRef = useRef(true);
  const hydratedWorkspaceIdRef = useRef<string | null>(currentAiSettings ? workspace.id : null);
  workspaceIdRef.current = workspace.id;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setBehaviorError('');
    setBehaviorDraft(currentAiSettings ? behaviorDraftFromSettings(currentAiSettings) : null);
    hydratedWorkspaceIdRef.current = currentAiSettings ? workspace.id : null;
    setProviderKeys(EMPTY_PROVIDER_KEYS);
    setCredentialErrors(EMPTY_CREDENTIAL_ERRORS);
    setCredentialEditorProvider(null);
    setDeleteCandidate(null);
    setSavingAction('');
  }, [workspace.id]);

  useEffect(() => {
    if (!currentAiSettings || hydratedWorkspaceIdRef.current === workspace.id) return;
    setBehaviorDraft(behaviorDraftFromSettings(currentAiSettings));
    hydratedWorkspaceIdRef.current = workspace.id;
  }, [currentAiSettings, workspace.id]);

  const providerModels = useMemo(() => {
    return behaviorDraft ? modelsForProvider(currentAiSettings, behaviorDraft.defaultProvider) : [];
  }, [behaviorDraft, currentAiSettings]);

  const selectableModels = useMemo(() => {
    if (!behaviorDraft) return [];
    return providerModels.includes(behaviorDraft.defaultModel) ? providerModels : [behaviorDraft.defaultModel, ...providerModels];
  }, [behaviorDraft, providerModels]);

  const selectableProviders = useMemo(() => {
    const allowedProviders = currentAiSettings?.allowedProviders || PROVIDERS;
    if (!behaviorDraft) return allowedProviders;
    return allowedProviders.includes(behaviorDraft.defaultProvider) ? allowedProviders : [behaviorDraft.defaultProvider, ...allowedProviders];
  }, [behaviorDraft, currentAiSettings?.allowedProviders]);
  const providerOptions = useMemo<Array<SelectOption<LlmProvider>>>(
    () =>
      selectableProviders.map((provider) => ({
        value: provider,
        label: providerLabel(provider),
        disabled: currentAiSettings ? !currentAiSettings.allowedProviders.includes(provider) : false
      })),
    [currentAiSettings, selectableProviders]
  );
  const modelOptions = useMemo<Array<SelectOption<string>>>(
    () =>
      selectableModels.map((model) => ({
        value: model,
        label: model,
        disabled: !providerModels.includes(model)
      })),
    [providerModels, selectableModels]
  );
  const reasoningSummaryModeOptions = useMemo<Array<SelectOption<ReasoningSummaryMode>>>(
    () =>
      REASONING_SUMMARY_MODES.map((mode) => ({
        value: mode,
        label: t(reasoningModeLabel(mode)),
        disabled: currentAiSettings ? !currentAiSettings.allowedReasoningSummaryModes.includes(mode) : false
      })),
    [currentAiSettings, t]
  );
  const reasoningEffortOptions = useMemo<Array<SelectOption<ReasoningEffort>>>(
    () =>
      REASONING_EFFORTS.map((effort) => ({
        value: effort,
        label: t(reasoningEffortLabel(effort)),
        disabled: currentAiSettings ? !currentAiSettings.allowedReasoningEfforts.includes(effort) : false
      })),
    [currentAiSettings, t]
  );

  const hasBehaviorChanges = Boolean(currentAiSettings && behaviorDraft && behaviorDraftChanged(currentAiSettings, behaviorDraft));
  const isReasoningPolicyDisabled = reasoningPolicyDisabled(currentAiSettings);
  const canSaveBehavior = Boolean(canManageAiSettings && currentAiSettings && behaviorDraft && hasBehaviorChanges && currentAiSettings.allowedProviders.includes(behaviorDraft.defaultProvider) && providerModels.includes(behaviorDraft.defaultModel) && currentAiSettings.allowedReasoningSummaryModes.includes(behaviorDraft.reasoningSummaryMode) && currentAiSettings.allowedReasoningEfforts.includes(behaviorDraft.reasoningEffort));
  const isSaving = Boolean(savingAction);
  const displayedProviderStatuses = currentAiSettings?.providers || PROVIDERS.map((provider) => (
    { provider, configured: false, enabled: false, source: 'none' as const }
  ));
  const providerStatusByProvider = useMemo(() => {
    return new Map(displayedProviderStatuses.map((status) => [status.provider, status]));
  }, [displayedProviderStatuses]);
  const savedDefaultProviderStatus = currentAiSettings ? providerStatusByProvider.get(currentAiSettings.defaultProvider) : undefined;
  const savedDefaultProviderConfigured = Boolean(savedDefaultProviderStatus?.configured);
  const savedDefaultProviderEnabled = Boolean(savedDefaultProviderStatus?.enabled);
  const savedDefaultCredentialSourceBadgeKey = savedDefaultProviderStatus?.source === 'workspace'
    ? 'workspaceAiSettings.workspaceKeyBadge'
    : savedDefaultProviderStatus?.source === 'platform_default'
      ? 'workspaceAiSettings.platformDefaultBadge'
      : null;
  const savedDefaultProviderMissingCredential = Boolean(currentAiSettings && savedDefaultProviderStatus && savedDefaultProviderEnabled && !savedDefaultProviderConfigured);
  const savedDefaultProviderDisabled = Boolean(currentAiSettings && savedDefaultProviderStatus && !savedDefaultProviderEnabled);
  const hasReadyAiRuntime = isAiRuntimeReady(
    resolveAiRuntimeReadiness({
      settings: currentAiSettings,
      isLoading: aiSettingsResource.isLoading && !currentAiSettings,
      error: aiSettingsResource.error
    })
  );
  const isCurrentWorkspaceRequest = () => isMountedRef.current && workspaceIdRef.current === workspace.id;
  const readinessNotice = !canManageAiSettings
    ? { tone: 'neutral' as const, message: t('workspaceAiSettings.noAccess') }
    : hasReadyAiRuntime
    ? {
        tone: 'neutral' as const,
        message: t('workspaceAiSettings.readinessReady')
      }
    : savedDefaultProviderDisabled
    ? {
        tone: 'danger' as const,
        message: t('workspaceAiSettings.defaultProviderDisabledWarning', {
          provider: providerLabel(currentAiSettings!.defaultProvider)
        })
      }
    : savedDefaultProviderMissingCredential
    ? {
        tone: 'warning' as const,
        message: t('workspaceAiSettings.defaultCredentialMissingWarning', {
          provider: providerLabel(currentAiSettings!.defaultProvider)
        })
      }
    : {
        tone: 'neutral' as const,
        message: t('workspaceAiSettings.readinessReady')
      };
  const readinessAction =
    returnTo && hasReadyAiRuntime
      ? {
          label: t('workspaceAiSettings.returnToAssistant'),
          onClick: () => onReturnToAssistant?.(returnTo)
        }
      : savedDefaultProviderMissingCredential
      ? {
          label: t('workspaceAiSettings.readinessAddCredentialAction', {
            provider: providerLabel(currentAiSettings!.defaultProvider)
          }),
          onClick: () => {
            if (!currentAiSettings) return;
            const provider = currentAiSettings.defaultProvider;
            setCredentialEditorProvider(provider);
            setDeleteCandidate(null);
            setCredentialErrors((current) => ({ ...current, [provider]: '' }));
            setProviderKeys((current) => ({ ...current, [provider]: '' }));
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
    setBehaviorDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        defaultProvider: provider,
        defaultModel: nextProviderModels.length > 0 && !nextProviderModels.includes(current.defaultModel) ? nextProviderModels[0] : current.defaultModel
      };
    });
  };

  const handleSaveBehavior = async () => {
    if (!canSaveBehavior || !behaviorDraft || isSaving) return;
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
      aiSettingsResource.update(updated);
      setBehaviorDraft(behaviorDraftFromSettings(updated));
      showToast(t('workspaceAiSettings.settingsSaved'));
    } catch (error) {
      if (!isCurrentWorkspaceRequest()) return;
      setBehaviorError(
        formatControlPlaneError(error, t('workspaceAiSettings.saveFailed'), {
          area: 'aiSettings'
        })
      );
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
      const wasConfigured = currentAiSettings.providers.some(
        (status) => status.provider === provider && status.source === 'workspace'
      );
      const updated = await controlPlaneApi.saveWorkspaceAiProviderCredential(workspace.id, provider, apiKey);
      if (!isCurrentWorkspaceRequest()) return;
      aiSettingsResource.update(updated);
      setProviderKeys((current) => ({ ...current, [provider]: '' }));
      setCredentialEditorProvider(null);
      showToast(
        t(wasConfigured ? 'workspaceAiSettings.keyRotated' : 'workspaceAiSettings.keyAdded', {
          provider: providerLabel(provider)
        })
      );
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
      aiSettingsResource.update(updated);
      setDeleteCandidate(null);
      setCredentialEditorProvider(null);
      setProviderKeys((current) => ({ ...current, [provider]: '' }));
      showToast(
        t('workspaceAiSettings.keyDeleted', {
          provider: providerLabel(provider)
        })
      );
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
    <PageShell embedded={embedded}>
      {!embedded && <PageHeader title={t('workspaceAiSettings.title')} description={t('workspaceAiSettings.subtitle')} />}

      <div className="max-w-4xl">
        {aiSettingsResource.isLoading && !currentAiSettings && <WorkspaceAiSettingsSkeleton label={t('workspaceAiSettings.loading')} />}

        {!aiSettingsResource.isLoading && !currentAiSettings && aiSettingsResource.error && (
          <div className="mb-8">
            <InlineAlert tone="danger">{aiSettingsResource.error}</InlineAlert>
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={aiSettingsResource.retry}>
              <ICONS.RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t('common.retry')}
            </Button>
          </div>
        )}

        {currentAiSettings && behaviorDraft && (
          <>
            <SettingsSection title={t('workspaceAiSettings.readinessTitle')} description={t('workspaceAiSettings.readinessBody')}>
              <div className="grid gap-px bg-ui-border sm:grid-cols-3">
                <div className="bg-ui-surface p-5">
                  <p className="mb-2 type-label">{t('workspaceAiSettings.defaultRuntime')}</p>
                  <p className="min-w-0 truncate type-row-title">
                    {providerLabel(currentAiSettings.defaultProvider)} / {currentAiSettings.defaultModel}
                  </p>
                </div>
                <div className="bg-ui-surface p-5">
                  <p className="mb-2 type-label">{t('workspaceAiSettings.defaultCredential')}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={savedDefaultProviderConfigured ? 'success' : savedDefaultProviderDisabled ? 'warning' : 'neutral'}>
                      {t(savedDefaultProviderConfigured ? 'workspaceAiSettings.credentialConfiguredBadge' : 'workspaceAiSettings.credentialMissingBadge')}
                    </StatusBadge>
                    {savedDefaultProviderConfigured && savedDefaultCredentialSourceBadgeKey && (
                      <StatusBadge tone="neutral">{t(savedDefaultCredentialSourceBadgeKey)}</StatusBadge>
                    )}
                    {savedDefaultProviderDisabled && <StatusBadge tone="warning">{t('workspaceAiSettings.providerDisabled')}</StatusBadge>}
                  </div>
                </div>
                <div className="bg-ui-surface p-5">
                  <p className="mb-2 type-label">{t('workspaceAiSettings.reasoningReadiness')}</p>
                  <p className="type-row-title">
                    {t('workspaceAiSettings.reasoningSummaryStatus', {
                      mode: isReasoningPolicyDisabled ? t('workspaceAiSettings.reasoningSummaryUnavailable') : t(reasoningModeLabel(currentAiSettings.reasoningSummaryMode))
                    })}
                  </p>
                  <p className="mt-1 type-caption type-emphasis text-ui-text-muted">
                    {t('workspaceAiSettings.reasoningEffortStatus', {
                      effort: t(reasoningEffortLabel(currentAiSettings.reasoningEffort))
                    })}
                  </p>
                </div>
              </div>
              <div className="border-t border-ui-border bg-ui-bg/35 p-5">
                <InlineAlert tone={readinessNotice.tone} className="min-h-14">
                  {readinessNotice.message}
                </InlineAlert>
                {(canManageAiSettings || Boolean(returnTo && hasReadyAiRuntime)) && (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="type-caption">{t('workspaceAiSettings.nextAction')}</p>
                    <Button type="button" variant={savedDefaultProviderMissingCredential || savedDefaultProviderDisabled ? 'secondary' : 'tertiary'} size="sm" onClick={() => readinessAction.onClick()} className="w-full sm:w-auto">
                      <ICONS.ArrowRight className="h-4 w-4" aria-hidden="true" />
                      {readinessAction.label}
                    </Button>
                  </div>
                )}
              </div>
            </SettingsSection>

            <SettingsSection title={t('workspaceAiSettings.behaviorTitle')} description={t('workspaceAiSettings.behaviorBody')} ref={behaviorSectionRef} className="scroll-mt-8">
              <div className="p-6">
                <div className="mb-5 flex min-w-0 items-center gap-4">
                  <IconTile>
                    <ICONS.Zap className="h-5 w-5" aria-hidden="true" />
                  </IconTile>
                  <div className="min-w-0">
                    <p className="mb-0.5 type-row-title">{t('workspaceAiSettings.behavior')}</p>
                    <p className="type-caption leading-5 text-ui-text-muted">{t('workspaceAiSettings.behaviorDescription')}</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block type-label">{t('workspaceAiSettings.provider')}</span>
                    <Select<LlmProvider> value={behaviorDraft.defaultProvider} options={providerOptions} onChange={handleDefaultProviderChange} disabled={!canManageAiSettings || !currentAiSettings || isSaving} ariaLabel={t('workspaceAiSettings.provider')} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block type-label">{t('workspaceAiSettings.model')}</span>
                    <Select<string>
                      value={behaviorDraft.defaultModel}
                      options={modelOptions}
                      onChange={(defaultModel) => {
                        setBehaviorError('');
                        setBehaviorDraft((current) => ({
                          ...current,
                          defaultModel
                        }));
                      }}
                      disabled={!canManageAiSettings || !currentAiSettings || isSaving}
                      ariaLabel={t('workspaceAiSettings.model')}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block type-label">{t('workspaceAiSettings.reasoningSummaryMode')}</span>
                    <Select<ReasoningSummaryMode>
                      value={behaviorDraft.reasoningSummaryMode}
                      options={reasoningSummaryModeOptions}
                      onChange={(reasoningSummaryMode) => {
                        setBehaviorError('');
                        setBehaviorDraft((current) => ({
                          ...current,
                          reasoningSummaryMode
                        }));
                      }}
                      disabled={!canManageAiSettings || !currentAiSettings || isReasoningPolicyDisabled || isSaving}
                      ariaLabel={t('workspaceAiSettings.reasoningSummaryMode')}
                    />
                    <p className="mt-2 type-caption leading-5 text-ui-text-muted">{isReasoningPolicyDisabled ? t('workspaceAiSettings.reasoningPolicyDisabled') : t('workspaceAiSettings.reasoningDescription')}</p>
                  </label>
                  <label className="block">
                    <span className="mb-1 block type-label">{t('workspaceAiSettings.reasoningEffortLabel')}</span>
                    <Select<ReasoningEffort>
                      value={behaviorDraft.reasoningEffort}
                      options={reasoningEffortOptions}
                      onChange={(reasoningEffort) => {
                        setBehaviorError('');
                        setBehaviorDraft((current) => ({
                          ...current,
                          reasoningEffort
                        }));
                      }}
                      disabled={!canManageAiSettings || !currentAiSettings || isSaving}
                      ariaLabel={t('workspaceAiSettings.reasoningEffortLabel')}
                    />
                    <p className="mt-2 min-h-10 type-caption leading-5 text-ui-text-muted">{behaviorDraft.reasoningSummaryMode === 'off' ? t('workspaceAiSettings.reasoningEffortOffHelp') : t('workspaceAiSettings.reasoningEffortHelp')}</p>
                  </label>
                </div>
                {behaviorError && (
                  <InlineAlert tone="danger" className="mt-5">
                    {behaviorError}
                  </InlineAlert>
                )}
              </div>
              <div className="flex flex-col gap-3 border-t border-ui-border bg-ui-bg/35 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="type-caption leading-5 text-ui-text-muted">{hasBehaviorChanges ? t('workspaceAiSettings.behaviorUnsavedFooter') : t('workspaceAiSettings.behaviorSavedFooter')}</p>
                <Button type="button" variant="primary" size="sm" onClick={handleSaveBehavior} disabled={!canSaveBehavior || isSaving} className="w-full sm:w-36">
                  {savingAction === 'behavior' ? <ICONS.RefreshCw className="h-4 w-4 animate-spin" /> : <ICONS.CheckCircle2 className="h-4 w-4" />}
                  {savingAction === 'behavior' ? t('workspaceAiSettings.saving') : t('workspaceAiSettings.saveBehavior')}
                </Button>
              </div>
            </SettingsSection>

            <SettingsSection title={t('workspaceAiSettings.credentialsTitle')} description={t('workspaceAiSettings.credentialsBody')} ref={credentialsSectionRef} className="scroll-mt-8">
              {displayedProviderStatuses.map((providerStatus) => {
                const provider = providerStatus.provider;
                const isEditingCredential = credentialEditorProvider === provider;
                const credentialError = credentialErrors[provider];
                const isWorkspaceOverride = providerStatus.source === 'workspace';
                const isPlatformDefault = providerStatus.source === 'platform_default';
                const credentialSourceBadgeKey = isWorkspaceOverride
                  ? 'workspaceAiSettings.workspaceKeyBadge'
                  : isPlatformDefault
                    ? 'workspaceAiSettings.platformDefaultBadge'
                    : null;
                return (
                  <div key={provider} className="border-b border-ui-border p-6 last:border-0">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-center gap-4">
                        <IconTile>
                          <ICONS.Lock className="h-5 w-5" aria-hidden="true" />
                        </IconTile>
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <p className="type-row-title">{providerLabel(provider)}</p>
                            <StatusBadge tone={providerStatus.configured ? 'success' : 'neutral'}>
                              {t(providerStatus.configured ? 'workspaceAiSettings.credentialConfiguredBadge' : 'workspaceAiSettings.credentialMissingBadge')}
                            </StatusBadge>
                            {providerStatus.configured && credentialSourceBadgeKey && (
                              <StatusBadge tone="neutral">{t(credentialSourceBadgeKey)}</StatusBadge>
                            )}
                            {!providerStatus.enabled && (
                              <StatusBadge tone="warning">{t('workspaceAiSettings.providerDisabled')}</StatusBadge>
                            )}
                          </div>
                          <p className={`type-caption leading-5 text-ui-text-muted ${isPlatformDefault ? 'lg:whitespace-nowrap' : ''}`}>
                            {!providerStatus.enabled
                              ? t('workspaceAiSettings.credentialDisabledDescription')
                              : isWorkspaceOverride
                                ? t('workspaceAiSettings.credentialConfigured')
                                : isPlatformDefault
                                  ? t('workspaceAiSettings.credentialInherited')
                                : t('workspaceAiSettings.credentialMissing')}
                          </p>
                        </div>
                      </div>
                      {(canManageAiSettings || isEditingCredential || credentialError) && (
                        <div className="flex w-full flex-col gap-3 lg:w-auto">
                          {!isEditingCredential && canManageAiSettings && (
                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => openCredentialEditor(provider)}
                                disabled={!currentAiSettings || isSaving || !providerStatus.enabled}
                                className="w-full whitespace-nowrap sm:w-auto"
                                aria-label={t(
                                  isWorkspaceOverride
                                    ? 'workspaceAiSettings.rotateKeyForProvider'
                                    : 'workspaceAiSettings.addKeyForProvider',
                                  { provider: providerLabel(provider) }
                                )}
                              >
                                <ICONS.CheckCircle2 className="h-4 w-4" />
                                {isWorkspaceOverride ? t('workspaceAiSettings.rotateKey') : t('workspaceAiSettings.addWorkspaceKey')}
                              </Button>
                              {isWorkspaceOverride && (
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => {
                                    setCredentialErrors((current) => ({
                                      ...current,
                                      [provider]: ''
                                    }));
                                    setDeleteCandidate(provider);
                                  }}
                                  disabled={!currentAiSettings || isSaving}
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
                                <span className="mb-1 block type-label">
                                  {isWorkspaceOverride ? t('workspaceAiSettings.rotateKey') : t('workspaceAiSettings.addWorkspaceKey')}
                                </span>
                                <TextInput
                                  type="password"
                                  value={providerKeys[provider]}
                                  onChange={(event) =>
                                    setProviderKeys((current) => ({
                                      ...current,
                                      [provider]: event.target.value
                                    }))
                                  }
                                  disabled={!canManageAiSettings || !currentAiSettings || !providerStatus.enabled || isSaving}
                                  aria-label={t(
                                    isWorkspaceOverride
                                      ? 'workspaceAiSettings.rotateKeyForProvider'
                                      : 'workspaceAiSettings.addKeyForProvider',
                                    { provider: providerLabel(provider) }
                                  )}
                                  placeholder={isWorkspaceOverride ? t('workspaceAiSettings.apiKeyRotatePlaceholder') : t('workspaceAiSettings.apiKeyAddPlaceholder')}
                                  className={credentialInputClassName}
                                  autoComplete="off"
                                />
                              </label>
                              <p className="mt-2 type-caption leading-5 text-ui-text-muted">{t('workspaceAiSettings.credentialEditorHelp')}</p>
                              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleSaveProviderKey(provider)}
                                  disabled={!canManageAiSettings || !currentAiSettings || !providerKeys[provider].trim() || isSaving || !providerStatus.enabled}
                                  className="w-full whitespace-nowrap sm:w-auto"
                                  aria-label={t(
                                    isWorkspaceOverride
                                      ? 'workspaceAiSettings.rotateKeyForProvider'
                                    : 'workspaceAiSettings.addKeyForProvider',
                                    { provider: providerLabel(provider) }
                                  )}
                                >
                                  <ICONS.CheckCircle2 className="h-4 w-4" />
                                  {savingAction === `save:${provider}` ? t('workspaceAiSettings.saving') : isWorkspaceOverride ? t('workspaceAiSettings.rotateKey') : t('workspaceAiSettings.addWorkspaceKey')}
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
            </SettingsSection>
          </>
        )}
      </div>
      <DestructiveConfirmationDialog
        open={Boolean(deleteCandidate)}
        titleId="delete-workspace-ai-provider-key-title"
        title={deleteCandidate ? t('workspaceAiSettings.deleteKeyTitle', { provider: providerLabel(deleteCandidate) }) : ''}
        subtitle={t('common.irreversibleAction')}
        description={t('workspaceAiSettings.deleteKeyDescription')}
        error={deleteCandidate ? credentialErrors[deleteCandidate] : null}
        cancelLabel={t('app.cancel')}
        confirmLabel={t('workspaceAiSettings.deleteKey')}
        loadingLabel={t('workspaceAiSettings.saving')}
        confirmDisabled={!canManageAiSettings || !currentAiSettings}
        pending={Boolean(deleteCandidate && savingAction === `delete:${deleteCandidate}`)}
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={() => {
          if (deleteCandidate) void handleDeleteProviderKey(deleteCandidate);
        }}
      />
    </PageShell>
  );
};
