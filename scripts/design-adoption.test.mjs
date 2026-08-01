import { describe, expect, it } from 'vitest';
import {
  ADOPTION_RULES,
  analyzeSource,
  applyExceptions,
  validateExceptionMetadata
} from './design-adoption.mjs';

const publicUiExports = new Set(['Button', 'DataTable', 'Dialog', 'EmptyState', 'RightSidePanel']);

function analyze(source, repoPath = 'src/sample.tsx') {
  return analyzeSource({ source, repoPath, publicUiExports });
}

describe('design-system adoption mutations', () => {
  it.each([
    ['native-control-bypass', 'export const Sample = () => <button type="button">Save</button>;'],
    ['low-level-overlay', "import { Dialog } from '@acornops/ui'; export const Sample = () => <Dialog titleId=\"title\" onClose={() => undefined} />;"],
    ['low-level-overlay', 'export const Sample = () => <div role="dialog">Details</div>;'],
    ['native-visible-table', 'export const Sample = () => <table><tbody><tr><td>Value</td></tr></tbody></table>;'],
    ['raw-typography', 'export const Sample = () => <p className="text-sm font-semibold">Value</p>;'],
    ['ui-export-shadow', 'export const EmptyState = () => <p className="type-body">Empty</p>;'],
    ['feature-owned-menu', 'export const Sample = () => <div role="menu">Actions</div>;'],
    ['feature-owned-menu', "import { useFloatingActionMenu } from '@acornops/ui'; export const Sample = () => null;"],
    ['feature-owned-listbox', 'export const Sample = () => <div role="listbox"><div role="option">One</div></div>;'],
    ['shared-tab-copy', 'export const Sample = () => <div role="tablist"><button role="tab">One</button></div>;'],
    ['semantic-callout-bypass', 'export const Sample = () => <div role="alert" className="rounded border border-status-danger/25 bg-status-danger-soft">Failed</div>;']
  ])('rejects the %s forbidden sample', (rule, source) => {
    expect(analyze(source).some((violation) => violation.rule === rule)).toBe(true);
  });

  it('accepts shared controls and semantic typography', () => {
    const violations = analyze(
      "import { Button } from '@acornops/ui'; export const Sample = () => <Button className=\"type-ui\">Save</Button>;"
    );
    expect(violations).toEqual([]);
  });

  it('requires exact reviewed exception metadata and rejects temporary final exceptions', () => {
    const violations = analyze('export const Sample = () => <table><tbody /></table>;');
    const target = violations.find((violation) => violation.rule === 'native-visible-table');
    const document = {
      schemaVersion: 1,
      exceptions: [{
        id: 'sample-table',
        rule: target.rule,
        path: target.path,
        scope: target.scope,
        classification: 'temporary',
        rationale: 'A deliberately long rationale used to exercise exact metadata validation.',
        owner: 'design-system',
        reviewedOn: '2026-07-29',
        expiresOn: '2026-07-30'
      }]
    };

    expect(applyExceptions(violations, document).excepted).toHaveLength(1);
    expect(validateExceptionMetadata(document, violations, { final: true })).toContain(
      'sample-table: temporary exceptions are prohibited in final validation'
    );
  });

  it('keeps the public rule inventory stable', () => {
    expect(ADOPTION_RULES).toEqual([
      'native-control-bypass',
      'low-level-overlay',
      'native-visible-table',
      'raw-typography',
      'ui-export-shadow',
      'feature-owned-menu',
      'feature-owned-listbox',
      'shared-tab-copy',
      'semantic-callout-bypass'
    ]);
  });
});
