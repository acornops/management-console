import type { TargetSummary } from '@/services/controlPlaneApi';
import type { KubernetesCluster, Workspace } from '@/types';
import { safeStorage } from '@/utils/safeStorage';

export type RunbookTargetType = 'kubernetes' | 'virtual_machine';
export type RunbookApplicability = RunbookTargetType | 'all';
export type RunbookTemplateFilter = 'compatible' | 'all' | RunbookTargetType;

export interface RunbookTarget {
  id: string;
  workspaceId: string;
  targetType: RunbookTargetType;
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown' | 'connected' | 'disconnected' | 'not_installed';
  runnable: boolean;
  disabledReason?: string;
}

export interface Runbook {
  id: string;
  title: string;
  description: string;
  prompt: string;
  applicability: RunbookApplicability;
}

export interface RunbookDraft {
  title: string;
  description: string;
  prompt: string;
  applicability: RunbookApplicability;
}

export interface RunbookExecutionRequest {
  targetId: string;
  workspaceId: string;
  targetType: RunbookTargetType;
  prompt: string;
}

export interface PendingVmRunbookPrompt {
  workspaceId: string;
  targetId: string;
  prompt: string;
  id: number;
}

interface StoredRunbookState {
  version: 2;
  templates: Runbook[];
}

const RUNBOOK_STORAGE_VERSION = 2;

export type RunbookSeedTemplateCopy = Pick<Runbook, 'title' | 'description' | 'prompt'>;
export type RunbookSeedTemplateCopies = Partial<Record<string, RunbookSeedTemplateCopy>>;

const DEFAULT_RUNBOOK_SEEDS: Array<Runbook & { copyKey: string }> = [
  {
    id: 'seed-kubernetes-oomkilled-triage',
    copyKey: 'oomkilledTriage',
    title: 'OOMKilled Triage',
    description: 'Investigate memory pressure and restart loops on a workload.',
    prompt:
      'Review recent OOMKilled pods, compare container limits against observed usage, check recent deploys, then summarize the likely root cause and a safer memory target.',
    applicability: 'kubernetes'
  },
  {
    id: 'seed-kubernetes-latency-analysis',
    copyKey: 'latencyAnalysis',
    title: 'High API Latency Analysis',
    description: 'Trace ingress, service, and workload causes for a latency spike.',
    prompt:
      'Inspect recent service latency regressions, correlate ingress and backend workload health, and identify whether the bottleneck is network, saturation, or release related.',
    applicability: 'kubernetes'
  },
  {
    id: 'seed-kubernetes-node-notready',
    copyKey: 'nodeNotReady',
    title: 'Node NotReady Debug',
    description: 'Check node health drift and likely platform causes.',
    prompt:
      'Summarize why the selected node entered NotReady, including recent kubelet, pressure, or network indicators, then suggest the next operator action.',
    applicability: 'kubernetes'
  },
  {
    id: 'seed-vm-service-failure',
    copyKey: 'vmServiceFailure',
    title: 'Host Service Failure Triage',
    description: 'Inspect failing services and recent host-level changes.',
    prompt:
      'Review failed systemd services, recent unit restarts, dependency failures, and relevant journal entries, then summarize the likely service failure cause.',
    applicability: 'virtual_machine'
  },
  {
    id: 'seed-vm-log-error-sweep',
    copyKey: 'vmLogErrorSweep',
    title: 'Host Log Error Sweep',
    description: 'Scan host logs for recurring errors and warnings.',
    prompt:
      'Search allowed host log sources for repeated errors, warnings, authentication failures, and crash indicators, then group the strongest signals by likely subsystem.',
    applicability: 'virtual_machine'
  },
  {
    id: 'seed-vm-cpu-memory-pressure',
    copyKey: 'vmCpuMemoryPressure',
    title: 'CPU and Memory Pressure',
    description: 'Review host saturation signals and top processes.',
    prompt:
      'Inspect CPU, memory, swap, and process pressure indicators, identify the top consumers where available, and recommend the safest next diagnostic step.',
    applicability: 'virtual_machine'
  },
  {
    id: 'seed-vm-network-listeners',
    copyKey: 'vmNetworkListeners',
    title: 'Network Listener Review',
    description: 'Check listening ports and unexpected network exposure.',
    prompt:
      'Review network listeners, bound addresses, owning processes, and recent service changes, then flag unexpected exposure or missing expected listeners.',
    applicability: 'virtual_machine'
  },
  {
    id: 'seed-all-target-health-summary',
    copyKey: 'targetHealthSummary',
    title: 'Target Health Summary',
    description: 'Summarize the selected target health and highest-priority signals.',
    prompt:
      'Summarize the selected target health, current availability signals, active findings, recent changes, and the next three operator checks without making changes.',
    applicability: 'all'
  }
];

