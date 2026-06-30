import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { mapApiWorkflowToDefinition } from './workflows/workflowPageHelpers';

const root = resolve(__dirname, '../..');
const workflowsPage = readFileSync(resolve(root, 'src/pages/WorkspaceWorkflowsPage.tsx'), 'utf8');
const workflowActions = readFileSync(resolve(root, 'src/pages/workflows/useWorkspaceWorkflowActions.ts'), 'utf8');

describe('WorkspaceWorkflowsPage ownership', () => {
  it('maps workflow ownership from the creator instead of defaulting to Kubernetes Diagnostics', () => {
    const workflow = mapApiWorkflowToDefinition({
      id: 'workflow-1',
      workspaceId: 'workspace-1',
      version: 1,
      source: 'user',
      name: 'Created workflow',
      status: 'active',
      createdBy: 'user-1',
      requiredPermissions: ['read_workspace_data'],
      policy: {
        mode: 'read_only',
        maxRuntimeSeconds: 900,
        retentionDays: 90,
        approvalRequirements: []
      },
      steps: [{
        id: 'created-workflow-step',
        title: 'Run workflow prompt',
        requiredInputs: [],
        agentIds: [],
        enabledSkills: [],
        allowedMcpServers: [],
        allowedTools: [],
        contextGrants: [],
        approvalRequired: false
      }]
    }, undefined, 'workspace-1', undefined, new Map([['user-1', 'Ning Zhang']]));

    expect(workflow.owner).toBe('Ning Zhang');
    expect(workflow.orchestrator.agentId).toBe('agent-workflow-orchestrator');
    expect(workflow.agents).toEqual([]);
  });

  it('loads workspace members before resolving workflow owner IDs', () => {
    expect(workflowsPage).toContain("import { controlPlaneApi } from '@/services/controlPlaneApi';");
    expect(workflowsPage).toContain('const [workflowOwnerMembers, setWorkflowOwnerMembers] = useState<ProjectMember[]>(workspace.members || []);');
    expect(workflowsPage).toContain('controlPlaneApi.listWorkspaceMembers(workspace.id, { limit: 50 })');
    expect(workflowsPage).toContain('setWorkflowOwnerMembers(page.items);');
    expect(workflowsPage).toContain('workflowOwnerMembers');
    expect(workflowActions).toContain('ownerLabelsByUserId');
  });
});
