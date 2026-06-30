import React from 'react';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { CloseButton, Textarea, TextInput } from '@/components/common/ComponentVocabulary';
import { ModalStepIndicator } from '@/components/common/ModalStepIndicator';
import { RightSidePanel } from '@/components/common/RightSidePanel';
import { Select, SelectOption } from '@/components/common/Select';
import { ICONS } from '@/constants';
import { type AgentDefinition } from '@/pages/agents/agentModel';
import { WorkspaceAgentDetailPanel } from '@/pages/WorkspaceAgentDetailPanel';
import {
  AgentCapabilityOptionButtons,
  appendUniqueToken,
  createAgentEditDraft,
  statusOptions,
  type AgentCapabilityOptions,
  type AgentDraft,
  type AgentEditDraft
} from '@/pages/WorkspaceAgentsPage.helpers';

interface CreateAgentDrawerProps {
  createDraft: AgentDraft;
  setCreateDraft: React.Dispatch<React.SetStateAction<AgentDraft>>;
  draftMcpServers: string;
  setDraftMcpServers: React.Dispatch<React.SetStateAction<string>>;
  draftTools: string;
  setDraftTools: React.Dispatch<React.SetStateAction<string>>;
  draftSkills: string;
  setDraftSkills: React.Dispatch<React.SetStateAction<string>>;
  agentCapabilityOptions: AgentCapabilityOptions;
  creatingAgent: boolean;
  onClose: () => void;
  onReset: () => void;
  onSave: () => void;
}

type CreateAgentStep = 1 | 2 | 3;

const createAgentSteps: Array<{ id: `${CreateAgentStep}`; label: string }> = [
  { id: '1', label: 'Identity' },
  { id: '2', label: 'Capabilities' },
  { id: '3', label: 'Review' }
];

type AgentCapabilityOption = AgentCapabilityOptions['mcpServers'][number];

const splitCapabilityInput = (value: string): string[] =>
  Array.from(new Set(value.split(/\n|,/).map((item) => item.trim()).filter(Boolean)));

const joinCapabilityInput = (values: string[]): string => values.join('\n');

const toggleCapabilityValue = (values: string[], value: string, checked: boolean): string[] => {
  if (checked) return values.includes(value) ? values : [...values, value];
  return values.filter((item) => item !== value);
};

const capabilityServerToolPrefixes: Record<string, string[]> = {
  'acornops-cluster-agent': ['events.', 'inventory.', 'logs.', 'metrics.'],
  github: ['github.'],
  'workspace-chat': ['chat.'],
  'artifact-writer': ['reports.']
};

const normalizeCapabilityIdPrefix = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');

const getToolOptionsForSelectedMcpServers = (
  selectedMcpServers: string[],
  options: AgentCapabilityOptions['mcpTools']
): AgentCapabilityOptions['mcpTools'] => {
  if (selectedMcpServers.length === 0) return [];
  const prefixes = selectedMcpServers.flatMap((server) => {
    const normalized = normalizeCapabilityIdPrefix(server);
    return capabilityServerToolPrefixes[server] || capabilityServerToolPrefixes[normalized] || [`${normalized}.`];
  });
  return options.filter((option) => prefixes.some((prefix) => option.value.toLowerCase().startsWith(prefix)));
};

const capabilityOptionLabelFor = (value: string, options: AgentCapabilityOption[]): string =>
  options.find((option) => option.value === value)?.label || value;

interface AgentCapabilityMultiSelectProps {
  label: string;
  selectedValues: string[];
  options: AgentCapabilityOption[];
  searchPlaceholder: string;
  emptyMessage: string;
  onSelectedValuesChange: (nextValues: string[]) => void;
}

