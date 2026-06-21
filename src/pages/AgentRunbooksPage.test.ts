import { describe, expect, it, vi } from 'vitest';

import {
  createEmptyRunbookDraft,
  createDefaultRunbookTemplates,
  createKubernetesRunbookTarget,
  createManualRunbook,
  createVirtualMachineRunbookTarget,
  deleteRunbookTemplate,
  getNextRunbookTargetId,
  getRunnableRunbookTarget,
  getRunbookDisabledReason,
  getRunbookVmTargetLimit,
  isRunbookCompatibleWithTargetType,
  isRunbookRunnable,
  moveRunbookTemplateBefore,
  parseStoredRunbookState,
  runRunbookWithSelectedTarget,
  updateRunbookTemplate,
  type Runbook
} from './runbooks/runbookModel';
import { listRunbookVmTargetsForWorkspace } from './runbooks/runbookVmTargets';
import type { TargetSummary } from '@/services/controlPlaneApi';
import { HealthStatus, KubernetesCluster } from '@/types';

const createCluster = (
  id: string,
  agentConnectionState: KubernetesCluster['agentConnectionState'] = 'connected'
): KubernetesCluster => ({
  id,
  name: `${id} cluster`,
  cluster: id,
  namespace: 'default',
  workspaceId: 'workspace-1',
  agentConnectionState,
  owners: [],
  gitlabPipelines: [],
  status: HealthStatus.GREEN,
  podStats: {
    running: 0,
    failed: 0,
    pending: 0
  },
  metrics: {
    cpu: '0',
    memory: '0'
  },
  lastUpdate: '2026-05-16T00:00:00.000Z',
  mcpTools: [],
  chatSessions: [],
  workloads: [],
  nodes: [],
  namespaces: [],
  services: [],
  ingresses: [],
  pvcs: [],
  alerts: []
});

const createVmTarget = (id: string, status: TargetSummary['status'] = 'online'): TargetSummary => ({
  id,
  workspaceId: 'workspace-1',
  targetType: 'virtual_machine',
  name: `${id} vm`,
  status,
  metadata: {},
  createdAt: '2026-05-16T00:00:00.000Z',
  updatedAt: '2026-05-16T00:00:00.000Z'
});

const labels = {
  disconnected: 'Kubernetes agent disconnected',
  notInstalled: 'Kubernetes setup required',
  offline: 'VM disconnected',
  degraded: 'VM degraded',
  awaitingAgent: 'VM awaiting agent'
};

const runbook: Runbook = {
  id: 'runbook-1',
  title: 'Target health',
  description: 'Summarize target health',
  prompt: 'Summarize health',
  applicability: 'all'
};

describe('AgentRunbooksPage run targets', () => {
  it('keeps runbooks disabled when no runnable target is selected', () => {
    const target = createKubernetesRunbookTarget(createCluster('alpha'), labels);

    expect(getRunnableRunbookTarget([target], '')).toBeNull();
    expect(isRunbookRunnable(null)).toBe(false);
  });

  it('enables runbooks when a connected Kubernetes target is selected', () => {
    const target = createKubernetesRunbookTarget(createCluster('alpha'), labels);

    expect(getRunnableRunbookTarget([target], target.id)).toBe(target);
    expect(isRunbookRunnable(target)).toBe(true);
  });

  it('enables runbooks when an online VM target is selected', () => {
    const target = createVirtualMachineRunbookTarget(createVmTarget('vm-1'), labels);

    expect(getRunnableRunbookTarget([target], target.id)).toBe(target);
    expect(isRunbookRunnable(target)).toBe(true);
  });

  it('does not select disconnected, not-installed, offline, degraded, or unknown targets', () => {
    const targets = [
      createKubernetesRunbookTarget(createCluster('disconnected', 'disconnected'), labels),
      createKubernetesRunbookTarget(createCluster('not-installed', 'not_installed'), labels),
      createVirtualMachineRunbookTarget(createVmTarget('offline', 'offline'), labels),
      createVirtualMachineRunbookTarget(createVmTarget('degraded', 'degraded'), labels),
      createVirtualMachineRunbookTarget(createVmTarget('unknown', 'unknown'), labels)
    ];

    for (const target of targets) {
      expect(getRunnableRunbookTarget(targets, target.id)).toBeNull();
    }
  });

  it('clears a selected target when it is no longer runnable', () => {
    const connected = createKubernetesRunbookTarget(createCluster('alpha', 'connected'), labels);
    const nowDisconnected = createKubernetesRunbookTarget(createCluster('alpha', 'disconnected'), labels);

    expect(getNextRunbookTargetId([connected], connected.id)).toBe(connected.id);
    expect(getNextRunbookTargetId([nowDisconnected], connected.id)).toBe('');
    expect(getNextRunbookTargetId([], connected.id)).toBe('');
  });
});

