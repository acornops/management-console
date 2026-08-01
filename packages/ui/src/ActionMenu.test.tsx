import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ActionMenu, findMenuTypeaheadIndex, getMenuFocusIndex, MenuLink, MenuSurface } from './ActionMenu';
import { MenuItem } from './FormControls';
import { getFloatingMenuPosition } from './useFloatingActionMenu';

describe('ActionMenu', () => {
  it('wraps keyboard navigation and supports first, last, and typeahead focus', () => {
    expect(getMenuFocusIndex(-1, 3, 'ArrowDown')).toBe(0);
    expect(getMenuFocusIndex(0, 3, 'ArrowUp')).toBe(2);
    expect(getMenuFocusIndex(1, 3, 'Home')).toBe(0);
    expect(getMenuFocusIndex(1, 3, 'End')).toBe(2);
    expect(findMenuTypeaheadIndex(['Edit', 'Retry', 'Remove'], 0, 're')).toBe(1);
    expect(findMenuTypeaheadIndex(['Edit', 'Retry', 'Remove'], 1, 're')).toBe(2);
  });

  it('clamps to the viewport and flips above a constrained trigger', () => {
    expect(getFloatingMenuPosition({
      boundary: { top: 0, left: 0, width: 320, height: 240 },
      trigger: { top: 210, bottom: 230, right: 318 },
      menuWidth: 208,
      menuHeight: 120
    })).toEqual({ left: 104, placement: 'top', top: 82 });
  });

  it('exposes controlled trigger state and shared menu semantics', () => {
    const trigger = renderToStaticMarkup(
      <ActionMenu label="Actions" open={false} onOpenChange={() => undefined}>
        <MenuItem>Edit</MenuItem>
      </ActionMenu>
    );
    expect(trigger).toContain('aria-haspopup="menu"');
    expect(trigger).toContain('aria-expanded="false"');

    const surface = renderToStaticMarkup(
      <MenuSurface label="Actions">
        <MenuItem disabled>Disabled</MenuItem>
        <MenuLink href="/details">Details</MenuLink>
      </MenuSurface>
    );
    expect(surface).toContain('role="menu"');
    expect(surface).toContain('role="menuitem"');
  });
});
