import { spawn } from 'node:child_process';

const host = '127.0.0.1';
const port = Number(process.env.MANAGEMENT_CONSOLE_SMOKE_PORT || 4179);
const origin = `http://${host}:${port}`;
const routes = [
  '/',
  '/workspaces',
  '/settings',
  '/workspaces/smoke-workspace/investigations',
  '/workspaces/smoke-workspace/runbooks',
  '/workspaces/smoke-workspace/virtual-machines',
  '/workspaces/smoke-workspace/virtual-machines/smoke-vm/mcp-servers',
  '/workspaces/smoke-workspace/virtual-machines/smoke-vm/settings',
  '/invites/smoke-token',
  '/kubernetes-clusters/smoke-cluster/overview',
  '/workspaces/smoke-workspace/kubernetes-clusters/smoke-cluster/resources'
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPreview() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await delay(250);
  }
  throw new Error(`Vite preview did not become ready at ${origin}`);
}

async function assertRoute(path) {
  const response = await fetch(`${origin}${path}`, { redirect: 'manual' });
  if (!response.ok) {
    throw new Error(`Expected ${path} to return 200, received ${response.status}`);
  }
  const html = await response.text();
  if (!html.includes('<div id="root"></div>')) {
    throw new Error(`Expected ${path} to return the management console app shell`);
  }
  return html;
}

async function assertAssets(html) {
  const assetPaths = new Set();
  for (const match of html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g)) {
    assetPaths.add(match[1]);
  }
  if (assetPaths.size === 0) {
    throw new Error('Expected the app shell to reference built assets');
  }
  for (const assetPath of assetPaths) {
    const response = await fetch(new URL(assetPath, origin));
    if (!response.ok) {
      throw new Error(`Expected asset ${assetPath} to return 200, received ${response.status}`);
    }
  }
}

const preview = spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'preview', '--', '--host', host, '--port', String(port)],
  { detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] }
);

let previewOutput = '';
preview.stdout.on('data', (chunk) => {
  previewOutput += chunk;
});
preview.stderr.on('data', (chunk) => {
  previewOutput += chunk;
});

function stopPreview() {
  try {
    if (preview.pid && process.platform !== 'win32') {
      process.kill(-preview.pid, 'SIGTERM');
    } else {
      preview.kill('SIGTERM');
    }
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ESRCH') {
      throw error;
    }
  }
}

try {
  await waitForPreview();
  let firstHtml = '';
  for (const route of routes) {
    const html = await assertRoute(route);
    if (!firstHtml) firstHtml = html;
  }
  await assertAssets(firstHtml);
  console.log('management console route smoke checks passed.');
} catch (error) {
  console.error(previewOutput);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  stopPreview();
}
