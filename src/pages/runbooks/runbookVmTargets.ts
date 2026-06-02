import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { TargetSummary } from '@/services/controlPlaneApi';

const VM_TARGET_PAGE_SIZE = 100;

type ListWorkspaceTargets = typeof controlPlaneApi.listTargetsForWorkspace;

export const listRunbookVmTargetsForWorkspace = async (
  workspaceId: string,
  targetLimit: number,
  listTargets: ListWorkspaceTargets = controlPlaneApi.listTargetsForWorkspace
): Promise<TargetSummary[]> => {
  if (targetLimit <= 0) return [];
  const targets: TargetSummary[] = [];
  let cursor: string | undefined;
  const visitedCursors = new Set<string>();
  const maxPages = Math.ceil(targetLimit / VM_TARGET_PAGE_SIZE) + 1;
  let pageCount = 0;
  do {
    if (pageCount >= maxPages) break;
    if (cursor) {
      if (visitedCursors.has(cursor)) break;
      visitedCursors.add(cursor);
    }
    const remaining = targetLimit - targets.length;
    pageCount += 1;
    const page = await listTargets(workspaceId, {
      targetType: 'virtual_machine',
      limit: Math.min(VM_TARGET_PAGE_SIZE, Math.max(1, remaining)),
      cursor
    });
    targets.push(...page.items.filter((target) => target.targetType === 'virtual_machine'));
    cursor = page.nextCursor;
  } while (cursor && targets.length < targetLimit);
  return targets.slice(0, targetLimit);
};
