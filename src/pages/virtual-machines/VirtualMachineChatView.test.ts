import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');

describe('VirtualMachineChatView wiring', () => {
  const source = readFileSync(resolve(root, 'src/pages/virtual-machines/VirtualMachineChatView.tsx'), 'utf8');

  it('uses the shared target chat shell with VM target sessions', () => {
    expect(source).toContain("import { TargetChatView }");
    expect(source).toContain("import { useTargetChat }");
    expect(source).toContain("import { toVirtualMachineTargetDescriptor }");
    expect(source).toContain('() => toVirtualMachineTargetDescriptor(vm, chatSessions)');
    expect(source).toContain('target,');
    expect(source).not.toContain('sessionApi');
    expect(source).toContain('<TargetChatView');
    expect(source).toContain('titleKey="virtualMachines.chat.title"');
  });

  it('keeps VM assistant runs read-only', () => {
    expect(source).toContain('canRequestWriteRuns: false');
    expect(source).toContain('canRequestWriteRuns={false}');
    expect(source).toContain('canApproveWriteActions={false}');
    expect(source).not.toContain('useClusterChat');
    expect(source).not.toContain('controlPlaneApi.createSession');
    expect(source).not.toContain('KubernetesCluster');
  });

  it('starts triage prompts in a fresh draft conversation', () => {
    expect(source).toContain('void controller.handleCreateSessionWithInput(prompt);');
    expect(source).toContain('handledInitialInputRef.current = prompt;');
    expect(source).not.toContain('setInputValue(prompt);');
  });
});
