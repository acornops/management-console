import { describe, expect, it } from 'vitest';

import { createDefaultAgentDefinitions } from '@/pages/agents/agentModel';
import { createDefaultWorkflowDefinitions } from '@/pages/workflows/workflowModel';
import { getWorkflowAgentCapabilityReview } from '@/pages/workflows/workflowAgentCapabilities';

describe('workflowAgentCapabilities', () => {
  it('derives capability review access from assigned agent definitions', () => {
    const [workflow] = createDefaultWorkflowDefinitions();
    const agents = createDefaultAgentDefinitions();
    const review = getWorkflowAgentCapabilityReview({
      ...workflow,
      enabledMcpServers: ['mock-server'],
      enabledSkills: ['mock-skill'],
      allowedTools: ['mock.tool']
    }, agents);

    expect(review).toHaveLength(1);
    expect(review[0].agentId).toBe('agent-cluster-triage');
    expect(review[0].mcpServers).toEqual(['acornops-target-agent']);
    expect(review[0].skills).toEqual(['acornops-observability', 'acornops-target-boundary-design']);
    expect(review[0].tools).toEqual(['get_resource', 'get_resource_logs', 'list_resources']);
    expect(review[0].tools).not.toContain('mock.tool');
    expect(review[0].approvalPolicy).toContain('Write actions: blocked');
    expect(review[0].capabilityRules).toContain('read kubernetes target_inventory via list_resources');
  });
});
