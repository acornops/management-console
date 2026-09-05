import { useCallback, useState } from 'react';
const noScheduleImpact = async (): Promise<number> => 0;

export function useTargetMcpCredentialModeImpact(
  workspaceId: string,
  targetId: string,
  scheduleCount: (workspaceId: string, subjectId: string, serverId: string) => Promise<number> = noScheduleImpact
) {
  const [impact, setImpact] = useState<{ affectedScheduleCount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const clear = useCallback(() => setImpact(null), []);
  const prepare = useCallback(async (serverId: string, credentialMode: 'workspace' | 'individual') => {
    setLoading(true);
    try {
      const affectedScheduleCount = credentialMode === 'individual'
        ? await scheduleCount(workspaceId, targetId, serverId)
        : 0;
      setImpact({ affectedScheduleCount });
    } finally {
      setLoading(false);
    }
  }, [scheduleCount, targetId, workspaceId]);
  return { impact, loading, clear, prepare };
}
