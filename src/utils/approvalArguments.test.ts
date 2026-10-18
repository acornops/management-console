import { describe, expect, it } from 'vitest';
import { formatApprovalArguments } from './approvalArguments';

describe('approval argument presentation', () => {
  it('preserves existing chat JSON, including explicit empty arguments and visible directional escapes', () => {
    expect(formatApprovalArguments({})).toBe('{}');
    expect(formatApprovalArguments({ note: '警告\u202e', replicas: 0 })).toBe('{\n  "note": "警告\\u202e",\n  "replicas": 0\n}');
  });

  it('redacts nested credential fields for review without modifying the action or hiding ordinary patch keys', () => {
    const argumentsValue = { headers: { authorization: 'Bearer private' }, api_key: 'private', changes: [{ key: 'app', value: 'payments' }] };
    const formatted = formatApprovalArguments(argumentsValue, '[Hidden]');
    expect(formatted).not.toContain('private');
    expect(formatted).toContain('"key": "app"');
    expect(formatted).toContain('payments');
    expect(argumentsValue.headers.authorization).toBe('Bearer private');
  });
});
