import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { ICONS } from '@/constants';
import { headerMotion } from '@/lib/motion';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { LlmProvider, Workspace, WorkspaceAiSettings } from '@/types';

interface WorkspaceAiSettingsPageProps {
  workspace: Workspace;
  canManageAiSettings: boolean;
  showToast: (message: string) => void;
}

const SettingSection: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <section className="mb-10 last:mb-0">
    <div className="mb-6 px-1">
      <h2 className="mb-1 text-xl font-bold tracking-tight text-ui-text">{title}</h2>
      <p className="max-w-3xl text-sm leading-6 text-ui-text-muted">{description}</p>
    </div>
    <div className="overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">{children}</div>
  </section>
);

const PROVIDERS: LlmProvider[] = ['openai', 'anthropic', 'gemini'];
const EMPTY_PROVIDER_KEYS: Record<LlmProvider, string> = {
  openai: '',
  anthropic: '',
  gemini: ''
};

function providerLabel(provider: LlmProvider): string {
  if (provider === 'openai') return 'OpenAI';
  if (provider === 'anthropic') return 'Anthropic';
  return 'Gemini';
}

function modelBelongsToProvider(model: string, provider: LlmProvider): boolean {
  const normalized = model.toLowerCase();
  if (provider === 'openai') return normalized.startsWith('gpt-') || normalized.startsWith('o');
  if (provider === 'anthropic') return normalized.includes('claude');
  return normalized.includes('gemini');
}

function modelsForProvider(allowedModels: string[], provider: LlmProvider): string[] {
  const providerModels = allowedModels.filter((model) => modelBelongsToProvider(model, provider));
  return providerModels.length > 0 ? providerModels : allowedModels;
}

