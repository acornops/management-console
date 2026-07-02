import React from 'react';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { CloseButton, Textarea, TextInput } from '@/components/common/ComponentVocabulary';
import { ModalStepIndicator } from '@/components/common/ModalStepIndicator';
import { RightSidePanel } from '@/components/common/RightSidePanel';
import { ICONS } from '@/constants';
import { keepAvailableLineValues, WorkflowScopeMultiSelect, type WorkflowScopeOptions } from '@/pages/WorkspaceWorkflowsPage.scope';
import type { WorkflowOptionsCatalog } from '@/services/control-plane/workflowApi';
import { createWorkflowDraft, setLineValue, type CreateWorkflowDraft } from '@/pages/workflows/workflowPageHelpers';

export type CreateWorkflowStep = 1 | 2 | 3;

const createWorkflowSteps: Array<{ id: `${CreateWorkflowStep}`; label: string }> = [
  { id: '1', label: 'Describe' },
  { id: '2', label: 'Access' },
  { id: '3', label: 'Review' }
];

const RequiredFieldMarker: React.FC = () => <span className="text-status-danger-text" aria-hidden="true">*</span>;

const WorkflowCreateReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="grid gap-1 px-3 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
    <dt className="type-micro-label text-ui-text-muted">{label}</dt>
    <dd className="min-w-0 whitespace-pre-wrap break-words text-sm font-semibold text-ui-text [overflow-wrap:anywhere]">{value}</dd>
  </div>
);

