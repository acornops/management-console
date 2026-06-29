import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buttonClassName } from './Button';
import { formInputClassName, formTextareaClassName } from './formControlStyles';
import {
  closeButtonClassName,
  filterToggleButtonClassName,
  getFilterToggleModel,
  getSegmentedTabModel,
  segmentedTabButtonClassName,
  textInputClassName,
  textareaClassName
} from './ComponentVocabulary';

const root = resolve(__dirname, '../../..');

describe('common component vocabulary primitives', () => {
  it('keeps close buttons on the shared icon button vocabulary', () => {
    expect(closeButtonClassName()).toBe(buttonClassName({ variant: 'icon', size: 'icon' }));
    expect(closeButtonClassName('absolute right-4 top-4')).toContain('absolute right-4 top-4');
    expect(closeButtonClassName()).toContain('focus-visible:ring-accent/25');
  });

  it('keeps text inputs and textareas on shared form control styles', () => {
    expect(textInputClassName()).toBe(formInputClassName());
    expect(textInputClassName('font-mono')).toContain('font-mono');
    expect(textareaClassName()).toBe(formTextareaClassName());
    expect(textareaClassName('min-h-36')).toContain('min-h-36');
    expect(formTextareaClassName()).toContain('bg-ui-bg/70');
    expect(formTextareaClassName()).toContain('inset_0_0_0_1px_rgb(var(--border-rgb)/0.35)');
    expect(formTextareaClassName()).toContain('focus:bg-ui-surface');
  });

  it('builds accessible segmented tab models with count and icon metadata', () => {
    const tabs = getSegmentedTabModel({
      items: [
        { value: 'overview', label: 'Overview', count: 2 },
        { value: 'runs', label: 'Runs', icon: 'activity' }
      ],
      activeValue: 'runs'
    });

    expect(tabs).toEqual([
      { value: 'overview', label: 'Overview', count: 2, icon: undefined, isActive: false, ariaSelected: false },
      { value: 'runs', label: 'Runs', count: undefined, icon: 'activity', isActive: true, ariaSelected: true }
    ]);
    expect(segmentedTabButtonClassName({ isActive: true })).toContain('border-accent');
    expect(segmentedTabButtonClassName({ isActive: false })).toContain('border-transparent');
  });

  it('builds accessible filter toggle models with pressed state and stable button sizing', () => {
    const filters = getFilterToggleModel({
      items: [
        { value: 'all', label: 'All', count: 4 },
        { value: 'blocked', label: 'Blocked' }
      ],
      activeValue: 'blocked'
    });

    expect(filters).toEqual([
      { value: 'all', label: 'All', count: 4, icon: undefined, isActive: false, ariaPressed: false },
      { value: 'blocked', label: 'Blocked', count: undefined, icon: undefined, isActive: true, ariaPressed: true }
    ]);
    expect(filterToggleButtonClassName({ isActive: true })).toContain('bg-ui-surface');
    expect(filterToggleButtonClassName({ isActive: false })).toContain('hover:bg-ui-surface');
  });
});

describe('authenticated surface component vocabulary', () => {
  const workspaceInviteModal = readFileSync(resolve(root, 'src/pages/workspace-members/WorkspaceInviteModal.tsx'), 'utf8');
  const workspaceAgentsDrawers = readFileSync(resolve(root, 'src/pages/WorkspaceAgentsDrawers.tsx'), 'utf8');
  const workspaceAgentsCatalog = readFileSync(resolve(root, 'src/pages/WorkspaceAgentsCatalog.tsx'), 'utf8');
  const workspaceWorkflowsPage = readFileSync(resolve(root, 'src/pages/WorkspaceWorkflowsPage.tsx'), 'utf8');
  const addVirtualMachineModal = readFileSync(resolve(root, 'src/pages/virtual-machines/AddVirtualMachineModal.tsx'), 'utf8');
  const virtualMachinesListView = readFileSync(resolve(root, 'src/pages/virtual-machines/VirtualMachinesListView.tsx'), 'utf8');
  const targetSkillsView = readFileSync(
    resolve(root, 'src/features/kubernetes-cluster-detail/components/detail/views/TargetSkillsView.tsx'),
    'utf8'
  );

  it('routes modal and drawer close controls through CloseButton', () => {
    expect(workspaceInviteModal).toContain("from '@/components/common/ComponentVocabulary'");
    expect(workspaceInviteModal).toContain('CloseButton');
    expect(workspaceInviteModal).toContain('<Dialog');
    expect(workspaceInviteModal).toContain('<CloseButton');
    expect(workspaceAgentsDrawers).toContain("from '@/components/common/ComponentVocabulary'");
    expect(workspaceAgentsDrawers).toContain('CloseButton');
    expect(workspaceAgentsDrawers).toContain('<RightSidePanel');
    expect(workspaceAgentsDrawers).toContain('<CloseButton');
    expect(addVirtualMachineModal).toContain('<CloseButton');
    expect(virtualMachinesListView).toContain('<CloseButton');
  });

  it('routes raw form fields through TextInput and Textarea on migrated surfaces', () => {
    expect(workspaceInviteModal).toContain('<TextInput');
    expect(workspaceInviteModal).not.toContain('<input\n                  id="workspace-invite-email"');
    expect(workspaceAgentsDrawers).toContain('<TextInput');
    expect(workspaceAgentsDrawers).toContain('<Textarea');
    expect(workspaceWorkflowsPage).toContain('<TextInput');
    expect(workspaceWorkflowsPage).toContain('<Textarea');
    expect(targetSkillsView).toContain('<TextInput');
    expect(targetSkillsView).toContain('<Checkbox');
  });

  it('uses shared segmented tabs and filter toggles for compact page controls', () => {
    expect(workspaceAgentsCatalog).toContain("from '@/components/common/ComponentVocabulary'");
    expect(workspaceAgentsCatalog).toContain('FilterToggleGroup');
    expect(workspaceAgentsCatalog).toContain('<FilterToggleGroup');
    expect(workspaceWorkflowsPage).toContain("from '@/components/common/ComponentVocabulary'");
    expect(workspaceWorkflowsPage).toContain('SegmentedTabs');
    expect(workspaceWorkflowsPage).toContain('<SegmentedTabs');
    expect(workspaceWorkflowsPage).toContain('idBase="workflow-section"');
    expect(workspaceWorkflowsPage).not.toContain('role="tablist" aria-label="Workflow section tabs" className="flex gap-2 overflow-x-auto border-b border-ui-border"');
  });
});