export const WorkspaceAiSettingsPage: React.FC<WorkspaceAiSettingsPageProps> = ({
  workspace,
  canManageAiSettings,
  showToast
}) => {
  const { t } = useTranslation();
  const [aiSettings, setAiSettings] = useState<WorkspaceAiSettings | null>(null);
  const [aiSettingsError, setAiSettingsError] = useState('');
  const [isLoadingAiSettings, setIsLoadingAiSettings] = useState(false);
  const [defaultProvider, setDefaultProvider] = useState<LlmProvider>('gemini');
  const [defaultModel, setDefaultModel] = useState('gemini-2.0-flash');
  const [providerKeys, setProviderKeys] = useState<Record<LlmProvider, string>>(EMPTY_PROVIDER_KEYS);
  const [savingAction, setSavingAction] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<LlmProvider | null>(null);
  const workspaceIdRef = useRef(workspace.id);

  useEffect(() => {
    let cancelled = false;
    workspaceIdRef.current = workspace.id;
    setAiSettings(null);
    setIsLoadingAiSettings(true);
    setAiSettingsError('');
    setProviderKeys(EMPTY_PROVIDER_KEYS);
    setDeleteCandidate(null);
    setSavingAction('');
    controlPlaneApi.getWorkspaceAiSettings(workspace.id)
      .then((settings) => {
        if (cancelled) return;
        setAiSettings(settings);
        setDefaultProvider(settings.defaultProvider);
        setDefaultModel(settings.defaultModel);
      })
      .catch((error) => {
        if (cancelled) return;
        setAiSettingsError(error instanceof Error ? error.message : t('workspaceAiSettings.loadFailed'));
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
    return modelsForProvider(currentAiSettings?.allowedModels || [], defaultProvider);
  }, [currentAiSettings?.allowedModels, defaultProvider]);

  const selectableModels = useMemo(() => {
    return providerModels.includes(defaultModel) ? providerModels : [defaultModel, ...providerModels];
  }, [defaultModel, providerModels]);

  const selectableProviders = useMemo(() => {
    const allowedProviders = currentAiSettings?.allowedProviders || PROVIDERS;
    return allowedProviders.includes(defaultProvider) ? allowedProviders : [defaultProvider, ...allowedProviders];
  }, [currentAiSettings?.allowedProviders, defaultProvider]);

  const canSaveDefaults = Boolean(
    canManageAiSettings
      && currentAiSettings
      && currentAiSettings.allowedProviders.includes(defaultProvider)
      && providerModels.includes(defaultModel)
  );
  const isSaving = Boolean(savingAction);
  const displayedProviderStatuses = currentAiSettings?.providers || PROVIDERS.map((provider) => ({
    provider,
    configured: false,
    enabled: false
  }));

  const handleDefaultProviderChange = (provider: LlmProvider) => {
    setDefaultProvider(provider);
    const nextProviderModels = modelsForProvider(currentAiSettings?.allowedModels || [], provider);
    if (nextProviderModels.length > 0 && !nextProviderModels.includes(defaultModel)) {
      setDefaultModel(nextProviderModels[0]);
    }
  };

  const handleSaveDefaults = async () => {
    if (!canSaveDefaults || isSaving) return;
    setSavingAction('defaults');
    setAiSettingsError('');
    try {
      const updated = await controlPlaneApi.updateWorkspaceAiSettings(workspace.id, {
        defaultProvider,
        defaultModel
      });
      if (workspaceIdRef.current !== workspace.id) return;
      setAiSettings(updated);
      showToast(t('workspaceAiSettings.defaultsSaved'));
    } catch (error) {
      if (workspaceIdRef.current !== workspace.id) return;
      setAiSettingsError(error instanceof Error ? error.message : t('workspaceAiSettings.saveFailed'));
    } finally {
      if (workspaceIdRef.current === workspace.id) setSavingAction('');
    }
  };

  const handleSaveProviderKey = async (provider: LlmProvider) => {
    const apiKey = providerKeys[provider].trim();
    if (!apiKey || !canManageAiSettings || !currentAiSettings || isSaving) return;
    setSavingAction(`save:${provider}`);
    setAiSettingsError('');
    try {
      const wasConfigured = currentAiSettings.providers.some((status) => status.provider === provider && status.configured);
      const updated = await controlPlaneApi.saveWorkspaceAiProviderCredential(workspace.id, provider, apiKey);
      if (workspaceIdRef.current !== workspace.id) return;
      setAiSettings(updated);
      setProviderKeys((current) => ({ ...current, [provider]: '' }));
      showToast(t(wasConfigured ? 'workspaceAiSettings.keyRotated' : 'workspaceAiSettings.keyAdded', {
        provider: providerLabel(provider)
      }));
    } catch (error) {
      if (workspaceIdRef.current !== workspace.id) return;
      setAiSettingsError(error instanceof Error ? error.message : t('workspaceAiSettings.saveFailed'));
    } finally {
      if (workspaceIdRef.current === workspace.id) setSavingAction('');
    }
  };

  const handleDeleteProviderKey = async (provider: LlmProvider) => {
    if (!canManageAiSettings || !currentAiSettings || isSaving) return;
    setSavingAction(`delete:${provider}`);
    setAiSettingsError('');
    try {
      const updated = await controlPlaneApi.deleteWorkspaceAiProviderCredential(workspace.id, provider);
      if (workspaceIdRef.current !== workspace.id) return;
      setAiSettings(updated);
      setDeleteCandidate(null);
      showToast(t('workspaceAiSettings.keyDeleted', { provider: providerLabel(provider) }));
    } catch (error) {
      if (workspaceIdRef.current !== workspace.id) return;
      setAiSettingsError(error instanceof Error ? error.message : t('workspaceAiSettings.saveFailed'));
    } finally {
      if (workspaceIdRef.current === workspace.id) setSavingAction('');
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <motion.header {...headerMotion} className="mb-12">
        <h1 className="type-route-title">{t('workspaceAiSettings.title')}</h1>
        <p className="type-body mt-2 max-w-2xl">
          {t('workspaceAiSettings.subtitle')}
        </p>
      </motion.header>

      <div className="max-w-4xl">
        <SettingSection
          title={t('workspaceAiSettings.defaultsTitle')}
          description={t('workspaceAiSettings.defaultsBody')}
        >
          <div className="p-6">
            <div className="mb-5 flex min-w-0 items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong shadow-sm">
                <ICONS.Zap className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="mb-0.5 text-sm font-bold text-ui-text">{t('workspaceAiSettings.defaults')}</p>
                <p className="text-xs leading-5 text-ui-text-muted">{t('workspaceAiSettings.defaultsDescription')}</p>
              </div>
            </div>
            {isLoadingAiSettings ? (
              <p className="text-sm font-medium text-ui-text-muted">{t('workspaceAiSettings.loading')}</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('workspaceAiSettings.provider')}</span>
                  <select
                    className="h-10 w-full rounded-lg border border-ui-border bg-ui-surface px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    value={defaultProvider}
                    onChange={(event) => handleDefaultProviderChange(event.target.value as LlmProvider)}
                    disabled={!canManageAiSettings || !currentAiSettings}
                  >
                    {selectableProviders.map((provider) => (
                      <option key={provider} value={provider} disabled={!currentAiSettings?.allowedProviders.includes(provider)}>
                        {providerLabel(provider)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-ui-text-muted">{t('workspaceAiSettings.model')}</span>
                  <select
                    className="h-10 w-full rounded-lg border border-ui-border bg-ui-surface px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    value={defaultModel}
                    onChange={(event) => setDefaultModel(event.target.value)}
                    disabled={!canManageAiSettings || !currentAiSettings}
                  >
                    {selectableModels.map((model) => (
                      <option key={model} value={model} disabled={!providerModels.includes(model)}>
                        {model}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveDefaults}
                  disabled={!canSaveDefaults || isSaving}
                  className="w-full md:w-auto"
                >
                  <ICONS.CheckCircle2 className="h-4 w-4" />
                  {savingAction === 'defaults' ? t('workspaceAiSettings.saving') : t('workspaceAiSettings.saveDefaults')}
                </Button>
              </div>
            )}
            {aiSettingsError && <p className="mt-4 text-sm font-semibold text-status-danger-text">{aiSettingsError}</p>}
            {!canManageAiSettings && (
              <p className="mt-4 text-xs font-medium text-ui-text-muted">{t('workspaceAiSettings.noAccess')}</p>
            )}
          </div>
        </SettingSection>

        <SettingSection
          title={t('workspaceAiSettings.credentialsTitle')}
          description={t('workspaceAiSettings.credentialsBody')}
        >
          {displayedProviderStatuses.map((providerStatus) => {
            const provider = providerStatus.provider as LlmProvider;
            const isDeleteConfirming = deleteCandidate === provider;
            return (
              <div key={provider} className="flex flex-col gap-5 border-b border-ui-border p-6 last:border-0 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg text-accent-strong shadow-sm">
                    <ICONS.Lock className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-ui-text">{providerLabel(provider)}</p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-widest ${
                          providerStatus.configured
                            ? 'border-status-success/25 bg-status-success-soft text-status-success-text'
                            : 'border-ui-border bg-ui-bg text-ui-text-muted'
                        }`}
                      >
                        {providerStatus.configured ? t('workspaceAiSettings.credentialConfiguredBadge') : t('workspaceAiSettings.credentialMissingBadge')}
                      </span>
                      {!providerStatus.enabled && (
                        <span className="rounded-full border border-status-warning/25 bg-status-warning-soft px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-widest text-status-warning-text">
                          {t('workspaceAiSettings.providerDisabled')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-5 text-ui-text-muted">
                      {providerStatus.configured ? t('workspaceAiSettings.credentialConfigured') : t('workspaceAiSettings.credentialMissing')}
                    </p>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-3 lg:w-[28rem]">
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
                    className="h-10 w-full rounded-lg border border-ui-border bg-ui-surface px-3 text-sm font-medium text-ui-text outline-none placeholder:text-ui-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
                    autoComplete="off"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {isDeleteConfirming ? (
                      <>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteProviderKey(provider)}
                          disabled={!canManageAiSettings || !currentAiSettings || isSaving}
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
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSaveProviderKey(provider)}
                          disabled={!canManageAiSettings || !currentAiSettings || !providerKeys[provider].trim() || isSaving || !providerStatus.enabled}
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
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteCandidate(provider)}
                          disabled={!canManageAiSettings || !currentAiSettings || isSaving || !providerStatus.configured}
                          aria-label={t('workspaceAiSettings.deleteKeyForProvider', { provider: providerLabel(provider) })}
                        >
                          <ICONS.Trash2 className="h-4 w-4" />
                          {t('workspaceAiSettings.deleteKey')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </SettingSection>
      </div>
    </div>
  );
};
