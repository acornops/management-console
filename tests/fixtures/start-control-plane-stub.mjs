import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const output = '/tmp/acornops-management-console-mcp-parity-stub.mjs';
await build({
  entryPoints: ['tests/fixtures/control-plane-stub.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  outfile: output
});
await import(`${pathToFileURL(output).href}?built=${Date.now()}`);
