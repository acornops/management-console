import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { initializeI18n } from '@/i18n';
import { TargetToolsView } from '@/features/targets/admin/TargetToolsView';
import type { ControlPlaneTargetToolsCatalog } from '@/services/controlPlaneApi';
import type { TargetDescriptor } from '@/features/targets/targetDescriptor';

beforeAll(async () => {
  await initializeI18n();
});

describe('TargetToolsView', () => {
  it('hides discovery controls for a true empty inventory', () => {
    const target: TargetDescriptor = {
      id: 'target-1',
      workspaceId: 'workspace-1',
      targetType: 'kubernetes',
      name: 'Empty target',
      chatSessions: [],
      mcpTools: []
    };
    const catalog: ControlPlaneTargetToolsCatalog = {
      workspaceId: target.workspaceId,
      targetId: target.id,
      targetType: target.targetType,
      permissions: { canEdit: true },
      items: []
    };

    const markup = renderToStaticMarkup(
      <TargetToolsView target={target} canManageTools initialCatalog={catalog} />
    );

    expect(markup).toContain('data-target-tools-access-summary="true"');
    expect(markup).toContain('data-target-tools-list="true"');
    expect(markup).toContain('No built-in tools are available.');
    expect(markup).not.toContain('<table');
    expect(markup).not.toContain('id="target-tool-search"');
    expect(markup).not.toContain('Showing 0 of 0');
  });

  it('uses one subtle separator treatment for populated tool rows', () => {
    const target: TargetDescriptor = {
      id: 'target-1',
      workspaceId: 'workspace-1',
      targetType: 'kubernetes',
      name: 'Populated target',
      chatSessions: [],
      mcpTools: []
    };
    const catalog: ControlPlaneTargetToolsCatalog = {
      workspaceId: target.workspaceId,
      targetId: target.id,
      targetType: target.targetType,
      permissions: { canEdit: true },
      items: [{
        id: 'prompt.resources.read',
        label: 'Read prompt resources',
        description: 'Read bounded evidence.',
        enabled: true,
        origin: 'platform_native',
        capability: 'read',
        runtimeKind: 'function',
        config: {}
      }]
    };

    const markup = renderToStaticMarkup(
      <TargetToolsView target={target} canManageTools initialCatalog={catalog} />
    );

    expect(markup).toContain('<tbody class="divide-y divide-ui-bg">');
    expect(markup).toContain('data-target-capability-table-frame="true"');
  });
});
