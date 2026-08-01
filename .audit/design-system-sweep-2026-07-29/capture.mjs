import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const auditPort = process.env.AUDIT_PORT || '4186';
const origin = `http://127.0.0.1:${auditPort}`;
const outputDirectory = path.resolve('.audit/design-system-sweep-2026-07-29');

const routes = [
  ['01', 'workspace-overview', '/workspaces/fixture-workspace/overview'],
  ['02', 'agents', '/workspaces/fixture-workspace/agents'],
  ['03', 'mcp-catalog', '/workspaces/fixture-workspace/catalog'],
  ['04', 'workflows', '/workspaces/fixture-workspace/workflows'],
  ['05', 'runs', '/workspaces/fixture-workspace/runs'],
  ['06', 'schedules', '/workspaces/fixture-workspace/triggers'],
  ['07', 'event-triggers', '/workspaces/fixture-workspace/triggers?type=acornops_event'],
  ['08', 'webhook-triggers', '/workspaces/fixture-workspace/triggers?type=webhook'],
  ['09', 'approvals', '/workspaces/fixture-workspace/approvals'],
  ['10', 'members', '/workspaces/fixture-workspace/members'],
  ['11', 'ai-settings', '/workspaces/fixture-workspace/ai-settings'],
  ['12', 'workspace-settings', '/workspaces/fixture-workspace/settings'],
  ['13', 'outbound-webhooks', '/workspaces/fixture-workspace/webhooks'],
  ['14', 'audit-log', '/workspaces/fixture-workspace/audit-log'],
  ['15', 'kubernetes-clusters', '/workspaces/fixture-workspace/kubernetes-clusters'],
  ['16', 'cluster-overview', '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/overview'],
  ['17', 'cluster-resources', '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/resources'],
  ['18', 'cluster-mcp-servers', '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/mcp-servers'],
  ['19', 'cluster-skills', '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/skills'],
  ['20', 'cluster-tools', '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/tools'],
  ['21', 'cluster-chat', '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/chat'],
  ['22', 'cluster-settings', '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/settings'],
  ['23', 'virtual-machines', '/workspaces/fixture-workspace/virtual-machines'],
  ['24', 'vm-overview', '/workspaces/fixture-workspace/virtual-machines/fixture-vm/overview'],
  ['25', 'vm-resources', '/workspaces/fixture-workspace/virtual-machines/fixture-vm/resources'],
  ['26', 'vm-services', '/workspaces/fixture-workspace/virtual-machines/fixture-vm/services'],
  ['27', 'vm-processes', '/workspaces/fixture-workspace/virtual-machines/fixture-vm/processes'],
  ['28', 'vm-network', '/workspaces/fixture-workspace/virtual-machines/fixture-vm/network'],
  ['29', 'vm-logs', '/workspaces/fixture-workspace/virtual-machines/fixture-vm/logs'],
  ['30', 'vm-mcp-servers', '/workspaces/fixture-workspace/virtual-machines/fixture-vm/mcp-servers'],
  ['31', 'vm-skills', '/workspaces/fixture-workspace/virtual-machines/fixture-vm/skills'],
  ['32', 'vm-tools', '/workspaces/fixture-workspace/virtual-machines/fixture-vm/tools'],
  ['33', 'vm-chat', '/workspaces/fixture-workspace/virtual-machines/fixture-vm/chat'],
  ['34', 'vm-settings', '/workspaces/fixture-workspace/virtual-machines/fixture-vm/settings'],
  ['35', 'account-settings', '/account'],
  ['36', 'help', '/help'],
  ['37', 'workspaces', '/workspaces'],
  ['38', 'workspace-invitation', '/invites/fixture-invitation-token'],
  ['39', 'external-integration-link', '/integrations/external/link?status=linked'],
  ['40', 'not-found', '/this-route-does-not-exist']
];
const startAt = process.env.AUDIT_START_AT || '01';
const endAt = process.env.AUDIT_END_AT || '40';
const selectedRoutes = routes.filter(([number]) => (
  Number(number) >= Number(startAt) && Number(number) <= Number(endAt)
));

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-gpu']
});
const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  reducedMotion: 'reduce',
  colorScheme: 'light'
});

