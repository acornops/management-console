/** Keep action JSON readable while exposing invisible directional controls. */
export function formatApprovalArguments(value: Record<string, unknown>, sensitiveValueLabel?: string): string {
  const redact = sensitiveValueLabel === undefined ? undefined : (key: string, item: unknown) => (
    /(?:password|passwd|secret|token|credential|authorization|api[_-]?key|private[_-]?key|cookie)/i.test(key)
      ? sensitiveValueLabel
      : item
  );
  return JSON.stringify(value, redact, 2).replace(/\p{Cf}/gu, (character) =>
    character.split('').map((unit) => `\\u${unit.charCodeAt(0).toString(16).padStart(4, '0')}`).join('')
  );
}
