import { describe, expect, it } from 'vitest';
import { canManageMcpServerTools } from '@/features/targets/admin/McpServersView.data';

describe('MCP server tool permissions', () => {
  it('requires manage_tools instead of inheriting target-insights access', () => {
    expect(canManageMcpServerTools({
      manage_tools: false,
      manage_target_insights: true
    })).toBe(false);
    expect(canManageMcpServerTools({ manage_tools: true })).toBe(true);
    expect(canManageMcpServerTools(undefined)).toBe(false);
  });
});
