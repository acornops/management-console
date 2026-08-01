import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const phase = process.env.AUDIT_PHASE || 'before';
const outputDirectory = path.resolve('.audit/design-system-reaudit-2026-08-01');
const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-gpu']
});
const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  colorScheme: 'light',
  reducedMotion: 'reduce'
});
const page = await context.newPage();
await page.addInitScript(() => {
  window.localStorage.setItem('app_theme', 'light');
  window.localStorage.setItem('acornops_active_theme_preference', 'light');
  window.localStorage.setItem('app_language', 'en');
});
await page.goto('http://127.0.0.1:4191/account', { waitUntil: 'domcontentloaded' });
await page.locator('h1').first().waitFor({ state: 'visible', timeout: 45_000 });
await page.evaluate(() => document.fonts.ready);
const axe = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .exclude('[data-brand-wordmark]')
  .exclude('[data-design-contrast-exception="activation"]')
  .analyze();
const violations = axe.violations.map((violation) => ({
  id: violation.id,
  impact: violation.impact,
  help: violation.help,
  nodes: violation.nodes.map((node) => ({
    target: node.target,
    html: node.html,
    summary: node.failureSummary
  }))
}));
await page.screenshot({
  path: path.join(outputDirectory, `05-account-settings-${phase}.png`),
  animations: 'disabled',
  caret: 'hide'
});
await writeFile(
  path.join(outputDirectory, `05-account-settings-${phase}.json`),
  `${JSON.stringify({ phase, violations }, null, 2)}\n`
);
await context.close();
await browser.close();
console.log(JSON.stringify({ phase, violations }, null, 2));
if (violations.length > 0) process.exitCode = 1;
