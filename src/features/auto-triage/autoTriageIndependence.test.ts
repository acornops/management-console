import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const coreModules = [
  './AutomaticInvestigationActivity.tsx',
  '../targets/auto-triage/TargetAutoTriageSettingsSection.tsx',
  '../targets/chat/components/AutomaticInvestigationBrief.tsx',
  '../targets/chat/components/TargetChatContextNotices.tsx',
  '../../services/control-plane/autoTriageApi.ts',
  '../../services/control-plane/autoTriageTypes.ts'
];

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('target auto-triage UI independence', () => {
  it('does not import Automation or Workflow feature modules from core surfaces', () => {
    for (const path of coreModules) {
      expect(source(path), `${path} should be target-native`).not.toMatch(
        /from\s+['"][^'"]*(?:workflow-activity|workflowApi|pages\/workflows|features\/automation)[^'"]*['"]/i
      );
    }
  });

  it('uses target and run permissions rather than Workflow permissions', () => {
    const settings = source('../targets/auto-triage/TargetAutoTriageSettingsSection.tsx');
    expect(settings).toContain('canManageTargets');
    expect(settings).toContain('canCreateReadWriteRuns');
    expect(settings).not.toContain('manage_workflows');
  });
});
