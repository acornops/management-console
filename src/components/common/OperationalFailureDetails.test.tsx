import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { operationalFailureCause } from './OperationalFailureDetails';

const root = resolve(__dirname, '../../..');
const scheduleFacts = readFileSync(resolve(root, 'src/pages/WorkspaceScheduleExecutionFacts.tsx'), 'utf8');
const webhookFacts = readFileSync(resolve(root, 'src/pages/WorkspaceWebhookExecutionFacts.tsx'), 'utf8');

describe('operational failure presentation', () => {
  it('removes implementation codes from the primary human-readable cause', () => {
    expect(operationalFailureCause(
      'MCP_CONNECTION_REQUIRED: credential connection is missing for a required approved MCP tool.',
      'Fallback'
    )).toBe('credential connection is missing for a required approved MCP tool.');
    expect(operationalFailureCause('UPSTREAM_FAILURE', 'The dispatch failed.')).toBe('The dispatch failed.');
    expect(operationalFailureCause('  ', 'The dispatch failed.')).toBe('The dispatch failed.');
  });

  it('uses cause, impact, next-step, and disclosed technical detail for schedule and webhook failures', () => {
    for (const source of [scheduleFacts, webhookFacts]) {
      expect(source).toContain('<OperationalFailureDetails');
      expect(source).toContain('technicalDetail=');
    }
    expect(scheduleFacts).not.toContain('>{schedule.lastError}</p>');
    expect(webhookFacts).not.toContain('>{trigger.lastError}</p>');
  });
});
