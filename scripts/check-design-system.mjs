#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const srcRoot = join(root, 'src');
const exceptions = JSON.parse(readFileSync(join(root, 'scripts/design-system-exceptions.json'), 'utf8'));
const failures = [];

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  }).filter((path) => ['.ts', '.tsx'].includes(extname(path)) && !path.includes('.test.'));
}

function productionFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? productionFiles(path) : [path];
  }).filter((path) => ['.ts', '.tsx', '.css'].includes(extname(path)) && !path.includes('.test.'));
}

function jsxButtonOpenings(source) {
  const openings = [];
  const startPattern = /<(?:motion\.)?button\b/g;
  let match;

  while ((match = startPattern.exec(source)) !== null) {
    let braceDepth = 0;
    let quote = '';
    let escaped = false;
    let index = match.index;

    for (; index < source.length; index += 1) {
      const character = source[index];
      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (character === '\\') {
          escaped = true;
        } else if (character === quote) {
          quote = '';
        }
        continue;
      }
      if (character === '"' || character === "'" || character === '`') {
        quote = character;
      } else if (character === '{') {
        braceDepth += 1;
      } else if (character === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
      } else if (character === '>' && braceDepth === 0) {
        openings.push({ source: source.slice(match.index, index + 1), start: match.index });
        startPattern.lastIndex = index + 1;
        break;
      }
    }
  }

  return openings;
}

function report(path, rule, detail) {
  failures.push(`${relative(root, path)}: ${rule}: ${detail}`);
}

const files = sourceFiles(srcRoot);
const productionSources = productionFiles(srcRoot);
const namedTailwindPalette = /(?:^|[\s'"`])(?:[a-z-]+:)*(?:bg|text|border|divide|ring|outline|shadow|fill|stroke|from|via|to|decoration|caret|accent)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\/[^\s'"`}]+)?/g;
const approvedButtonSizingHelpers = /(?:buttonClassName|closeButtonClassName|menuOptionClassName|segmentedTabButtonClassName|filterToggleButtonClassName)\s*\(/;
const canonicalButtonTarget = /(?:^|[\s'"`])(?:control-target|min-h-11|h-11|min-h-12|h-12|min-h-control|h-control)(?=$|[\s'"`])/;

for (const path of productionSources) {
  const source = readFileSync(path, 'utf8');
  const paletteMatches = [...source.matchAll(namedTailwindPalette)];
  for (const match of paletteMatches) {
    report(path, 'named-tailwind-palette', `${match[0].trim()} must resolve through a design token`);
  }
  if (/\bbackdrop-blur(?:-|\b)/.test(source)) {
    report(path, 'no-glass', 'backdrop blur is prohibited; use an opaque token scrim or surface');
  }
}

for (const path of files) {
  const source = readFileSync(path, 'utf8');
  const repoPath = relative(root, path).replaceAll('\\', '/');

  if (repoPath !== 'src/components/common/Select.tsx' && /<select(?:\s|>)/.test(source)) {
    report(path, 'shared-select', 'use the typed Select primitive');
  }
  if (repoPath !== 'src/components/common/Checkbox.tsx' && /type=["']checkbox["']/.test(source)) {
    report(path, 'shared-checkbox', 'use the Checkbox primitive');
  }
  if (repoPath !== 'src/components/common/FormControls.tsx' && /type=["']radio["']/.test(source)) {
    report(path, 'shared-radio', 'use the Radio primitive');
  }
  if (repoPath !== 'src/components/common/FormControls.tsx' && /role=["']switch["']/.test(source)) {
    report(path, 'shared-switch', 'use the Switch primitive');
  }
  if (/variant\s*=\s*["']accent["']|variant\s*:\s*["']accent["']/.test(source)) {
    report(path, 'button-intent', 'accent was renamed to activation');
  }
  if (/variant\s*=\s*["']activation["']|variant\s*:\s*["']activation["']/.test(source) && !exceptions.activationContexts.includes(repoPath)) {
    report(path, 'activation-context', 'orange activation buttons are limited to workflow launch/activation contexts');
  }

  const allowsIllustrationColor = exceptions.literalColorModules.includes(repoPath);
  if (!allowsIllustrationColor && /#[0-9a-fA-F]{3,8}\b|oklch\(/.test(source)) {
    report(path, 'token-colors', 'component-local literal colors are prohibited');
  }

  if (repoPath.startsWith('src/pages/') && /px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10/.test(source)) {
    report(path, 'route-shell-copy', 'use PageShell instead of copying route margins and scrolling');
  }

  for (const opening of jsxButtonOpenings(source)) {
    const isDesktopSidebarNavigationRow = repoPath === 'src/app/AppDesktopSidebarParts.tsx' && /navButtonClass\(/.test(opening.source);
    if (!approvedButtonSizingHelpers.test(opening.source) && !canonicalButtonTarget.test(opening.source) && !isDesktopSidebarNavigationRow) {
      const line = source.slice(0, opening.start).split('\n').length;
      report(path, 'raw-button-target', `line ${line}: raw buttons require an approved shared sizing helper or a 44px mobile target (36px compact targets may begin at sm)`);
    }
  }
}

for (const repoPath of exceptions.authenticatedRoutePages) {
  const source = readFileSync(join(root, repoPath), 'utf8');
  if (!source.includes('PageShell') && !exceptions.embeddedRouteExceptions[repoPath]) {
    report(join(root, repoPath), 'authenticated-route-shell', 'route must compose through PageShell');
  }
  if (!source.includes('PageHeader') && !exceptions.routeHeaderDelegates[repoPath] && !exceptions.embeddedRouteExceptions[repoPath]) {
    report(join(root, repoPath), 'authenticated-route-header', 'route must compose through PageHeader');
  }
}

for (const [repoPath, delegate] of Object.entries(exceptions.routeHeaderDelegates)) {
  const delegateSource = readFileSync(join(root, delegate), 'utf8');
  if (!delegateSource.includes('PageHeader')) {
    report(join(root, repoPath), 'route-header-delegate', `${delegate} must compose through PageHeader`);
  }
}

for (const [repoPath, reason] of Object.entries(exceptions.embeddedRouteExceptions)) {
  if (typeof reason !== 'string' || reason.trim().length < 20) {
    report(join(root, repoPath), 'documented-exception', 'embedded route exceptions require a durable reason');
  }
}

if (failures.length > 0) {
  console.error(`Design-system check failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Design-system check passed across ${files.length} source files.`);
