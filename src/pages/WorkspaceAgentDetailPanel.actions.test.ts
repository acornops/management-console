import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, 'WorkspaceAgentDetailPanel.tsx'), 'utf8');

describe('WorkspaceAgentDetailPanel action order', () => {
  it('keeps Refresh to the left of Run agent in Activity', () => {
    const activity = source.slice(source.indexOf("props.activeTab === 'activity'"), source.indexOf("props.activeTab === 'versions'"));

    expect(activity.indexOf('onRefreshSelectedAgentActivity')).toBeLessThan(activity.indexOf('onTestSelectedAgent'));
  });

  it('keeps Refresh to the left of Save snapshot in Versions', () => {
    const versions = source.slice(source.indexOf("props.activeTab === 'versions'"), source.indexOf("props.activeTab === 'settings'"));

    expect(versions.indexOf('onRefreshSelectedAgentVersions')).toBeLessThan(versions.indexOf('onSaveSelectedAgentVersion'));
    expect(versions).toContain('<ICONS.Save className="h-4 w-4" aria-hidden="true" />');
  });
});
