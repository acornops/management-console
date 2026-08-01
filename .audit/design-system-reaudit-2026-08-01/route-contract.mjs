import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { routeCoverageManifest } from '../../scripts/route-coverage-manifest.mjs';

const origin = 'http://127.0.0.1:4191';
const outputPath = path.resolve('.audit/design-system-reaudit-2026-08-01/route-contract.json');
const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-gpu']
});
const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  colorScheme: 'light',
  reducedMotion: 'reduce',
  locale: 'en-US'
});
const page = await context.newPage();
page.setDefaultTimeout(45_000);
await page.addInitScript(() => {
  window.localStorage.setItem('app_theme', 'light');
  window.localStorage.setItem('acornops_active_theme_preference', 'light');
  window.localStorage.setItem('app_language', 'en');
});

const results = [];
for (const route of routeCoverageManifest) {
  const errors = [];
  const onPageError = (error) => errors.push(`pageerror: ${error.message}`);
  const onConsole = (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);

  let status = null;
  let title = '';
  let ready = false;
  let overflow = null;
  let reflowOverflow = null;
  let axeViolations = [];
  try {
    const response = await page.goto(`${origin}${route.path}`, { waitUntil: 'domcontentloaded' });
    status = response?.status() || null;
    await page.locator(route.ready).first().waitFor({ state: 'visible' });
    await page.evaluate(() => document.fonts.ready);
    ready = true;
    title = await page.title();
    overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('[data-brand-wordmark]')
      .exclude('[data-design-contrast-exception="activation"]')
      .analyze();
    axeViolations = axe.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target)
    }));
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    reflowOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  results.push({
    name: route.name,
    category: route.category,
    path: route.path,
    status,
    title,
    ready,
    overflow,
    reflowOverflow,
    axeViolations,
    errors
  });
  page.off('pageerror', onPageError);
  page.off('console', onConsole);
  console.log(`${route.name}: ${ready && status === 200 && axeViolations.length === 0 && (overflow || 0) <= 1 && (reflowOverflow || 0) <= 1 ? 'pass' : 'review'}`);
}

await writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`);
await context.close();
await browser.close();

const failures = results.filter((result) => (
  !result.ready
  || result.status !== 200
  || result.axeViolations.length > 0
  || (result.overflow || 0) > 1
  || (result.reflowOverflow || 0) > 1
));
console.log(`Audited ${results.length} routes; ${failures.length} require review.`);
if (failures.length > 0) process.exitCode = 1;
