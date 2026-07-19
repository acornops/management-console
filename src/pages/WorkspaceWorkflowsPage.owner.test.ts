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
      origin: { type: 'manual' },
      name: 'Created workflow',
      status: 'active',
      createdBy: 'user-1',
      prompt: 'Run the workflow.',
      agentIds: ['agent-owner'],
      executionMode: 'direct',
      requiredPermissions: ['read_workspace_data'],
      capabilityPolicy: {
        mode: 'read_only',
        restrictionMode: 'restrict',
        semanticCapabilityIds: ['workspace.read'],
        contextGrants: [],
        maxRuntimeSeconds: 900,
        retentionDays: 90,
        approvalRequirements: []
      }
    }, undefined, 'workspace-1', {
      clusters: [], mcpServers: [], mcpTools: [], skills: [],
      agents: [{ value: 'agent-owner', label: 'Owner Agent' }], chatSessions: [],
      outputFormats: [], approvalPolicies: [], runtimeLimits: [], retentionPolicies: [], sourceAvailability: {}
    }, new Map([['user-1', 'Ning Zhang']]));

    expect(workflow.owner).toBe('Ning Zhang');
    expect(workflow.agents).toEqual([
      expect.objectContaining({ agentId: 'agent-owner', name: 'Owner Agent', role: 'Direct' })
    ]);
  });

  it('loads workspace members before resolving workflow owner IDs', () => {
    expect(workflowsPage).toContain("import { controlPlaneApi } from '@/services/controlPlaneApi';");
    expect(workflowsPage).toContain('const [workflowOwnerMembers, setWorkflowOwnerMembers] = useState<ProjectMember[]>(workspace.members || []);');
    expect(workflowsPage).toContain('controlPlaneApi.listWorkspaceMembers(workspace.id, { limit: 50 })');
    expect(workflowsPage).toContain('setWorkflowOwnerMembers(page.items);');
    expect(workflowsPage).toContain('workflowOwnerMembers');
    expect(workflowActions).toContain('ownerLabelsByUserId');
  });

  it('attributes template-origin workflows to AcornOps rather than the installer', () => {
    const workflow = mapApiWorkflowToDefinition({
      id: 'workflow-system', workspaceId: 'workspace-1', version: 3,
      origin: { type: 'template', templateId: 'acornops-starter', templateVersion: 1 },
      name: 'Target diagnostics', status: 'active', createdBy: 'user-1',
      createdByUser: { userId: 'user-1', displayName: 'Dev User' },
      prompt: 'Inspect the selected target.', agentIds: ['agent-system'], executionMode: 'direct',
      requiredPermissions: ['read_workspace_data'],
      capabilityPolicy: {
        mode: 'read_only', restrictionMode: 'restrict', semanticCapabilityIds: [], contextGrants: [],
        maxRuntimeSeconds: 900, retentionDays: 90, approvalRequirements: []
      }
    }, undefined, 'workspace-1', {
      clusters: [], mcpServers: [], mcpTools: [], skills: [],
      agents: [{ value: 'agent-system', label: 'Target Diagnostics' }], chatSessions: [],
      outputFormats: [], approvalPolicies: [], runtimeLimits: [], retentionPolicies: [], sourceAvailability: {}
    }, new Map([['user-1', 'Dev User']]));

    expect(workflow.owner).toBe('AcornOps');
    expect(workflow.source).toBe('system');
  });

  it('presents coordinated specialists as peers without exposing an internal coordinator', () => {
    const workflow = mapApiWorkflowToDefinition({
      id: 'workflow-managed', workspaceId: 'workspace-1', version: 1,
      origin: { type: 'template', templateId: 'acornops-starter', templateVersion: 1 },
      name: 'Managed response', status: 'draft', createdBy: 'user-1',
      prompt: 'Coordinate the response.',
      agentIds: ['agent-diagnostics', 'agent-repository'],
      executionMode: 'coordinated',
      requiredPermissions: ['read_workspace_data'],
      capabilityPolicy: {
        mode: 'read_only', restrictionMode: 'restrict', semanticCapabilityIds: ['target.diagnostics.read'], contextGrants: [],
        maxRuntimeSeconds: 900, retentionDays: 90, approvalRequirements: []
      }
    }, undefined, 'workspace-1', {
      clusters: [], mcpServers: [], mcpTools: [], skills: [],
      agents: [
        { value: 'agent-diagnostics', label: 'Target Diagnostics' },
        { value: 'agent-repository', label: 'Workflow Analyst' }
      ], chatSessions: [],
      outputFormats: [], approvalPolicies: [], runtimeLimits: [], retentionPolicies: [], sourceAvailability: {}
    });

    expect(workflow.executionMode).toBe('coordinated');
    expect(workflow.agents).toEqual([
      expect.objectContaining({ name: 'Target Diagnostics', role: 'AcornOps-coordinated' }),
      expect.objectContaining({ name: 'Workflow Analyst', role: 'AcornOps-coordinated' })
    ]);
    expect(JSON.stringify(workflow)).not.toContain('manager');
  });
});
