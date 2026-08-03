import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/app/AppDesktopAccountMenu.tsx'), 'utf8');

describe('AppDesktopAccountMenu identity trigger', () => {
  it('keeps the email visible and uses a defined token-based identity treatment', () => {
    expect(source).toContain('{user.email}');
    expect(source).toContain('border border-ui-border font-mono type-micro-label');
    expect(source).toContain('min-h-12 justify-between gap-2.5 px-2.5 py-2');
    expect(source).toContain('group-hover:text-ui-text motion-reduce:duration-0');
  });

  it('keeps identity in the trigger and leaves the open panel action-only', () => {
    expect(source.match(/\{user\.name\}/g)).toHaveLength(1);
    expect(source.match(/\{user\.email\}/g)).toHaveLength(1);
    expect(source).not.toContain('<span className="type-micro-label">{t(\'app.account\')}</span>');
    expect(source).toContain('<div className="border-t border-ui-border p-1.5">');
    expect(source).toContain('bg-ui-surface shadow-sm');
    expect(source).not.toContain('bg-ui-surface shadow-xl');
  });

  it('uses the same quiet surface for the active route and open menu states', () => {
    expect(source).toContain("(isActive || isOpen) ? 'border-transparent bg-ui-bg text-ui-text hover:bg-ui-bg hover:text-ui-text'");
    expect(source).toContain("isActive ? 'bg-ui-surface text-accent-readable'");
    expect(source).toContain("isActive ? 'bg-ui-bg text-ui-text'");
    expect(source).not.toContain("isActive ? 'bg-accent text-control-activation-fg'");
    expect(source).not.toContain("isActive ? 'bg-accent-soft text-accent-strong'");
    expect(source).not.toContain("isActive ? 'border-accent/30 bg-accent-soft shadow-sm'");
  });
});
