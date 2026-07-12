import { describe, expect, it } from 'vitest';
import { approvalCheckpoint, enLocale, zhLocale } from '@/stylesTestSupport';

describe('patch resource approval fallback', () => {
  it('surfaces rollout and traffic-routing consequences without exposing values', () => {
    expect(approvalCheckpoint).toContain("approval.toolName === 'patch_resource'");
    expect(approvalCheckpoint).toContain('rawChanges.slice(0, 10)');
    expect(approvalCheckpoint).toContain('replace(/[\\p{Cc}\\p{Cf}]+/gu');
    expect(approvalCheckpoint).toContain('formatApprovalArguments(approval.arguments)');
    expect(approvalCheckpoint).toContain("t('chat.approvalFallbackSummary.patchRedirectsTraffic')");
    expect(approvalCheckpoint).toContain("'patchAffectsFutureJobs' : 'patchTriggersRollout'");
    expect(enLocale).toContain('patchRedirectsTraffic:');
    expect(enLocale).toContain('patchTriggersRollout:');
    expect(enLocale).toContain('patchAffectsFutureJobs:');
    expect(zhLocale).toContain('patchRedirectsTraffic:');
    expect(zhLocale).toContain('patchTriggersRollout:');
    expect(zhLocale).toContain('patchAffectsFutureJobs:');
  });
});
