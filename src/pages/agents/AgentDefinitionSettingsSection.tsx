import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, CollectionState, Select, type SelectOption, Textarea, TextInput } from '@acornops/ui';
import { ICONS } from '@/constants';
import { AgentEmojiPicker } from '@/pages/agents/AgentAvatar';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import { statusOptions, type AgentEditDraft } from '@/pages/WorkspaceAgentsPage.helpers';
import type { useAgentOwnerOptions } from './useAgentOwnerOptions';

interface AgentDefinitionSettingsSectionProps {
  agent: AgentDefinition;
  canManageAgents: boolean;
  draft: AgentEditDraft;
  setDraft: React.Dispatch<React.SetStateAction<AgentEditDraft | null>>;
  ownerSelectOptions: Array<SelectOption<string>>;
  ownerOptions: ReturnType<typeof useAgentOwnerOptions>;
  canReadMembers: boolean;
  onOwnerChange: (userId: string) => void;
  changeSummary: string[];
  saving: boolean;
  onReset: () => void;
  onSave: () => void;
}

export const AgentDefinitionSettingsSection: React.FC<AgentDefinitionSettingsSectionProps> = ({
  agent,
  canManageAgents,
  draft,
  setDraft,
  ownerSelectOptions,
  ownerOptions,
  canReadMembers,
  onOwnerChange,
  changeSummary,
  saving,
  onReset,
  onSave
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = React.useState(true);
  const [appearanceExpanded, setAppearanceExpanded] = React.useState(false);
  const appearanceId = React.useId();
  const titleId = React.useId();
  const descriptionId = React.useId();
  const contentId = React.useId();
  const updateDraft = (update: Partial<AgentEditDraft>) => {
    setDraft((current) => current ? { ...current, ...update } : current);
  };
  const saveDisabled = saving || !canManageAgents || (!canReadMembers && draft.ownerUserId !== agent.ownerUserId) || !draft.name.trim() || !draft.description.trim() || changeSummary.length === 0;

  return (
    <section className="mb-10" aria-labelledby={titleId} data-agent-definition-settings="true">
      <div className="mb-6 flex flex-col gap-4 px-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id={titleId} className="mb-1 type-section-title">{t('agentUi.definition')}</h2>
          <p id={descriptionId} className="max-w-[72ch] type-body leading-6 text-ui-text-muted">
            {t('agentUi.definitionDescription')}
          </p>
          {changeSummary.length > 0 && !expanded && (
            <p className="type-caption type-emphasis mt-1 text-status-warning-text">{t('agentUi.unsavedPreserved')}</p>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="w-full shrink-0 sm:w-auto"
          aria-expanded={expanded}
          aria-controls={contentId}
          aria-describedby={descriptionId}
          aria-label={t(expanded ? 'agentUi.collapseDefinition' : 'agentUi.expandDefinition')}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? t('agentUi.collapseFields') : t('agentUi.expandFields')}
          {expanded ? <ICONS.ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ICONS.ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>

      <div id={contentId} hidden={!expanded} className="overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">
        <form onSubmit={(event) => { event.preventDefault(); onSave(); }}>
          <div className="space-y-6 p-6">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="type-caption text-ui-text-muted">{t('agentAppearance.selected', { emoji: draft.avatarEmoji })}</p>
                <Button type="button" variant="tertiary" size="sm" aria-expanded={appearanceExpanded} aria-controls={appearanceId} onClick={() => setAppearanceExpanded((current) => !current)}>
                  {t('agentAppearance.title')}
                  {appearanceExpanded ? <ICONS.ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ICONS.ChevronDown className="h-4 w-4" aria-hidden="true" />}
                </Button>
              </div>
              <div id={appearanceId} hidden={!appearanceExpanded} className="mt-3">
                {appearanceExpanded && <AgentEmojiPicker
                  value={draft.avatarEmoji}
                  onChange={(avatarEmoji) => updateDraft({ avatarEmoji })}
                  description={t('agentUi.identityHelp')}
                  disabled={!canManageAgents || saving}
                />}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="type-micro-label">{t('schedules.form.name')}</span>
                <TextInput required value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} disabled={!canManageAgents || saving} className="mt-2" />
              </label>
              <label className="block">
                <span className="type-micro-label">{t('common.status')}</span>
                <Select<AgentEditDraft['status']>
                  value={draft.status}
                  options={statusOptions.map(option => ({ ...option, label: t(`agentsWorkflows.agents.status.${option.value}`) }))}
                  onChange={(status) => updateDraft({ status })}
                  disabled={!canManageAgents || saving}
                  className="mt-2"
                  ariaLabel={t('common.status')}
                />
              </label>
            </div>

            <label className="block">
              <span className="type-micro-label">{t('agentUi.purpose')}</span>
              <span className="type-caption mt-1 block text-ui-text-muted">{t('agentUi.purposeHelp')}</span>
              <Textarea required value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} disabled={!canManageAgents || saving} className="mt-2 min-h-24" />
            </label>
          </div>

          <div className="border-t border-ui-border p-6">
            <label className="block">
              <span className="type-micro-label">{t('agentUi.owner')}</span>
              <Select<string>
                value={draft.ownerUserId}
                options={ownerSelectOptions}
                placeholder={t('agentUi.keepOwner')}
                onChange={onOwnerChange}
                disabled={!canManageAgents || !canReadMembers || saving}
                className="mt-2 sm:max-w-md"
                ariaLabel={t('agentUi.owner')}
              />
            </label>
            <p className="type-caption mt-2 text-ui-text-muted">
              {canReadMembers ? t('agentUi.ownerHelp') : t('agentUi.ownerReadPermission', { name: agent.owner })}
            </p>
            {canReadMembers && <div className="mt-3 space-y-3">
              <CollectionState phase={ownerOptions.phase} itemCount={ownerOptions.items.length}
                loading={<p role="status" className="type-caption text-ui-text-muted">{t('agentUi.loadingMembers')}</p>}
                empty={<p role="status" className="type-caption text-ui-text-muted">{t('agentUi.noMembers')}</p>}
                error={null}>
                <p role="status" className="type-caption text-ui-text-muted">{t('agentUi.loadedMembers', { count: ownerOptions.items.length })}</p>
              </CollectionState>
              {ownerOptions.error && <p role="alert" className="type-caption text-status-danger-text">{ownerOptions.items.length ? t('agentUi.moreOwnersFailed') : t('agentUi.ownersFailed')}</p>}
              {ownerOptions.error ? <Button type="button" variant="secondary" size="sm" onClick={() => void ownerOptions.retry()} disabled={saving}>{t('agentUi.retryMembers')}</Button>
                : ownerOptions.nextCursor && <Button type="button" variant="secondary" size="sm" onClick={() => void ownerOptions.loadMore()} disabled={saving || ownerOptions.phase === 'loadingMore'}>{ownerOptions.phase === 'loadingMore' ? t('agentUi.loadingMembers') : t('agentUi.loadMoreMembers')}</Button>}
            </div>}
          </div>

          <div className="border-t border-ui-border p-6">
            <label className="block">
              <span className="type-micro-label">{t('agentUi.instructions')}</span>
              <span className="type-caption mt-1 block text-ui-text-muted">{t('agentUi.futureInstructionsHelp')}</span>
              <Textarea value={draft.instructions} onChange={(event) => updateDraft({ instructions: event.target.value })} disabled={!canManageAgents || saving} className="mt-2 min-h-32" />
            </label>
          </div>

          <p className="border-t border-ui-border bg-ui-bg/60 px-6 py-4 type-body text-ui-text-muted">
            {t('agentUi.capabilitiesHelp')}
          </p>

          {changeSummary.length > 0 && (
            <section className="border-t border-ui-border px-6 py-5" aria-labelledby="agent-change-summary-title">
              <h3 id="agent-change-summary-title" className="type-row-title">{t('agentUi.changesBeforeSave')}</h3>
              <ul className="type-body type-emphasis mt-3 grid gap-2">
                {changeSummary.map((change) => <li key={change}>{change}</li>)}
              </ul>
            </section>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-ui-border px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="tertiary" size="sm" onClick={onReset} disabled={!canManageAgents || saving || changeSummary.length === 0}>
              {t('tools.targetInsights.resetChanges')}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saveDisabled}>
              <ICONS.CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {saving ? t('skillEditor.saving') : t('mcpServers.saveChanges')}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};
