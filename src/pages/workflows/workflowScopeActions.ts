import { updateWorkflowScope } from '@/services/control-plane/workflowApi';
import { isSystemProvidedWorkflow } from './workflowModel';
import {
  createScopeDraft,
  mapApiWorkflowToDefinition,
  setLineValue,
  splitLines,
  type ScopeDraft
} from './workflowPageHelpers';

export function createWorkflowScopeActions(ctx: Record<string, any>) {
  const {
    selectedWorkflow, workflows, setWorkflows, workspace, workflowOptions, ownerLabelsByUserId,
    scopeDrafts, setScopeDrafts, setScopeSaveError, setScopeSaveResult, setIsEditingScopeTab,
    setSavingScope, setCompiledScopes
  } = ctx;

  function updateScopeDraft(workflowId: string, update: (draft: ScopeDraft) => ScopeDraft): void {
    setScopeSaveResult(null);
    setScopeDrafts((current: Record<string, ScopeDraft>) => {
      const workflow = workflows.find((item: { id: string }) => item.id === workflowId);
      const currentDraft = current[workflowId] || (workflow ? createScopeDraft(workflow) : undefined);
      return currentDraft ? { ...current, [workflowId]: update(currentDraft) } : current;
    });
  }

  function startEditingScopeTab(tab: 'capabilities'): void {
    if (!selectedWorkflow || isSystemProvidedWorkflow(selectedWorkflow)) return;
    setScopeSaveError(null);
    setScopeSaveResult(null);
    setIsEditingScopeTab(tab);
  }

  function cancelEditingScopeTab(): void {
    if (selectedWorkflow) {
      setScopeDrafts((current: Record<string, ScopeDraft>) => ({
        ...current,
        [selectedWorkflow.id]: createScopeDraft(selectedWorkflow)
      }));
    }
    setScopeSaveError(null);
    setIsEditingScopeTab('');
  }

  async function saveWorkflowScope(tab: 'capabilities'): Promise<void> {
    if (!selectedWorkflow || isSystemProvidedWorkflow(selectedWorkflow)) return;
    const draft = scopeDrafts[selectedWorkflow.id] || createScopeDraft(selectedWorkflow);
    setScopeSaveError(null);
    setScopeSaveResult(null);
    setSavingScope(selectedWorkflow.id);
    try {
      const semanticCapabilityIds = draft.restrictionMode === 'restrict'
        ? splitLines(draft.semanticCapabilityIds)
        : [];
      const updated = await updateWorkflowScope(workspace.id, selectedWorkflow.id, {
        agentIds: selectedWorkflow.agentIds,
        capabilityPolicy: {
          restrictionMode: draft.restrictionMode,
          semanticCapabilityIds
        }
      });
      const mapped = mapApiWorkflowToDefinition(updated, selectedWorkflow, workspace.id, workflowOptions, ownerLabelsByUserId);
      setWorkflows((current: any[]) => current.map((workflow) => workflow.id === selectedWorkflow.id
        ? { ...mapped, runs: workflow.runs, lastRun: workflow.lastRun }
        : workflow));
      setCompiledScopes((current: Record<string, unknown>) => {
        const next = { ...current };
        delete next[selectedWorkflow.id];
        return next;
      });
      setScopeDrafts((current: Record<string, ScopeDraft>) => ({ ...current, [selectedWorkflow.id]: createScopeDraft(mapped) }));
      setScopeSaveResult({ tab, message: draft.restrictionMode === 'inherit'
        ? 'Workflow capability policy saved. Future sessions will inherit the selected Agents’ current capabilities.'
        : 'Workflow capability policy saved. Future sessions will use the explicit capability restriction.' });
      setIsEditingScopeTab('');
    } catch (error) {
      setScopeSaveError({ tab, message: error instanceof Error ? error.message : 'Unable to save workflow scope' });
    } finally {
      setSavingScope('');
    }
  }

  function setSemanticCapabilityValue(workflowId: string, value: string, enabled: boolean): void {
    updateScopeDraft(workflowId, (draft) => ({
      ...draft,
      semanticCapabilityIds: setLineValue(draft.semanticCapabilityIds, value, enabled)
    }));
  }

  function setCapabilityRestrictionMode(workflowId: string, restrictionMode: 'inherit' | 'restrict'): void {
    updateScopeDraft(workflowId, (draft) => ({ ...draft, restrictionMode }));
  }

  return { cancelEditingScopeTab, saveWorkflowScope, setCapabilityRestrictionMode, setSemanticCapabilityValue, startEditingScopeTab };
}
