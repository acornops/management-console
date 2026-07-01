import { describe, expect, it } from 'vitest';
import { assistantTurn, styles, thinkingAcorn } from '@/stylesTestSupport';

describe('thinking acorn polish contract', () => {
  it('renders the supplied rolling acorn as a compact decorative thinking indicator', () => {
    expect(styles).toContain('.thinking-acorn {');
    expect(styles).toContain('width: 1.4rem;');
    expect(styles).toContain('height: 1rem;');
    expect(styles).toContain('opacity: 0.5;');
    expect(styles).toContain('.thinking-acorn > svg');
    expect(styles).not.toContain('@keyframes thinking-squirrel-walk');
    expect(styles).not.toContain('@keyframes thinking-acorn-roll');
    expect(styles).not.toContain('.thinking-squirrel');
    expect(thinkingAcorn).toContain("import rollingAcornSvgSource from '@/assets/assistant/rolling-acorn.svg?raw';");
    expect(thinkingAcorn).toContain('const animatedAcornSvgMarkup = rollingAcornSvgSource');
    expect(thinkingAcorn).toContain('.replace(/\\srole="img"/,');
    expect(thinkingAcorn).toContain('<title\\b[^>]*>[\\s\\S]*?<\\/title>');
    expect(thinkingAcorn).toContain('<desc\\b[^>]*>[\\s\\S]*?<\\/desc>');
    expect(thinkingAcorn).toContain(".replace(/\\sid=([\"'])[^\"']*\\1/g, '')");
    expect(thinkingAcorn).toContain('const getMutedAcornFillOpacity = (hexColor: string): string => {');
    expect(thinkingAcorn).toContain('fill="currentColor" fill-opacity="${getMutedAcornFillOpacity(fillColor)}"');
    expect(thinkingAcorn).toContain('focusable="false"');
    expect(thinkingAcorn).toContain('const staticAcornSvgMarkup = animatedAcornSvgMarkup.replace');
    expect(thinkingAcorn).toContain('/\\s*<animate(?:Transform)?\\b[^>]*\\/>/g');
    expect(thinkingAcorn).toContain('const ThinkingAcornComponent: React.FC<ThinkingAcornProps>');
    expect(thinkingAcorn).toContain('export const ThinkingAcorn = React.memo(ThinkingAcornComponent);');
    expect(thinkingAcorn).toContain('className="thinking-acorn"');
    expect(thinkingAcorn).toContain('reducedMotion ? staticAcornSvgMarkup : animatedAcornSvgMarkup');
    expect(thinkingAcorn).toContain('aria-hidden="true"');
    expect(assistantTurn).toContain("import { ThinkingAcorn }");
    expect(assistantTurn).toContain('<ThinkingAcorn reducedMotion={shouldReduceMotion === true} />');
  });
});
