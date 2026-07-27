import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ModalStepIndicator } from '@/components/common/ModalStepIndicator';

describe('ModalStepIndicator', () => {
  it('keeps only the active label visible on compact mobile layouts', () => {
    const markup = renderToStaticMarkup(
      <ModalStepIndicator
        steps={[
          { id: 'workspace', label: 'Workspace' },
          { id: 'members', label: 'Invite Members' },
          { id: 'ai', label: 'AI Provider' }
        ]}
        currentStepId="ai"
        compactOnMobile
      />
    );

    expect(markup).toContain('<span class="sr-only sm:not-sr-only">Workspace</span>');
    expect(markup).toContain('<span class="sr-only sm:not-sr-only">Invite Members</span>');
    expect(markup).toContain('<span>AI Provider</span>');
    expect(markup).toContain('w-4 sm:w-16');
  });

  it('keeps every label visible by default', () => {
    const markup = renderToStaticMarkup(
      <ModalStepIndicator
        steps={[
          { id: 'workspace', label: 'Workspace' },
          { id: 'members', label: 'Invite Members' }
        ]}
        currentStepId="workspace"
      />
    );

    expect(markup).not.toContain('sr-only');
    expect(markup).toContain('w-16');
  });
});