describe('AgentRunbooksPage VM target loading', () => {
  it('uses VM quota as the target inventory limit', () => {
    expect(getRunbookVmTargetLimit({ quota: undefined })).toBe(100);
    expect(getRunbookVmTargetLimit({ quota: { members: { used: 1, limit: 5 }, kubernetesClusters: { used: 1, limit: 10 }, virtualMachines: { used: 4, limit: 30 } } })).toBe(30);
    expect(getRunbookVmTargetLimit({ quota: { members: { used: 1, limit: 5 }, kubernetesClusters: { used: 1, limit: 10 }, virtualMachines: { used: 12, limit: 10 } } })).toBe(12);
    expect(getRunbookVmTargetLimit({ quota: { members: { used: 1, limit: 5 }, kubernetesClusters: { used: 1, limit: 10 }, virtualMachines: { used: 0, limit: 0 } } })).toBe(0);
  });

  it('paginates VM targets until the quota limit is loaded', async () => {
    const listTargets = vi.fn()
      .mockResolvedValueOnce({ items: Array.from({ length: 100 }, (_, index) => createVmTarget(`vm-${index}`)), nextCursor: 'page-2' })
      .mockResolvedValueOnce({ items: Array.from({ length: 50 }, (_, index) => createVmTarget(`vm-${index + 100}`)) });

    const targets = await listRunbookVmTargetsForWorkspace('workspace-1', 150, listTargets);

    expect(targets).toHaveLength(150);
    expect(listTargets).toHaveBeenCalledTimes(2);
    expect(listTargets).toHaveBeenNthCalledWith(1, 'workspace-1', { targetType: 'virtual_machine', limit: 100, cursor: undefined });
    expect(listTargets).toHaveBeenNthCalledWith(2, 'workspace-1', { targetType: 'virtual_machine', limit: 50, cursor: 'page-2' });
  });

  it('skips VM target loading when quota is zero', async () => {
    const listTargets = vi.fn();

    expect(await listRunbookVmTargetsForWorkspace('workspace-1', 0, listTargets)).toEqual([]);
    expect(listTargets).not.toHaveBeenCalled();
  });

  it('stops VM target loading when the API repeats a cursor', async () => {
    const listTargets = vi.fn()
      .mockResolvedValueOnce({ items: [createVmTarget('vm-1')], nextCursor: 'repeat' })
      .mockResolvedValueOnce({ items: [createVmTarget('vm-2')], nextCursor: 'repeat' });

    const targets = await listRunbookVmTargetsForWorkspace('workspace-1', 10, listTargets);

    expect(targets.map((target) => target.id)).toEqual(['vm-1', 'vm-2']);
    expect(listTargets).toHaveBeenCalledTimes(2);
  });

  it('caps empty cursor pagination near the requested inventory size', async () => {
    const listTargets = vi.fn(async (_workspaceId: string, options?: { cursor?: string }) => ({
      items: [],
      nextCursor: `next-${options?.cursor || 'first'}`
    }));

    expect(await listRunbookVmTargetsForWorkspace('workspace-1', 150, listTargets)).toEqual([]);
    expect(listTargets).toHaveBeenCalledTimes(3);
  });
});

