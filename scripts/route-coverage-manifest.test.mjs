import { describe, expect, it } from 'vitest';
import {
  requiredRouteCoverageCategories,
  routeCoverageManifest
} from './route-coverage-manifest.mjs';

describe('route coverage manifest', () => {
  it('uses unique route names and paths with stable ready selectors', () => {
    const names = routeCoverageManifest.map((route) => route.name);
    const paths = routeCoverageManifest.map((route) => route.path);

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(paths).size).toBe(paths.length);
    expect(routeCoverageManifest).not.toHaveLength(0);
    for (const route of routeCoverageManifest) {
      expect(route.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(route.path).toMatch(/^\//);
      expect(route.ready).toBeTruthy();
    }
  });

  it('covers every required product-layout category', () => {
    const coveredCategories = new Set(routeCoverageManifest.map((route) => route.category));

    expect([...requiredRouteCoverageCategories].sort()).toEqual(
      [...coveredCategories].sort()
    );
  });

  it('preserves scroll only for intentional deep-link baselines', () => {
    expect(routeCoverageManifest.filter((route) => route.preserveScroll).map((route) => route.name))
      .toEqual(['workspace-mcp-registries']);
  });
});