const audit = [];
for (const [number, name, route] of selectedRoutes) {
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const consoleErrors = [];
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`console: ${message.text()}`);
  });

  const response = await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#root').waitFor({ state: 'visible' });
  await page.waitForFunction(() => (document.querySelector('#root')?.textContent || '').trim().length > 20);
  await page.locator('h1, h2.type-route-title').first().waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(number === '10' ? 5000 : 1200);

  const screenshotPath = path.join(outputDirectory, `${number}-${name}.png`);
  try {
    await page.screenshot({ path: screenshotPath, animations: 'disabled', timeout: 15_000 });
  } catch (error) {
    consoleErrors.push(`screenshot fallback: ${error instanceof Error ? error.message : String(error)}`);
    const cdp = await context.newCDPSession(page);
    const screenshot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
      fromSurface: true
    });
    await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    await cdp.detach();
  }

  const routeEvidence = await page.evaluate(({ number, name, route, status }) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) !== 0
        && rect.width > 2
        && rect.height > 2
        && !element.classList.contains('sr-only')
        && !element.closest('.sr-only');
    };
    const elementRecord = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180),
        className: typeof element.className === 'string' ? element.className : '',
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        textTransform: style.textTransform,
        color: style.color,
        backgroundColor: style.backgroundColor,
        padding: `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
        borderRadius: style.borderRadius,
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
        x: Math.round(rect.x * 10) / 10,
        y: Math.round(rect.y * 10) / 10
      };
    };
    const selectVisible = (selector) => Array.from(document.querySelectorAll(selector)).filter(visible);
    const primaryScrollRegion = document.querySelector('.page-shell:not(.page-shell--embedded)');
    const root = document.querySelector('#root');
    const rootText = (root?.textContent || '').replace(/\s+/g, ' ').trim();

    return {
      number,
      name,
      route,
      status,
      title: document.title,
      rootText: rootText.slice(0, 300),
      primaryScroll: primaryScrollRegion
        ? {
            scrollHeight: primaryScrollRegion.scrollHeight,
            clientHeight: primaryScrollRegion.clientHeight
          }
        : null,
      headings: selectVisible('h1, h2, h3').map(elementRecord),
      pageHeaders: selectVisible('.page-header').map(elementRecord),
      tableHeaders: selectVisible('th').map(elementRecord),
      semanticLabels: selectVisible('.type-label').map(elementRecord),
      tables: selectVisible('table').map(elementRecord),
      dataSurfaces: selectVisible('.data-surface').map(elementRecord),
      controls: selectVisible('button, input, select, textarea, [role="button"], [role="combobox"]')
        .slice(0, 80)
        .map(elementRecord),
      typeRoleCounts: Array.from(document.querySelectorAll(
        '.type-route-title, .type-section-title, .type-panel-title, .type-row-title, .type-body, .type-ui, .type-caption, .type-label, .type-micro-label, .type-data, .type-code'
      )).reduce((counts, element) => {
        for (const role of Array.from(element.classList).filter((item) => item.startsWith('type-'))) {
          counts[role] = (counts[role] || 0) + 1;
        }
        return counts;
      }, {}),
      directTextUtilityCounts: Array.from(document.querySelectorAll('[class]')).reduce((counts, element) => {
        for (const name of Array.from(element.classList).filter((item) => /^text-(xs|sm|base|lg|xl|2xl|3xl|\[)/.test(item))) {
          counts[name] = (counts[name] || 0) + 1;
        }
        return counts;
      }, {})
    };
  }, { number, name, route, status: response?.status() || null });
  routeEvidence.consoleErrors = consoleErrors;
  audit.push(routeEvidence);
  await writeFile(
    path.join(outputDirectory, `${number}-${name}.json`),
    `${JSON.stringify(routeEvidence, null, 2)}\n`,
    'utf8'
  );

  const visibleTables = page.locator('table:not(.sr-only):visible');
  const visibleTableCount = await visibleTables.count();
  for (let index = 0; index < visibleTableCount; index += 1) {
    const table = visibleTables.nth(index);
    await table.scrollIntoViewIfNeeded();
    try {
      await table.screenshot({
        path: path.join(outputDirectory, `${number}-${name}-table-${index + 1}.png`),
        animations: 'disabled',
        timeout: 15_000
      });
    } catch (error) {
      routeEvidence.consoleErrors.push(
        `table screenshot skipped: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  await page.close();
  console.log(`Captured ${number} ${name}`);
}

await writeFile(
  path.join(outputDirectory, 'rendered-evidence.json'),
  `${JSON.stringify(audit, null, 2)}\n`,
  'utf8'
);
await browser.close();

console.log(`Captured ${audit.length} routes in ${outputDirectory}`);
