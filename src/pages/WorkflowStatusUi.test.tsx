import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { initializeI18n } from '@/i18n';
import { WorkflowModeLabel } from './WorkflowStatusUi';

beforeAll(initializeI18n);

describe('WorkflowModeLabel', () => {
  it('presents read-write policy with stronger neutral pill emphasis', () => {
    const html = renderToStaticMarkup(<WorkflowModeLabel mode="read_write" />);

    expect(html).toContain('Read/write policy');
    expect(html).toContain('rounded-full');
    expect(html).toContain('bg-ui-surface-strong');
    expect(html).toContain('text-ui-text');
    expect(html).toContain('type-caption');
    expect(html).toContain('normal-case');
    expect(html).not.toContain('bg-status-warning-soft');
  });

  it('presents read-only policy as a quiet neutral pill', () => {
    const html = renderToStaticMarkup(<WorkflowModeLabel mode="read_only" />);

    expect(html).toContain('Read-only policy');
    expect(html).toContain('rounded-full');
    expect(html).toContain('bg-ui-bg');
    expect(html).toContain('text-ui-text-muted');
    expect(html).toContain('type-caption');
    expect(html).toContain('normal-case');
    expect(html).not.toContain('bg-status-success-soft');
  });
});
