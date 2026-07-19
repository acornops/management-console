import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppErrorBoundary, AppRecoveryScreen } from './AppErrorBoundary';

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
