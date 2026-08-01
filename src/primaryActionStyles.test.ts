import { describe, expect, it } from 'vitest';

import {
  chatView,
  targetInsightsDialog,
  targetSkillsView,
  userMessageTurn,
  workspaceAgentDetailPanel
} from './stylesTestSupport';

describe('primary action style contracts', () => {
  it('keeps live create and save actions primary across target and Agent details', () => {
    expect(targetSkillsView).toMatch(/variant="primary" size="md" onClick=\{openCreateEditor\}/);
    expect(chatView).toMatch(/onClick=\{handleCreateSessionClick\}[\s\S]*?variant="primary"/);
    expect(workspaceAgentDetailPanel).toMatch(/variant="primary" onClick=\{props\.onSaveSelectedAgentVersion\}/);
    expect(targetInsightsDialog).toMatch(/variant="primary" size="sm" className="mt-4" onClick=\{startNewFile\}/);
    expect(userMessageTurn).toMatch(/variant="primary"[\s\S]*?\{t\('chat\.saveEdit'\)\}/);
  });
});
