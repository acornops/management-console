import { safeStorage } from '@/utils/safeStorage';

const RECENT_INVESTIGATION_STORAGE_KEY = 'acornops.workspace.recent-investigation';
const RECENT_INVESTIGATION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const RECENT_INVESTIGATION_STORAGE_VERSION = 3;

export interface RecentInvestigationContext {
  workspaceId: string;
  path: string;
  targetName: string;
  targetType: 'kubernetes' | 'virtual_machine';
  timestamp: number;
}

interface RecentInvestigationWriteContext extends Omit<RecentInvestigationContext, 'timestamp'> {
  userId: string;
}

type StoredRecentInvestigationContext = RecentInvestigationContext;

interface StoredRecentInvestigationState {
  version: typeof RECENT_INVESTIGATION_STORAGE_VERSION;
  entries: Record<string, Record<string, StoredRecentInvestigationContext>>;
}

function isStoredRecentInvestigationContext(value: unknown): value is StoredRecentInvestigationContext {
  const parsed = value as Partial<StoredRecentInvestigationContext> | null;
  return Boolean(
    parsed &&
      typeof parsed.workspaceId === 'string' &&
      typeof parsed.path === 'string' &&
      typeof parsed.targetName === 'string' &&
      (parsed.targetType === 'kubernetes' || parsed.targetType === 'virtual_machine') &&
      typeof parsed.timestamp === 'number'
  );
}

function parseRecentInvestigation(value: string | null): StoredRecentInvestigationState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<StoredRecentInvestigationState>;
    if (parsed?.version !== RECENT_INVESTIGATION_STORAGE_VERSION || !parsed.entries || typeof parsed.entries !== 'object') {
      return null;
    }

    const nextEntries: StoredRecentInvestigationState['entries'] = {};
    for (const [userId, workspaceEntries] of Object.entries(parsed.entries)) {
      if (!workspaceEntries || typeof workspaceEntries !== 'object') return null;
      const nextWorkspaceEntries: Record<string, StoredRecentInvestigationContext> = {};
      for (const [workspaceId, context] of Object.entries(workspaceEntries)) {
        if (!isStoredRecentInvestigationContext(context)) return null;
        nextWorkspaceEntries[workspaceId] = context;
      }
      nextEntries[userId] = nextWorkspaceEntries;
    }

    return {
      version: RECENT_INVESTIGATION_STORAGE_VERSION,
      entries: nextEntries
    };
  } catch {
    return null;
  }
}

function persistRecentInvestigationState(state: StoredRecentInvestigationState): void {
  const hasEntries = Object.values(state.entries).some((workspaceEntries) => Object.keys(workspaceEntries).length > 0);
  if (!hasEntries) {
    clearRecentInvestigation();
    return;
  }

  safeStorage.setItem(RECENT_INVESTIGATION_STORAGE_KEY, JSON.stringify(state));
}

function pruneRecentInvestigationState(
  state: StoredRecentInvestigationState,
  now: number
): { state: StoredRecentInvestigationState; changed: boolean } {
  let changed = false;
  const nextEntries: StoredRecentInvestigationState['entries'] = {};

  for (const [userId, workspaceEntries] of Object.entries(state.entries)) {
    const nextWorkspaceEntries: Record<string, StoredRecentInvestigationContext> = {};
    for (const [workspaceId, context] of Object.entries(workspaceEntries)) {
      if (now - context.timestamp > RECENT_INVESTIGATION_MAX_AGE_MS) {
        changed = true;
        continue;
      }
      nextWorkspaceEntries[workspaceId] = context;
    }
    if (Object.keys(nextWorkspaceEntries).length > 0) {
      nextEntries[userId] = nextWorkspaceEntries;
      continue;
    }
    changed = true;
  }

  return {
    state: {
      version: RECENT_INVESTIGATION_STORAGE_VERSION,
      entries: nextEntries
    },
    changed
  };
}

export function clearRecentInvestigation(): void {
  safeStorage.removeItem(RECENT_INVESTIGATION_STORAGE_KEY);
}

export function writeRecentInvestigation(context: RecentInvestigationWriteContext): void {
  const parsed = parseRecentInvestigation(safeStorage.getItem(RECENT_INVESTIGATION_STORAGE_KEY));
  const now = Date.now();
  const baseState = parsed ?? { version: RECENT_INVESTIGATION_STORAGE_VERSION, entries: {} };
  const { state } = pruneRecentInvestigationState(baseState, now);
  const userEntries = state.entries[context.userId] ?? {};

  state.entries[context.userId] = {
    ...userEntries,
    [context.workspaceId]: {
      workspaceId: context.workspaceId,
      path: context.path,
      targetName: context.targetName,
      targetType: context.targetType,
      timestamp: now
    }
  };

  persistRecentInvestigationState(state);
}

export function readRecentInvestigation(workspaceId: string, currentUserId: string): RecentInvestigationContext | null {
  const raw = safeStorage.getItem(RECENT_INVESTIGATION_STORAGE_KEY);
  const parsed = parseRecentInvestigation(raw);
  if (!parsed) {
    if (raw) clearRecentInvestigation();
    return null;
  }

  const { state, changed } = pruneRecentInvestigationState(parsed, Date.now());
  if (changed) {
    persistRecentInvestigationState(state);
  }

  return state.entries[currentUserId]?.[workspaceId] ?? null;
}
