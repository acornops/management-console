import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const origin = process.env.AUDIT_ORIGIN || 'http://127.0.0.1:4187';
const outputDirectory = path.resolve('.audit/app-consistency-2026-08-02');
const routes = [
  ['01', 'workspace-overview', '/workspaces/fixture-workspace/overview'],
  ['02', 'agents', '/workspaces/fixture-workspace/agents'],
  ['03', 'workflows', '/workspaces/fixture-workspace/workflows'],
  ['04', 'runs', '/workspaces/fixture-workspace/runs'],
  ['05', 'members', '/workspaces/fixture-workspace/members'],
  ['06', 'ai-settings', '/workspaces/fixture-workspace/ai-settings'],
  ['07', 'kubernetes-clusters', '/workspaces/fixture-workspace/kubernetes-clusters'],
  ['08', 'cluster-overview', '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/overview'],
  ['09', 'cluster-resources', '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/resources'],
  ['10', 'cluster-mcp-servers', '/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/mcp-servers'],
  ['11', 'vm-logs', '/workspaces/fixture-workspace/virtual-machines/fixture-vm/logs'],
  ['12', 'account-settings', '/account'],
  ['13', 'help', '/help']
];

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
for (const [number, name, route] of routes) {
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  const response = await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#root').waitFor({ state: 'visible' });
  await page.waitForFunction(() => (document.querySelector('#root')?.textContent || '').trim().length > 20);
  await page.locator('h1, h2.type-route-title').first().waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(number === '05' ? 3500 : 1400);

  const screenshotPath = path.join(outputDirectory, `${number}-${name}.png`);
  await page.screenshot({ path: screenshotPath, animations: 'disabled' });

  const evidence = await page.evaluate(({ number, name, route, status }) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden'
        && Number(style.opacity) !== 0 && rect.width > 2 && rect.height > 2
        && !element.classList.contains('sr-only') && !element.closest('.sr-only');
    };
    const record = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        text: (element.textContent || element.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 160),
        className: typeof element.className === 'string' ? element.className : '',
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        textTransform: style.textTransform,
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        padding: `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
        gap: style.gap,
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
        x: Math.round(rect.x * 10) / 10,
        y: Math.round(rect.y * 10) / 10
      };
    };
    const select = (selector) => Array.from(document.querySelectorAll(selector)).filter(visible).map(record);
    return {
      number,
      name,
      route,
      status,
      title: document.title,
      headings: select('h1, h2, h3'),
      labels: select('.type-label, label'),
      rowTitles: select('.type-row-title'),
      tableHeaders: select('th, [role="columnheader"]'),
      controls: select('button, input, select, textarea, [role="button"], [role="combobox"]').slice(0, 100),
      cards: select('.data-surface, .page-section, article').slice(0, 60),
      alerts: select('[role="alert"], .inline-alert'),
      directTextUtilities: Array.from(document.querySelectorAll('[class]')).filter(visible).flatMap((element) => {
        const matches = Array.from(element.classList).filter((item) => /^text-(xs|sm|base|lg|xl|2xl|3xl|\[)/.test(item));
        return matches.length ? [{ ...record(element), utilities: matches }] : [];
      }),
      typeRoleCounts: Array.from(document.querySelectorAll('[class]')).reduce((counts, element) => {
        for (const item of Array.from(element.classList).filter((name) => name.startsWith('type-'))) {
          counts[item] = (counts[item] || 0) + 1;
        }
        return counts;
      }, {})
    };
  }, { number, name, route, status: response?.status() || null });
  evidence.errors = errors;
  audit.push(evidence);
  await writeFile(path.join(outputDirectory, `${number}-${name}.json`), `${JSON.stringify(evidence, null, 2)}\n`);
  await page.close();
  process.stdout.write(`Captured ${number} ${name}\n`);
}

await writeFile(path.join(outputDirectory, 'rendered-evidence.json'), `${JSON.stringify(audit, null, 2)}\n`);
await browser.close();
