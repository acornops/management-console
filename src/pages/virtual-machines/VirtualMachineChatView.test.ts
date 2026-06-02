import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');

describe('VirtualMachineChatView wiring', () => {
  const source = readFileSync(resolve(root, 'src/pages/virtual-machines/VirtualMachineChatView.tsx'), 'utf8');

  it('uses the shared target chat shell with VM target sessions', () => {
    expect(source).toContain("import { TargetChatView }");
    expect(source).toContain("import { useTargetChat }");
    expect(source).toContain('createSession: controlPlaneApi.createTargetSession');
    expect(source).toContain('listSessions: controlPlaneApi.listTargetSessions');
    expect(source).toContain('target,');
    expect(source).toContain('<TargetChatView');
  });

  it('keeps VM assistant runs read-only', () => {
    expect(source).toContain('canRequestWriteRuns: false');
    expect(source).toContain('canApproveWriteActions={false}');
    expect(source).not.toContain('useClusterChat');
    expect(source).not.toContain('controlPlaneApi.createSession');
  });
});
