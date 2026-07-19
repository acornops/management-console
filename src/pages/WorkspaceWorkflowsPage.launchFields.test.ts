import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { WorkflowDefinition } from './workflows/workflowModel';
import { buildWorkflowCreateInput, createFallbackWorkflowOptions, createWorkflowDraft } from './workflows/workflowPageHelpers';
import {
  applyWorkflowPromptReference,
  beginWorkflowPromptReference,
  findActivePromptMention,
  getEffectiveWorkflowCapabilityIds,
  getWorkflowLaunchInputState,
  insertWorkflowTargetPlaceholder,
  workflowPromptReference
} from './WorkspaceWorkflowsPage.launchFields';

const root = resolve(__dirname, '../..');
const launchFieldsSource = readFileSync(resolve(root, 'src/pages/WorkspaceWorkflowsPage.launchFields.tsx'), 'utf8');
const pageSource = readFileSync(resolve(root, 'src/pages/WorkspaceWorkflowsPage.tsx'), 'utf8');
const createDrawerSource = readFileSync(resolve(root, 'src/pages/WorkspaceWorkflowsPage.createDrawer.tsx'), 'utf8');
const actionsSource = readFileSync(resolve(root, 'src/pages/workflows/useWorkspaceWorkflowActions.ts'), 'utf8');
const englishSource = readFileSync(resolve(root, 'src/i18n/locales/en.js'), 'utf8');
const chineseSource = readFileSync(resolve(root, 'src/i18n/locales/zh.js'), 'utf8');

function workflowFixture(kind: 'target' | 'incident'): WorkflowDefinition {
  const target = kind === 'target';
  const agent = { agentId: 'agent-1', name: 'Diagnostics', role: 'Direct', required: true };
  return {
    id: target ? 'target-diagnostics' : 'incident-report-pdf',
    workspaceId: 'workspace-1',
    name: target ? 'Target diagnostics' : 'Incident report PDF',
    description: '',
    status: 'active',
    owner: 'AcornOps',
    tags: [],
    lastRun: 'No runs yet',
    agentIds: [agent.agentId],
    executionMode: 'direct',
    semanticCapabilityIds: target ? ['target.diagnostics.read'] : ['chat.sessions.read_selected', 'reports.pdf.generate'],
    capabilityRestrictionMode: 'restrict',
    targetConstraints: target ? { targetTypes: ['kubernetes', 'virtual_machine'], targetIds: [] } : undefined,
    agents: [agent],
    requiredPermissions: ['read_workspace_data', 'create_read_only_runs'],
    contextGrants: [],
    inputs: target
      ? []
      : [{ name: 'chatSessionIds', label: 'Incident chats', type: 'chat_session_list', required: true, optionSource: 'chatSessions' }],
    policy: { mode: 'read_only', approvals: [] },
    starterPrompt: target ? 'Inspect @target[Target name].' : 'Report on @chat[Incident chat title].',
    runs: []
  };
}

function targetCatalog() {
  const development = {
    value: 'cluster-1',
    label: 'Development Cluster',
    provenance: { source: 'target' as const, targetId: 'cluster-1', targetName: 'Development Cluster', targetType: 'kubernetes' as const }
  };
  return {
    ...createFallbackWorkflowOptions([]),
    targets: [
      development,
      {
        value: 'vm-1',
        label: 'Payments VM',
        provenance: { source: 'target' as const, targetId: 'vm-1', targetName: 'Payments VM', targetType: 'virtual_machine' as const }
      },
      {
        value: 'vm-offline',
        label: 'Offline VM',
        disabled: true,
        disabledReason: 'Target is offline',
        provenance: { source: 'target' as const, targetId: 'vm-offline', targetName: 'Offline VM', targetType: 'virtual_machine' as const }
      }
    ],
    clusters: [development]
  };
}