describe('AgentRunbooksPage template compatibility', () => {
  it('allows matching target types and all-target templates', () => {
    expect(isRunbookCompatibleWithTargetType({ applicability: 'kubernetes' }, 'kubernetes')).toBe(true);
    expect(isRunbookCompatibleWithTargetType({ applicability: 'virtual_machine' }, 'virtual_machine')).toBe(true);
    expect(isRunbookCompatibleWithTargetType({ applicability: 'all' }, 'kubernetes')).toBe(true);
    expect(isRunbookCompatibleWithTargetType({ applicability: 'all' }, 'virtual_machine')).toBe(true);
  });

  it('rejects mismatched target types', () => {
    expect(isRunbookCompatibleWithTargetType({ applicability: 'kubernetes' }, 'virtual_machine')).toBe(false);
    expect(isRunbookCompatibleWithTargetType({ applicability: 'virtual_machine' }, 'kubernetes')).toBe(false);
  });

  it('returns explicit disabled reasons for missing and incompatible targets', () => {
    expect(
      getRunbookDisabledReason({ ...runbook, applicability: 'kubernetes' }, null, {
        noTarget: 'No target',
        targetUnavailable: 'Unavailable',
        kubernetesOnly: 'Kubernetes only',
        vmOnly: 'VM only'
      })
    ).toBe('No target');

    expect(
      getRunbookDisabledReason(
        { ...runbook, applicability: 'kubernetes' },
        createVirtualMachineRunbookTarget(createVmTarget('vm-1'), labels),
        {
          noTarget: 'No target',
          targetUnavailable: 'Unavailable',
          kubernetesOnly: 'Kubernetes only',
          vmOnly: 'VM only'
        }
      )
    ).toBe('Kubernetes only');
  });
});

describe('AgentRunbooksPage dispatch', () => {
  it('dispatches Kubernetes runbooks with a target-shaped request', () => {
    const target = createKubernetesRunbookTarget(createCluster('connected'), labels);
    const onRunRunbook = vi.fn();

    const didRun = runRunbookWithSelectedTarget([target], target.id, { ...runbook, applicability: 'kubernetes' }, onRunRunbook);

    expect(didRun).toBe(true);
    expect(onRunRunbook).toHaveBeenCalledWith({
      targetId: target.id,
      workspaceId: target.workspaceId,
      targetType: 'kubernetes',
      prompt: runbook.prompt
    });
  });

  it('dispatches VM runbooks with a target-shaped request', () => {
    const target = createVirtualMachineRunbookTarget(createVmTarget('vm-1'), labels);
    const onRunRunbook = vi.fn();

    const didRun = runRunbookWithSelectedTarget([target], target.id, { ...runbook, applicability: 'virtual_machine' }, onRunRunbook);

    expect(didRun).toBe(true);
    expect(onRunRunbook).toHaveBeenCalledWith({
      targetId: target.id,
      workspaceId: target.workspaceId,
      targetType: 'virtual_machine',
      prompt: runbook.prompt
    });
  });

  it('does not dispatch incompatible templates', () => {
    const target = createVirtualMachineRunbookTarget(createVmTarget('vm-1'), labels);
    const onRunRunbook = vi.fn();

    expect(runRunbookWithSelectedTarget([target], target.id, { ...runbook, applicability: 'kubernetes' }, onRunRunbook)).toBe(false);
    expect(onRunRunbook).not.toHaveBeenCalled();
  });
});

describe('AgentRunbooksPage manual templates', () => {
  it('cancel clears the creation draft', () => {
    expect(createEmptyRunbookDraft()).toEqual({
      title: '',
      description: '',
      prompt: '',
      applicability: 'all'
    });
  });

  it('save creates a manual template from a valid draft', () => {
    const saved = createManualRunbook(
      {
        title: '  API saturation triage  ',
        description: '  Check latency and CPU pressure  ',
        prompt: '  Inspect ingress and deployment metrics  ',
        applicability: 'kubernetes'
      },
      'Manual investigation command template',
      1_779_552_000_000
    );

    expect(saved).toEqual({
      id: 'manual-1779552000000',
      title: 'API saturation triage',
      description: 'Check latency and CPU pressure',
      prompt: 'Inspect ingress and deployment metrics',
      applicability: 'kubernetes'
    });
  });

  it('save ignores drafts without a name or command', () => {
    expect(
      createManualRunbook(
        {
          title: 'CPU triage',
          description: 'Check pressure',
          prompt: '',
          applicability: 'virtual_machine'
        },
        'Manual investigation command template',
        1_779_552_000_000
      )
    ).toBeNull();

    expect(
      createManualRunbook(
        {
          title: '',
          description: 'Check pressure',
          prompt: 'Inspect pods',
          applicability: 'kubernetes'
        },
        'Manual investigation command template',
        1_779_552_000_000
      )
    ).toBeNull();
  });
});

