import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CollectionState,
  type CollectionPhase
} from '@acornops/ui';

function render(phase: CollectionPhase, itemCount: number, filtered = false): string {
  return renderToStaticMarkup(
    <CollectionState
      phase={phase}
      itemCount={itemCount}
      filtered={filtered}
      loading={<span>INITIAL_LOADING</span>}
      empty={<span>TRUE_EMPTY</span>}
      filteredEmpty={<span>FILTERED_EMPTY</span>}
      error={<span>INITIAL_ERROR</span>}
      feedback={<span>RETAINED_FEEDBACK</span>}
      announcement="Collection updated"
    >
      <span>CONTENT</span>
    </CollectionState>
  );
}

describe('CollectionState precedence', () => {
  it.each<[CollectionPhase, number, boolean, string, string[]]>([
    ['loading', 0, false, 'INITIAL_LOADING', ['TRUE_EMPTY', 'CONTENT']],
    ['ready', 0, false, 'TRUE_EMPTY', ['INITIAL_LOADING', 'CONTENT']],
    ['ready', 0, true, 'FILTERED_EMPTY', ['TRUE_EMPTY', 'CONTENT']],
    ['error', 0, false, 'INITIAL_ERROR', ['TRUE_EMPTY', 'CONTENT']],
    ['ready', 2, false, 'CONTENT', ['INITIAL_LOADING', 'TRUE_EMPTY']],
    ['refreshing', 2, false, 'CONTENT', ['INITIAL_LOADING', 'TRUE_EMPTY']],
    ['loadingMore', 2, false, 'CONTENT', ['INITIAL_LOADING', 'TRUE_EMPTY']],
    ['error', 2, false, 'CONTENT', ['INITIAL_ERROR', 'TRUE_EMPTY']]
  ])('renders %s with %i items', (phase, itemCount, filtered, expected, excluded) => {
    const markup = render(phase, itemCount, filtered);
    expect(markup).toContain(expected);
    excluded.forEach((value) => expect(markup).not.toContain(value));
    if (itemCount > 0 && ['refreshing', 'loadingMore', 'error'].includes(phase)) expect(markup).toContain('RETAINED_FEEDBACK');
  });

  it('marks loading boundaries busy and exposes a polite atomic announcement', () => {
    const markup = render('refreshing', 1);
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-atomic="true"');
  });
});
