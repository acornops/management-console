import { describe, expect, it } from 'vitest';

import { checkboxClassName } from './Checkbox';

describe('Checkbox', () => {
  it('uses the shared focus, accent, border, and disabled control vocabulary', () => {
    const className = checkboxClassName({ className: 'mt-1' });

    expect(className).toContain('h-4 w-4');
    expect(className).toContain('rounded');
    expect(className).toContain('border-ui-border');
    expect(className).toContain('text-accent');
    expect(className).toContain('focus-visible:ring-2');
    expect(className).toContain('focus-visible:ring-accent/25');
    expect(className).toContain('disabled:cursor-not-allowed');
    expect(className).toContain('disabled:opacity-50');
    expect(className).toContain('mt-1');
  });
});
