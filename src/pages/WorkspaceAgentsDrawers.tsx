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
  const [emojiCustomized, setEmojiCustomized] = React.useState(false);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const canSave = Boolean(createDraft.name.trim() && createDraft.description.trim());
  const appearanceSummary = emojiCustomized
    ? `${createDraft.avatarEmoji} chosen by you`
    : createDraft.name.trim()
      ? `${createDraft.avatarEmoji} selected from a matching keyword in the name`
      : `${createDraft.avatarEmoji} is the default. Certain name keywords select another emoji.`;
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
            <h2 id="create-agent-title" className="type-section-title">Create agent</h2>
            <p id="create-agent-description" className="type-caption mt-2 text-ui-text-muted">Describe when people should use this Agent. You can refine how it works and add capabilities later.</p>
          </div>
          <CloseButton onClick={onClose} label="Close create agent drawer" className="shrink-0" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <AgentAvatar emoji={createDraft.avatarEmoji} size="lg" className="mt-6" />
            <label className="min-w-0 flex-1">
              <span className="type-micro-label">Name <span aria-hidden="true">*</span></span>
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
                placeholder="Kubernetes incident guide"
                className="mt-2"
              />
            </label>
          </div>

          <label className="block">
            <span className="type-micro-label">Purpose <span aria-hidden="true">*</span></span>
            <span className="type-caption mt-1 block text-ui-text-muted">Shown in the Agent catalog so people know when to use it.</span>
            <Textarea
              required
              value={createDraft.description}
              onChange={(event) => setCreateDraft((draft) => ({ ...draft, description: event.target.value }))}
              placeholder="Triage Kubernetes incidents and summarize safe next steps."
              className="mt-2 min-h-24"
            />
          </label>

          <details className="group rounded-md border border-ui-border bg-ui-bg">
            <summary className="control-target flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-md px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-control-boundary [&::-webkit-details-marker]:hidden">
              <span>
                <span className="type-ui block text-ui-text">Customize appearance</span>
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
                description="Optional. Choose a different visual identity; status is always shown separately."
              />
            </div>
          </details>

          <details className="group rounded-md border border-ui-border bg-ui-bg">
            <summary className="control-target flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-md px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-control-boundary [&::-webkit-details-marker]:hidden">
              <span>
                <span className="type-ui block text-ui-text">Customize how the Agent works</span>
                <span className="type-caption mt-0.5 block text-ui-text-muted">Optional. If empty, the purpose is used as its instructions.</span>
              </span>
              <ICONS.ChevronRight className="h-4 w-4 shrink-0 text-ui-text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
            </summary>
            <label className="block border-t border-ui-border px-4 py-4">
              <span className="type-micro-label">Agent instructions</span>
              <span className="type-caption mt-1 block text-ui-text-muted">Sent to the Agent at the start of each run. Use this for boundaries, process, and response guidance.</span>
              <Textarea
                value={createDraft.instructions}
                onChange={(event) => setCreateDraft((draft) => ({ ...draft, instructions: event.target.value }))}
                placeholder="For example: inspect before acting, explain risks, and ask before making changes."
                className="mt-2"
              />
            </label>
          </details>

          <div className="border-t border-ui-border pt-4">
            <p className="type-ui text-ui-text">Safe defaults are applied automatically</p>
            <p className="type-caption mt-1 text-ui-text-muted">Restricted trust, approval before changes, and no capabilities until you add them.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-5 py-4">
        <Button type="button" variant="tertiary" size="sm" onClick={onClose}>Cancel</Button>
        <Button type="button" variant="primary" size="sm" onClick={onSave} disabled={creatingAgent || !canSave}>
          <ICONS.Plus className="h-4 w-4" />
          {creatingAgent ? 'Creating...' : 'Create agent'}
        </Button>
      </div>
    </DrawerFrame>
  );
};
