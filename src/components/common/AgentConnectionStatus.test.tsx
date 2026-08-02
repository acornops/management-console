import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AgentConnectionStatus } from '@/components/common/AgentConnectionStatus';

function render(isConnected: boolean): string {
  return renderToStaticMarkup(
    <AgentConnectionStatus
      isConnected={isConnected}
      waitingLabel="Waiting for agent connection..."
      connectedLabel="Agent connected"
    />
  );
}

describe('AgentConnectionStatus', () => {
  it('renders a neutral live status while waiting', () => {
    const markup = render(false);

    expect(markup).toContain('Waiting for agent connection...');
    expect(markup).not.toContain('Agent connected');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('border-ui-border');
  });

  it('renders the success state after the target connects', () => {
    const markup = render(true);

    expect(markup).toContain('Agent connected');
    expect(markup).not.toContain('Waiting for agent connection...');
    expect(markup).toContain('border-status-success/25');
  });
});
