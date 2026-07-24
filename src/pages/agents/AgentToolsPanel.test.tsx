import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FetchToolActions } from '@/pages/agents/AgentToolsPanel';

describe('FetchToolActions', () => {
  it('shows Grant followed by a labelled configuration icon before the tool is granted', () => {
    const html = renderToStaticMarkup(
      <FetchToolActions
        assigned={false}
        busy={false}
        canManageAgents
        saving={false}
        onConfigure={vi.fn()}
        onRevoke={vi.fn()}
      />
    );

    expect(html).toMatch(/>Grant<\/button>.*aria-label="Configure Fetch"/);
    expect(html).not.toContain('>Revoke</button>');
    expect(html).not.toContain('>Configure</button>');
  });

  it('replaces Grant with Revoke while retaining the configuration icon after grant', () => {
    const html = renderToStaticMarkup(
      <FetchToolActions
        assigned
        busy={false}
        canManageAgents
        saving={false}
        onConfigure={vi.fn()}
        onRevoke={vi.fn()}
      />
    );

    expect(html).toMatch(/>Revoke<\/button>.*aria-label="Configure Fetch"/);
    expect(html).not.toContain('>Grant</button>');
  });
});
