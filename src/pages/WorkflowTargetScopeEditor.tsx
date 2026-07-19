import React from 'react';
import { Checkbox } from '@/components/common/Checkbox';
import type { WorkflowOption } from '@/services/control-plane/workflowApi';

type WorkflowTargetType = 'kubernetes' | 'virtual_machine';

const TARGET_TYPES: ReadonlyArray<readonly [WorkflowTargetType, string]> = [
  ['kubernetes', 'Kubernetes'],
  ['virtual_machine', 'Virtual machines']
];

function workflowTargetType(target: WorkflowOption): WorkflowTargetType {
  return target.provenance?.targetType || 'kubernetes';
}

export function visibleWorkflowTargets(
  targets: WorkflowOption[],
  targetTypes: string[],
  targetIds: string[] = []
): WorkflowOption[] {
  if (targetTypes.length === 0) {
    return targets.filter((target) => targetIds.includes(target.value));
  }
  return targets.filter((target) => targetTypes.includes(workflowTargetType(target)));
}

export function targetIdsForTypes(
  targets: WorkflowOption[],
  targetIds: string[],
  targetTypes: string[]
): string[] {
  if (targetTypes.length === 0) return [];
  const targetsById = new Map(targets.map((target) => [target.value, target]));
  return targetIds.filter((targetId) => {
    const target = targetsById.get(targetId);
    return Boolean(target && targetTypes.includes(workflowTargetType(target)));
  });
}

export const WorkflowTargetScopeEditor: React.FC<{
  targetTypes: string[];
  targetIds: string[];
  targets: WorkflowOption[];
  onChange: (update: { targetTypes?: string[]; targetIds?: string[] }) => void;
}> = ({ targetTypes, targetIds, targets, onChange }) => {
  const visibleTargets = visibleWorkflowTargets(targets, targetTypes, targetIds);

  return (
    <fieldset className="rounded-md border border-ui-border bg-ui-bg p-3">
      <legend className="type-micro-label px-1">Target scope</legend>
      <p className="type-caption mt-1 text-ui-text-muted">Optional. Leave empty for any target allowed by the selected Agents.</p>
      <div className="mt-3 flex flex-wrap gap-4">
        {TARGET_TYPES.map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm font-semibold">
            <Checkbox checked={targetTypes.includes(value)} onChange={(event) => {
              const nextTargetTypes = event.target.checked
                ? [...new Set([...targetTypes, value])]
                : targetTypes.filter((type) => type !== value);
              onChange({
                targetTypes: nextTargetTypes,
                targetIds: targetIdsForTypes(targets, targetIds, nextTargetTypes)
              });
            }} />
            {label}
          </label>
        ))}
      </div>
      {visibleTargets.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2" role="group" aria-label="Exact targets">
          {visibleTargets.map((target) => (
            <label key={target.value} className="flex items-start gap-2 rounded-md border border-ui-border bg-ui-surface px-3 py-2 text-sm font-semibold">
              <Checkbox checked={targetIds.includes(target.value)} disabled={target.disabled} onChange={(event) => onChange({
                targetIds: event.target.checked ? [...new Set([...targetIds, target.value])] : targetIds.filter((id) => id !== target.value)
              })} />
              <span>{target.label}{target.description && <span className="type-caption mt-0.5 block text-ui-text-muted">{target.description}</span>}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="type-caption mt-3 text-ui-text-muted">
          {targetTypes.length === 0 ? 'Select a target type to choose exact targets.' : 'No matching targets are available.'}
        </p>
      )}
    </fieldset>
  );
};
