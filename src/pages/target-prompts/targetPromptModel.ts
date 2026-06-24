export type TargetPromptType = 'kubernetes' | 'virtual_machine';

export interface TargetPromptRequest {
  targetId: string;
  workspaceId: string;
  targetType: TargetPromptType;
  prompt: string;
}

export interface PendingVmTargetPrompt {
  workspaceId: string;
  targetId: string;
  prompt: string;
  id: number;
}
