import type { AgentDefinition } from '@/pages/agents/agentModel';

export const genericAgentChatSuggestionKeys = [
  'agentChat.suggestions.inspect',
  'agentChat.suggestions.summarize',
  'agentChat.suggestions.nextSteps',
  'agentChat.suggestions.readiness'
];

const kubernetesAgentSuggestionKeys = [
  'agentChat.suggestions.kubernetes.issues',
  'agentChat.suggestions.kubernetes.workloads',
  'agentChat.suggestions.kubernetes.events',
  'agentChat.suggestions.kubernetes.logs'
];

const virtualMachineAgentSuggestionKeys = [
  'agentChat.suggestions.virtualMachine.issues',
  'agentChat.suggestions.virtualMachine.services',
  'agentChat.suggestions.virtualMachine.resources',
  'agentChat.suggestions.virtualMachine.logs'
];

const starterTemplateId = 'acornops-starter';

export function getAgentChatSuggestionKeys(
  agent: Pick<AgentDefinition, 'name' | 'templateRef'>
): string[] {
  if (agent.templateRef?.templateId !== starterTemplateId) return genericAgentChatSuggestionKeys;
  if (agent.templateRef.recordKey === 'agent:kubernetesAgent') return kubernetesAgentSuggestionKeys;
  if (agent.templateRef.recordKey === 'agent:virtualMachineAgent') return virtualMachineAgentSuggestionKeys;
  return genericAgentChatSuggestionKeys;
}
