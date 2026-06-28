import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const workspaceAiSettingsPage = [
  readFileSync(resolve(root, 'src/pages/WorkspaceAiSettingsPage.tsx'), 'utf8'),
  readFileSync(resolve(root, 'src/pages/WorkspaceAiSettingsPage.helpers.tsx'), 'utf8')
].join('\n');

describe('WorkspaceAiSettingsPage source contracts', () => {
  it('does not retain credential form state across workspace changes', () => {
    expect(workspaceAiSettingsPage).toContain('const EMPTY_PROVIDER_KEYS');
    expect(workspaceAiSettingsPage).toContain('const workspaceIdRef = useRef(workspace.id);');
    expect(workspaceAiSettingsPage).toContain('workspaceIdRef.current = workspace.id;');
    expect(workspaceAiSettingsPage).toContain('const currentAiSettings = aiSettings?.workspaceId === workspace.id ? aiSettings : null;');
    expect(workspaceAiSettingsPage).toContain('setAiSettings(null);');
    expect(workspaceAiSettingsPage).toContain('setBehaviorDraft(DEFAULT_BEHAVIOR_DRAFT);');
    expect(workspaceAiSettingsPage).toContain('setProviderKeys(EMPTY_PROVIDER_KEYS);');
    expect(workspaceAiSettingsPage).toContain('setCredentialErrors(EMPTY_CREDENTIAL_ERRORS);');
    expect(workspaceAiSettingsPage).toContain('setCredentialEditorProvider(null);');
    expect(workspaceAiSettingsPage).toContain('setDeleteCandidate(null);');
    expect(workspaceAiSettingsPage).toContain('setSavingAction(\'\');');
    expect(workspaceAiSettingsPage).toContain('}, [workspace.id]);');
    expect(workspaceAiSettingsPage).not.toContain('}, [t, workspace.id]);');
  });

  it('ignores stale workspace mutation responses and serializes writes', () => {
    expect(workspaceAiSettingsPage).toContain('const isSaving = Boolean(savingAction);');
    expect(workspaceAiSettingsPage.match(/workspaceIdRef\.current !== workspace\.id/g)?.length).toBeGreaterThanOrEqual(3);
    expect(workspaceAiSettingsPage).toContain('if (!canSaveBehavior || isSaving) return;');
    expect(workspaceAiSettingsPage).toContain('if (!apiKey || !canManageAiSettings || !currentAiSettings || isSaving) return;');
    expect(workspaceAiSettingsPage).toContain('if (!canManageAiSettings || !currentAiSettings || isSaving) return;');
    expect(workspaceAiSettingsPage).toContain("setSavingAction('behavior');");
    expect(workspaceAiSettingsPage).toContain('disabled={!canSaveBehavior || isSaving}');
    expect(workspaceAiSettingsPage).toContain('if (workspaceIdRef.current === workspace.id) setSavingAction(\'\');');
  });

  it('keeps credential state write-only and explicit about add versus rotate actions', () => {
    expect(workspaceAiSettingsPage).toContain('const [credentialEditorProvider, setCredentialEditorProvider]');
    expect(workspaceAiSettingsPage).toContain('const isEditingCredential = credentialEditorProvider === provider;');
    expect(workspaceAiSettingsPage).toContain('const openCredentialEditor = (provider: LlmProvider) => {');
    expect(workspaceAiSettingsPage).toContain('const closeCredentialEditor = (provider: LlmProvider) => {');
    expect(workspaceAiSettingsPage).toContain('type="password"');
    expect(workspaceAiSettingsPage).toContain('autoComplete="off"');
    expect(workspaceAiSettingsPage).toContain("aria-label={t(");
    expect(workspaceAiSettingsPage).toContain('workspaceAiSettings.addKeyForProvider');
    expect(workspaceAiSettingsPage).toContain('workspaceAiSettings.rotateKeyForProvider');
    expect(workspaceAiSettingsPage).toContain('workspaceAiSettings.deleteKeyForProvider');
    expect(workspaceAiSettingsPage).toContain('workspaceAiSettings.confirmDeleteForProvider');
    expect(workspaceAiSettingsPage).toContain('providerStatus.configured ? t(\'workspaceAiSettings.credentialConfiguredBadge\') : t(\'workspaceAiSettings.credentialMissingBadge\')');
    expect(workspaceAiSettingsPage).toContain('setCredentialErrors((current) => ({ ...current, [provider]: \'\' }));');
    expect(workspaceAiSettingsPage).toContain('className="w-full sm:w-28"');
    expect(workspaceAiSettingsPage).not.toContain('apiKey:');
    expect(workspaceAiSettingsPage).not.toContain('secretName');
  });

  it('mirrors backend provider/model filtering with a custom-model fallback', () => {
    expect(workspaceAiSettingsPage).toContain('const providerModels = allowedModels.filter((model) => modelBelongsToProvider(model, provider));');
    expect(workspaceAiSettingsPage).toContain('return providerModels.length > 0 ? providerModels : allowedModels;');
    expect(workspaceAiSettingsPage).toContain('providerModels.includes(behaviorDraft.defaultModel)');
    expect(workspaceAiSettingsPage).not.toContain("t('workspaceAiSettings.noProviderModels')");
  });

  it('uses one behavior save workflow for provider, model, and reasoning settings', () => {
    expect(workspaceAiSettingsPage).toContain('interface BehaviorDraft');
    expect(workspaceAiSettingsPage).toContain('function behaviorDraftFromSettings(settings: WorkspaceAiSettings): BehaviorDraft');
    expect(workspaceAiSettingsPage).toContain('function behaviorDraftChanged(settings: WorkspaceAiSettings, draft: BehaviorDraft): boolean');
    expect(workspaceAiSettingsPage).toContain('const hasBehaviorChanges = Boolean(currentAiSettings && behaviorDraftChanged(currentAiSettings, behaviorDraft));');
    expect(workspaceAiSettingsPage).toContain('const canSaveBehavior = Boolean(');
    expect(workspaceAiSettingsPage).toContain('const handleSaveBehavior = async () => {');
    expect(workspaceAiSettingsPage).toContain('reasoningSummaryMode: behaviorDraft.reasoningSummaryMode');
    expect(workspaceAiSettingsPage).toContain('reasoningEffort: behaviorDraft.reasoningEffort');
    expect(workspaceAiSettingsPage).toContain("showToast(t('workspaceAiSettings.settingsSaved'))");
    expect(workspaceAiSettingsPage).not.toContain('const handleSaveDefaults = async () => {');
    expect(workspaceAiSettingsPage).not.toContain('workspaceAiSettings.saveDefaults');
    expect(workspaceAiSettingsPage).not.toContain('workspaceAiSettings.defaultsSaved');
  });

  it('keeps readiness and reasoning helper areas stable while values change', () => {
    expect(workspaceAiSettingsPage).toContain("title={t('workspaceAiSettings.readinessTitle')}");
    expect(workspaceAiSettingsPage).toContain("description={t('workspaceAiSettings.readinessBody')}");
    expect(workspaceAiSettingsPage).toContain('const readinessNotice = !canManageAiSettings');
    expect(workspaceAiSettingsPage).toContain('const savedDefaultProvider = currentAiSettings?.defaultProvider ?? behaviorDraft.defaultProvider;');
    expect(workspaceAiSettingsPage).toContain('providerStatusByProvider.get(savedDefaultProvider)');
    expect(workspaceAiSettingsPage).toContain("t('workspaceAiSettings.readinessReady')");
    expect(workspaceAiSettingsPage).not.toContain('workspaceAiSettings.unsavedBehaviorChanges');
    expect(workspaceAiSettingsPage).toContain('className="min-h-14"');
    expect(workspaceAiSettingsPage).toContain("t('workspaceAiSettings.reasoningEffortInactive')");
    expect(workspaceAiSettingsPage).toContain('className="mt-2 min-h-10 text-xs font-medium leading-5 text-ui-text-muted"');
  });

  it('turns AI readiness into a next-action guide instead of a passive status card', () => {
    expect(workspaceAiSettingsPage).toContain('const readinessAction =');
    expect(workspaceAiSettingsPage).toContain("t('workspaceAiSettings.readinessAddCredentialAction')");
    expect(workspaceAiSettingsPage).toContain("t('workspaceAiSettings.readinessChooseProviderAction')");
    expect(workspaceAiSettingsPage).toContain("t('workspaceAiSettings.readinessReviewCredentialsAction')");
    expect(workspaceAiSettingsPage).toContain("t('workspaceAiSettings.nextAction')");
    expect(workspaceAiSettingsPage).toContain('onClick={() => readinessAction.onClick()}');
  });

  it('anchors in-page AI settings jumps without collapsing section margins', () => {
    expect(workspaceAiSettingsPage).toContain('sectionRef?: React.Ref<HTMLElement>;');
    expect(workspaceAiSettingsPage).toContain('<section ref={sectionRef} className={`mb-10 ${className} last:mb-0`}>');
    expect(workspaceAiSettingsPage).toContain('sectionRef={behaviorSectionRef}');
    expect(workspaceAiSettingsPage).toContain('sectionRef={credentialsSectionRef}');
    expect(workspaceAiSettingsPage).toContain('className="scroll-mt-8"');
    expect(workspaceAiSettingsPage).not.toContain('<div ref={behaviorSectionRef} className="scroll-mt-8">');
    expect(workspaceAiSettingsPage).not.toContain('<div ref={credentialsSectionRef} className="scroll-mt-8">');
  });

  it('derives reasoning policy disablement from allowed summary modes', () => {
    expect(workspaceAiSettingsPage).toContain('function reasoningPolicyDisabled(settings: WorkspaceAiSettings | null): boolean');
    expect(workspaceAiSettingsPage).toContain("!settings.allowedReasoningSummaryModes.some((mode) => mode !== 'off')");
    expect(workspaceAiSettingsPage).not.toContain('!currentAiSettings.reasoningSummariesEnabled');
  });
});