const getStorageKey = (workspaceId: string) => `acornops.runbooks.${workspaceId}`;

export const createEmptyRunbookDraft = (applicability: RunbookApplicability = 'all'): RunbookDraft => ({
  title: '',
  description: '',
  prompt: '',
  applicability
});

export const isRunbookApplicability = (value: unknown): value is RunbookApplicability =>
  value === 'kubernetes' || value === 'virtual_machine' || value === 'all';

export const createManualRunbook = (
  draft: RunbookDraft,
  fallbackDescription: string,
  timestamp = Date.now()
): Runbook | null => {
  const title = draft.title.trim();
  const prompt = draft.prompt.trim();
  if (!title || !prompt) return null;
  return {
    id: `manual-${timestamp}`,
    title,
    description: draft.description.trim() || fallbackDescription,
    prompt,
    applicability: draft.applicability
  };
};

export const updateRunbookTemplate = (
  templates: Runbook[],
  runbookId: string,
  draft: RunbookDraft,
  fallbackDescription: string
): Runbook[] | null => {
  const title = draft.title.trim();
  const prompt = draft.prompt.trim();
  if (!title || !prompt) return null;
  return templates.map((runbook) =>
    runbook.id === runbookId
      ? {
          ...runbook,
          title,
          description: draft.description.trim() || fallbackDescription,
          prompt,
          applicability: draft.applicability
        }
      : runbook
  );
};

export const deleteRunbookTemplate = (templates: Runbook[], runbookId: string): Runbook[] =>
  templates.filter((runbook) => runbook.id !== runbookId);

export const moveRunbookTemplateBefore = (templates: Runbook[], draggedRunbookId: string, targetRunbookId: string): Runbook[] => {
  if (draggedRunbookId === targetRunbookId) return templates;
  const draggedIndex = templates.findIndex((runbook) => runbook.id === draggedRunbookId);
  const targetIndex = templates.findIndex((runbook) => runbook.id === targetRunbookId);
  if (draggedIndex < 0 || targetIndex < 0) return templates;

  const nextTemplates = [...templates];
  const [draggedRunbook] = nextTemplates.splice(draggedIndex, 1);
  const nextTargetIndex = nextTemplates.findIndex((runbook) => runbook.id === targetRunbookId);
  if (nextTargetIndex < 0) return templates;
  nextTemplates.splice(nextTargetIndex, 0, draggedRunbook);
  return nextTemplates;
};

export const getRunbookVmTargetLimit = (workspace: Pick<Workspace, 'quota'>): number => {
  const quota = workspace.quota?.virtualMachines;
  if (!quota) return 100;
  return Math.max(0, quota.used, quota.limit);
};

const normalizeRunbook = (value: unknown, fallbackApplicability: RunbookApplicability): Runbook | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Record<keyof Runbook, unknown>>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.description !== 'string' ||
    typeof candidate.prompt !== 'string'
  ) {
    return null;
  }
  return {
    id: candidate.id,
    title: candidate.title,
    description: candidate.description,
    prompt: candidate.prompt,
    applicability: isRunbookApplicability(candidate.applicability) ? candidate.applicability : fallbackApplicability
  };
};

export const createDefaultRunbookTemplates = (copies: RunbookSeedTemplateCopies = {}): Runbook[] =>
  DEFAULT_RUNBOOK_SEEDS.map(({ copyKey, ...runbook }) => ({
    ...runbook,
    ...(copies[copyKey] || {})
  }));

const mergeDefaultRunbookTemplates = (templates: Runbook[], seedTemplates = createDefaultRunbookTemplates()): Runbook[] => {
  const existingIds = new Set(templates.map((runbook) => runbook.id));
  return [
    ...seedTemplates.filter((runbook) => !existingIds.has(runbook.id)).map((runbook) => ({ ...runbook })),
    ...templates
  ];
};

export const parseStoredRunbookState = (
  stored: string | null,
  seedTemplates = createDefaultRunbookTemplates()
): StoredRunbookState | null => {
  if (!stored) return null;
  try {
    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      const legacyTemplates = parsed.map((item) => normalizeRunbook(item, 'kubernetes')).filter((item): item is Runbook => Boolean(item));
      return {
        version: RUNBOOK_STORAGE_VERSION,
        templates: mergeDefaultRunbookTemplates(legacyTemplates, seedTemplates)
      };
    }
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as { version?: unknown; templates?: unknown };
    if (candidate.version !== RUNBOOK_STORAGE_VERSION || !Array.isArray(candidate.templates)) return null;
    const templates = candidate.templates.map((item) => normalizeRunbook(item, 'kubernetes')).filter((item): item is Runbook => Boolean(item));
    if (candidate.templates.length > 0 && templates.length === 0) return null;
    return {
      version: RUNBOOK_STORAGE_VERSION,
      templates
    };
  } catch {
    return null;
  }
};

