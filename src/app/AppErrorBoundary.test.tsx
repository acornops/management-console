import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { initializeI18n } from '@/i18n';
import { AppErrorBoundary, AppRecoveryScreen } from './AppErrorBoundary';

beforeAll(initializeI18n);

describe('application error boundary', () => {
  it('switches to a safe recovery state', () => {
    expect(AppErrorBoundary.getDerivedStateFromError()).toEqual({ failed: true });
    const markup = renderToStaticMarkup(<AppRecoveryScreen />);
    expect(markup).toContain('Reload');
    expect(markup).toContain('Return to console');
    expect(markup).not.toContain('stack');
    expect(markup).not.toContain('query');
  });
});
