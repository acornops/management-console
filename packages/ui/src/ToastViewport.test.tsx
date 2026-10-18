import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastViewport } from './ToastViewport';

vi.mock('react-dom', async (original) => ({ ...await original<typeof import('react-dom')>(), createPortal: (children: React.ReactNode) => children }));
afterEach(() => vi.unstubAllGlobals());

describe('toast severity', () => {
  it('retains the viewport hook used by consumer safe-area positioning', () => {
    vi.stubGlobal('document', { body: {} });
    const markup = renderToStaticMarkup(<ToastViewport toasts={[]} onDismiss={() => undefined} />);
    const viewportClasses = markup.match(/^<div class="([^"]+)"/)?.[1].split(' ');
    expect(viewportClasses).toContain('toast-viewport');
    expect(viewportClasses).toContain('bottom-6');
  });

  it.each([
    ['error', 'circle-alert', 'status-danger', 'alert', 'assertive'],
    ['success', 'circle-check', 'status-success', 'status', 'polite'],
    ['warning', 'triangle-alert', 'status-warning', 'status', 'polite'],
    ['info', 'info', 'text-ui-text-muted', 'status', 'polite'],
    [undefined, 'info', 'text-ui-text-muted', 'status', 'polite']
  ] as const)('renders %s with a truthful icon and announcement', (tone, icon, token, role, live) => {
    vi.stubGlobal('document', { body: {} });
    const markup = renderToStaticMarkup(<ToastViewport toasts={[{ id: 'toast-1', message: 'Safe feedback', tone }]} onDismiss={() => undefined} />);
    expect(markup).toContain(`lucide-${icon}`);
    expect(markup).toContain(token);
    expect(markup).toContain(`role="${role}"`);
    expect(markup).toContain(`aria-live="${live}"`);
    if (tone !== 'success') expect(markup).not.toContain('status-success');
  });
});
