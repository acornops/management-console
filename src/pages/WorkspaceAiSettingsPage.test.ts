import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const workspaceAiSettingsPage = readFileSync(resolve(root, 'src/pages/WorkspaceAiSettingsPage.tsx'), 'utf8');

describe('WorkspaceAiSettingsPage source contracts', () => {
  it('does not retain credential form state across workspace changes', () => {
    expect(workspaceAiSettingsPage).toContain('const EMPTY_PROVIDER_KEYS');
    expect(workspaceAiSettingsPage).toContain('const workspaceIdRef = useRef(workspace.id);');
    expect(workspaceAiSettingsPage).toContain('workspaceIdRef.current = workspace.id;');
    expect(workspaceAiSettingsPage).toContain('const currentAiSettings = aiSettings?.workspaceId === workspace.id ? aiSettings : null;');
    expect(workspaceAiSettingsPage).toContain('setAiSettings(null);');
    expect(workspaceAiSettingsPage).toContain('setProviderKeys(EMPTY_PROVIDER_KEYS);');
    expect(workspaceAiSettingsPage).toContain('setDeleteCandidate(null);');
    expect(workspaceAiSettingsPage).toContain('setSavingAction(\'\');');
    expect(workspaceAiSettingsPage).toContain('}, [workspace.id]);');
    expect(workspaceAiSettingsPage).not.toContain('}, [t, workspace.id]);');
  });

  it('ignores stale workspace mutation responses and serializes writes', () => {
    expect(workspaceAiSettingsPage).toContain('const isSaving = Boolean(savingAction);');
    expect(workspaceAiSettingsPage.match(/workspaceIdRef\.current !== workspace\.id/g)?.length).toBeGreaterThanOrEqual(3);
    expect(workspaceAiSettingsPage).toContain('if (!canSaveDefaults || isSaving) return;');
    expect(workspaceAiSettingsPage).toContain('if (!apiKey || !canManageAiSettings || !currentAiSettings || isSaving) return;');
    expect(workspaceAiSettingsPage).toContain('if (!canManageAiSettings || !currentAiSettings || isSaving) return;');
    expect(workspaceAiSettingsPage).toContain('disabled={!canManageAiSettings || !currentAiSettings || isSaving}');
    expect(workspaceAiSettingsPage).toContain('if (workspaceIdRef.current === workspace.id) setSavingAction(\'\');');
  });

  it('keeps credential state write-only and explicit about add versus rotate actions', () => {
    expect(workspaceAiSettingsPage).toContain('type="password"');
    expect(workspaceAiSettingsPage).toContain('autoComplete="off"');
    expect(workspaceAiSettingsPage).toContain("aria-label={t(");
    expect(workspaceAiSettingsPage).toContain('workspaceAiSettings.addKeyForProvider');
    expect(workspaceAiSettingsPage).toContain('workspaceAiSettings.rotateKeyForProvider');
    expect(workspaceAiSettingsPage).toContain('workspaceAiSettings.deleteKeyForProvider');
    expect(workspaceAiSettingsPage).toContain('workspaceAiSettings.confirmDeleteForProvider');
    expect(workspaceAiSettingsPage).toContain('providerStatus.configured ? t(\'workspaceAiSettings.rotateKey\') : t(\'workspaceAiSettings.addKey\')');
    expect(workspaceAiSettingsPage).toContain('providerStatus.configured ? t(\'workspaceAiSettings.credentialConfiguredBadge\') : t(\'workspaceAiSettings.credentialMissingBadge\')');
    expect(workspaceAiSettingsPage).not.toContain('apiKey:');
    expect(workspaceAiSettingsPage).not.toContain('secretName');
  });

  it('mirrors backend provider/model filtering with a custom-model fallback', () => {
    expect(workspaceAiSettingsPage).toContain('const providerModels = allowedModels.filter((model) => modelBelongsToProvider(model, provider));');
    expect(workspaceAiSettingsPage).toContain('return providerModels.length > 0 ? providerModels : allowedModels;');
    expect(workspaceAiSettingsPage).toContain('providerModels.includes(defaultModel)');
    expect(workspaceAiSettingsPage).not.toContain("t('workspaceAiSettings.noProviderModels')");
  });
});
