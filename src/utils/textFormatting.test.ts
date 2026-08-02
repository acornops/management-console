import { describe, expect, it } from 'vitest';
import { formatIdentifierLabel } from './textFormatting';

describe('formatIdentifierLabel', () => {
  it.each([
    ['waiting_approval', 'Waiting approval'],
    ['waiting-approval', 'Waiting approval'],
    ['waiting.approval', 'Waiting approval'],
    ['waitingApproval', 'Waiting approval'],
    ['MCPServerUnavailable', 'MCP server unavailable'],
    ['oauthAuthorizationRequired', 'OAuth authorization required'],
    ['acornops_targets', 'AcornOps targets'],
    ['  queued  ', 'Queued'],
    ['', '']
  ])('formats sentence-case identifier %j', (value, expected) => {
    expect(formatIdentifierLabel(value)).toBe(expected);
  });

  it('supports title case for generated fallback names', () => {
    expect(formatIdentifierLabel('virtual_machine_mcp_agent', 'title')).toBe('Virtual Machine MCP Agent');
  });

  it('supports lower case when the label continues an existing sentence', () => {
    expect(formatIdentifierLabel('producer_projection', 'lower')).toBe('producer projection');
  });

  it('preserves unknown uppercase acronyms', () => {
    expect(formatIdentifierLabel('XML_parser')).toBe('XML parser');
  });
});
