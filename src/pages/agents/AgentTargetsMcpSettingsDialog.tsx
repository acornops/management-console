import React from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Checkbox,
  CloseButton,
  CollectionState,
  DialogFrame,
  InlineAlert,
  InlineLoadingIndicator,
  Radio,
  StatusBadge,
  TextInput
} from '@acornops/ui';
import type {
  AgentTargetAccessPolicyApi,
  AgentTargetAccessSettingsApi
} from '@/services/control-plane/agentApi';

interface AgentTargetsMcpSettingsDialogProps {
  workspaceId: string;
  agentId: string;
  serverId: string;
  serverName: string;
  canEdit: boolean;
  load: (workspaceId: string, agentId: string, serverId: string) => Promise<AgentTargetAccessSettingsApi>;
  save: (workspaceId: string, agentId: string, serverId: string, policy: AgentTargetAccessPolicyApi) => Promise<AgentTargetAccessSettingsApi>;
  onClose: () => void;
}

const policyModes: AgentTargetAccessPolicyApi['mode'][] = ['all', 'allowlist', 'denylist'];

export function normalizedTargetAccessPolicy(policy: AgentTargetAccessPolicyApi): AgentTargetAccessPolicyApi {
  return {
    mode: policy.mode,
    targetIds: policy.mode === 'all'
      ? []
      : [...new Set(policy.targetIds.map((targetId) => targetId.trim()).filter(Boolean))]
        .sort((left, right) => left.localeCompare(right))
  };
}

export function targetAccessPolicyChanged(
  saved: AgentTargetAccessPolicyApi,
  draft: AgentTargetAccessPolicyApi
): boolean {
  return JSON.stringify(normalizedTargetAccessPolicy(saved)) !== JSON.stringify(normalizedTargetAccessPolicy(draft));
}

function targetStatusTone(status: AgentTargetAccessSettingsApi['targets'][number]['status']) {
  if (status === 'online') return 'success' as const;
  if (status === 'degraded') return 'warning' as const;
  if (status === 'offline') return 'danger' as const;
  return 'neutral' as const;
}

