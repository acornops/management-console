import { spawn } from 'node:child_process';
import { routeCoverageManifest } from './route-coverage-manifest.mjs';

const host = '127.0.0.1';
const port = Number(process.env.DESIGN_ROUTES_PORT || 4188);
if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
  throw new Error('DESIGN_ROUTES_PORT must be an integer between 1024 and 65535.');
}
const origin = `http://${host}:${port}`;
const chunkSize = 6;
const concurrency = 1;
const allProjects = [
  'desktop-light',
  'desktop-dark',
  'mobile-light',
  'mobile-dark',
  'sidebar-constrained'
];
const args = process.argv.slice(2);
const updateSnapshots = args.includes('--update-snapshots');
const projectArg = args.find((arg) => arg.startsWith('--project='));
const projects = projectArg ? [projectArg.slice('--project='.length)] : allProjects;
const unsupportedArgs = args.filter((arg) =>
  arg !== '--update-snapshots' && !arg.startsWith('--project=')
);

if (unsupportedArgs.length > 0) {
  throw new Error(`Unsupported design-route argument(s): ${unsupportedArgs.join(', ')}`);
}
for (const project of projects) {
  if (!allProjects.includes(project)) {
    throw new Error(`Unknown design-route project: ${project}`);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // The fixture server is still starting.
    }
    await delay(250);
  }
  throw new Error(`Design-route fixture server did not become ready at ${origin}`);
}

async function serverIsReady() {
  try {
    const response = await fetch(origin);
    return response.ok;
  } catch {
    return false;
  }
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: 'inherit',
      ...options
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      resolve(signal ? 128 + (signal === 'SIGTERM' ? 15 : 0) : (code ?? 1));
    });
  });
}

function stopServer(server) {
  if (!server?.pid) return;
  try {
    if (process.platform === 'win32') server.kill('SIGTERM');
    else process.kill(-server.pid, 'SIGTERM');
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ESRCH') {
      throw error;
    }
  }
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
let server = null;
if (!(await serverIsReady())) {
  server = spawn(
    npmCommand,
    ['run', 'dev', '--', '--host', host, '--port', String(port), '--strictPort'],
    {
      detached: process.platform !== 'win32',
      stdio: 'ignore',
      env: {
        ...process.env,
        VITE_APP_DATA_MODE: 'mock',
        VITE_UI_SOURCE_MODE: '1',
        VITE_CONTROL_PLANE_API_BASE_URL: 'http://127.0.0.1:59999'
      }
    }
  );
  server.unref();
}

let failed = false;
try {
  await waitForServer();
  const tasks = [];
  for (let index = 0; index < routeCoverageManifest.length; index += chunkSize) {
    for (const project of projects) {
      const routeNames = routeCoverageManifest
        .slice(index, index + chunkSize)
        .map((route) => route.name);
      tasks.push({ project, routeNames, key: `${project}-${index / chunkSize + 1}` });
    }
  }
  let nextTaskIndex = 0;
  const workerCount = concurrency;
  await Promise.all(Array.from({ length: Math.min(workerCount, tasks.length) }, async () => {
    while (nextTaskIndex < tasks.length) {
      const task = tasks[nextTaskIndex];
      nextTaskIndex += 1;
      console.log(`design routes: ${task.project} [${task.routeNames.join(', ')}]`);
      const playwrightArgs = [
        '--no-install',
        'playwright',
        'test',
        '--config=playwright.design-routes.config.ts',
        `--project=${task.project}`,
        '--grep=all canonical routes'
      ];
      if (updateSnapshots) playwrightArgs.push('--update-snapshots');
      const code = await run(npxCommand, playwrightArgs, {
        env: {
          ...process.env,
          DESIGN_ROUTES_REUSE_SERVER: '1',
          DESIGN_ROUTE_RUN_KEY: task.key,
          DESIGN_ROUTE_NAMES: task.routeNames.join(',')
        }
      });
      if (code !== 0) failed = true;
    }
  }));

  if (!projectArg || projects.includes('desktop-light')) {
    const code = await run(npxCommand, [
      '--no-install',
      'playwright',
      'test',
      '--config=playwright.design-routes.config.ts',
      '--project=desktop-light',
      '--grep=forced-colors mode'
    ], {
      env: {
        ...process.env,
        DESIGN_ROUTES_REUSE_SERVER: '1',
        DESIGN_ROUTE_RUN_KEY: 'desktop-light-forced-colors',
        DESIGN_ROUTE_NAMES: routeCoverageManifest[1].name
      }
    });
    if (code !== 0) failed = true;
  }
} finally {
  stopServer(server);
}

if (failed) process.exitCode = 1;
