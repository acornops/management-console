import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import i18n, { initializeI18n } from '@/i18n';
import { formatControlPlaneError } from './errorFormatting';
import { ControlPlaneRequestError } from './http';

function controlPlaneError(
  status: number,
  code?: string,
  message = code || 'Backend detail',
  details?: Record<string, unknown>
): ControlPlaneRequestError {
  return new ControlPlaneRequestError(`Control plane request failed (${status}): ${message}`, status, code, details);
}

describe('formatControlPlaneError', () => {
  beforeAll(async () => {
    await initializeI18n();
  });

  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('uses validation field details when present', () => {
    const error = controlPlaneError(400, 'VALIDATION_ERROR', 'Invalid request body', {
      fieldErrors: {
        repoUrl: ['Required']
      }
    });

    expect(formatControlPlaneError(error, 'Fallback', { area: 'targetSkills' })).toBe('Repo Url: Required');
  });

  it('maps skill import errors to specific recovery copy', () => {
    const error = controlPlaneError(400, 'INVALID_SKILL_BUNDLE', 'Invalid bundle');

    expect(formatControlPlaneError(error, 'Failed importing skill.', { area: 'targetSkills' })).toBe(
      'That path does not contain a valid skill bundle. Choose a folder with SKILL.md.'
    );
  });

  it('does not collapse target insight 404 responses into disabled copy', () => {
    const error = controlPlaneError(404, 'NOT_FOUND', 'Target Insights entry not found');

    expect(formatControlPlaneError(error, 'Failed saving Insights file.', { area: 'targetInsights' })).toBe(
      'The requested item could not be found. Refresh and try again.'
    );
  });

  it('localizes mapped messages after i18n initialization', async () => {
    await i18n.changeLanguage('zh');
    const error = controlPlaneError(503, 'AGENT_UNAVAILABLE', 'connection timeout');

    expect(formatControlPlaneError(error, 'Fallback', { area: 'cluster' })).toBe(
      'Agent 离线或未响应。请检查连接后重试。'
    );
  });

  it('uses owner conflict override copy', () => {
    const error = controlPlaneError(409, 'LAST_OWNER', 'Workspace must keep at least one owner');

    expect(
      formatControlPlaneError(error, 'Fallback', {
        area: 'members',
        ownerConflictMessage: 'Custom owner copy'
      })
    ).toBe('Custom owner copy');
  });

  it('normalizes generic network and CSRF failures', () => {
    expect(formatControlPlaneError(new Error('Failed to fetch'), 'Fallback')).toBe(
      'Could not reach the service. Check your connection and try again.'
    );
    expect(formatControlPlaneError(new Error('CSRF token request failed (503)'), 'Fallback')).toBe(
      'Could not reach the service. Check your connection and try again.'
    );
  });

  it('normalizes generic request failure status messages', () => {
    expect(formatControlPlaneError(new Error('Run stream request failed (500): upstream detail'), 'Fallback')).toBe(
      'The service could not complete the request. Try again shortly.'
    );
    expect(formatControlPlaneError(new Error('Target chat activity stream request failed (403): forbidden'), 'Fallback')).toBe(
      'You do not have permission to do that.'
    );
  });
});