describe('AgentRunbooksPage template management', () => {
  it('edits a template without changing its id', () => {
    const updated = updateRunbookTemplate([runbook], runbook.id, {
      title: '  Updated health  ',
      description: '  New description  ',
      prompt: '  Check current target  ',
      applicability: 'virtual_machine'
    }, 'Fallback description');

    expect(updated?.[0]).toEqual({
      id: runbook.id,
      title: 'Updated health',
      description: 'New description',
      prompt: 'Check current target',
      applicability: 'virtual_machine'
    });
  });

  it('deletes seeded and manual templates by id', () => {
    const seeded = { ...runbook, id: 'seed-vm-service-failure' };
    const manual = { ...runbook, id: 'manual-1' };

    expect(deleteRunbookTemplate([seeded, manual], seeded.id)).toEqual([manual]);
    expect(deleteRunbookTemplate([seeded, manual], manual.id)).toEqual([seeded]);
  });

  it('moves a dragged template before the drop target', () => {
    const first = { ...runbook, id: 'runbook-1' };
    const second = { ...runbook, id: 'runbook-2' };
    const third = { ...runbook, id: 'runbook-3' };

    expect(moveRunbookTemplateBefore([first, second, third], third.id, second.id).map((template) => template.id))
      .toEqual(['runbook-1', 'runbook-3', 'runbook-2']);
    expect(moveRunbookTemplateBefore([first, second, third], first.id, first.id)).toEqual([first, second, third]);
    expect(moveRunbookTemplateBefore([first, second, third], 'missing', second.id)).toEqual([first, second, third]);
  });
});

describe('AgentRunbooksPage storage migration', () => {
  it('uses localized seed copies for fresh workspace defaults', () => {
    const templates = createDefaultRunbookTemplates({
      vmServiceFailure: {
        title: '本地化服务故障',
        description: '本地化描述',
        prompt: '本地化提示词'
      }
    });

    expect(templates.find((template) => template.id === 'seed-vm-service-failure')).toMatchObject({
      title: '本地化服务故障',
      description: '本地化描述',
      prompt: '本地化提示词',
      applicability: 'virtual_machine'
    });
  });

  it('seeds defaults while migrating v1 manual runbooks to Kubernetes-only applicability', () => {
    const seedTemplates = createDefaultRunbookTemplates({
      vmServiceFailure: {
        title: 'Localized service failure',
        description: 'Localized description',
        prompt: 'Localized prompt'
      }
    });
    const state = parseStoredRunbookState(
      JSON.stringify([
        {
          id: 'manual-1',
          title: 'Old triage',
          description: 'Old description',
          prompt: 'Inspect pods',
          custom: true
        }
      ]),
      seedTemplates
    );

    expect(state?.templates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'seed-vm-service-failure',
        title: 'Localized service failure',
        applicability: 'virtual_machine'
      }),
      expect.objectContaining({
        id: 'seed-all-target-health-summary',
        applicability: 'all'
      }),
      {
        id: 'manual-1',
        title: 'Old triage',
        description: 'Old description',
        prompt: 'Inspect pods',
        applicability: 'kubernetes'
      }
    ]));
  });

  it('parses v2 templates and preserves empty lists so deleted seeds do not reappear', () => {
    expect(parseStoredRunbookState(JSON.stringify({ version: 2, templates: [] }))).toEqual({
      version: 2,
      templates: []
    });

    expect(parseStoredRunbookState(JSON.stringify({
      version: 2,
      templates: [{ ...runbook, applicability: 'virtual_machine' }]
    }))?.templates[0].applicability).toBe('virtual_machine');
  });

  it('ignores invalid stored data', () => {
    expect(parseStoredRunbookState('{not json')).toBeNull();
    expect(parseStoredRunbookState(JSON.stringify({ version: 2, templates: [{ id: 'bad' }] }))).toBeNull();
  });
});
