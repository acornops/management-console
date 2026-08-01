import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/app/AppDesktopAccountMenu.tsx'), 'utf8');

describe('AppDesktopAccountMenu selected-state contrast', () => {
  it('uses readable selected-state tokens without an activation fill', () => {
    expect(source).toContain("isActive ? 'bg-accent-soft text-accent-readable'");
    expect(source).toContain("isActive ? 'text-ui-text' : 'text-ui-text-muted'");
    expect(source).not.toContain("isActive ? 'bg-accent text-control-activation-fg'");
  });
});
