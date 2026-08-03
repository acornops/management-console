import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineAlert, InlineConfirmation } from '@acornops/ui';
import { Checkbox } from '@acornops/ui';
import { CloseButton, TextInput } from '@acornops/ui';
import { ModalStepIndicator } from '@acornops/ui';
import { DrawerFrame } from '@acornops/ui';
import { ICONS } from '@/constants';
import type { WorkflowOptionsCatalog } from '@/services/control-plane/workflowApi';
import { createWorkflowDraft, getSoleAvailableWorkflowAgentId, type CreateWorkflowDraft } from '@/pages/workflows/workflowPageHelpers';
import { TargetMentionTextarea } from '@/features/targets/mentions/TargetMentionAutocomplete';

export type CreateWorkflowStep = 1 | 2;

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
  workspaceId: string;
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
  workspaceId,
  onClose,
  onCreate
}) => {
  const { t } = useTranslation();
  const createWorkflowSteps: Array<{ id: `${CreateWorkflowStep}`; label: string }> = [
    { id: '1', label: t('workflowCoordination.creation.stepName') },
    { id: '2', label: t('workflowCoordination.creation.stepAgents') }
  ];
  const [stepNavigationError, setStepNavigationError] = React.useState('');
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [optionalDetailsOpen, setOptionalDetailsOpen] = React.useState(Boolean(createDraft.description || createDraft.starterPrompt));
  const appliedAgentDefault = React.useRef(false);
  const nameStepComplete = Boolean(createDraft.name.trim());
  const agentsStepComplete = workflowOptionsReady && createDraft.agentIds.length > 0;
  const soleAvailableAgentId = getSoleAvailableWorkflowAgentId(workflowOptions.agents);
  const agentSelectionIsDefault = createDraft.agentIds.length === 1 && createDraft.agentIds[0] === soleAvailableAgentId;
  const draftPristine = !createDraft.name && !createDraft.description && !createDraft.starterPrompt && (createDraft.agentIds.length === 0 || agentSelectionIsDefault);
  const finishClose = () => {
    onClose();
    setCreateDraft(createWorkflowDraft());
    setCreateWorkflowStep(1);
    setStepNavigationError('');
    setDiscardOpen(false);
    setOptionalDetailsOpen(false);
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
  const selectionFeedback = selectedAgentCount === 1
    ? t('workflowCoordination.directAssignmentDescription', { name: selectedAgentLabels[0] })
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

  React.useEffect(() => {
    if (createWorkflowStep !== 2 || appliedAgentDefault.current || workflowOptions.sourceAvailability.agents?.status !== 'available') return;
    appliedAgentDefault.current = true;
    const agentId = getSoleAvailableWorkflowAgentId(workflowOptions.agents);
    if (!agentId) return;
    setCreateDraft((draft) => draft.agentIds.length > 0 ? draft : { ...draft, agentIds: [agentId] });
  }, [createWorkflowStep, setCreateDraft, workflowOptions.agents, workflowOptions.sourceAvailability.agents?.status]);

  const goToCreateWorkflowStep = (nextStep: CreateWorkflowStep) => {
    if (nextStep > 1 && !createDraft.name.trim()) {
      setCreateWorkflowStep(1);
      setStepNavigationError(t('workflowCoordination.creation.nameRequired'));
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
            <h2 id="create-workflow-title" className="type-section-title">{t('workflowCoordination.creation.title')}</h2>
            <p id="create-workflow-description" className="type-caption mt-2 text-ui-text-muted">{t('workflowCoordination.createDescription')}</p>
          </div>
          <CloseButton onClick={close} label={t('workflowCoordination.creation.close')} />
        </div>
        <div aria-label={t('workflowCoordination.creation.setup')}>
          <ModalStepIndicator steps={createWorkflowSteps} currentStepId={`${createWorkflowStep}`} onStepSelect={(stepId) => goToCreateWorkflowStep(Number(stepId) as CreateWorkflowStep)} className="mt-4" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
        {discardOpen && (
          <InlineConfirmation
            id="discard-workflow-draft"
            title={t('workflowCoordination.creation.discardTitle')}
            description={t('workflowCoordination.creation.discardDescription')}
            tone="warning"
            confirmLabel={t('workflowCoordination.creation.discardConfirm')}
            cancelLabel={t('workflowCoordination.creation.continueEditing')}
            onConfirm={finishClose}
            onCancel={() => setDiscardOpen(false)}
            className="mb-4"
          />
        )}
        {!canManageWorkflows && <div className="mb-4 rounded-md border border-ui-border bg-ui-bg px-3 py-2 type-caption type-emphasis text-ui-text-muted">{t('workflowCoordination.creation.permissionRequired')}</div>}
        {!workflowOptionsReady && <div className="mb-4 rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-2 type-caption type-emphasis text-status-warning-text">{t('workflowCoordination.creation.optionsRequired')}</div>}
        {createError && <InlineAlert tone="danger" aria-live="assertive" className="mb-4 type-emphasis">{createError}</InlineAlert>}
        {stepNavigationError && <InlineAlert tone="warning" className="mb-4 type-emphasis" aria-live="polite">{stepNavigationError}</InlineAlert>}
        {createWorkflowStep === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="type-panel-title">{t('workflowCoordination.creation.nameTitle')}</h3>
              <p className="type-caption mt-1 max-w-xl text-ui-text-muted">{t('workflowCoordination.creation.nameDescription')}</p>
            </div>
            <label htmlFor="create-workflow-name-input" className="block">
              <span className="type-micro-label">{t('workflowCoordination.creation.nameLabel')} <RequiredFieldMarker /></span>
              <TextInput id="create-workflow-name-input" value={createDraft.name} onChange={(event) => {
                const name = event.target.value;
                setCreateDraft((draft) => ({ ...draft, name }));
                if (name.trim()) setStepNavigationError('');
              }} placeholder={t('workflowCoordination.creation.namePlaceholder')} className="mt-2" required autoFocus />
            </label>
            <details className="group rounded-md border border-ui-border bg-ui-bg" open={optionalDetailsOpen} onToggle={(event) => setOptionalDetailsOpen(event.currentTarget.open)}>
              <summary className="control-target flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-md px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-control-boundary [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="type-ui block text-ui-text">{t('workflowCoordination.creation.optionalDetails')}</span>
                  <span className="type-caption mt-0.5 block text-ui-text-muted">{t('workflowCoordination.creation.optionalDetailsDescription')}</span>
                </span>
                <ICONS.ChevronRight className="h-4 w-4 shrink-0 text-ui-text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
              </summary>
              <div className="space-y-5 border-t border-ui-border px-4 py-4">
                <label htmlFor="create-workflow-description-input" className="block">
                  <span className="type-micro-label">{t('workflowCoordination.creation.descriptionLabel')} <span className="type-caption normal-case tracking-normal text-ui-text-muted">{t('workflowCoordination.creation.optional')}</span></span>
                  <TextInput id="create-workflow-description-input" value={createDraft.description} onChange={(event) => setCreateDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder={t('workflowCoordination.creation.descriptionPlaceholder')} className="mt-2" />
                  <span className="type-caption mt-2 block text-ui-text-muted">{t('workflowCoordination.creation.descriptionHelp')}</span>
                </label>
                <div className="block">
                  <label htmlFor="create-workflow-prompt" className="type-micro-label">{t('workflowCoordination.creation.instructionsLabel')} <span className="type-caption normal-case tracking-normal text-ui-text-muted">{t('workflowCoordination.creation.optional')}</span></label>
                  <TargetMentionTextarea
                    id="create-workflow-prompt"
                    aria-label={t('workflowCoordination.creation.instructionsLabel')}
                    aria-describedby="create-workflow-prompt-help"
                    value={createDraft.starterPrompt}
                    workspaceId={workspaceId}
                    onValueChange={(starterPrompt) => setCreateDraft((draft) => ({ ...draft, starterPrompt }))}
                    className="mt-2 min-h-28"
                  />
                  <span id="create-workflow-prompt-help" className="type-caption mt-2 block text-ui-text-muted">{t('workflowCoordination.creation.instructionsHelp', { name: createDraft.name.trim() || t('workflowCoordination.creation.fallbackWorkflowName') })}</span>
                </div>
              </div>
            </details>
          </div>
        )}
        {createWorkflowStep === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="type-panel-title">{t('workflowCoordination.creation.chooseAgentsTitle')}</h3>
              <p className="type-caption mt-1 text-ui-text-muted">{t('workflowCoordination.agentsDescription')}</p>
            </div>
            {selectionFeedback && <div role="status" aria-live="polite" aria-atomic="true" className="rounded-md border border-ui-border bg-ui-bg px-3 py-2 type-caption type-emphasis text-ui-text">{selectionFeedback}</div>}
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
                      {agent.description && <span className="type-caption mt-0.5 block text-ui-text-muted">{agent.description}</span>}
                      {agent.disabledReason && <span className="type-caption mt-0.5 block text-status-warning-text">{agent.disabledReason}</span>}
                    </span>
                  </label>
                )) : <span className="type-caption text-ui-text-muted">{t('workflowCoordination.creation.noAvailableAgents')}</span>}
              </div>
            </fieldset>
          </div>
        )}
      </div>
      <div className={`flex items-center gap-3 border-t border-ui-border bg-ui-bg px-5 py-4 ${createWorkflowStep === 1 ? 'justify-end' : 'justify-between'}`}>
        {createWorkflowStep === 1 ? (
          <Button type="button" variant="primary" size="sm" onClick={() => goToCreateWorkflowStep(2)} disabled={!canManageWorkflows || !nameStepComplete}>
            {t('workflowCoordination.creation.chooseAgents')}
            <ICONS.ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => goToCreateWorkflowStep(1)}>
              <ICONS.ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {t('workflowCoordination.creation.backToName')}
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={onCreate} disabled={!canManageWorkflows || creatingWorkflow || !nameStepComplete || !agentsStepComplete}>
              <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
              {t(creatingWorkflow ? 'workflowCoordination.creation.creating' : 'workflowCoordination.creation.create')}
            </Button>
          </>
        )}
      </div>
    </DrawerFrame>
  );
};
