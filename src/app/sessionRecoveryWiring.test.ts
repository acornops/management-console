import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = `${readFileSync(resolve(__dirname, '../App.tsx'), 'utf8')}\n${readFileSync(resolve(__dirname, './useAuthenticatedSessionLifecycle.ts'), 'utf8')}`;

describe('session expiry application reset', () => {
  it('preserves the URL and clears authenticated application state', () => {
    [
      'preserveSessionReturnPath(window.location)',
      'clearControlPlaneCsrfState()',
      'setUser(null)',
      'setKubernetesClusters([])',
      'args.resetVirtualMachineCache()',
      'setWorkspaces([])',
      'setSelectedWorkspaceId(null)',
      "setSessionBootstrapState('anonymous')"
    ].forEach((snippet) => expect(source).toContain(snippet));
    expect(source).toContain('sessionExpired={sessionExpired}');
    expect(source).toContain('consumeSessionReturnPath()');
  });
});
