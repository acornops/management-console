import { describe, expect, it } from 'vitest';
import {
  normalizeFetchPattern,
  validateFetchPatterns
} from '@/pages/agents/fetchToolConfig';

describe('Fetch tool URL configuration', () => {
  it('normalizes the host and default HTTPS port', () => {
    expect(normalizeFetchPattern(' https://API.Example.com:443/v1/*?q=* ')).toBe(
      'https://api.example.com/v1/*?q=*'
    );
  });

  it('allows wildcards in paths and queries', () => {
    expect(validateFetchPatterns([
      'https://api.example.com/v1/services/*',
      'https://api.example.com/search?q=*'
    ])).toEqual({
      errors: {},
      normalizedPatterns: [
        'https://api.example.com/v1/services/*',
        'https://api.example.com/search?q=*'
      ]
    });
  });

  it.each([
    ['http://api.example.com/data', 'Only HTTPS'],
    ['https://user:secret@api.example.com/data', 'credentials'],
    ['https://api.example.com/data#fragment', 'fragments'],
    ['https://127.0.0.1/data', 'DNS hostname'],
    ['https://*.example.com/data', 'path or query']
  ])('rejects %s', (value, message) => {
    expect(() => normalizeFetchPattern(value)).toThrow(message);
  });

  it('reports duplicates after normalization', () => {
    expect(validateFetchPatterns([
      'https://API.example.com:443/data',
      'https://api.example.com/data'
    ]).errors[1]).toContain('duplicates URL 1');
  });
});
