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

export function getAgentChatSuggestionKeys(agentName: string): string[] {
  const normalizedName = agentName.trim().toLowerCase();
  if (normalizedName === 'kubernetes agent') return kubernetesAgentSuggestionKeys;
  if (normalizedName === 'virtual machine agent') return virtualMachineAgentSuggestionKeys;
  return genericAgentChatSuggestionKeys;
}
