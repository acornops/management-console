import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, 'WorkflowTemplateSetupDrawer.tsx'), 'utf8');

describe('workflow template setup drawer', () => {
  it('uses focus-managed shared primitives and resilient loading', () => {
    expect(source).toContain('<DrawerFrame');
    expect(source).not.toContain('initialFocusRef={firstTemplateRef}');
    expect(source).toContain('role="status" aria-live="polite"');
    expect(source).toContain('role="alert"');
    expect(source).toContain("t('workflowTemplates.retry')");
  });

  it('separates loading, failure, empty, permission, and ready states', () => {
    expect(source).toContain('loading ?');
    expect(source).toContain('loadError ?');
    expect(source).toContain('templates.length === 0');
    expect(source).toContain("t('workflowTemplates.installPermission')");
    expect(source).not.toContain('<section aria-live="polite"');
  });

  it('attributes templates to AcornOps in the template catalog', () => {
    expect(source.match(/t\('workflowTemplates\.byAcornOps'\)/g)).toHaveLength(2);
  });

  it('keeps templates limited to generic install and activation operations', () => {
    expect(source).toContain('activateAutomationTemplate');
    expect(source).toContain('installAutomationTemplate');
    expect(source).not.toContain('source-control');
    expect(source).not.toContain('repository-review');
  });
});