const AgentCapabilityMultiSelect: React.FC<AgentCapabilityMultiSelectProps> = ({
  label,
  selectedValues,
  options,
  searchPlaceholder,
  emptyMessage,
  onSelectedValuesChange
}) => {
  const [query, setQuery] = React.useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((option) => {
    if (!normalizedQuery) return true;
    return [option.label, option.value, option.description || ''].some((value) => value.toLowerCase().includes(normalizedQuery));
  });
  const selectedCountLabel = selectedValues.length === 0 ? 'None selected' : `${selectedValues.length} selected`;

  return (
    <fieldset className="min-w-0">
      <legend className="type-micro-label">{label}</legend>
      <details className="group mt-2 rounded-md border border-ui-border bg-ui-surface">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">
          <span className="min-w-0 break-words">Choose {label.toLowerCase()}</span>
          <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-ui-text-muted">
            {selectedCountLabel}
            <ICONS.ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </span>
        </summary>
        <div className="border-t border-ui-border p-3">
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9"
            disabled={options.length === 0}
          />
          <div className="mt-3 max-h-48 overflow-y-auto rounded-md border border-ui-border bg-ui-bg custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const checked = selectedValues.includes(option.value);
                return (
                  <label key={option.value} className="flex cursor-pointer items-start gap-3 border-b border-ui-border px-3 py-2 text-sm font-semibold text-ui-text last:border-b-0 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
                    <Checkbox
                      checked={checked}
                      disabled={option.disabled}
                      onChange={(event) => onSelectedValuesChange(toggleCapabilityValue(selectedValues, option.value, event.target.checked))}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block break-words [overflow-wrap:anywhere]">{option.label}</span>
                      {option.description && <span className="type-caption mt-0.5 block break-words text-ui-text-muted [overflow-wrap:anywhere]">{option.description}</span>}
                      {option.disabledReason && <span className="type-caption mt-0.5 block break-words text-status-warning-text [overflow-wrap:anywhere]">{option.disabledReason}</span>}
                    </span>
                  </label>
                );
              })
            ) : (
              <div className="px-3 py-4 text-sm font-semibold text-ui-text-muted">{emptyMessage}</div>
            )}
          </div>
          {selectedValues.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedValues.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onSelectedValuesChange(selectedValues.filter((item) => item !== value))}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-ui-border bg-ui-bg px-2 py-1 text-xs font-semibold text-ui-text shadow-sm hover:border-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                  title={`Remove ${capabilityOptionLabelFor(value, options)}`}
                >
                  <span className="min-w-0 truncate">{capabilityOptionLabelFor(value, options)}</span>
                  <ICONS.X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </div>
      </details>
    </fieldset>
  );
};

