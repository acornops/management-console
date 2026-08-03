import { describe, expect, it } from 'vitest';

import { suggestCatalogSourceName } from '@/pages/WorkspaceCatalogSources.helpers';

describe('workspace catalog source helpers', () => {
  it('suggests a display name from the registry host', () => {
    expect(suggestCatalogSourceName('https://registry.example.com/catalog')).toBe('registry.example.com');
    expect(suggestCatalogSourceName('invalid')).toBe('');
  });
});
