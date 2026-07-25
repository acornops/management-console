import type {
  WorkflowEventInputBinding,
  WorkflowEventTrigger,
  WorkflowEventTriggerSecret,
  WorkflowEventTriggerSourceType
} from '@/services/control-plane/workflowEventTriggerApi';

export interface TriggerDraft {
  id?: string;
  workflowId: string;
  name: string;
  enabled: boolean;
  sourceType: WorkflowEventTriggerSourceType;
  inputBindings: Record<string, WorkflowEventInputBinding>;
  approvedContextGrants: string;
  principalId?: string;
}

export interface SecretDisclosure extends WorkflowEventTriggerSecret {
  name: string;
}

export const issueTextBindings: WorkflowEventInputBinding[] = [
  'issue.id',
  'issue.title',
  'issue.summary',
  'issue.severity',
  'issue.scope',
  'issue.object',
  'target.id',
  'target.type'
];

export function emptyTriggerDraft(): TriggerDraft {
  return {
    workflowId: '',
    name: '',
    enabled: true,
    sourceType: 'acornops_event',
    inputBindings: {},
    approvedContextGrants: ''
  };
}

export function retainDeclaredBindings(
  bindings: Record<string, WorkflowEventInputBinding>,
  parameterKeys: string[]
): Record<string, WorkflowEventInputBinding> {
  const declared = new Set(parameterKeys);
  return Object.fromEntries(
    Object.entries(bindings).filter(([key]) => declared.has(key))
  );
}

export function draftFromTrigger(
  trigger: WorkflowEventTrigger,
  parameterKeys?: string[]
): TriggerDraft {
  return {
    id: trigger.id,
    workflowId: trigger.workflowId,
    name: trigger.name,
    enabled: trigger.status === 'enabled',
    sourceType: trigger.sourceType,
    inputBindings: parameterKeys
      ? retainDeclaredBindings(trigger.inputBindings, parameterKeys)
      : trigger.inputBindings,
    approvedContextGrants: trigger.approvedContextGrants.join('\n'),
    principalId: trigger.principal.id
  };
}

export function parseContextGrants(value: string): string[] {
  return value.split(/\n|,/).map((grant) => grant.trim()).filter(Boolean);
}
