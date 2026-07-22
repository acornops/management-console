import { describe, expect, it } from 'vitest';
import { assistantTurn, styles, thinkingAcorn } from '@/stylesTestSupport';

describe('thinking acorn polish contract', () => {
  it('renders a legible UI-scale acorn as a compact working indicator', () => {
    expect(styles).toContain('.thinking-acorn {');
    expect(styles).toContain('width: 0.875rem;');
    expect(styles).toContain('height: 0.875rem;');
    expect(styles).toContain('color: color-mix(in oklab, var(--brand-orange-strong), var(--text-muted) 68%);');
    expect(styles).toContain('.thinking-acorn__spinner > svg');
    expect(styles).toContain(".thinking-acorn:not([data-reduced-motion='true']) .thinking-acorn__spinner");
    expect(styles).toContain('animation: thinking-acorn-spin 1.35s linear infinite;');
    expect(styles).toContain('@keyframes thinking-acorn-spin');
    expect(styles).not.toContain('@keyframes thinking-acorn-shadow');
    expect(styles).not.toContain('.thinking-acorn::after');
    expect(styles).not.toContain('@keyframes thinking-squirrel-walk');
    expect(styles).not.toContain('@keyframes thinking-acorn-roll');
    expect(styles).not.toContain('.thinking-squirrel');
    expect(thinkingAcorn).not.toContain("from 'lucide-react'");
    expect(thinkingAcorn).toContain('const ThinkingAcornComponent: React.FC<ThinkingAcornProps>');
    expect(thinkingAcorn).toContain('export const ThinkingAcorn = React.memo(ThinkingAcornComponent);');
    expect(thinkingAcorn).toContain('className="thinking-acorn"');
    expect(thinkingAcorn).toContain('className="thinking-acorn__spinner"');
    expect(thinkingAcorn).toContain('className="thinking-acorn__body"');
    expect(thinkingAcorn).toContain('className="thinking-acorn__cap"');
    expect(thinkingAcorn).toContain('viewBox="3.75 1.5 12.5 14.5"');
    expect(thinkingAcorn).toContain("data-reduced-motion={reducedMotion ? 'true' : undefined}");
    expect(thinkingAcorn).toContain('aria-hidden="true"');
    expect(assistantTurn).toContain("import { ThinkingAcorn }");
    expect(assistantTurn).toContain('<ThinkingAcorn reducedMotion={shouldReduceMotion === true} />');
  });
});
