#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function lines(value) {
  return value ? value.split('\n').filter(Boolean) : [];
}

function changedFiles() {
  const baseSha = process.env.CHANGESET_BASE_SHA?.trim();
  if (baseSha && !/^0+$/.test(baseSha)) {
    try {
      return lines(git(['diff', '--name-only', baseSha, 'HEAD']));
    } catch {
      // Fall through to local working-tree detection when CI history is shallow.
    }
  }

  const workingTree = lines(git(['diff', '--name-only', 'HEAD']));
  const staged = lines(git(['diff', '--name-only', '--cached', 'HEAD']));
  const untracked = lines(git(['ls-files', '--others', '--exclude-standard']));
  return Array.from(new Set([...workingTree, ...staged, ...untracked]));
}

const files = changedFiles();
const packageChanged = files.some((file) => file.startsWith('packages/ui/'));
const changesetChanged = files.some(
  (file) => file.startsWith('.changeset/') && file.endsWith('.md')
);

if (packageChanged && !changesetChanged) {
  console.error(
    'UI package changes require a Markdown changeset under .changeset/.'
  );
  process.exit(1);
}

console.log(
  packageChanged
    ? 'UI package changes include a Changesets release note.'
    : 'No UI package release change detected.'
);
