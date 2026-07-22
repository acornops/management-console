import { describe, expect, it } from 'vitest';
import { resolveAppDataMode } from './appDataMode';

describe('resolveAppDataMode', () => {
  it('defaults standalone development to mock mode', () => {
    expect(resolveAppDataMode(undefined, { production: false })).toBe('mock');
  });

  it('defaults production builds to control-plane mode', () => {
    expect(resolveAppDataMode(undefined, { production: true })).toBe('control-plane');
  });

  it('accepts both supported development modes', () => {
    expect(resolveAppDataMode('mock', { production: false })).toBe('mock');
    expect(resolveAppDataMode('control-plane', { production: false })).toBe('control-plane');
  });

  it('rejects invalid values with a useful startup error', () => {
    expect(() => resolveAppDataMode('fixtures', { production: false })).toThrow(
      'Expected "mock" or "control-plane"'
    );
  });

  it('rejects mock mode in production', () => {
    expect(() => resolveAppDataMode('mock', { production: true })).toThrow(
      'Production builds must use VITE_APP_DATA_MODE=control-plane'
    );
  });
});
