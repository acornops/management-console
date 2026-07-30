import { describe, expect, it } from 'vitest';

import {
  MCP_OAUTH_RESULT_STORAGE_KEY,
  readMcpOAuthWindowResult
} from './mcpOAuthWindowHandoff';

describe('readMcpOAuthWindowResult', () => {
  it('accepts a bounded cross-tab OAuth completion message', () => {
    expect(readMcpOAuthWindowResult({
      key: MCP_OAUTH_RESULT_STORAGE_KEY,
      newValue: JSON.stringify({
        id: 'completion-1',
        result: 'connected',
        returnPath: '/workspaces/example/clusters/example/mcp-servers'
      })
    })).toEqual({
      id: 'completion-1',
      result: 'connected',
      returnPath: '/workspaces/example/clusters/example/mcp-servers'
    });
  });

  it('ignores unrelated, malformed, or incomplete storage messages', () => {
    expect(readMcpOAuthWindowResult({
      key: 'unrelated',
      newValue: JSON.stringify({ result: 'connected' })
    })).toBeNull();
    expect(readMcpOAuthWindowResult({
      key: MCP_OAUTH_RESULT_STORAGE_KEY,
      newValue: '{'
    })).toBeNull();
    expect(readMcpOAuthWindowResult({
      key: MCP_OAUTH_RESULT_STORAGE_KEY,
      newValue: JSON.stringify({ id: 'completion-1', result: 'connected' })
    })).toBeNull();
  });
});
