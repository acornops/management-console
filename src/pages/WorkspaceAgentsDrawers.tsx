import { useTranslation } from 'react-i18next';
import React from 'react';
import { Button } from '@acornops/ui';
import { CloseButton, Textarea, TextInput } from '@acornops/ui';
import { DrawerFrame } from '@acornops/ui';
import { ICONS } from '@/constants';
import { AgentAvatar, AgentEmojiPicker, suggestAgentEmoji } from '@/pages/agents/AgentAvatar';
import { type AgentDraft } from '@/pages/WorkspaceAgentsPage.helpers';

interface CreateAgentDrawerProps {
  createDraft: AgentDraft;
  setCreateDraft: React.Dispatch<React.SetStateAction<AgentDraft>>;
  creatingAgent: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const CreateAgentDrawer: React.FC<CreateAgentDrawerProps> = ({
  createDraft,
  setCreateDraft,
  creatingAgent,
  onClose,
  onSave
}) => {
  const { t } = useTranslation();
  const [emojiCustomized, setEmojiCustomized] = React.useState(false);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const canSave = Boolean(createDraft.name.trim() && createDraft.description.trim());
  const appearanceSummary = emojiCustomized
    ? t('agentUi.emojiChosen', { emoji: createDraft.avatarEmoji })
    : createDraft.name.trim()
      ? t('agentUi.emojiSuggested', { emoji: createDraft.avatarEmoji })
      : t('agentUi.emojiDefault', { emoji: createDraft.avatarEmoji });
  return (
    <DrawerFrame unframed
      isOpen
      onClose={onClose}
      titleId="create-agent-title"
      descriptionId="create-agent-description"
      initialFocusRef={nameInputRef}
      className="max-w-3xl"
    >
      <div className="border-b border-ui-border bg-ui-bg px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="create-agent-title" className="type-section-title">{t('agentUi.create')}</h2>
            <p id="create-agent-description" className="type-caption mt-2 text-ui-text-muted">{t('agentUi.createDescription')}</p>
          </div>
          <CloseButton onClick={onClose} label={t('agentUi.closeCreate')} className="shrink-0" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <AgentAvatar emoji={createDraft.avatarEmoji} size="lg" className="mt-6" />
            <label className="min-w-0 flex-1">
              <span className="type-micro-label">{t('schedules.form.name')} <span aria-hidden="true">*</span></span>
              <TextInput
                ref={nameInputRef}
                required
                value={createDraft.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setCreateDraft((draft) => ({
                    ...draft,
                    name,
                    avatarEmoji: emojiCustomized ? draft.avatarEmoji : suggestAgentEmoji(name)
                  }));
                }}
                placeholder={t('agentUi.namePlaceholder')}
                className="mt-2"
              />
            </label>
          </div>

          <label className="block">
            <span className="type-micro-label">{t('agentUi.purpose')} <span aria-hidden="true">*</span></span>
            <span className="type-caption mt-1 block text-ui-text-muted">{t('agentUi.purposeHelp')}</span>
            <Textarea
              required
              value={createDraft.description}
              onChange={(event) => setCreateDraft((draft) => ({ ...draft, description: event.target.value }))}
              placeholder={t('agentUi.purposePlaceholder')}
              className="mt-2 min-h-24"
            />
          </label>

          <details className="group rounded-md border border-ui-border bg-ui-bg">
            <summary className="control-target flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-md px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-control-boundary [&::-webkit-details-marker]:hidden">
              <span>
                <span className="type-ui block text-ui-text">{t('agentUi.appearance')}</span>
                <span className="type-caption mt-0.5 block text-ui-text-muted">{appearanceSummary}</span>
              </span>
              <ICONS.ChevronRight className="h-4 w-4 shrink-0 text-ui-text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
            </summary>
            <div className="border-t border-ui-border px-4 py-4">
              <AgentEmojiPicker
                value={createDraft.avatarEmoji}
                onChange={(avatarEmoji) => {
                  setEmojiCustomized(true);
                  setCreateDraft((draft) => ({ ...draft, avatarEmoji }));
                }}
                description={t('agentUi.appearanceHelp')}
              />
            </div>
          </details>

          <details className="group rounded-md border border-ui-border bg-ui-bg">
            <summary className="control-target flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-md px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-control-boundary [&::-webkit-details-marker]:hidden">
              <span>
                <span className="type-ui block text-ui-text">{t('agentUi.customize')}</span>
                <span className="type-caption mt-0.5 block text-ui-text-muted">{t('agentUi.customizeHelp')}</span>
              </span>
              <ICONS.ChevronRight className="h-4 w-4 shrink-0 text-ui-text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
            </summary>
            <label className="block border-t border-ui-border px-4 py-4">
              <span className="type-micro-label">{t('agentUi.instructions')}</span>
              <span className="type-caption mt-1 block text-ui-text-muted">{t('agentUi.instructionsHelp')}</span>
              <Textarea
                value={createDraft.instructions}
                onChange={(event) => setCreateDraft((draft) => ({ ...draft, instructions: event.target.value }))}
                placeholder={t('agentUi.instructionsPlaceholder')}
                className="mt-2"
              />
            </label>
          </details>

          <div className="border-t border-ui-border pt-4">
            <p className="type-ui text-ui-text">{t('agentUi.safeDefaults')}</p>
            <p className="type-caption mt-1 text-ui-text-muted">{t('agentUi.safeDefaultsHelp')}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-5 py-4">
        <Button type="button" variant="tertiary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="button" variant="primary" size="sm" onClick={onSave} disabled={creatingAgent || !canSave}>
          <ICONS.Plus className="h-4 w-4" />
          {creatingAgent ? t('skillEditor.creating') : t('agentUi.create')}
        </Button>
      </div>
    </DrawerFrame>
  );
};
