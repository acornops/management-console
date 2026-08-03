import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('target mention surface scope', () => {
  it('enables target mentions in Agent chat and leaves target chat disabled by default', () => {
    const agentChat = readSource('src/pages/agents/AgentChatPanel.tsx');
    const chatView = readSource('src/features/targets/chat/components/TargetChatView.tsx');
    expect(agentChat).toContain('targetMentionsEnabled');
    expect(chatView).toContain('targetMentionsEnabled = false');
  });

  it('uses the shared chat scroll anchor for Agent conversations', () => {
    const agentChat = readSource('src/pages/agents/AgentChatPanel.tsx');
    expect(agentChat).toContain("useTargetChatScrollAnchor({");
    expect(agentChat).toContain('transcriptRef={transcriptRef}');
    expect(agentChat).toContain('onChatScroll={handleChatScroll}');
  });

  it('uses the shared capability preview control with the Agent-specific loader', () => {
    const agentChat = readSource('src/pages/agents/AgentChatPanel.tsx');
    const chatView = readSource('src/features/targets/chat/components/TargetChatView.tsx');
    const composer = readSource('src/features/targets/chat/components/TargetChatComposer.tsx');
    expect(agentChat).toContain('loadAssistantCapabilitiesPreview={getAgentAssistantCapabilitiesPreview}');
    expect(agentChat).not.toContain('capabilityPreviewEnabled={false}');
    expect(chatView).toContain('loadAssistantCapabilitiesPreview(subject.workspaceId, subject.id, requestedToolAccessMode)');
    expect(composer).toContain('<AssistantCapabilityPreviewControl');
  });

  it('uses the target mention textarea only for workflow prompt fields', () => {
    const createDrawer = readSource('src/pages/WorkspaceWorkflowsPage.createDrawer.tsx');
    const settingsPanel = readSource('src/pages/WorkflowSettingsPanel.tsx');
    expect(createDrawer).toMatch(/<TargetMentionTextarea[\s\S]*id="create-workflow-prompt"/);
    expect(settingsPanel).toMatch(/<TargetMentionTextarea[\s\S]*id="workflow-edit-prompt"/);
  });
});
