import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { targetIdsForTypes, visibleWorkflowTargets, WorkflowTargetScopeEditor } from '@/pages/WorkflowTargetScopeEditor';
import type { WorkflowOption } from '@/services/control-plane/workflowApi';

const targets: WorkflowOption[] = [
  {
    value: 'cluster-1',
    label: 'Development Cluster',
    description: 'Kubernetes cluster · online',
    provenance: { source: 'target', targetType: 'kubernetes' }
  },
  {
    value: 'vm-1',
    label: 'Development Linux VM',
    description: 'Virtual machine · online',
    provenance: { source: 'target', targetType: 'virtual_machine' }
  }
];

describe('WorkflowTargetScopeEditor', () => {
  it('reveals only targets matching the selected target type', () => {
    const markup = renderToStaticMarkup(
      <WorkflowTargetScopeEditor
        targetTypes={['kubernetes']}
        targetIds={[]}
        targets={targets}
        onChange={() => undefined}
      />
    );

    expect(markup).toContain('Development Cluster');
    expect(markup).not.toContain('Development Linux VM');
  });

  it('keeps exact target choices collapsed until a target type is selected', () => {
    const markup = renderToStaticMarkup(
      <WorkflowTargetScopeEditor
        targetTypes={[]}
        targetIds={[]}
        targets={targets}
        onChange={() => undefined}
      />
    );

    expect(markup).toContain('Select a target type to choose exact targets.');
    expect(markup).not.toContain('Development Cluster');
    expect(markup).not.toContain('Development Linux VM');
  });

  it('removes exact selections that would become hidden when a type is deselected', () => {
    expect(targetIdsForTypes(targets, ['cluster-1', 'vm-1'], ['kubernetes'])).toEqual(['cluster-1']);
    expect(targetIdsForTypes(targets, ['cluster-1'], [])).toEqual([]);
  });

  it('rejects target options without final target provenance', () => {
    const unscopedTarget = { value: 'unscoped-target', label: 'Unscoped target' };
    expect(visibleWorkflowTargets([unscopedTarget], ['kubernetes'])).toEqual([]);
    expect(visibleWorkflowTargets([unscopedTarget], ['virtual_machine'])).toEqual([]);
  });
});
