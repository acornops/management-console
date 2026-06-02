import { describe, expect, it } from 'vitest';

import {
  applyNamespaceTokenSelection,
  buildNamespaceSuggestions,
  filterNamespaceSuggestions,
  normalizeNamespaceTokens,
  splitNamespaceTokenInput
} from './namespaceScopeTokens';

describe('namespace scope token helpers', () => {
  it('normalizes and de-duplicates namespace tokens case-insensitively', () => {
    expect(normalizeNamespaceTokens([' default ', '', 'kube-system', 'DEFAULT', 'payments '])).toEqual([
      'default',
      'kube-system',
      'payments'
    ]);
  });

  it('splits comma and pasted newline namespace input into tokens', () => {
    expect(splitNamespaceTokenInput('default, kube-system\npayments,,observability')).toEqual([
      'default',
      'kube-system',
      'payments',
      'observability'
    ]);
  });

  it('builds sorted suggestions from snapshot and selected namespaces', () => {
    expect(buildNamespaceSuggestions({
      namespaces: [
        { name: 'payments' },
        { name: 'default' },
        { name: 'DEFAULT' }
      ],
      include: ['staging'],
      exclude: ['kube-system']
    })).toEqual(['default', 'kube-system', 'payments', 'staging']);
  });

  it('filters suggestions by query and omits already selected namespaces', () => {
    expect(filterNamespaceSuggestions({
      query: 'pay',
      selected: ['payments-canary'],
      suggestions: ['default', 'payments', 'payments-canary', 'platform']
    })).toEqual(['payments']);
  });

  it('moves selected namespaces out of the opposite scope', () => {
    expect(applyNamespaceTokenSelection({
      include: ['default', 'payments'],
      exclude: ['observability', 'staging'],
      target: 'exclude',
      tokens: ['payments', 'kube-system']
    })).toEqual({
      include: ['default'],
      exclude: ['observability', 'staging', 'payments', 'kube-system']
    });
  });
});
