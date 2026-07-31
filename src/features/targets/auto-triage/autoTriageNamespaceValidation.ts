const KUBERNETES_NAMESPACE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const AUTO_TRIAGE_NAMESPACE_LIMIT = 100;
export const AUTO_TRIAGE_NAMESPACE_INPUT_MAX_CHARACTERS = 7000;

export type AutoTriageNamespaceValidationError = 'invalid' | 'too_many';

export interface AutoTriageNamespaceValidation {
  values: string[];
  error?: AutoTriageNamespaceValidationError;
}

export function parseAutoTriageNamespaceList(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(/[,\n\r]+/)
    .map((namespace) => namespace.trim())
    .filter((namespace) => {
      if (!namespace || seen.has(namespace)) return false;
      seen.add(namespace);
      return true;
    });
}

export function validateAutoTriageNamespaceList(value: string): AutoTriageNamespaceValidation {
  const values = parseAutoTriageNamespaceList(value);
  if (values.length > AUTO_TRIAGE_NAMESPACE_LIMIT) {
    return { values, error: 'too_many' };
  }
  if (values.some((namespace) => !KUBERNETES_NAMESPACE_PATTERN.test(namespace))) {
    return { values, error: 'invalid' };
  }
  return { values };
}
