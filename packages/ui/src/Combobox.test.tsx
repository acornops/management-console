import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ComboboxGroup, ComboboxListbox, ComboboxOption } from './Combobox';

describe('Combobox presentation', () => {
  it('owns listbox, group, option, active, and disabled semantics for rich results', () => {
    const markup = renderToStaticMarkup(
      <ComboboxListbox label="References">
        <ComboboxGroup label="Tools">
          <ComboboxOption active>
            <span>Fetch</span><span>Read tool</span>
          </ComboboxOption>
          <ComboboxOption disabled>Unavailable</ComboboxOption>
        </ComboboxGroup>
      </ComboboxListbox>
    );

    expect(markup).toContain('role="listbox"');
    expect(markup).toContain('role="group"');
    expect(markup).toContain('role="option"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('disabled=""');
  });

  it('allows features to render loading and empty states without changing roles', () => {
    const loading = renderToStaticMarkup(<ComboboxListbox label="Members"><p role="status">Loading</p></ComboboxListbox>);
    const empty = renderToStaticMarkup(<ComboboxListbox label="Members"><p>No matches</p></ComboboxListbox>);
    expect(loading).toContain('role="status"');
    expect(empty).toContain('role="listbox"');
    expect(empty).toContain('No matches');
  });
});