export const CreateAgentDrawer: React.FC<CreateAgentDrawerProps> = ({
  createDraft,
  setCreateDraft,
  draftMcpServers,
  setDraftMcpServers,
  draftTools,
  setDraftTools,
  draftSkills,
  setDraftSkills,
  agentCapabilityOptions,
  creatingAgent,
  onClose,
  onReset,
  onSave
}) => {
  const [createAgentStep, setCreateAgentStep] = React.useState<CreateAgentStep>(1);
  const [stepNavigationError, setStepNavigationError] = React.useState('');
  const selectedMcpServers = React.useMemo(() => splitCapabilityInput(draftMcpServers), [draftMcpServers]);
  const selectedTools = React.useMemo(() => splitCapabilityInput(draftTools), [draftTools]);
  const toolOptions = React.useMemo(
    () => getToolOptionsForSelectedMcpServers(selectedMcpServers, agentCapabilityOptions.mcpTools),
    [agentCapabilityOptions.mcpTools, selectedMcpServers]
  );
  React.useEffect(() => {
    if (!draftTools.trim()) return;
    const availableToolIds = new Set(toolOptions.map((option) => option.value));
    const catalogToolIds = new Set(agentCapabilityOptions.mcpTools.map((option) => option.value));
    const nextTools = selectedTools.filter((tool) => !catalogToolIds.has(tool) || availableToolIds.has(tool));
    if (nextTools.length !== selectedTools.length) setDraftTools(joinCapabilityInput(nextTools));
  }, [agentCapabilityOptions.mcpTools, draftTools, selectedTools, setDraftTools, toolOptions]);
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
  const reset = () => {
    onReset();
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
    { label: 'MCP servers', value: draftMcpServers.trim() || 'None' },
    { label: 'Tools', value: draftTools.trim() || 'None' },
    { label: 'Skills', value: draftSkills.trim() || 'None' },
    { label: 'Instructions', value: createDraft.instructions.trim() || createDraft.description.trim() || 'Assignment purpose will be used.' }
  ];
  return (
    <RightSidePanel
      isOpen
      onClose={close}
      titleId="create-agent-title"
      descriptionId="create-agent-description"
      className="max-w-xl"
    >
      <div className="border-b border-ui-border bg-ui-bg px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="create-agent-title" className="type-section-title">Create agent</h2>
            <p id="create-agent-description" className="type-caption mt-2 text-ui-text-muted">Name the agent and its assignment purpose. It saves with restricted trust and approval required for write tools.</p>
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
                <h3 className="type-panel-title">Capabilities</h3>
                <p className="type-caption mt-1 text-ui-text-muted">Select capabilities from the catalog. Paste approved IDs only when the option is not listed.</p>
              </div>
              {agentCapabilityOptions.mcpServers.length === 0 && agentCapabilityOptions.mcpTools.length === 0 && agentCapabilityOptions.skills.length === 0 && (
                <div className="rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-2 text-sm font-semibold text-status-warning-text">
                  Capability options did not load. Existing IDs remain visible; new edits may have fewer picker choices.
                </div>
              )}
              <AgentCapabilityMultiSelect
                label="MCP servers"
                selectedValues={splitCapabilityInput(draftMcpServers)}
                options={agentCapabilityOptions.mcpServers}
                searchPlaceholder="Search MCP servers"
                emptyMessage="No MCP servers are available from the catalog."
                onSelectedValuesChange={(nextValues) => setDraftMcpServers(joinCapabilityInput(nextValues))}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <AgentCapabilityMultiSelect
                  label="Tools"
                  selectedValues={splitCapabilityInput(draftTools)}
                  options={toolOptions}
                  searchPlaceholder="Search tools"
                  emptyMessage={selectedMcpServers.length === 0 ? 'Choose MCP servers before choosing tools.' : 'No tools are available for the selected MCP servers.'}
                  onSelectedValuesChange={(nextValues) => setDraftTools(joinCapabilityInput(nextValues))}
                />
                <AgentCapabilityMultiSelect
                  label="Skills"
                  selectedValues={splitCapabilityInput(draftSkills)}
                  options={agentCapabilityOptions.skills}
                  searchPlaceholder="Search skills"
                  emptyMessage="No skills are available from the catalog."
                  onSelectedValuesChange={(nextValues) => setDraftSkills(joinCapabilityInput(nextValues))}
                />
              </div>
              <details className="rounded-md border border-ui-border bg-ui-bg px-3 py-2">
                <summary className="cursor-pointer text-sm font-semibold text-ui-text hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">Paste approved IDs</summary>
                <div className="mt-4 grid gap-4">
                  <label className="block">
                    <span className="type-micro-label">MCP servers</span>
                    <Textarea value={draftMcpServers} onChange={(event) => setDraftMcpServers(event.target.value)} placeholder="One MCP server ID per line" />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="type-micro-label">Tools</span>
                      <Textarea value={draftTools} onChange={(event) => setDraftTools(event.target.value)} placeholder="One tool ID per line" />
                    </label>
                    <label className="block">
                      <span className="type-micro-label">Skills</span>
                      <Textarea value={draftSkills} onChange={(event) => setDraftSkills(event.target.value)} placeholder="One skill ID per line" />
                    </label>
                  </div>
                </div>
              </details>
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
                <p className="type-caption mt-1 text-ui-text-muted">This agent saves with restricted trust and approval required for write tools.</p>
              </div>
              <dl className="divide-y divide-ui-border rounded-md border border-ui-border bg-ui-bg">
                <AgentCreateReviewRow label="Name" value={createDraft.name || 'Unnamed agent'} />
                <AgentCreateReviewRow label="Assignment purpose" value={createDraft.description || 'Required before save'} />
                {capabilitySummary.map((item) => <AgentCreateReviewRow key={item.label} label={item.label} value={item.value} />)}
                <AgentCreateReviewRow label="Trust" value="Restricted trust" />
                <AgentCreateReviewRow label="Policy" value="Write tools require approval" />
              </dl>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-5 py-4">
        <Button type="button" variant="tertiary" size="sm" onClick={reset}>Reset</Button>
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
  agentCapabilityOptions: AgentCapabilityOptions;
  editChangeSummary: string[];
  updatingAgentId: string;
  onClose: () => void;
  onSave: () => void;
}

export const EditAgentDrawer: React.FC<EditAgentDrawerProps> = ({
  editingAgent,
  editDraft,
  setEditDraft,
  ownerSelectOptions,
  agentCapabilityOptions,
  editChangeSummary,
  updatingAgentId,
  onClose,
  onSave
}) => (
  <RightSidePanel
    isOpen
    onClose={onClose}
    titleId="edit-agent-title"
    descriptionId="edit-agent-description"
    className="max-w-xl"
  >
      <div className="border-b border-ui-border bg-ui-bg px-5 py-4">
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
              <TextInput value={editDraft.name} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, name: event.target.value }))} className="mt-2" />
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

          <details open className="rounded-md border border-ui-border bg-ui-bg px-3 py-2">
            <summary className="cursor-pointer text-sm font-semibold text-ui-text">Capabilities</summary>
            <div className="mt-4 space-y-4">
              <div className="border-b border-ui-border pb-4">
                <h3 className="type-micro-label">Capability catalog</h3>
                <p className="type-caption mt-1 text-ui-text-muted">Use catalog options to avoid typos.</p>
              </div>
              <label className="block">
                <span className="type-micro-label">MCP servers</span>
                <Textarea value={editDraft.mcpServers} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, mcpServers: event.target.value }))} placeholder="One MCP server ID per line" />
              </label>
              <AgentCapabilityOptionButtons
                options={agentCapabilityOptions.mcpServers}
                onSelect={(value) => setEditDraft((draft) => draft && ({ ...draft, mcpServers: appendUniqueToken(draft.mcpServers, value) }))}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block">
                    <span className="type-micro-label">Tools</span>
                    <Textarea value={editDraft.tools} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, tools: event.target.value }))} placeholder="One tool ID per line" />
                  </label>
                  <AgentCapabilityOptionButtons
                    options={agentCapabilityOptions.mcpTools}
                    onSelect={(value) => setEditDraft((draft) => draft && ({ ...draft, tools: appendUniqueToken(draft.tools, value) }))}
                  />
                </div>
                <div>
                  <label className="block">
                    <span className="type-micro-label">Skills</span>
                    <Textarea value={editDraft.skills} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, skills: event.target.value }))} placeholder="One skill ID per line" />
                  </label>
                  <AgentCapabilityOptionButtons
                    options={agentCapabilityOptions.skills}
                    onSelect={(value) => setEditDraft((draft) => draft && ({ ...draft, skills: appendUniqueToken(draft.skills, value) }))}
                  />
                </div>
              </div>
            </div>
          </details>

          <section className="rounded-md border border-ui-border bg-ui-bg px-3 py-3">
            <h3 className="type-micro-label">Policy</h3>
            <div className="mt-3 grid gap-3">
              <label className="flex items-start gap-3 text-sm font-semibold text-ui-text">
                <Checkbox checked={editDraft.writeToolsRequireApproval} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, writeToolsRequireApproval: event.target.checked }))} className="mt-1" />
                <span>Require approval for write tools</span>
              </label>
            </div>
          </section>

          <section className="rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-3 text-status-warning-text">
            <h3 className="type-micro-label">Changes before save</h3>
            <ul className="mt-3 grid gap-2 text-sm font-semibold">
              {editChangeSummary.map((change) => <li key={change}>{change}</li>)}
            </ul>
          </section>

          <section className="rounded-md border border-ui-border bg-ui-bg px-3 py-3">
            <h3 className="type-micro-label">Affected workflows</h3>
            <div className="mt-3 grid gap-2">
              {editingAgent.workflowsUsingAgent.length > 0
                ? editingAgent.workflowsUsingAgent.map((workflow) => (
                  <span key={workflow} className="rounded-md border border-ui-border bg-ui-surface px-3 py-2 text-sm font-semibold text-ui-text">{workflow}</span>
                ))
                : <span className="type-caption text-ui-text-muted">No workflows currently assign this agent.</span>}
            </div>
          </section>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-5 py-4">
        <Button type="button" variant="tertiary" size="sm" onClick={() => setEditDraft(createAgentEditDraft(editingAgent))}>Reset</Button>
        <Button type="button" variant="primary" size="sm" onClick={onSave} disabled={updatingAgentId === editingAgent.id || !editDraft.name.trim() || !editDraft.description.trim()}>
          <ICONS.CheckCircle2 className="h-4 w-4" />
          {updatingAgentId === editingAgent.id ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
  </RightSidePanel>
);

interface AgentDetailsDrawerProps extends React.ComponentProps<typeof WorkspaceAgentDetailPanel> {
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
}

export const AgentDetailsDrawer: React.FC<AgentDetailsDrawerProps> = ({
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
