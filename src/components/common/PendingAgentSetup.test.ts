import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const pendingAgentSetup = readFileSync(resolve(root, 'src/components/common/PendingAgentSetup.tsx'), 'utf8');
const styles = readFileSync(resolve(root, 'src/styles.css'), 'utf8');

describe('PendingAgentSetup polish', () => {
  it('uses a reduced-motion-safe pending step pulse only on the action step', () => {
    expect(pendingAgentSetup).toContain('pending-agent-step-pulse');
    expect(pendingAgentSetup).toContain('<Clock className="h-3.5 w-3.5" />');
    expect(pendingAgentSetup).not.toContain('pending-agent-line-pulse');
    expect(styles).toContain('.pending-agent-step-pulse {');
    expect(styles).toContain('animation: pending-agent-step-pulse 3.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;');
    expect(styles).toContain('@keyframes pending-agent-step-pulse');
    expect(styles).toContain('box-shadow: 0 0 0 4px rgb(var(--status-warning-rgb) / 0.08);');
    expect(styles).toContain('.pending-agent-step-pulse {\n    animation: none !important;\n    box-shadow: none;');
  });
});
