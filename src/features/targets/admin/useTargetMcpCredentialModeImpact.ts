import { useState } from 'react';
import { targetMcpCredentialModeScheduleCount } from '@/features/catalog/mcpCredentialModeImpact';

export function useTargetMcpCredentialModeImpact(
  workspaceId: string,
  targetId: string,
  scheduleCount: (workspaceId: string, subjectId: string, serverId: string) => Promise<number> = targetMcpCredentialModeScheduleCount
) {
  const [impact, setImpact] = useState<{ affectedScheduleCount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const clear = () => setImpact(null);
  const prepare = async (serverId: string, credentialMode: 'workspace' | 'individual') => {
    setLoading(true);
    try {
      const affectedScheduleCount = credentialMode === 'individual'
        ? await scheduleCount(workspaceId, targetId, serverId)
        : 0;
      setImpact({ affectedScheduleCount });
    } finally {
      setLoading(false);
    }
  };
  return { impact, loading, clear, prepare };
}
