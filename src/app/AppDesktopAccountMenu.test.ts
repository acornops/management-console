import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/app/AppDesktopAccountMenu.tsx'), 'utf8');

describe('AppDesktopAccountMenu selected-state contrast', () => {
  it('uses the same quiet selected-state surface as peer sidebar destinations', () => {
    expect(source).toContain("isActive ? 'border-transparent bg-ui-bg text-ui-text'");
    expect(source).toContain("isActive ? 'bg-ui-surface text-accent-readable'");
    expect(source).toContain("isActive ? 'bg-ui-bg text-ui-text'");
    expect(source).not.toContain("isActive ? 'bg-accent text-control-activation-fg'");
    expect(source).not.toContain("isActive ? 'bg-accent-soft text-accent-strong'");
    expect(source).not.toContain("isActive ? 'border-accent/30 bg-accent-soft shadow-sm'");
  });
});
