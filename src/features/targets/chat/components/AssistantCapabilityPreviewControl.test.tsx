import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { AssistantCapabilityPreviewControl } from '@/features/targets/chat/components/AssistantCapabilityPreviewControl';
import { initializeI18n } from '@/i18n';

beforeAll(initializeI18n);

describe('AssistantCapabilityPreviewControl', () => {
  it('makes omitted MCP credentials visible on the collapsed capability control', () => {
    const markup = renderToStaticMarkup(
      <AssistantCapabilityPreviewControl
        canChat
        isLoading={false}
        error=""
        requestedToolAccessMode="read_only"
        preview={{
          workspaceId: 'workspace-1',
          targetId: 'target-1',
          targetType: 'virtual_machine',
          toolAccessMode: 'read_only',
          confirmationRequiredForWrite: false,
          writeUnavailableReason: null,
          unavailableMcpToolCount: 1,
          toolSummary: {
            totalAllowed: 1,
            nativeAllowed: 0,
            readAllowed: 1,
            writeAllowed: 0
          },
          skillSummary: { totalAvailable: 0 },
          tools: [{
            id: 'query_logs',
            name: 'query_logs',
            label: 'Query logs',
            description: 'Read target logs',
            capability: 'read',
            runtimeKind: 'function',
            source: 'builtin'
          }],
          skills: []
        }}
      />
    );

    expect(markup).toContain('1 MCP tool was omitted from this chat');
    expect(markup).toContain('text-status-warning-text');
  });
});
