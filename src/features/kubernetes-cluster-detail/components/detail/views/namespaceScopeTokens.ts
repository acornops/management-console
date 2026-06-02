export type NamespaceScopeTarget = 'include' | 'exclude';

interface NamespaceSuggestionsInput {
  namespaces: Array<{ name: string }>;
  include: string[];
  exclude: string[];
}

interface NamespaceSuggestionFilterInput {
  suggestions: string[];
  selected: string[];
  query: string;
}

interface NamespaceTokenSelectionInput {
  include: string[];
  exclude: string[];
  target: NamespaceScopeTarget;
  tokens: string[];
}

function namespaceTokenKey(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function normalizeNamespaceTokens(values: string[]): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];

  values.forEach((value) => {
    const token = value.trim();
    if (!token) return;

    const key = namespaceTokenKey(token);
    if (seen.has(key)) return;

    seen.add(key);
    tokens.push(token);
  });

  return tokens;
}

export function splitNamespaceTokenInput(value: string): string[] {
  return normalizeNamespaceTokens(value.split(/[,\n\r]+/));
}

export function buildNamespaceSuggestions({
  namespaces,
  include,
  exclude
}: NamespaceSuggestionsInput): string[] {
  return normalizeNamespaceTokens([
    ...namespaces.map((namespace) => namespace.name),
    ...include,
    ...exclude
  ]).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
}

export function filterNamespaceSuggestions({
  suggestions,
  selected,
  query
}: NamespaceSuggestionFilterInput): string[] {
  const selectedKeys = new Set(normalizeNamespaceTokens(selected).map(namespaceTokenKey));
  const queryKey = namespaceTokenKey(query);

  return suggestions.filter((suggestion) => {
    const suggestionKey = namespaceTokenKey(suggestion);
    return !selectedKeys.has(suggestionKey) && (!queryKey || suggestionKey.includes(queryKey));
  });
}

function removeNamespaceTokens(values: string[], tokens: string[]): string[] {
  const tokenKeys = new Set(normalizeNamespaceTokens(tokens).map(namespaceTokenKey));
  return normalizeNamespaceTokens(values).filter((value) => !tokenKeys.has(namespaceTokenKey(value)));
}

export function applyNamespaceTokenSelection({
  include,
  exclude,
  target,
  tokens
}: NamespaceTokenSelectionInput): { include: string[]; exclude: string[] } {
  const additions = normalizeNamespaceTokens(tokens);
  if (additions.length === 0) {
    return {
      include: normalizeNamespaceTokens(include),
      exclude: normalizeNamespaceTokens(exclude)
    };
  }

  if (target === 'include') {
    return {
      include: normalizeNamespaceTokens([...include, ...additions]),
      exclude: removeNamespaceTokens(exclude, additions)
    };
  }

  return {
    include: removeNamespaceTokens(include, additions),
    exclude: normalizeNamespaceTokens([...exclude, ...additions])
  };
}