export const readRunbookTemplates = (
  workspaceId: string,
  seedTemplates = createDefaultRunbookTemplates()
): Runbook[] => {
  const storedState = parseStoredRunbookState(safeStorage.getItem(getStorageKey(workspaceId)), seedTemplates);
  return storedState ? storedState.templates : seedTemplates.map((runbook) => ({ ...runbook }));
};

export const persistRunbookTemplates = (workspaceId: string, templates: Runbook[]) => {
  const state: StoredRunbookState = {
    version: RUNBOOK_STORAGE_VERSION,
    templates
  };
  safeStorage.setItem(getStorageKey(workspaceId), JSON.stringify(state));
};

export const createKubernetesRunbookTarget = (cluster: KubernetesCluster, disabledReasons: {
  disconnected: string;
  notInstalled: string;
}): RunbookTarget => {
  const runnable = cluster.agentConnectionState === 'connected';
  const status = cluster.agentConnectionState === 'connected'
    ? 'connected'
    : cluster.agentConnectionState === 'disconnected'
      ? 'disconnected'
      : 'not_installed';
  return {
    id: cluster.id,
    workspaceId: cluster.workspaceId,
    targetType: 'kubernetes',
    name: cluster.name,
    status,
    runnable,
    disabledReason: runnable ? undefined : cluster.agentConnectionState === 'disconnected' ? disabledReasons.disconnected : disabledReasons.notInstalled
  };
};

export const createVirtualMachineRunbookTarget = (target: TargetSummary, disabledReasons: {
  offline: string;
  degraded: string;
  awaitingAgent: string;
}): RunbookTarget => {
  const runnable = target.status === 'online';
  const disabledReason = runnable
    ? undefined
    : target.status === 'offline'
      ? disabledReasons.offline
      : target.status === 'degraded'
        ? disabledReasons.degraded
        : disabledReasons.awaitingAgent;
  return {
    id: target.id,
    workspaceId: target.workspaceId,
    targetType: 'virtual_machine',
    name: target.name,
    status: target.status,
    runnable,
    disabledReason
  };
};

export const isRunbookRunnable = (target: RunbookTarget | null): target is RunbookTarget => Boolean(target?.runnable);

export const getRunnableRunbookTarget = (targets: RunbookTarget[], selectedTargetId: string): RunbookTarget | null => {
  if (!selectedTargetId) return null;
  const selectedTarget = targets.find((target) => target.id === selectedTargetId);
  return selectedTarget && selectedTarget.runnable ? selectedTarget : null;
};

export const getNextRunbookTargetId = (targets: RunbookTarget[], selectedTargetId: string): string =>
  getRunnableRunbookTarget(targets, selectedTargetId)?.id || '';

export const isRunbookCompatibleWithTargetType = (
  runbook: Pick<Runbook, 'applicability'>,
  targetType: RunbookTargetType
): boolean => runbook.applicability === 'all' || runbook.applicability === targetType;

export const getRunbookDisabledReason = (
  runbook: Runbook,
  selectedTarget: RunbookTarget | null,
  labels: { noTarget: string; targetUnavailable: string; kubernetesOnly: string; vmOnly: string }
): string | undefined => {
  if (!selectedTarget) return labels.noTarget;
  if (!selectedTarget.runnable) return selectedTarget.disabledReason || labels.targetUnavailable;
  if (isRunbookCompatibleWithTargetType(runbook, selectedTarget.targetType)) return undefined;
  return runbook.applicability === 'kubernetes' ? labels.kubernetesOnly : labels.vmOnly;
};

export const runRunbookWithSelectedTarget = (
  targets: RunbookTarget[],
  selectedTargetId: string,
  runbook: Runbook,
  onRunRunbook: (request: RunbookExecutionRequest) => void
): boolean => {
  const target = getRunnableRunbookTarget(targets, selectedTargetId);
  if (!target || !isRunbookCompatibleWithTargetType(runbook, target.targetType)) return false;
  onRunRunbook({ targetId: target.id, workspaceId: target.workspaceId, targetType: target.targetType, prompt: runbook.prompt });
  return true;
};

export const getDefaultApplicabilityForTarget = (target: RunbookTarget | null): RunbookApplicability => target?.targetType || 'all';
