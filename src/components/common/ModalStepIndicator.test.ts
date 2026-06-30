import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const modalStepIndicator = readFileSync(resolve(root, 'src/components/common/ModalStepIndicator.tsx'), 'utf8');

describe('ModalStepIndicator', () => {
  it('keeps non-active steps optionally clickable for wizard navigation', () => {
    expect(modalStepIndicator).toContain('onStepSelect?: (stepId: string) => void;');
    expect(modalStepIndicator).toContain('const selectable = Boolean(!active && onStepSelect);');
    expect(modalStepIndicator).toContain('<button');
    expect(modalStepIndicator).toContain('onClick={() => onStepSelect?.(step.id)}');
    expect(modalStepIndicator).toContain('aria-label={`Go to ${step.label}`}');
    expect(modalStepIndicator).toContain("complete ? 'text-accent-strong' : 'text-ui-text-muted hover:text-accent-strong'");
    expect(modalStepIndicator).toContain('min-h-11');
    expect(modalStepIndicator).toContain('focus-visible:ring-accent/25');
  });

  it('keeps active step marker color on shared semantic tokens', () => {
    expect(modalStepIndicator).toContain("active ? 'bg-accent text-ui-bg'");
    expect(modalStepIndicator).not.toContain('text-[oklch(');
  });
});
