import React from 'react';
import { Trans } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { CloseButton, Textarea, TextInput } from '@/components/common/ComponentVocabulary';
import { ModalStepIndicator } from '@/components/common/ModalStepIndicator';
import { RightSidePanel } from '@/components/common/RightSidePanel';
import { Select, SelectOption } from '@/components/common/Select';
import { ICONS } from '@/constants';
import { type AgentDefinition } from '@/pages/agents/agentModel';
import type { WorkflowOption } from '@/services/control-plane/workflowApi';
import { WorkspaceAgentDetailPanel } from '@/pages/WorkspaceAgentDetailPanel';
import {
  statusOptions,
  type AgentDraft,
  type AgentEditDraft
} from '@/pages/WorkspaceAgentsPage.helpers';

interface CreateAgentDrawerProps {
  createDraft: AgentDraft;
  setCreateDraft: React.Dispatch<React.SetStateAction<AgentDraft>>;
  creatingAgent: boolean;
  onClose: () => void;
  onSave: () => void;
}

type CreateAgentStep = 1 | 2 | 3;

const createAgentSteps: Array<{ id: `${CreateAgentStep}`; label: string }> = [
  { id: '1', label: 'Identity' },
  { id: '2', label: 'Capabilities' },
  { id: '3', label: 'Review' }
];

export const CreateAgentDrawer: React.FC<CreateAgentDrawerProps> = ({
  createDraft,
  setCreateDraft,
  creatingAgent,
  onClose,
  onSave
}) => {
  const [createAgentStep, setCreateAgentStep] = React.useState<CreateAgentStep>(1);
  const [stepNavigationError, setStepNavigationError] = React.useState('');
  const identityError = () => {
    if (!createDraft.name.trim() && !createDraft.description.trim()) return 'Step 1 is not done. Enter an agent name and assignment purpose before continuing.';
    if (!createDraft.name.trim()) return 'Step 1 is not done. Enter an agent name before continuing.';
    if (!createDraft.description.trim()) return 'Step 1 is not done. Enter an assignment purpose before continuing.';
    return '';
  };
  const close = () => {
    onClose();
    setCreateAgentStep(1);
    setStepNavigationError('');
  };
  const goToCreateAgentStep = (nextStep: CreateAgentStep) => {
    if (nextStep > 1) {
      const nextError = identityError();
      if (nextError) {
        setCreateAgentStep(1);
        setStepNavigationError(nextError);
        return;
      }
    }
    setStepNavigationError('');
    setCreateAgentStep(nextStep);
  };
  const capabilitySummary = [
    { label: 'Capabilities', value: 'Assigned after creation through workspace Agent capability APIs.' },
    { label: 'Instructions', value: createDraft.instructions.trim() || createDraft.description.trim() || 'Assignment purpose will be used.' }
  ];
  return (
    <RightSidePanel
      isOpen
      onClose={close}
      titleId="create-agent-title"
      descriptionId="create-agent-description"
      className="max-w-3xl"
    >
      <div className="border-b border-ui-border bg-ui-bg px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="create-agent-title" className="type-section-title">Create agent</h2>
            <p id="create-agent-description" className="type-caption mt-2 text-ui-text-muted">Name the agent and its assignment purpose. It saves with restricted trust and asks before changes.</p>
          </div>
          <CloseButton onClick={close} label="Close create agent drawer" className="shrink-0" />
        </div>
        <div aria-label="Create agent steps">
          <ModalStepIndicator
            steps={createAgentSteps}
            currentStepId={`${createAgentStep}`}
            onStepSelect={(stepId) => goToCreateAgentStep(Number(stepId) as CreateAgentStep)}
            className="mt-4"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
        {stepNavigationError && <div className="mb-4 rounded-md border border-status-warning/30 bg-status-warning-soft p-3 text-xs font-semibold text-status-warning-text" role="status" aria-live="polite">{stepNavigationError}</div>}
        <div className="space-y-5">
          {createAgentStep === 1 && (
            <>
              <label className="block">
                <span className="type-micro-label">Name</span>
                <TextInput
                  value={createDraft.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setCreateDraft((draft) => ({ ...draft, name }));
                    if (name.trim() && createDraft.description.trim()) setStepNavigationError('');
                  }}
                  className="mt-2"
                />
              </label>
              <label className="block">
                <span className="type-micro-label">Assignment purpose</span>
                <TextInput
                  value={createDraft.description}
                  onChange={(event) => {
                    const description = event.target.value;
                    setCreateDraft((draft) => ({ ...draft, description }));
                    if (createDraft.name.trim() && description.trim()) setStepNavigationError('');
                  }}
                  placeholder="Triage Kubernetes incidents and summarize safe next steps"
                  className="mt-2"
                />
              </label>
            </>
          )}

          {createAgentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="type-panel-title">Instructions and capabilities</h3>
                <p className="type-caption mt-1 text-ui-text-muted">Create the Agent first. Its workspace-owned capability ceiling is configured independently, and workflows may only narrow it.</p>
              </div>
              <label className="block">
                <span className="type-micro-label">Operating instructions</span>
                <Textarea value={createDraft.instructions} onChange={(event) => setCreateDraft((draft) => ({ ...draft, instructions: event.target.value }))} placeholder="Optional. If empty, the assignment purpose becomes the instructions." />
              </label>
            </div>
          )}

          {createAgentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="type-panel-title">Review</h3>
                <p className="type-caption mt-1 text-ui-text-muted">This agent saves with restricted trust and asks before changes.</p>
              </div>
              <dl className="divide-y divide-ui-border rounded-md border border-ui-border bg-ui-bg">
                <AgentCreateReviewRow label="Name" value={createDraft.name || 'Unnamed agent'} />
                <AgentCreateReviewRow label="Assignment purpose" value={createDraft.description || 'Required before save'} />
                {capabilitySummary.map((item) => <AgentCreateReviewRow key={item.label} label={item.label} value={item.value} />)}
                <AgentCreateReviewRow label="Trust" value="Restricted trust" />
                <AgentCreateReviewRow label="Permission mode" value="Ask before changes" />
              </dl>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-5 py-4">
        <Button type="button" variant="tertiary" size="sm" onClick={close}>Cancel</Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => goToCreateAgentStep(createAgentStep === 3 ? 2 : 1)} disabled={createAgentStep === 1}>Back</Button>
          {createAgentStep < 3 ? (
            <Button type="button" variant="primary" size="sm" onClick={() => goToCreateAgentStep(createAgentStep === 1 ? 2 : 3)}>Next</Button>
          ) : (
            <Button type="button" variant="primary" size="sm" onClick={onSave} disabled={creatingAgent || !createDraft.name.trim() || !createDraft.description.trim()}>
              <ICONS.Plus className="h-4 w-4" />
              {creatingAgent ? 'Saving...' : 'Save agent'}
            </Button>
          )}
        </div>
      </div>
    </RightSidePanel>
  );
};

const AgentCreateReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="grid gap-1 px-3 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
    <dt className="type-micro-label text-ui-text-muted">{label}</dt>
    <dd className="min-w-0 whitespace-pre-wrap break-words text-sm font-semibold text-ui-text [overflow-wrap:anywhere]">{value}</dd>
  </div>
);

interface EditAgentDrawerProps {
  editingAgent: AgentDefinition;
  editDraft: AgentEditDraft;
  setEditDraft: React.Dispatch<React.SetStateAction<AgentEditDraft | null>>;
  ownerSelectOptions: Array<SelectOption<string>>;
  targetOptions: WorkflowOption[];
  editChangeSummary: string[];
  updatingAgentId: string;
  nameInputRef?: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onSave: () => void;
}

export const EditAgentDrawer: React.FC<EditAgentDrawerProps> = ({
  editingAgent,
  editDraft,
  setEditDraft,
  ownerSelectOptions,
  targetOptions,
  editChangeSummary,
  updatingAgentId,
  nameInputRef,
  onClose,
  onSave
}) => {
  const scopeTokens = editDraft.targetScope.split(/\n|,/).map((token) => token.trim()).filter(Boolean);
  const selectedTypes = new Set(scopeTokens.filter((token) => token.startsWith('target-type:')).map((token) => token.slice(12)));
  const selectedIds = new Set(scopeTokens.filter((token) => token.startsWith('target:')).map((token) => token.slice(7)));
  const updateTargetScope = (types: Set<string>, ids: Set<string>) => setEditDraft((draft) => draft && ({
    ...draft,
    targetScope: [
      types.size || ids.size ? 'scope:selected_target' : 'scope:workspace',
      ...[...types].sort().map((type) => `target-type:${type}`),
      ...[...ids].sort().map((id) => `target:${id}`)
    ].join('\n')
  }));
  return (
  <RightSidePanel
    isOpen
    onClose={onClose}
    titleId="edit-agent-title"
    descriptionId="edit-agent-description"
    initialFocusRef={nameInputRef}
    className="w-full max-w-[min(100vw,64rem)]"
  >
      <div className="shrink-0 border-b border-ui-border bg-ui-bg px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="edit-agent-title" className="type-section-title">Edit agent</h2>
            <p id="edit-agent-description" className="type-caption mt-2 text-ui-text-muted">Changes apply to the shared agent definition. Review workflow impact before saving.</p>
          </div>
          <CloseButton onClick={onClose} label="Close edit agent drawer" className="shrink-0" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="type-micro-label">Name</span>
              <TextInput ref={nameInputRef} value={editDraft.name} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, name: event.target.value }))} className="mt-2" />
            </label>
            <label className="block">
              <span className="type-micro-label">Status</span>
              <Select<AgentEditDraft['status']>
                value={editDraft.status}
                options={statusOptions}
                onChange={(status) => setEditDraft((draft) => draft && ({ ...draft, status }))}
                className="mt-2"
                ariaLabel="Status"
              />
            </label>
          </div>
          <label className="block">
            <span className="type-micro-label">Assignment purpose</span>
            <TextInput value={editDraft.description} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, description: event.target.value }))} className="mt-2" />
          </label>
          <section className="rounded-md border border-ui-border bg-ui-bg px-3 py-3">
            <label className="block">
              <span className="type-micro-label">Agent owner</span>
              <Select<string>
                value={editDraft.ownerUserId}
                options={ownerSelectOptions}
                onChange={(ownerUserId) => setEditDraft((draft) => draft && ({ ...draft, ownerUserId }))}
                className="mt-2"
                ariaLabel="Agent owner"
              />
            </label>
            <p className="type-caption mt-2 text-ui-text-muted">
              {ownerSelectOptions.length > 1 ? 'Only loaded workspace members are available for owner transfer.' : `Current owner: ${editingAgent.owner}`}
            </p>
          </section>
          <label className="block">
            <span className="type-micro-label">Operating instructions</span>
            <Textarea value={editDraft.instructions} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, instructions: event.target.value }))} />
          </label>

          <p className="rounded-md border border-ui-border bg-ui-bg px-3 py-3 text-sm text-ui-text-muted">This form edits the Agent definition only. Its workspace-owned capability ceiling is configured independently and remains visible in the Capabilities tab.</p>

          <section className="rounded-md border border-ui-border bg-ui-bg px-3 py-3">
            <h3 className="type-micro-label">Target scope</h3>
            <p className="type-caption mt-2 text-ui-text-muted">Allow target types broadly, then optionally narrow the Agent to exact targets.</p>
            <div className="mt-3 flex flex-wrap gap-4">
              {([
                ['kubernetes', 'Kubernetes'],
                ['virtual_machine', 'Virtual machines']
              ] as const).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm font-semibold text-ui-text">
                  <Checkbox
                    checked={selectedTypes.has(value)}
                    onChange={(event) => {
                      const next = new Set(selectedTypes);
                      event.target.checked ? next.add(value) : next.delete(value);
                      updateTargetScope(next, selectedIds);
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-2" aria-label="Exact target scope">
              {targetOptions.length ? targetOptions.map((target) => (
                <label key={target.value} className="flex items-start gap-2 rounded-md border border-ui-border px-3 py-2 text-sm font-semibold text-ui-text">
                  <Checkbox
                    className="mt-0.5"
                    checked={selectedIds.has(target.value)}
                    disabled={target.disabled}
                    onChange={(event) => {
                      const next = new Set(selectedIds);
                      event.target.checked ? next.add(target.value) : next.delete(target.value);
                      updateTargetScope(selectedTypes, next);
                    }}
                  />
                  <span><span className="block">{target.label}</span>{target.description && <span className="type-caption block text-ui-text-muted">{target.description}</span>}</span>
                </label>
              )) : <p className="type-caption text-ui-text-muted">No targets are registered in this workspace.</p>}
            </div>
          </section>

          {editChangeSummary.length > 0 && <section className="border-y border-ui-border py-4">
            <h3 className="type-micro-label">Changes before save</h3>
            <ul className="mt-3 grid gap-2 text-sm font-semibold">
              {editChangeSummary.map((change) => <li key={change}>{change}</li>)}
            </ul>
          </section>}

          <section className="border-y border-ui-border py-4">
            <h3 className="type-micro-label">Affected workflows</h3>
            <div className="mt-3 grid gap-2">
              {editingAgent.workflowsUsingAgent.length > 0
                ? editingAgent.workflowsUsingAgent.map((workflow) => (
                  <a key={workflow} href={`/workspaces/${editingAgent.workspaceId}/workflows?${new URLSearchParams({ q: workflow }).toString()}`} className="text-sm font-semibold text-accent-strong underline-offset-4 hover:underline">{workflow}</a>
                ))
                : <span className="type-caption text-ui-text-muted">No workflows currently assign this agent.</span>}
            </div>
          </section>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-5 py-4">
        <Button type="button" variant="tertiary" size="sm" onClick={onClose}>Cancel</Button>
        <Button type="button" variant="primary" size="sm" onClick={onSave} disabled={updatingAgentId === editingAgent.id || !editDraft.name.trim() || !editDraft.description.trim() || editChangeSummary.length === 0}>
          <ICONS.CheckCircle2 className="h-4 w-4" />
          {updatingAgentId === editingAgent.id ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
  </RightSidePanel>
  );
};

interface AgentWorkspaceDrawerProps extends React.ComponentProps<typeof WorkspaceAgentDetailPanel> {
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
}

export const AgentWorkspaceDrawer: React.FC<AgentWorkspaceDrawerProps> = ({
  closeButtonRef,
  isOpen,
  onClose,
  ...detailProps
}) => (
  <RightSidePanel
    isOpen={isOpen}
    onClose={onClose}
    titleId="agent-details-title"
    initialFocusRef={closeButtonRef}
    className="block w-full max-w-[min(100vw,64rem)] overflow-y-auto bg-ui-surface p-0"
  >
    <CloseButton
      ref={closeButtonRef}
      onClick={onClose}
      label="Close agent details"
      className="absolute right-4 top-4 z-10 shadow-sm"
    />
    <WorkspaceAgentDetailPanel {...detailProps} />
  </RightSidePanel>
);
