import { describe, expect, it } from 'vitest';
import { findLoadedLogMatches, safeLogFilename } from './loadedLogContent';

describe('loaded log content', () => {
  it('finds literal case-insensitive matches without changing multiline content', () => {
    expect(findLoadedLogMatches('Error [x]\nerror [x]\n' + 'z'.repeat(10000), '[X]')).toEqual([
      { start: 6, end: 9 }, { start: 16, end: 19 }
    ]);
  });
  it('does not match an empty query or missing content', () => {
    expect(findLoadedLogMatches('some output', '')).toEqual([]);
    expect(findLoadedLogMatches('', 'error')).toEqual([]);
  });
  it('makes a bounded plain text filename without paths or control characters', () => {
    expect(safeLogFilename('../../pod\nname/worker')).toBe('pod-name-worker-loaded-logs.txt');
    expect(safeLogFilename('...')).toBe('logs-loaded-logs.txt');
    expect(safeLogFilename('x'.repeat(200)).length).toBeLessThan(110);
  });
});
