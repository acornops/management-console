import { spawn } from 'node:child_process';
import net from 'node:net';

const host = '127.0.0.1';
const port = Number(process.env.MANAGEMENT_CONSOLE_NGINX_SMOKE_PORT || await findFreePort());
const origin = `http://${host}:${port}`;
const configuredImageTag = process.env.MANAGEMENT_CONSOLE_NGINX_SMOKE_IMAGE;
const imageTag = configuredImageTag || `acornops-management-console:nginx-smoke-${process.pid}`;
const containerName = process.env.MANAGEMENT_CONSOLE_NGINX_SMOKE_CONTAINER || `acornops-management-console-nginx-smoke-${process.pid}`;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
      ...options
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}\n${stdout}${stderr}`));
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, host, () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === 'object') {
          resolve(address.port);
        } else {
          reject(new Error('Unable to allocate a free localhost port'));
        }
      });
    });
    server.on('error', reject);
  });
}

async function waitForNginx() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // Container is still starting.
    }
    await delay(250);
  }
  throw new Error(`Nginx container did not become ready at ${origin}`);
}

async function fetchText(path) {
  const response = await fetch(`${origin}${path}`, { redirect: 'manual' });
  return { response, text: await response.text() };
}

function assertStatus(response, path, expectedStatus = 200) {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected ${path} to return ${expectedStatus}, received ${response.status}`);
  }
}

function assertHeader(response, header, expected, path) {
  const actual = response.headers.get(header);
  if (actual !== expected) {
    throw new Error(`Expected ${path} ${header} to be ${expected}, received ${actual ?? '<missing>'}`);
  }
}

function assertHeaderIncludes(response, header, expected, path) {
  const actual = response.headers.get(header);
  if (!actual?.split(',').map((value) => value.trim()).includes(expected)) {
    throw new Error(`Expected ${path} ${header} to include ${expected}, received ${actual ?? '<missing>'}`);
  }
}

function assertHeaderContains(response, header, expected, path) {
  const actual = response.headers.get(header);
  if (!actual?.includes(expected)) {
    throw new Error(`Expected ${path} ${header} to contain ${expected}, received ${actual ?? '<missing>'}`);
  }
}

function assertSecurityHeaders(response, path) {
  assertHeader(response, 'x-content-type-options', 'nosniff', path);
  assertHeader(response, 'x-frame-options', 'DENY', path);
  assertHeader(response, 'referrer-policy', 'no-referrer', path);
  assertHeaderContains(response, 'content-security-policy', "frame-ancestors 'none'", path);
  assertHeaderIncludes(response, 'permissions-policy', 'camera=()', path);
}

function findBuiltAssetPath(html) {
  const assetPaths = [...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+\.(?:js|css))"/g)].map((match) => match[1]);
  const assetPath = assetPaths.find((path) => path.endsWith('.js')) ?? assetPaths[0];
  if (!assetPath) {
    throw new Error('Expected app shell to reference a built JS or CSS asset');
  }
  return new URL(assetPath, origin).pathname;
}

async function assertGzipHeaders(path) {
  const response = await fetch(`${origin}${path}`, {
    method: 'HEAD',
    headers: { 'Accept-Encoding': 'gzip' },
    redirect: 'manual'
  });
  assertStatus(response, path);
  assertHeader(response, 'content-encoding', 'gzip', path);
  assertHeaderIncludes(response, 'vary', 'Accept-Encoding', path);
}

try {
  await run('docker', ['build', '-t', imageTag, '.'], { stdio: 'inherit' });
  const runResult = await run('docker', [
    'run',
    '-d',
    '--rm',
    '--name',
    containerName,
    '-p',
    `${host}:${port}:8080`,
    imageTag
  ]);
  if (!runResult.stdout.trim()) {
    throw new Error('Docker did not return a container id');
  }

  await waitForNginx();

  const root = await fetchText('/');
  assertStatus(root.response, '/');
  assertHeader(root.response, 'cache-control', 'no-cache', '/');
  assertSecurityHeaders(root.response, '/');

  const index = await fetchText('/index.html');
  assertStatus(index.response, '/index.html');
  assertHeader(index.response, 'cache-control', 'no-cache', '/index.html');
  assertSecurityHeaders(index.response, '/index.html');

  const assetPath = findBuiltAssetPath(root.text);
  const asset = await fetch(`${origin}${assetPath}`, { redirect: 'manual' });
  assertStatus(asset, assetPath);
  assertHeader(asset, 'cache-control', 'public, max-age=31536000, immutable', assetPath);
  assertSecurityHeaders(asset, assetPath);
  await assertGzipHeaders(assetPath);

  const localeManifest = await fetch(`${origin}/locales/manifest.json`, { redirect: 'manual' });
  assertStatus(localeManifest, '/locales/manifest.json');
  assertHeader(localeManifest, 'cache-control', 'no-cache', '/locales/manifest.json');
  assertSecurityHeaders(localeManifest, '/locales/manifest.json');

  const missingLocale = await fetch(`${origin}/locales/missing.json`, { redirect: 'manual' });
  assertStatus(missingLocale, '/locales/missing.json', 404);
  assertSecurityHeaders(missingLocale, '/locales/missing.json');

  const deepRoutePath = '/workspaces/smoke-workspace/settings';
  const deepRoute = await fetchText(deepRoutePath);
  assertStatus(deepRoute.response, deepRoutePath);
  assertHeader(deepRoute.response, 'cache-control', 'no-cache', deepRoutePath);
  assertSecurityHeaders(deepRoute.response, deepRoutePath);

  console.log('management console nginx header smoke checks passed.');
} finally {
  await run('docker', ['rm', '-f', containerName]).catch(() => {});
  if (!configuredImageTag) {
    await run('docker', ['image', 'rm', '-f', imageTag]).catch(() => {});
  }
}
