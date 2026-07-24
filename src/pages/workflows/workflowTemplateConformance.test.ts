import { describe, expect, it } from 'vitest';
import fixture from './workflow-template-conformance.json';
import { parseWorkflowTemplate } from '@/pages/WorkspaceWorkflowsPage.launchFields';

describe('workflow template conformance', () => {
  for (const vector of fixture.valid) {
    it(vector.name, () => {
      const parsed = parseWorkflowTemplate(vector.prompt);
      expect(parsed.errors).toEqual([]);
      expect(parsed.parameters).toEqual(vector.parameters);
    });
  }

  for (const vector of fixture.invalid) {
    it(`rejects ${vector.name}`, () => {
      expect(parseWorkflowTemplate(vector.prompt).errors.length).toBeGreaterThan(0);
    });
  }
});
