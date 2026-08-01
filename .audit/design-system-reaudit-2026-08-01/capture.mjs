import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const origin = 'http://127.0.0.1:4191';
const outputDirectory = path.resolve('.audit/design-system-reaudit-2026-08-01');

const steps = [
  {
    number: '01',
    name: 'resource-catalog-desktop-light',
    route: '/workspaces/fixture-workspace/kubernetes-clusters',
    viewport: { width: 1850, height: 1000 },
    theme: 'light',
    language: 'en',
    kind: 'resource'
  },
  {
    number: '02',
    name: 'resource-catalog-mobile-dark',
    route: '/workspaces/fixture-workspace/agents',
    viewport: { width: 390, height: 844 },
    theme: 'dark',
    language: 'en',
    kind: 'resource'
  },
  {
    number: '03',
    name: 'audit-log-desktop-monday-first',
    route: '/workspaces/fixture-workspace/audit-log',
    viewport: { width: 1600, height: 1000 },
    theme: 'light',
    language: 'zh',
    kind: 'date-time'
  },
  {
    number: '04',
    name: 'audit-log-mobile-monday-first',
    route: '/workspaces/fixture-workspace/audit-log',
    viewport: { width: 390, height: 844 },
    theme: 'dark',
    language: 'zh',
    kind: 'date-time'
  }
];

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-gpu']
});

const audit = [];
for (const step of steps) {
  const context = await browser.newContext({
    viewport: step.viewport,
    colorScheme: step.theme,
    reducedMotion: 'reduce',
    locale: step.language === 'zh' ? 'zh-CN' : 'en-US',
    isMobile: step.viewport.width < 600,
    hasTouch: step.viewport.width < 600
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`console: ${message.text()}`);
  });
  await page.addInitScript(({ theme, language }) => {
    window.localStorage.setItem('app_theme', theme);
    window.localStorage.setItem('acornops_active_theme_preference', theme);
    window.localStorage.setItem('app_language', language);
  }, { theme: step.theme, language: step.language });

  const response = await page.goto(`${origin}${step.route}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#root').waitFor({ state: 'visible' });
  await page.locator('h1').first().waitFor({ state: 'visible', timeout: 45_000 });
  await page.evaluate(() => document.fonts.ready);

  let evidence;
  if (step.kind === 'resource') {
    const grid = page.locator('[data-resource-card-grid="true"]').last();
    await grid.waitFor({ state: 'visible' });
    evidence = await grid.evaluate((element) => {
      const gridBox = element.getBoundingClientRect();
      const gridStyle = getComputedStyle(element);
      const cards = Array.from(element.children).map((card) => {
        const box = card.getBoundingClientRect();
        return {
          width: Math.round(box.width * 10) / 10,
          top: Math.round(box.top * 10) / 10,
          maxWidth: getComputedStyle(card).maxWidth
        };
      });
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        display: gridStyle.display,
        columns: gridStyle.gridTemplateColumns,
        gridWidth: Math.round(gridBox.width * 10) / 10,
        cards
      };
    });
  } else {
    await page.locator('button[aria-controls="audit-custom-range-controls"]').click();
    await page.locator('#audit-custom-range-controls').waitFor({ state: 'visible' });
    const triggers = page.locator('#audit-filter-from, #audit-filter-to');
    const triggerHeights = await triggers.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
    await page.locator('#audit-filter-from').click();
    const dialog = page.locator('#audit-filter-from-dialog');
    await dialog.waitFor({ state: 'visible' });
    const activeDate = dialog.locator('[data-calendar-date][tabindex="0"]');
    const initialDate = await activeDate.getAttribute('data-calendar-date');
    await activeDate.press('Home');
    const homeDate = await dialog.locator('[data-calendar-date][tabindex="0"]').getAttribute('data-calendar-date');
    await dialog.locator('[data-calendar-date][tabindex="0"]').press('End');
    const endDate = await dialog.locator('[data-calendar-date][tabindex="0"]').getAttribute('data-calendar-date');
    evidence = await dialog.evaluate((element, keyboardDates) => {
      const group = element.querySelector('[role="group"]');
      const weekdayLabels = group
        ? Array.from(group.children).slice(0, 7).map((child) => (child.textContent || '').trim())
        : [];
      const monthButtons = Array.from(element.querySelectorAll('button[aria-label]')).slice(0, 2);
      const timeInputs = Array.from(element.querySelectorAll('input'));
      const box = element.getBoundingClientRect();
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        language: document.documentElement.lang,
        weekdayLabels,
        keyboardDates,
        dialog: {
          left: Math.round(box.left * 10) / 10,
          top: Math.round(box.top * 10) / 10,
          right: Math.round(box.right * 10) / 10,
          bottom: Math.round(box.bottom * 10) / 10,
          width: Math.round(box.width * 10) / 10,
          height: Math.round(box.height * 10) / 10
        },
        monthButtonHeights: monthButtons.map((button) => button.getBoundingClientRect().height),
        timeInputHeights: timeInputs.map((input) => input.getBoundingClientRect().height)
      };
    }, { initialDate, homeDate, endDate });
    evidence.triggerHeights = triggerHeights;
  }

  const screenshotPath = path.join(outputDirectory, `${step.number}-${step.name}.png`);
  await page.screenshot({ path: screenshotPath, animations: 'disabled', caret: 'hide' });
  const record = {
    ...step,
    status: response?.status() || null,
    title: await page.title(),
    consoleErrors,
    evidence,
    screenshotPath
  };
  audit.push(record);
  await writeFile(path.join(outputDirectory, `${step.number}-${step.name}.json`), `${JSON.stringify(record, null, 2)}\n`);
  await context.close();
}

await writeFile(path.join(outputDirectory, 'rendered-evidence.json'), `${JSON.stringify(audit, null, 2)}\n`);
await browser.close();
console.log(`Captured ${audit.length} fresh audit steps in ${outputDirectory}`);
