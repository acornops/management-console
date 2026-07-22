import { describe, expect, it } from 'vitest';
import vectorsJson from '../../../../docs/contracts/mcp-public-header-vectors.json?raw';

import { validatePublicHeaderRows } from './mcpServersCatalog';

const vectors = JSON.parse(vectorsJson) as {
  cases: Array<{ name: string; headers: Array<[string, string]>; valid: boolean }>;
};

describe('MCP public-header conformance', () => {
  for (const vector of vectors.cases) {
    it(vector.name, () => {
      const rows = vector.headers.map(([name, value], index) => ({
        id: `${vector.name}-${index}`,
        name,
        value,
      }));
      expect(validatePublicHeaderRows(rows) === null).toBe(vector.valid);
    });
  }
});
