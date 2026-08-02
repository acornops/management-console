import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineAlert, InlineConfirmation, Textarea } from '@acornops/ui';
import { Checkbox } from '@acornops/ui';
import { CloseButton, TextInput } from '@acornops/ui';
import { ModalStepIndicator } from '@acornops/ui';
import { DrawerFrame } from '@acornops/ui';
import { ICONS } from '@/constants';
import type { WorkflowOptionsCatalog } from '@/services/control-plane/workflowApi';
import { createWorkflowDraft, type CreateWorkflowDraft } from '@/pages/workflows/workflowPageHelpers';

export type CreateWorkflowStep = 1 | 2;

const createWorkflowSteps: Array<{ id: `${CreateWorkflowStep}`; label: string }> = [
  { id: '1', label: 'Describe' },
  { id: '2', label: 'Agents' }
];

const RequiredFieldMarker: React.FC = () => <span className="text-status-danger-text" aria-hidden="true">*</span>;

export const WorkflowCreateDrawer: React.FC<{
  createWorkflowStep: CreateWorkflowStep;
  setCreateWorkflowStep: React.Dispatch<React.SetStateAction<CreateWorkflowStep>>;
  createDraft: CreateWorkflowDraft;
  setCreateDraft: React.Dispatch<React.SetStateAction<CreateWorkflowDraft>>;
  createError: string;
  creatingWorkflow: boolean;
  canManageWorkflows: boolean;
  workflowOptionsReady: boolean;
  workflowOptions: WorkflowOptionsCatalog;
  onClose: () => void;
  onCreate: () => void;
}> = ({
  createWorkflowStep,
  setCreateWorkflowStep,
  createDraft,
  setCreateDraft,
  createError,
  creatingWorkflow,
  canManageWorkflows,
  workflowOptionsReady,
  workflowOptions,
  onClose,
  onCreate
}) => {
  const { t } = useTranslation();
  const [stepNavigationError, setStepNavigationError] = React.useState('');
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const describeStepComplete = Boolean(createDraft.name.trim());
  const accessStepComplete = workflowOptionsReady && createDraft.agentIds.length > 0;
  const draftPristine = !createDraft.name && !createDraft.description && !createDraft.starterPrompt && createDraft.agentIds.length === 0;
  const finishClose = () => {
    onClose();
    setCreateDraft(createWorkflowDraft());
    setCreateWorkflowStep(1);
    setStepNavigationError('');
    setDiscardOpen(false);
  };
  const close = () => {
    if (!draftPristine) {
      setDiscardOpen(true);
      return;
    }
    finishClose();
  };
  const selectedAgentLabels = workflowOptions.agents
    .filter((agent) => createDraft.agentIds.includes(agent.value))
    .map((agent) => agent.label);
  const selectedAgentCount = selectedAgentLabels.length;
  const selectionFeedback = selectedAgentCount === 0
    ? t('workflowCoordination.selectionRequired')
    : selectedAgentCount > 1
      ? t('workflowCoordination.coordinatedFeedback', { count: selectedAgentCount })
      : '';

  React.useEffect(() => {
    if (workflowOptions.sourceAvailability.agents?.status !== 'available') return;
    const availableIds = new Set(workflowOptions.agents.filter((agent) => !agent.disabled).map((agent) => agent.value));
    setCreateDraft((draft) => {
      const agentIds = draft.agentIds.filter((agentId) => availableIds.has(agentId));
      return agentIds.length === draft.agentIds.length ? draft : { ...draft, agentIds };
    });
  }, [setCreateDraft, workflowOptions.agents, workflowOptions.sourceAvailability.agents?.status]);

  const goToCreateWorkflowStep = (nextStep: CreateWorkflowStep) => {
    if (nextStep > 1 && !createDraft.name.trim()) {
      setCreateWorkflowStep(1);
      setStepNavigationError('Step 1 is not done. Enter a workflow name before continuing.');
      return;
    }
    setStepNavigationError('');
    setCreateWorkflowStep(nextStep);
  };

  return (
    <DrawerFrame unframed isOpen onClose={close} titleId="create-workflow-title" descriptionId="create-workflow-description" className="max-w-2xl">
      <div className="border-b border-ui-border bg-ui-bg px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="create-workflow-title" className="type-section-title">Create workflow</h2>
            <p id="create-workflow-description" className="type-caption mt-2 text-ui-text-muted">{t('workflowCoordination.createDescription')}</p>
          </div>
          <CloseButton onClick={close} label="Close create workflow drawer" />
        </div>
        <div aria-label="Create workflow setup">
          <ModalStepIndicator steps={createWorkflowSteps} currentStepId={`${createWorkflowStep}`} onStepSelect={(stepId) => goToCreateWorkflowStep(Number(stepId) as CreateWorkflowStep)} className="mt-4" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
        {discardOpen && (
          <InlineConfirmation
            id="discard-workflow-draft"
            title="Discard workflow draft?"
            description="Your workflow name, prompt, and Agent selection will be lost."
            tone="warning"
            confirmLabel="Discard draft"
            cancelLabel="Continue editing"
            onConfirm={finishClose}
            onCancel={() => setDiscardOpen(false)}
            className="mb-4"
          />
        )}
        {!canManageWorkflows && <div className="mb-4 rounded-md border border-ui-border bg-ui-bg px-3 py-2 type-caption type-emphasis text-ui-text-muted">You need manage_workflows to create workflows.</div>}
        {!workflowOptionsReady && <div className="mb-4 rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-2 type-caption type-emphasis text-status-warning-text">Workflow options must load before you can create a workflow.</div>}
        {createError && <InlineAlert tone="danger" aria-live="assertive" className="mb-4 type-emphasis">{createError}</InlineAlert>}
        {stepNavigationError && <InlineAlert tone="warning" className="mb-4 type-emphasis" aria-live="polite">{stepNavigationError}</InlineAlert>}
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
            <div className="block">
              <label htmlFor="create-workflow-prompt" className="type-micro-label">Workflow prompt</label>
              <Textarea
                id="create-workflow-prompt"
                aria-label="Workflow prompt"
                value={createDraft.starterPrompt}
                onChange={(event) => setCreateDraft((draft) => ({ ...draft, starterPrompt: event.target.value }))}
                className="mt-2 min-h-32"
              />
            </div>
          </div>
        )}
        {createWorkflowStep === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="type-panel-title">Agents</h3>
              <p className="type-caption mt-1 text-ui-text-muted">{t('workflowCoordination.agentsDescription')}</p>
            </div>
            {selectionFeedback && <div role="status" aria-live="polite" aria-atomic="true" className={`rounded-md border px-3 py-2 type-caption type-emphasis ${createDraft.agentIds.length === 0 ? 'border-status-warning/30 bg-status-warning-soft text-status-warning-text' : 'border-ui-border bg-ui-bg text-ui-text'}`}>{selectionFeedback}</div>}
            <fieldset className="block rounded-md border border-ui-border bg-ui-bg p-3">
              <legend className="type-micro-label px-1">{t('workflowCoordination.agentsTitle')}</legend>
              <div className="mt-2 grid gap-2">
                {workflowOptions.agents.length > 0 ? workflowOptions.agents.map((agent) => (
                  <label key={agent.value} className="flex min-h-10 items-center gap-3 rounded-md border border-ui-border bg-ui-surface px-3 py-2 type-body type-emphasis text-ui-text">
                    <Checkbox checked={createDraft.agentIds.includes(agent.value)} disabled={agent.disabled} onChange={(event) => setCreateDraft((draft) => ({
                      ...draft,
                      agentIds: event.target.checked ? [...draft.agentIds, agent.value] : draft.agentIds.filter((agentId) => agentId !== agent.value)
                    }))} />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                      <span className="block">{agent.label}</span>
                      {agent.disabledReason && <span className="type-caption mt-0.5 block text-status-warning-text">{agent.disabledReason}</span>}
                    </span>
                  </label>
                )) : <span className="type-caption text-ui-text-muted">No workflow agents are available.</span>}
              </div>
            </fieldset>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-5 py-4">
        <Button type="button" variant="tertiary" size="sm" disabled={draftPristine} onClick={() => { setCreateDraft(createWorkflowDraft()); setCreateWorkflowStep(1); setStepNavigationError(''); }}>Reset</Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => goToCreateWorkflowStep(1)} disabled={createWorkflowStep === 1}>Back</Button>
          {createWorkflowStep === 1 ? (
            <Button type="button" variant="primary" size="sm" onClick={() => goToCreateWorkflowStep(2)} disabled={!canManageWorkflows || !describeStepComplete}>Next</Button>
          ) : (
            <Button type="button" variant="primary" size="sm" onClick={onCreate} disabled={!canManageWorkflows || creatingWorkflow || !describeStepComplete || !accessStepComplete}>
              <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
              {creatingWorkflow ? 'Creating...' : 'Create workflow'}
            </Button>
          )}
        </div>
      </div>
    </DrawerFrame>
  );
};
