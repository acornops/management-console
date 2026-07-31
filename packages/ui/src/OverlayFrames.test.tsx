import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DialogFrame, DrawerFrame } from './OverlayFrames';

describe('overlay frame descriptions', () => {
  it('applies a real bounded max width for each semantic dialog size', () => {
    const markup = renderToStaticMarkup(
      <DialogFrame
        title="Create schedule"
        onClose={() => undefined}
        width="md"
      >
        Form
      </DialogFrame>
    );

    expect(markup).toContain('max-width:min(calc(100vw - 2rem), 36rem)');
    expect(markup).toContain('width:calc(100vw - 2rem)');
  });

  it('associates generated descriptions with dialogs', () => {
    const markup = renderToStaticMarkup(
      <DialogFrame
        titleId="dialog-title"
        title="Dialog title"
        description="Dialog description"
        onClose={() => undefined}
      >
        Content
      </DialogFrame>
    );

    expect(markup).toContain('aria-describedby="dialog-title-description"');
    expect(markup).toContain('id="dialog-title-description"');
  });

  it('associates explicit descriptions with drawers', () => {
    const markup = renderToStaticMarkup(
      <DrawerFrame
        open
        titleId="drawer-title"
        descriptionId="drawer-help"
        title="Drawer title"
        description="Drawer description"
        onClose={() => undefined}
      >
        Content
      </DrawerFrame>
    );

    expect(markup).toContain('aria-describedby="drawer-help"');
    expect(markup).toContain('id="drawer-help"');
  });
});
