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
          <h2 id={titleId} className="mb-1 type-section-title">Agent definition</h2>
          <p id={descriptionId} className="max-w-[72ch] type-body leading-6 text-ui-text-muted">
            Edit the shared identity, purpose, ownership, and instructions used by future Agent runs.
          </p>
          {changeSummary.length > 0 && !expanded && (
            <p className="type-caption type-emphasis mt-1 text-status-warning-text">Unsaved changes are preserved.</p>
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
          aria-label={`${expanded ? 'Collapse' : 'Expand'} Agent definition`}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? 'Collapse fields' : 'Expand fields'}
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
                  description="This visual identity appears anywhere the Agent is presented."
                  disabled={!canManageAgents || saving}
                />}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="type-micro-label">Name</span>
                <TextInput required value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} disabled={!canManageAgents || saving} className="mt-2" />
              </label>
              <label className="block">
                <span className="type-micro-label">Status</span>
                <Select<AgentEditDraft['status']>
                  value={draft.status}
                  options={statusOptions}
                  onChange={(status) => updateDraft({ status })}
                  disabled={!canManageAgents || saving}
                  className="mt-2"
                  ariaLabel="Status"
                />
              </label>
            </div>

            <label className="block">
              <span className="type-micro-label">Purpose</span>
              <span className="type-caption mt-1 block text-ui-text-muted">Shown in the Agent catalog so people know when to use it.</span>
              <Textarea required value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} disabled={!canManageAgents || saving} className="mt-2 min-h-24" />
            </label>
          </div>

          <div className="border-t border-ui-border p-6">
            {canReadMembers && <label className="mb-4 block sm:max-w-md">
              <span className="type-micro-label">Search owner members</span>
              <TextInput type="search" value={ownerOptions.query} onChange={(event) => ownerOptions.setQuery(event.target.value)} disabled={!canManageAgents || saving} placeholder="Search members by name or email" className="mt-2" />
            </label>}
            <label className="block">
              <span className="type-micro-label">Agent owner</span>
              <Select<string>
                value={draft.ownerUserId}
                options={ownerSelectOptions}
                placeholder="Keep current owner"
                onChange={onOwnerChange}
                disabled={!canManageAgents || !canReadMembers || saving}
                className="mt-2 sm:max-w-md"
                ariaLabel="Agent owner"
              />
            </label>
            <p className="type-caption mt-2 text-ui-text-muted">
              {canReadMembers ? 'Search workspace members or load more to choose an owner. Your selection is kept when the search changes.' : `Current owner: ${agent.owner}. Read-members permission is required to choose another owner.`}
            </p>
            {canReadMembers && <div className="mt-3 space-y-3">
              <CollectionState phase={ownerOptions.phase} itemCount={ownerOptions.items.length}
                loading={<p role="status" className="type-caption text-ui-text-muted">Loading members...</p>}
                empty={<p role="status" className="type-caption text-ui-text-muted">No members match this search.</p>}
                error={null}>
                <p role="status" className="type-caption text-ui-text-muted">{ownerOptions.items.length} {ownerOptions.items.length === 1 ? 'member' : 'members'} loaded</p>
              </CollectionState>
              {ownerOptions.error && <p role="alert" className="type-caption text-status-danger-text">{ownerOptions.items.length ? 'Unable to load more owner choices. Previously loaded members are still available.' : 'Unable to load owner choices. Keep the current owner or retry.'}</p>}
              {ownerOptions.error ? <Button type="button" variant="secondary" size="sm" onClick={() => void ownerOptions.retry()} disabled={saving}>Retry member loading</Button>
                : ownerOptions.nextCursor && <Button type="button" variant="secondary" size="sm" onClick={() => void ownerOptions.loadMore()} disabled={saving || ownerOptions.phase === 'loadingMore'}>{ownerOptions.phase === 'loadingMore' ? 'Loading members...' : 'Load more members'}</Button>}
            </div>}
          </div>

          <div className="border-t border-ui-border p-6">
            <label className="block">
              <span className="type-micro-label">Agent instructions</span>
              <span className="type-caption mt-1 block text-ui-text-muted">Sent to the Agent at the start of each run. Changes apply to future runs.</span>
              <Textarea value={draft.instructions} onChange={(event) => updateDraft({ instructions: event.target.value })} disabled={!canManageAgents || saving} className="mt-2 min-h-32" />
            </label>
          </div>

          <p className="border-t border-ui-border bg-ui-bg/60 px-6 py-4 type-body text-ui-text-muted">
            Capabilities are configured independently and remain visible in the MCP Servers, Skills, and Tools sections.
          </p>

          {changeSummary.length > 0 && (
            <section className="border-t border-ui-border px-6 py-5" aria-labelledby="agent-change-summary-title">
              <h3 id="agent-change-summary-title" className="type-row-title">Changes before save</h3>
              <ul className="type-body type-emphasis mt-3 grid gap-2">
                {changeSummary.map((change) => <li key={change}>{change}</li>)}
              </ul>
            </section>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-ui-border px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="tertiary" size="sm" onClick={onReset} disabled={!canManageAgents || saving || changeSummary.length === 0}>
              Reset changes
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saveDisabled}>
              <ICONS.CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};
