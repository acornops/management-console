import { describe, expect, it } from 'vitest';
import { getAgentChatSuggestionKeys } from '@/pages/agents/agentChatSuggestions';

describe('Agent chat suggestions', () => {
  it('uses Kubernetes-specific prompts for the default Kubernetes Agent', () => {
    expect(getAgentChatSuggestionKeys({
      name: 'Renamed cluster specialist',
      templateRef: { templateId: 'acornops-starter', recordKey: 'agent:kubernetesAgent' }
    })).toEqual([
      'agentChat.suggestions.kubernetes.issues',
      'agentChat.suggestions.kubernetes.workloads',
      'agentChat.suggestions.kubernetes.events',
      'agentChat.suggestions.kubernetes.logs'
    ]);
  });

  it('uses VM-specific prompts for the default Virtual Machine Agent', () => {
    expect(getAgentChatSuggestionKeys({
      name: 'Renamed host specialist',
      templateRef: { templateId: 'acornops-starter', recordKey: 'agent:virtualMachineAgent' }
    })).toEqual([
      'agentChat.suggestions.virtualMachine.issues',
      'agentChat.suggestions.virtualMachine.services',
      'agentChat.suggestions.virtualMachine.resources',
      'agentChat.suggestions.virtualMachine.logs'
    ]);
  });

  it('retains generic prompts for user-defined Agents even when their name resembles a default', () => {
    expect(getAgentChatSuggestionKeys({ name: 'Kubernetes Agent' })).toEqual([
      'agentChat.suggestions.inspect',
      'agentChat.suggestions.summarize',
      'agentChat.suggestions.nextSteps',
      'agentChat.suggestions.readiness'
    ]);
  });
});