describe('workflow prompt references', () => {
  it('derives Kubernetes and VM structured bindings from generic target references', () => {
    const workflow = workflowFixture('target');
    const catalog = targetCatalog();

    const kubernetes = getWorkflowLaunchInputState(workflow, catalog, 'Inspect @target[Development Cluster].');
    const vm = getWorkflowLaunchInputState(workflow, catalog, 'Inspect @target[Payments VM].');

    expect(kubernetes).toMatchObject({ blocker: null, targetId: 'cluster-1', targetType: 'kubernetes' });
    expect(vm).toMatchObject({ blocker: null, targetId: 'vm-1', targetType: 'virtual_machine' });
    expect(actionsSource).toContain('targetId: promptReferences.targetId');
    expect(actionsSource).toContain('targetType: promptReferences.targetType');
  });

  it('continues accepting a concrete legacy cluster reference without emitting new cluster syntax', () => {
    const state = getWorkflowLaunchInputState(
      workflowFixture('target'),
      targetCatalog(),
      `Triage ${workflowPromptReference('cluster', 'Development Cluster')}.`
    );

    expect(state).toMatchObject({ blocker: null, targetId: 'cluster-1', targetType: 'kubernetes', kind: 'target' });
    expect(launchFieldsSource).toContain("if (kind === 'target') return WORKFLOW_TARGET_PLACEHOLDER");
  });

  it('blocks missing, multiple, ambiguous, unavailable, unknown, and out-of-scope target references', () => {
    const workflow = workflowFixture('target');
    const catalog = targetCatalog();
    expect(getWorkflowLaunchInputState(workflow, catalog, 'Inspect target health.').blocker).toBe('Add one target to the control message.');
    expect(getWorkflowLaunchInputState(workflow, catalog, 'Inspect @target[Payments VM] and @target[Development Cluster].').blocker)
      .toBe('Reference exactly one target in the control message.');
    expect(getWorkflowLaunchInputState(workflow, {
      ...catalog,
      targets: [...catalog.targets, { ...catalog.targets[1], value: 'vm-2' }]
    }, 'Inspect @target[Payments VM].').blocker).toContain('ambiguous');
    expect(getWorkflowLaunchInputState(workflow, catalog, 'Inspect @target[Offline VM].').blocker).toContain('unavailable');
    expect(getWorkflowLaunchInputState(workflow, catalog, 'Inspect @target[Unknown host].').blocker).toContain('not in this workspace');
    expect(getWorkflowLaunchInputState({
      ...workflow,
      targetConstraints: { targetTypes: ['kubernetes'], targetIds: [] }
    }, catalog, 'Inspect @target[Payments VM].').blocker).toContain('outside');
  });

  it('uses selected Agents current combined capabilities for inherited workflows', () => {
    const workflow = {
      ...workflowFixture('target'),
      semanticCapabilityIds: [],
      capabilityRestrictionMode: 'inherit' as const,
      targetConstraints: undefined
    };
    const agents = [
      { id: 'agent-1', semanticCapabilityIds: ['target.diagnostics.read'] },
      { id: 'agent-unselected', semanticCapabilityIds: ['reports.pdf.generate'] }
    ];

    expect(getEffectiveWorkflowCapabilityIds(workflow, agents)).toEqual(['target.diagnostics.read']);
    expect(getWorkflowLaunchInputState(workflow, targetCatalog(), 'Inspect target health.', agents).targetRequired).toBe(true);
  });

  it('requires and resolves an exact target for remediation capabilities', () => {
    const workflow = {
      ...workflowFixture('target'),
      name: 'Target remediation',
      semanticCapabilityIds: ['target.remediation.write'],
      requiredPermissions: ['read_workspace_data', 'create_read_write_runs'],
      policy: {
        ...workflowFixture('target').policy,
        mode: 'read_write' as const,
        approvals: ['Before every write-capable target tool']
      }
    };

    expect(getWorkflowLaunchInputState(workflow, targetCatalog(), 'Remediate target health.').blocker)
      .toBe('Add one target to the control message.');
    expect(getWorkflowLaunchInputState(workflow, targetCatalog(), 'Remediate @target[Payments VM].'))
      .toMatchObject({ blocker: null, targetId: 'vm-1', targetType: 'virtual_machine', targetRequired: true });
  });

  it('filters suggestions to workflow scope while retaining unavailable eligible targets and their reasons', () => {
    const state = getWorkflowLaunchInputState({
      ...workflowFixture('target'),
      targetConstraints: { targetTypes: ['virtual_machine'], targetIds: [] }
    }, targetCatalog(), 'Inspect @target[');

    expect(state.options.map((option) => option.value)).toEqual(['vm-1', 'vm-offline']);
    expect(state.options[1]).toMatchObject({ disabled: true, disabledReason: 'Target is offline' });
  });

  it('opens target suggestions and replaces the starter placeholder without mutating it beforehand', () => {
    const savedMessage = 'Inspect @target[Target name] using live evidence.';
    expect(savedMessage).toBe('Inspect @target[Target name] using live evidence.');
    const started = beginWorkflowPromptReference(savedMessage, 'target');
    expect(started.message).toBe('Inspect @ using live evidence.');
    const completed = applyWorkflowPromptReference(started.message, started.mention, 'target', 'Development Cluster');
    expect(completed.message).toBe('Inspect @target[Development Cluster] using live evidence.');
  });

  it('inserts an authoring placeholder without requiring or duplicating it', () => {
    expect(insertWorkflowTargetPlaceholder('Inspect live health.')).toBe('Inspect live health. @target[Target name]');
    expect(insertWorkflowTargetPlaceholder('Inspect @target[Target name].')).toBe('Inspect @target[Target name].');
    expect(buildWorkflowCreateInput({
      ...createWorkflowDraft(),
      name: 'Target inventory',
      agentIds: ['agent-1'],
      targetTypes: ['kubernetes']
    }).prompt).toBe('Start Target inventory.');
    expect(createDrawerSource).toContain("t('workflowPrompt.insertPlaceholder')");
    expect(pageSource).toContain('insertWorkflowTargetPlaceholder(selectedWorkflowEditDraft.starterPrompt)');
  });

  it('removes picker state and exposes keyboard-complete listbox behavior with visible selection', () => {
    expect(pageSource).not.toContain('workflowTargetId');
    expect(launchFieldsSource).not.toContain('selectedTargetId');
    expect(launchFieldsSource).not.toContain('onTargetChange');
    expect(launchFieldsSource).not.toContain('<Select');
    expect(launchFieldsSource).toContain('role="listbox"');
    expect(launchFieldsSource).toContain('role="option"');
    expect(launchFieldsSource).toContain("event.key === 'ArrowDown'");
    expect(launchFieldsSource).toContain("event.key === 'ArrowUp'");
    expect(launchFieldsSource).toContain("event.key === 'Enter'");
    expect(launchFieldsSource).toContain("event.key === 'Escape'");
    expect(launchFieldsSource).toContain('ring-2 ring-brand-orange/30');
  });

  it('ships English and Chinese prompt-first target copy', () => {
    expect(englishSource).not.toContain("addTarget: 'Add target'");
    expect(englishSource).toContain("insertPlaceholder: 'Insert target placeholder'");
    expect(chineseSource).not.toContain("addTarget: '添加目标'");
    expect(chineseSource).toContain("insertPlaceholder: '插入目标占位符'");
    expect(launchFieldsSource).not.toContain("t('workflowPrompt.addTarget')");
  });

  it('keeps incident chat reference binding unchanged', () => {
    const workflow = workflowFixture('incident');
    const catalog = {
      ...createFallbackWorkflowOptions([]),
      chatSessions: [
        { value: 'chat-1', label: 'Checkout outage' },
        { value: 'chat-2', label: 'Database follow-up' }
      ]
    };
    const state = getWorkflowLaunchInputState(
      workflow,
      catalog,
      `Use ${workflowPromptReference('chat', 'Checkout outage')} and ${workflowPromptReference('chat', 'Database follow-up')}.`
    );

    expect(state.blocker).toBeNull();
    expect(state.inputs).toEqual({ chatSessionIds: ['chat-1', 'chat-2'] });
  });

  it('derives the exact repository scope from the prompt without separate launch fields', () => {
    const workflow: WorkflowDefinition = {
      ...workflowFixture('incident'),
      id: 'user-created-repository-audit',
      inputs: [
        { name: 'repository', label: 'Repository', type: 'repository', required: true },
        { name: 'reviewInstructions', label: 'Review instructions', type: 'text', required: true }
      ]
    };
    expect(getWorkflowLaunchInputState(workflow, createFallbackWorkflowOptions([]), 'Review it.').blocker)
      .toBe('Name one exact repository in the prompt, for example @repository[github:owner/repository].');
    expect(getWorkflowLaunchInputState(
      workflow,
      createFallbackWorkflowOptions([]),
      'Check authorization boundaries in @repository[github:acornops/control-plane#42].',
      [],
      { repository: { provider: 'gitlab', repository: 'must-not-survive/stale-scope' } }
    ))
      .toMatchObject({
        blocker: null,
        inputs: {
          repository: { provider: 'github', repository: 'acornops/control-plane', changeRequest: { type: 'pull_request', number: 42 } },
          reviewInstructions: 'Check authorization boundaries in @repository[github:acornops/control-plane#42].'
        }
      });
    expect(getWorkflowLaunchInputState(workflow, createFallbackWorkflowOptions([]), 'Review https://gitlab.com/acornops/platform/control-plane/-/merge_requests/17.'))
      .toMatchObject({
        blocker: null,
        inputs: {
          repository: { provider: 'gitlab', repository: 'acornops/platform/control-plane', changeRequest: { type: 'merge_request', number: 17 } }
        }
      });
    expect(getWorkflowLaunchInputState(workflow, createFallbackWorkflowOptions([]), 'Compare @repository[github:acornops/control-plane] with @repository[gitlab:acornops/control-plane].').blocker)
      .toBe('Reference exactly one repository in the prompt.');
    expect(launchFieldsSource).not.toContain('onInputsChange');
    expect(launchFieldsSource).not.toContain('<TextInput');
    expect(launchFieldsSource).not.toContain('<Select');
  });

  it('authors free-form workflow intent once in the prompt', () => {
    const workflow: WorkflowDefinition = {
      ...workflowFixture('target'),
      inputs: [{ name: 'requestedChange', label: 'Requested change', type: 'text', required: true }]
    };
    const state = getWorkflowLaunchInputState(
      workflow,
      targetCatalog(),
      'Restart the stalled checkout deployment on @target[Development Cluster].'
    );

    expect(state).toMatchObject({
      blocker: null,
      inputs: {
        requestedChange: 'Restart the stalled checkout deployment on @target[Development Cluster].'
      }
    });
    expect(launchFieldsSource).not.toContain("input.type === 'repository' || input.type === 'text'");
    expect(launchFieldsSource).not.toContain("if (input.type !== 'text')");
    expect(launchFieldsSource).toContain('compatibilityPromptInputs');
    expect(pageSource).toContain('title="Prompt"');
  });

  it('still recognizes natural mention typing at the caret', () => {
    expect(findActivePromptMention('Inspect @target', 15, 'target')).toEqual({ start: 8, end: 15, query: '' });
  });
});
