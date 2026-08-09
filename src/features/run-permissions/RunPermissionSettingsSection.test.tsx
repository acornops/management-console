import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RunPermissionSettingsSection } from '@/features/run-permissions/RunPermissionSettingsSection';

describe('RunPermissionSettingsSection', () => {
  it('uses the shared settings-row treatment without exposing policy provenance', () => {
    const markup = renderToStaticMarkup(
      <RunPermissionSettingsSection
        title="Run permissions"
        description="Set the maximum change access."
        permissionMode="ask_before_changes"
        onChange={() => undefined}
      />
    );

    expect(markup).toContain('data-run-permission-settings="true"');
    expect(markup).toContain('Run permissions');
    expect(markup).toContain('agentChat.permissionSettings.modeLabel');
    expect(markup).toContain('agentChat.permissionSettings.modes.ask_before_changes.description');
    expect(markup).not.toContain('Source:');
    expect(markup).not.toContain('permissionModeSource');
    expect(markup).not.toContain('Save permissions');
  });

  it('disables the selector while the setting is unavailable', () => {
    const markup = renderToStaticMarkup(
      <RunPermissionSettingsSection
        title="Run permissions"
        description="Set the maximum change access."
        permissionMode="read_only"
        disabled
        disabledReason="Manage Agents permission required."
        onChange={() => undefined}
      />
    );

    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Manage Agents permission required.');
  });

  it('renders a target-specific safety note without presenting it as a disabled reason', () => {
    const markup = renderToStaticMarkup(
      <RunPermissionSettingsSection
        title="Run permissions"
        description="Set the maximum change access."
        permissionMode="auto_allowed_changes"
        note="Service restarts still require approval."
        onChange={() => undefined}
      />
    );

    expect(markup).toContain('Service restarts still require approval.');
    expect(markup).not.toContain('disabled=""');
  });
});
