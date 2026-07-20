import { describe, expect, it } from 'vitest';
import { removeSlashReferenceQuery, resolveSlashReferenceQuery } from './types';

describe('target chat slash references', () => {
  it('recognizes slash queries only at a token boundary', () => {
    expect(resolveSlashReferenceQuery('/post', 5)).toEqual({ start: 0, end: 5, query: 'post' });
    expect(resolveSlashReferenceQuery('check /skill', 12)).toEqual({ start: 6, end: 12, query: 'skill' });
    expect(resolveSlashReferenceQuery('https://acorn.io', 16)).toBeNull();
    expect(resolveSlashReferenceQuery('path/to/file', 12)).toBeNull();
  });

  it('removes only the selected slash query from prompt text', () => {
    const query = resolveSlashReferenceQuery('inspect /postgres', 17);
    expect(query).not.toBeNull();
    expect(removeSlashReferenceQuery('inspect /postgres', query!)).toBe('inspect ');
  });
});
