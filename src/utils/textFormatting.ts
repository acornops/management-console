export type IdentifierLabelCapitalization = 'lower' | 'sentence' | 'title';

const KNOWN_TERMS: Record<string, string> = {
  acornops: 'AcornOps',
  api: 'API',
  cpu: 'CPU',
  css: 'CSS',
  dns: 'DNS',
  gpu: 'GPU',
  html: 'HTML',
  http: 'HTTP',
  https: 'HTTPS',
  id: 'ID',
  ip: 'IP',
  json: 'JSON',
  llm: 'LLM',
  mcp: 'MCP',
  oauth: 'OAuth',
  oidc: 'OIDC',
  rbac: 'RBAC',
  sdk: 'SDK',
  ssh: 'SSH',
  sso: 'SSO',
  tcp: 'TCP',
  tls: 'TLS',
  ui: 'UI',
  uri: 'URI',
  url: 'URL',
  uuid: 'UUID',
  vm: 'VM',
  vpc: 'VPC',
  wcag: 'WCAG'
};

const KNOWN_TERM_ENTRIES = Object.entries(KNOWN_TERMS)
  .sort(([left], [right]) => right.length - left.length);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function protectKnownTerms(value: string): { value: string; terms: Map<string, string> } {
  const terms = new Map<string, string>();
  let protectedValue = value;

  KNOWN_TERM_ENTRIES.forEach(([term, label], index) => {
    const marker = `\uE000${index}\uE001`;
    const pattern = new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(term)}(?=$|[^a-z])`, 'gi');
    protectedValue = protectedValue.replace(pattern, (_match, prefix: string) => `${prefix} ${marker} `);
    terms.set(marker, label);
  });

  return { value: protectedValue, terms };
}

function capitalize(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1).toLowerCase()}` : '';
}

/**
 * Converts a machine identifier into a readable fallback label.
 *
 * Do not use this for user-authored or API-provided display names. Those values
 * are already presentation text and must be rendered verbatim.
 */
export function formatIdentifierLabel(
  value: string,
  capitalization: IdentifierLabelCapitalization = 'sentence'
): string {
  const protectedTerms = protectKnownTerms(value.trim());
  const words = protectedTerms.value
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  let hasLexicalWord = false;
  return words.map((word) => {
    const knownTerm = protectedTerms.terms.get(word) || KNOWN_TERMS[word.toLowerCase()];
    if (knownTerm) {
      hasLexicalWord = true;
      return knownTerm;
    }
    if (!/[A-Za-z0-9]/.test(word)) return word;

    const preserveUppercase = /^[A-Z0-9]{2,}$/.test(word);
    const formatted = preserveUppercase ? word : capitalize(word);
    const shouldCapitalize = capitalization === 'title' || (capitalization === 'sentence' && !hasLexicalWord);
    hasLexicalWord = true;
    return shouldCapitalize ? formatted : preserveUppercase ? word : word.toLowerCase();
  }).join(' ');
}
