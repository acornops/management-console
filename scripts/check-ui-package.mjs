#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const packageRoot = resolve(root, 'packages/ui');
const packageJson = JSON.parse(
  await readFile(resolve(packageRoot, 'package.json'), 'utf8')
);
const publicApi = await import('@acornops/ui');
const preset = await import('@acornops/ui/tailwind-preset');

const requiredExports = [
  'Button',
  'Checkbox',
  'CloseButton',
  'CollectionState',
  'DataTable',
  'Dialog',
  'DiscoveryFilterBar',
  'EmptyState',
  'FieldLabel',
  'MobileNavigation',
  'NavigationItem',
  'PageShell',
  'RightSidePanel',
  'Select',
  'Sidebar',
  'StatusBadge',
  'TextInput',
  'ToastViewport',
  'Tooltip'
];

const missing = requiredExports.filter((name) => !(name in publicApi));
if (missing.length > 0) {
  throw new Error(`Missing public @acornops/ui exports: ${missing.join(', ')}`);
}

if ('ComponentVocabulary' in publicApi) {
  throw new Error('ComponentVocabulary must not be part of the public API.');
}

for (const subpath of ['./tokens.css', './fonts', './tailwind-preset']) {
  if (!(subpath in packageJson.exports)) {
    throw new Error(`Missing package export map entry: ${subpath}`);
  }
}

await access(resolve(packageRoot, 'dist/index.js'));
await access(resolve(packageRoot, 'dist/index.d.ts'));
await access(resolve(packageRoot, 'tokens.css'));

if (!preset.default?.theme?.extend?.colors?.['ui-surface']) {
  throw new Error('Tailwind preset does not expose canonical semantic colors.');
}

console.log(
  `@acornops/ui export map passed with ${requiredExports.length} required symbols.`
);
