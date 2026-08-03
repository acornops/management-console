import { describe, expect, it } from 'vitest';

import type { ControlPlaneTargetToolItem } from '@/services/controlPlaneApi';
import {
  settingsDraftFromTool,
  TARGET_INSIGHTS_RECOMMENDED_TUNING
} from '@/features/targets/admin/targetInsightsDialogViewModel';

const tool = (overrides: Partial<ControlPlaneTargetToolItem> = {}): ControlPlaneTargetToolItem => ({
  id: 'target-insights',
  name: 'Insights',
  description: 'Target insights',
  enabled: true,
  config: {},
  ...overrides
} as ControlPlaneTargetToolItem);

describe('target Insights settings view model', () => {
  it('uses recommended tuning defaults when the target has no overrides', () => {
    expect(settingsDraftFromTool(tool())).toMatchObject(TARGET_INSIGHTS_RECOMMENDED_TUNING);
  });

  it('preserves explicit target tuning overrides', () => {
    expect(settingsDraftFromTool(tool({
      config: {
        learning: {
          idleCheckpointDelayMinutes: 45,
          minimumObservationsBeforeGeneralization: 5,
          checkpointModel: { mode: 'workspace_default' }
        },
        retrieval: {
          maxSnippetsPerRetrieval: 6,
          maxSnippetSizeBytes: 2048
        }
      }
    }))).toMatchObject({
      idleCheckpointDelayMinutes: 45,
      minimumObservationsBeforeGeneralization: 5,
      maxSnippetsPerRetrieval: 6,
      maxSnippetSizeBytes: 2048
    });
  });
});
