import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { en } from './locales/en';
import { zh } from './locales/zh';

type FlatTranslations = Record<string, string>;
type TranslationCall = {
  file: string;
  key: string;
  optionNames: Set<string> | null;
};

function flattenKeys(value: unknown, prefix = '', keys = new Set<string>()): Set<string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return keys;

  for (const [key, child] of Object.entries(value)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenKeys(child, nextPrefix, keys);
    } else {
      keys.add(nextPrefix);
    }
  }

  return keys;
}

function flattenTranslations(value: unknown, prefix = '', out: FlatTranslations = {}): FlatTranslations {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;

  for (const [key, child] of Object.entries(value)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenTranslations(child, nextPrefix, out);
    } else if (typeof child === 'string') {
      out[nextPrefix] = child;
    }
  }

  return out;
}

function sourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      sourceFiles(fullPath, files);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes('.test.')) {
      files.push(fullPath);
    }
  }
  return files;
}

function literalTranslationKeys(): Set<string> {
  const keys = new Set<string>();
  const patterns = [
    /\bt\(\s*['"]([^'"]+)['"]/g,
    /i18nKey=\{?\s*['"]([^'"]+)['"]/g
  ];

  for (const file of sourceFiles(join(__dirname, '..'))) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(source))) {
        keys.add(match[1]);
      }
    }
  }

  return keys;
}

function literalTranslationCalls(): TranslationCall[] {
  const calls: TranslationCall[] = [];

  for (const file of sourceFiles(join(__dirname, '..'))) {
    const source = readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

    function visit(node: ts.Node): void {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 't' &&
        ts.isStringLiteralLike(node.arguments[0])
      ) {
        const options = node.arguments[1];
        const optionNames = options && ts.isObjectLiteralExpression(options)
          ? new Set(options.properties.flatMap((property) => {
              if (ts.isShorthandPropertyAssignment(property)) return [property.name.text];
              if (!ts.isPropertyAssignment(property)) return [];
              const name = property.name;
              if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return [name.text];
              return [];
            }))
          : options ? null : new Set<string>();
        calls.push({ file, key: node.arguments[0].text, optionNames });
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return calls;
}

function placeholders(value: string | undefined): string[] {
  if (!value) return [];
  return [...value.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)].map((match) => match[1]);
}

describe('bundled i18n resources', () => {
  it('defines every literal translation key used by source files', () => {
    const usedKeys = literalTranslationKeys();
    const enKeys = flattenKeys(en);
    const zhKeys = flattenKeys(zh);

    expect([...usedKeys].filter((key) => !enKeys.has(key)).sort()).toEqual([]);
    expect([...usedKeys].filter((key) => !zhKeys.has(key)).sort()).toEqual([]);
  });

  it('keeps bundled locale trees aligned', () => {
    const enKeys = flattenKeys(en);
    const zhKeys = flattenKeys(zh);

    expect([...enKeys].filter((key) => !zhKeys.has(key)).sort()).toEqual([]);
    expect([...zhKeys].filter((key) => !enKeys.has(key)).sort()).toEqual([]);
  });

  it('passes interpolation values for literal translation calls', () => {
    const enTranslations = flattenTranslations(en);
    const missingInterpolationValues = literalTranslationCalls()
      .flatMap(({ file, key, optionNames }) =>
        placeholders(enTranslations[key])
          .filter((placeholder) => placeholder !== 'count' && optionNames !== null && !optionNames.has(placeholder))
          .map((placeholder) => `${file}: ${key} missing ${placeholder}`)
      )
      .sort();

    expect(missingInterpolationValues).toEqual([]);
  }, 30_000);
});
