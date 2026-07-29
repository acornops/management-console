#!/usr/bin/env node

import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const assetsDirectory = join(root, 'dist/assets');
const maximumChunkBytes = 350 * 1024;
const chunks = readdirSync(assetsDirectory)
  .filter((name) => name.endsWith('.js'))
  .map((name) => ({ name, bytes: statSync(join(assetsDirectory, name)).size }))
  .sort((left, right) => right.bytes - left.bytes);
const oversized = chunks.filter((chunk) => chunk.bytes > maximumChunkBytes);

if (oversized.length > 0) {
  console.error(`Bundle budget failed: JavaScript chunks must not exceed ${maximumChunkBytes} bytes.`);
  oversized.forEach((chunk) => console.error(`- ${chunk.name}: ${chunk.bytes} bytes`));
  process.exit(1);
}

console.log(`Bundle budget passed across ${chunks.length} JavaScript chunks; largest is ${chunks[0]?.name} at ${chunks[0]?.bytes ?? 0} bytes.`);
