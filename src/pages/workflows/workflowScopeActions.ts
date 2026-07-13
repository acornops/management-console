import { updateWorkflowScope } from '@/services/control-plane/workflowApi';
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
    if (!selectedWorkflow) return;
    const draft = scopeDrafts[selectedWorkflow.id] || createScopeDraft(selectedWorkflow);
    setScopeSaveError(null);
    setScopeSaveResult(null);
    setSavingScope(selectedWorkflow.id);
    try {
      const enabledMcpServers = splitLines(draft.enabledMcpServers);
      const enabledSkills = splitLines(draft.enabledSkills);
      const updated = await updateWorkflowScope(workspace.id, selectedWorkflow.id, {
        enabledMcpServers,
        enabledSkills,
        policy: { mode: draft.policyMode, approvalRequirements: splitLines(draft.approvalRequirements) },
        steps: selectedWorkflow.steps.map((step: { id: string; agentIds?: string[] }) => {
          const stepDraft = draft.steps[step.id];
          return {
            id: step.id,
            agentIds: step.agentIds || [],
            allowedMcpServers: enabledMcpServers,
            enabledSkills,
            allowedTools: splitLines(stepDraft?.allowedTools || ''),
            contextGrants: splitLines(stepDraft?.contextGrants || ''),
            approvalRequired: Boolean(stepDraft?.approvalRequired)
          };
        })
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
      setScopeSaveResult({ tab, message: 'Workflow capability gate saved. Future sessions will use the narrowed access.' });
      setIsEditingScopeTab('');
    } catch (error) {
      setScopeSaveError({ tab, message: error instanceof Error ? error.message : 'Unable to save workflow scope' });
    } finally {
      setSavingScope('');
    }
  }

  function setStepScopeValue(workflowId: string, stepId: string, key: 'allowedTools' | 'contextGrants', value: string, enabled: boolean): void {
    updateScopeDraft(workflowId, (draft) => ({
      ...draft,
      steps: {
        ...draft.steps,
        [stepId]: { ...draft.steps[stepId], [key]: setLineValue(draft.steps[stepId]?.[key] || '', value, enabled) }
      }
    }));
  }

  function setWorkflowScopeValue(workflowId: string, key: 'enabledMcpServers' | 'enabledSkills', value: string, enabled: boolean): void {
    updateScopeDraft(workflowId, (draft) => ({ ...draft, [key]: setLineValue(draft[key], value, enabled) }));
  }

  return { cancelEditingScopeTab, saveWorkflowScope, setStepScopeValue, setWorkflowScopeValue, startEditingScopeTab };
}
