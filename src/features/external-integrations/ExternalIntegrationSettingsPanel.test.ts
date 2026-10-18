import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExternalIntegrationSettingsPanel } from './ExternalIntegrationSettingsPanel';
import { controlPlaneApi } from '@/services/controlPlaneApi';

const hooks = vi.hoisted(() => ({ values: [] as any[], index: 0, effects: [] as Array<() => void>, links: null as any }));
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const overrides = {
    useState: (initial: any) => {
      const index = hooks.index++;
      if (!(index in hooks.values)) hooks.values[index] = typeof initial === 'function' ? initial() : initial;
      return [hooks.values[index], (value: any) => { hooks.values[index] = typeof value === 'function' ? value(hooks.values[index]) : value; }];
    },
    useRef: (value: unknown) => ({ current: value }),
    useCallback: (callback: unknown) => callback,
    useEffect: (effect: () => void) => { hooks.effects.push(effect); }
  };
  return { ...actual, ...overrides, default: { ...actual, ...overrides } };
});
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/sessionDataCache', () => ({ useSessionCachedState: () => [hooks.links, (value: any) => { hooks.links = typeof value === 'function' ? value(hooks.links) : value; }] }));
vi.mock('@/services/controlPlaneApi', () => ({ controlPlaneApi: { listExternalIntegrationLinks: vi.fn() } }));

function panel() {
  hooks.index = 0; hooks.effects = [];
  const tree = ExternalIntegrationSettingsPanel({}) as React.ReactElement<any>;
  return { markup: renderToStaticMarkup(tree), tree };
}

describe('integration collection states', () => {
  beforeEach(() => { hooks.values = []; hooks.links = null; vi.mocked(controlPlaneApi.listExternalIntegrationLinks).mockReset(); });
  it('never claims an empty collection after a first-load failure and clears the error on retry', async () => {
    vi.mocked(controlPlaneApi.listExternalIntegrationLinks).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce([]);
    expect(panel().markup).toContain('settings.externalIntegrationsLoading');
    await hooks.effects[0](); await Promise.resolve();
    const failed = panel();
    expect(failed.markup).toContain('settings.externalIntegrationsRetry');
    expect(failed.markup).not.toContain('settings.externalIntegrationsEmpty');
    await failed.tree.props.children[0].props.action.props.onClick(); await Promise.resolve();
    const retried = panel().markup;
    expect(retried).toContain('settings.externalIntegrationsEmpty');
    expect(retried).not.toContain('settings.externalIntegrationsRetry');
  });
  it('retains prior links and authored grants on a failed refresh', async () => {
    hooks.links = [{ id: 'link-1', clientDisplayName: 'Fixture chat', provider: 'fixture', externalUserId: 'safe-user', grantableWorkspaces: [] }];
    panel();
    hooks.values[0] = { 'link-1': { 'workspace-1': ['read_workspace_data', 'create_sessions'] } };
    vi.mocked(controlPlaneApi.listExternalIntegrationLinks).mockRejectedValueOnce(new Error('network'));
    await hooks.effects[0](); await Promise.resolve();
    const failed = panel();
    expect(failed.markup).toContain('Fixture chat');
    expect(failed.markup).toContain('settings.externalIntegrationsStale');
    expect(hooks.values[0]).toEqual({ 'link-1': { 'workspace-1': ['read_workspace_data', 'create_sessions'] } });
    vi.mocked(controlPlaneApi.listExternalIntegrationLinks).mockResolvedValueOnce(hooks.links);
    await failed.tree.props.children[0].props.action.props.onClick(); await Promise.resolve();
    expect(panel().markup).not.toContain('settings.externalIntegrationsStale');
  });
  it('clears prior mutation feedback after a successful explicit refresh', async () => {
    hooks.links = [];
    panel();
    hooks.values[1] = 'Mutation failed';
    vi.mocked(controlPlaneApi.listExternalIntegrationLinks).mockResolvedValueOnce([]);
    await hooks.effects[0](); await Promise.resolve();
    expect(panel().markup).not.toContain('Mutation failed');
  });
});

import {
  buildExternalIntegrationWorkspaceGrants,
  createExternalIntegrationGrantDraft,
  formatExternalIntegrationCapability,
  normalizeExternalIntegrationCapabilities,
  toggleExternalIntegrationCapability
} from './externalIntegrationGrants';
import type { ControlPlaneExternalIntegrationGrantableWorkspace } from '@/services/controlPlaneApi';

const workspaces: ControlPlaneExternalIntegrationGrantableWorkspace[] = [
  {
    workspaceId: 'workspace-1',
    workspaceName: 'Development',
    role: 'owner',
    grantedCapabilities: ['read_workspace_data'],
    grantableCapabilities: ['read_workspace_data', 'create_sessions', 'create_read_write_runs', 'restart_services']
  },
  {
    workspaceId: 'workspace-2',
    workspaceName: 'Production',
    role: 'operator',
    grantedCapabilities: ['read_workspace_data', 'create_sessions', 'create_read_only_runs'],
    grantableCapabilities: ['read_workspace_data', 'create_sessions', 'create_read_only_runs']
  }
];

describe('external integration workspace grants', () => {
  it('adds required read and session capabilities for read-only runs', () => {
    expect(normalizeExternalIntegrationCapabilities(['create_read_only_runs'])).toEqual([
      'read_workspace_data',
      'create_sessions',
      'create_read_only_runs'
    ]);
  });

  it('fails closed when a prerequisite is not grantable', () => {
    expect(normalizeExternalIntegrationCapabilities(
      ['create_read_only_runs'],
      ['read_workspace_data', 'create_read_only_runs']
    )).toEqual([]);
  });

  it('adds required read and session capabilities for read-write runs', () => {
    expect(normalizeExternalIntegrationCapabilities(['create_read_write_runs'])).toEqual([
      'read_workspace_data',
      'create_sessions',
      'create_read_write_runs'
    ]);
  });

  it('keeps server-provided capabilities visible and selectable', () => {
    expect(formatExternalIntegrationCapability('restart_services')).toBe('Restart services');
    expect(normalizeExternalIntegrationCapabilities(
      ['restart_services'],
      ['restart_services']
    )).toEqual(['restart_services']);
  });

  it('keeps grant selection isolated across workspaces', () => {
    const initialDraft = createExternalIntegrationGrantDraft(workspaces);
    const updatedDraft = toggleExternalIntegrationCapability(
      initialDraft,
      workspaces[0],
      'create_read_write_runs',
      true
    );

    expect(updatedDraft['workspace-1']).toEqual([
      'read_workspace_data',
      'create_sessions',
      'create_read_write_runs'
    ]);
    expect(updatedDraft['workspace-2']).toEqual([
      'read_workspace_data',
      'create_sessions',
      'create_read_only_runs'
    ]);
  });

  it('omits disabled workspaces from the replacement payload', () => {
    expect(buildExternalIntegrationWorkspaceGrants({
      'workspace-1': ['read_workspace_data'],
      'workspace-2': []
    })).toEqual([
      { workspaceId: 'workspace-1', capabilities: ['read_workspace_data'] }
    ]);
  });
});
