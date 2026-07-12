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

function report(path, rule, detail) {
  failures.push(`${relative(root, path)}: ${rule}: ${detail}`);
}

const files = sourceFiles(srcRoot);
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
