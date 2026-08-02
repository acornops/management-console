import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DestructiveConfirmationDialog } from './DestructiveConfirmationDialog';

describe('DestructiveConfirmationDialog', () => {
  it('owns destructive warning, error, and disabled confirmation anatomy', () => {
    const markup = renderToStaticMarkup(
      <DestructiveConfirmationDialog
        open
        titleId="delete-resource-title"
        title="Delete resource?"
        subtitle="This action cannot be undone."
        description="The resource will be permanently removed."
        error="Deletion failed."
        cancelLabel="Keep resource"
        closeLabel="Close delete confirmation"
        confirmLabel="Delete resource"
        confirmDisabled
        overlayClassName="z-[120]"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('Close delete confirmation');
    expect(markup).toContain('The resource will be permanently removed.');
    expect(markup).toContain('Deletion failed.');
    expect(markup).toContain('z-[120]');
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Delete resource<\/button>/);
  });
});
