import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { FileInput } from './FileInput';

describe('FileInput', () => {
  it('fixes the native input type to file', () => {
    const markup = renderToStaticMarkup(<FileInput accept=".yaml" multiple />);
    expect(markup).toContain('type="file"');
    expect(markup).toContain('accept=".yaml"');
    expect(markup).toContain('multiple=""');
  });

  it('supports visually hidden trigger compositions', () => {
    const markup = renderToStaticMarkup(<FileInput visuallyHidden aria-label="Attach files" />);
    expect(markup).toContain('class="sr-only"');
    expect(markup).toContain('aria-label="Attach files"');
  });
});