export const WorkflowCreateDrawer: React.FC<{
  createWorkflowStep: CreateWorkflowStep;
  setCreateWorkflowStep: React.Dispatch<React.SetStateAction<CreateWorkflowStep>>;
  createDraft: CreateWorkflowDraft;
  setCreateDraft: React.Dispatch<React.SetStateAction<CreateWorkflowDraft>>;
  createError: string;
  creatingWorkflow: boolean;
  canManageWorkflowScope: boolean;
  workflowOptions: WorkflowOptionsCatalog;
  createWorkflowScopeOptions: WorkflowScopeOptions;
  onClose: () => void;
  onCreate: () => void;
}> = ({
  createWorkflowStep,
  setCreateWorkflowStep,
  createDraft,
  setCreateDraft,
  createError,
  creatingWorkflow,
  canManageWorkflowScope,
  workflowOptions,
  createWorkflowScopeOptions,
  onClose,
  onCreate
}) => {
  const [stepNavigationError, setStepNavigationError] = React.useState('');
  const close = () => { onClose(); setCreateWorkflowStep(1); setStepNavigationError(''); };
  const describeStepComplete = Boolean(createDraft.name.trim());
  const accessStepComplete = createDraft.agentIds.length > 0;
  const selectedAgentLabels = workflowOptions.agents
    .filter((agent) => createDraft.agentIds.includes(agent.value))
    .map((agent) => agent.label);

  React.useEffect(() => {
    setCreateDraft((draft) => {
      const enabledMcpServers = keepAvailableLineValues(draft.enabledMcpServers, createWorkflowScopeOptions.mcpServers);
      const enabledSkills = keepAvailableLineValues(draft.enabledSkills, createWorkflowScopeOptions.skills);
      const allowedTools = keepAvailableLineValues(draft.allowedTools, createWorkflowScopeOptions.mcpTools);
      if (enabledMcpServers === draft.enabledMcpServers && enabledSkills === draft.enabledSkills && allowedTools === draft.allowedTools) return draft;
      return { ...draft, enabledMcpServers, enabledSkills, allowedTools };
    });
  }, [createWorkflowScopeOptions.mcpServers, createWorkflowScopeOptions.mcpTools, createWorkflowScopeOptions.skills, setCreateDraft]);

  const goToCreateWorkflowStep = (nextStep: CreateWorkflowStep) => {
    if (nextStep > 1 && !createDraft.name.trim()) {
      setCreateWorkflowStep(1);
      setStepNavigationError('Step 1 is not done. Enter a workflow name before continuing.');
      return;
    }
    if (nextStep > 2 && createDraft.agentIds.length === 0) {
      setCreateWorkflowStep(2);
      setStepNavigationError('Step 2 is not done. Select at least one workflow agent before review.');
      return;
    }
    setStepNavigationError('');
    setCreateWorkflowStep(nextStep);
  };

  return (
    <RightSidePanel isOpen onClose={close} titleId="create-workflow-title" descriptionId="create-workflow-description" className="max-w-2xl">
      <div className="border-b border-ui-border bg-ui-bg px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="create-workflow-title" className="type-section-title">Create workflow</h2>
            <p id="create-workflow-description" className="type-caption mt-2 text-ui-text-muted">Define the run prompt, selected agents, and optional capability restrictions. Control-plane validation remains authoritative.</p>
          </div>
          <CloseButton onClick={close} label="Close create workflow drawer" />
        </div>
        <div aria-label="Create workflow setup">
          <ModalStepIndicator steps={createWorkflowSteps} currentStepId={`${createWorkflowStep}`} onStepSelect={(stepId) => goToCreateWorkflowStep(Number(stepId) as CreateWorkflowStep)} className="mt-4" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
        {!canManageWorkflowScope && <div className="mb-4 rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-xs font-semibold text-ui-text-muted">You need manage_workflows to create workflows.</div>}
        {createError && <div role="alert" aria-live="assertive" className="mb-4 rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{createError}</div>}
        {stepNavigationError && <div className="mb-4 rounded-md border border-status-warning/30 bg-status-warning-soft p-3 text-xs font-semibold text-status-warning-text" role="status" aria-live="polite">{stepNavigationError}</div>}
        {createWorkflowStep === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="type-panel-title">Describe</h3>
              <p className="type-caption mt-1 text-ui-text-muted">Give operators a clear run name and the default instruction copied into each launch.</p>
            </div>
            <label htmlFor="create-workflow-name-input" className="block">
              <span className="type-micro-label">Name <RequiredFieldMarker /></span>
              <TextInput id="create-workflow-name-input" value={createDraft.name} onChange={(event) => {
                const name = event.target.value;
                setCreateDraft((draft) => ({ ...draft, name }));
                if (name.trim()) setStepNavigationError('');
              }} className="mt-2" required />
            </label>
            <label htmlFor="create-workflow-description-input" className="block">
              <span className="type-micro-label">Description</span>
              <TextInput id="create-workflow-description-input" value={createDraft.description} onChange={(event) => setCreateDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Example: Prepare an incident report from selected sessions" className="mt-2" />
            </label>
            <label htmlFor="create-workflow-starter-prompt-input" className="block">
              <span className="type-micro-label">Workflow prompt</span>
              <Textarea id="create-workflow-starter-prompt-input" value={createDraft.starterPrompt} onChange={(event) => setCreateDraft((draft) => ({ ...draft, starterPrompt: event.target.value }))} placeholder="Default message copied into each new run" className="mt-2 min-h-36" />
            </label>
          </div>
        )}
        {createWorkflowStep === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="type-panel-title">Access</h3>
              <p className="type-caption mt-1 text-ui-text-muted">Choose the agents that provide capabilities, then narrow their inherited access only when needed.</p>
            </div>
            {createDraft.agentIds.length === 0 && (
              <div role="status" aria-live="polite" className="rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-2 text-xs font-semibold text-status-warning-text">
                Select at least one workflow agent before review. A workflow with no selected agents cannot launch.
              </div>
            )}
            <fieldset className="block rounded-md border border-ui-border bg-ui-bg p-3">
              <legend className="type-micro-label px-1">Workflow agents</legend>
              <div className="mt-2 grid gap-2">
                {workflowOptions.agents.length > 0 ? workflowOptions.agents.map((agent) => (
                  <label key={agent.value} className="flex min-h-10 items-center gap-3 rounded-md border border-ui-border bg-ui-surface px-3 py-2 text-sm font-semibold text-ui-text">
                    <Checkbox checked={createDraft.agentIds.includes(agent.value)} disabled={agent.disabled} onChange={(event) => setCreateDraft((draft) => ({
                      ...draft,
                      agentIds: event.target.checked ? [...draft.agentIds, agent.value] : draft.agentIds.filter((agentId) => agentId !== agent.value)
                    }))} />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">{agent.label}</span>
                  </label>
                )) : <span className="type-caption text-ui-text-muted">No workflow agents are available.</span>}
              </div>
            </fieldset>
            <details className="rounded-md border border-ui-border bg-ui-bg px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold text-ui-text hover:text-accent-strong">Advanced scope</summary>
              <div className="mt-4 grid gap-4">
                <div className="space-y-1">
                  <span className="type-micro-label text-ui-text-muted">Available from selected agents</span>
                  <p className="type-caption text-ui-text-muted">Workflows can only restrict capabilities inherited from selected agents.</p>
                </div>
                <WorkflowScopeMultiSelect label="Restrict MCP servers" value={createDraft.enabledMcpServers} options={createWorkflowScopeOptions.mcpServers} searchPlaceholder="Filter MCP servers" emptyMessage="Select an agent with MCP servers before adding restrictions." selectedEmptyLabel="No MCP server restrictions" onToggle={(option, checked) => setCreateDraft((draft) => ({ ...draft, enabledMcpServers: setLineValue(draft.enabledMcpServers, option.value, checked) }))} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <WorkflowScopeMultiSelect label="Restrict skills" value={createDraft.enabledSkills} options={createWorkflowScopeOptions.skills} searchPlaceholder="Filter skills" emptyMessage="Select an agent with skills before adding restrictions." selectedEmptyLabel="No skill restrictions" onToggle={(option, checked) => setCreateDraft((draft) => ({ ...draft, enabledSkills: setLineValue(draft.enabledSkills, option.value, checked) }))} />
                  <WorkflowScopeMultiSelect label="Restrict tools" value={createDraft.allowedTools} options={createWorkflowScopeOptions.mcpTools} searchPlaceholder="Filter tools" emptyMessage="Select an agent with tools before adding restrictions." selectedEmptyLabel="No tool restrictions" onToggle={(option, checked) => setCreateDraft((draft) => ({ ...draft, allowedTools: setLineValue(draft.allowedTools, option.value, checked) }))} />
                </div>
              </div>
            </details>
          </div>
        )}
        {createWorkflowStep === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="type-panel-title">Review</h3>
              <p className="type-caption mt-1 text-ui-text-muted">Confirm the workflow definition before it becomes available for governed runs.</p>
            </div>
            <dl className="divide-y divide-ui-border rounded-md border border-ui-border bg-ui-bg">
              <WorkflowCreateReviewRow label="Name" value={createDraft.name || 'Unnamed workflow'} />
              <WorkflowCreateReviewRow label="Description" value={createDraft.description || 'Workspace automation configured from the console.'} />
              <WorkflowCreateReviewRow label="Workflow agents" value={selectedAgentLabels.join('\n') || 'None'} />
              <WorkflowCreateReviewRow label="Mode" value="Read only" />
              <WorkflowCreateReviewRow label="MCP servers" value={createDraft.enabledMcpServers.trim() || 'None'} />
              <WorkflowCreateReviewRow label="Skills" value={createDraft.enabledSkills.trim() || 'None'} />
              <WorkflowCreateReviewRow label="Tools" value={createDraft.allowedTools.trim() || 'None'} />
            </dl>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-5 py-4">
        <Button type="button" variant="tertiary" size="sm" onClick={() => { setCreateDraft(createWorkflowDraft()); setCreateWorkflowStep(1); setStepNavigationError(''); }}>Reset</Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => goToCreateWorkflowStep(createWorkflowStep === 3 ? 2 : 1)} disabled={createWorkflowStep === 1}>Back</Button>
          {createWorkflowStep < 3 ? (
            <Button type="button" variant="primary" size="sm" onClick={() => goToCreateWorkflowStep(createWorkflowStep === 1 ? 2 : 3)} disabled={!canManageWorkflowScope || (createWorkflowStep === 1 && !describeStepComplete) || (createWorkflowStep === 2 && !accessStepComplete)}>Next</Button>
          ) : (
            <Button type="button" variant="primary" size="sm" onClick={onCreate} disabled={!canManageWorkflowScope || creatingWorkflow || !describeStepComplete || !accessStepComplete}>
              <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
              {creatingWorkflow ? 'Creating...' : 'Create workflow'}
            </Button>
          )}
        </div>
      </div>
    </RightSidePanel>
  );
};