export const AgentTargetsMcpSettingsDialog: React.FC<AgentTargetsMcpSettingsDialogProps> = ({
  workspaceId,
  agentId,
  serverId,
  serverName,
  canEdit,
  load,
  save,
  onClose
}) => {
  const { t } = useTranslation();
  const [settings, setSettings] = React.useState<AgentTargetAccessSettingsApi | null>(null);
  const [draft, setDraft] = React.useState<AgentTargetAccessPolicyApi>({ mode: 'all', targetIds: [] });
  const [search, setSearch] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const loadGeneration = React.useRef(0);
  const mounted = React.useRef(true);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      loadGeneration.current += 1;
    };
  }, []);

  const loadSettings = React.useCallback(async () => {
    const generation = loadGeneration.current + 1;
    loadGeneration.current = generation;
    setLoading(true);
    setError(null);
    try {
      const next = await load(workspaceId, agentId, serverId);
      if (loadGeneration.current !== generation) return;
      setSettings(next);
      setDraft(normalizedTargetAccessPolicy(next.policy));
    } catch (loadError) {
      if (loadGeneration.current !== generation) return;
      setError(loadError instanceof Error ? loadError.message : t('mcpServers.targetAccessLoadFailed'));
    } finally {
      if (loadGeneration.current === generation) setLoading(false);
    }
  }, [agentId, load, serverId, t, workspaceId]);

  React.useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const selectedIds = React.useMemo(() => new Set(draft.targetIds), [draft.targetIds]);
  const hasChanges = settings ? targetAccessPolicyChanged(settings.policy, draft) : false;
  const filteredTargets = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return (settings?.targets || []).filter((target) => (
      !query
      || target.name.toLowerCase().includes(query)
      || target.id.toLowerCase().includes(query)
      || t(`chat.targetMentionTypes.${target.targetType}`).toLowerCase().includes(query)
      || t(`chat.targetMentionStatuses.${target.status}`).toLowerCase().includes(query)
    ));
  }, [search, settings?.targets, t]);

  const toggleTarget = (targetId: string) => {
    setDraft((current) => ({
      ...current,
      targetIds: current.targetIds.includes(targetId)
        ? current.targetIds.filter((id) => id !== targetId)
        : [...current.targetIds, targetId]
    }));
  };

  const submit = async () => {
    if (!canEdit || !settings || !hasChanges || saving) return;
    setSaving(true);
    setError(null);
    try {
      await save(workspaceId, agentId, serverId, normalizedTargetAccessPolicy(draft));
      onClose();
    } catch (saveError) {
      if (mounted.current) {
        setError(saveError instanceof Error ? saveError.message : t('mcpServers.targetAccessSaveFailed'));
      }
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <DialogFrame
      unframed
      titleId="agent-target-access-settings-title"
      closeDisabled={saving}
      onClose={onClose}
      className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-4">
        <div className="min-w-0">
          <h3 id="agent-target-access-settings-title" className="type-panel-title">{t('mcpServers.targetAccessTitle')}</h3>
          <p className="type-caption mt-1 text-ui-text-muted">{t('mcpServers.targetAccessBody', { name: serverName })}</p>
        </div>
        <CloseButton onClick={onClose} disabled={saving} aria-label={t('mcpServers.closeTargetAccessSettings')} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
        <CollectionState
          phase={loading ? 'loading' : settings ? 'ready' : 'error'}
          itemCount={settings ? 1 : 0}
          loading={(
            <div className="flex min-h-[18rem] items-center justify-center">
              <InlineLoadingIndicator label={t('mcpServers.loadingTargetAccess')} />
            </div>
          )}
          empty={<span />}
          error={(
            <div className="space-y-4">
              <InlineAlert tone="danger">{error || t('mcpServers.targetAccessLoadFailed')}</InlineAlert>
              <Button variant="secondary" size="sm" onClick={() => void loadSettings()}>{t('common.retry')}</Button>
            </div>
          )}
          feedback={settings && error ? <InlineAlert tone="danger">{error}</InlineAlert> : undefined}
        >
          {settings && (
            <div className="space-y-5">
              <>
                <fieldset disabled={!canEdit || saving}>
                  <legend className="type-label mb-3 text-ui-text">{t('mcpServers.targetAccessMode')}</legend>
                  <div className="grid gap-3">
                    {policyModes.map((mode) => (
                      <label key={mode} className={`flex min-h-11 items-start gap-3 rounded-lg border border-ui-border bg-ui-surface px-4 py-3 transition-colors ${canEdit && !saving ? 'cursor-pointer hover:bg-ui-bg' : ''}`}>
                        <Radio
                          name="agent-target-access-mode"
                          value={mode}
                          checked={draft.mode === mode}
                          onChange={() => setDraft((current) => ({ ...current, mode }))}
                          className="mt-0.5 shrink-0"
                        />
                        <span className="min-w-0">
                          <span className="type-ui block text-ui-text">{t(`mcpServers.targetAccessMode_${mode}`)}</span>
                          <span className="type-caption mt-0.5 block text-ui-text-muted">{t(`mcpServers.targetAccessMode_${mode}Help`)}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {draft.mode !== 'all' && (
                  <section aria-labelledby="agent-target-selection-title" className="overflow-hidden rounded-lg border border-ui-border">
                    <div className="border-b border-ui-border bg-ui-bg px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 id="agent-target-selection-title" className="type-row-title">{t('mcpServers.selectTargets')}</h4>
                          <p className="type-caption mt-0.5 text-ui-text-muted">{t('mcpServers.selectedTargetCount', { count: selectedIds.size })}</p>
                        </div>
                        {canEdit && (
                          <Button variant="tertiary" size="sm" onClick={() => setDraft((current) => ({ ...current, targetIds: [] }))} disabled={saving || selectedIds.size === 0}>
                            {t('mcpServers.clearTargetSelection')}
                          </Button>
                        )}
                      </div>
                      <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
                        <TextInput
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder={t('mcpServers.searchTargets')}
                          aria-label={t('mcpServers.searchTargets')}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="max-h-64 divide-y divide-ui-border overflow-y-auto custom-scrollbar">
                      {filteredTargets.length === 0 ? (
                        <p className="type-caption px-4 py-6 text-center text-ui-text-muted">{t(settings.targets.length === 0 ? 'mcpServers.noTargetsAvailable' : 'mcpServers.noTargetMatches')}</p>
                      ) : filteredTargets.map((target) => (
                        <label key={target.id} className={`flex min-h-11 items-start gap-3 px-4 py-3 transition-colors ${canEdit && !saving ? 'cursor-pointer hover:bg-ui-bg' : ''}`}>
                          <Checkbox
                            checked={selectedIds.has(target.id)}
                            disabled={!canEdit || saving}
                            onChange={() => toggleTarget(target.id)}
                            className="mt-0.5 shrink-0"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="type-ui block text-ui-text">{target.name}</span>
                            <span className="type-caption block truncate text-ui-text-muted">{t(`chat.targetMentionTypes.${target.targetType}`)} · {target.id}</span>
                          </span>
                          <StatusBadge tone={targetStatusTone(target.status)}>
                            {t(`chat.targetMentionStatuses.${target.status}`)}
                          </StatusBadge>
                        </label>
                      ))}
                    </div>
                  </section>
                )}
              </>
            </div>
          )}
        </CollectionState>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>{canEdit ? t('common.cancel') : t('common.close')}</Button>
        {canEdit && (
          <Button variant="primary" size="sm" onClick={() => void submit()} disabled={!settings || !hasChanges || loading || saving}>
            {saving ? t('common.saving') : t('mcpServers.saveTargetAccess')}
          </Button>
        )}
      </div>
    </DialogFrame>
  );
};
