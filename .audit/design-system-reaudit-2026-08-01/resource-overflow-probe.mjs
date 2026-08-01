import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputDirectory = path.resolve('.audit/design-system-reaudit-2026-08-01');
const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-gpu']
});
const context = await browser.newContext({
  viewport: { width: Math.round(1853 / 1.1), height: Math.round(964 / 1.1) },
  deviceScaleFactor: 1.1,
  reducedMotion: 'reduce'
});
const page = await context.newPage();
await page.goto('http://127.0.0.1:4191/workspaces/fixture-workspace/kubernetes-clusters', { waitUntil: 'domcontentloaded' });
await page.locator('[data-cluster-card="true"]').waitFor({ state: 'visible', timeout: 45_000 });

for (const clusterName of ['Tokyo Staging', 'Frankfurt Edge']) {
  await page.getByRole('button', { name: 'Connect Cluster' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Cluster Name').fill(clusterName);
  await dialog.getByRole('button', { name: 'Continue to Install Agent' }).click();
  await dialog.getByRole('button', { name: 'Close connect cluster dialog' }).click();
  await dialog.waitFor({ state: 'detached' });
}

const proof = await page.locator('[data-cluster-card-grid="true"]').evaluate((grid) => ({
  grid: {
    clientWidth: grid.clientWidth,
    scrollWidth: grid.scrollWidth,
    columns: getComputedStyle(grid).gridTemplateColumns
  },
  cards: Array.from(grid.children).map((card) => {
    const cardElement = card;
    const cardBox = cardElement.getBoundingClientRect();
    const records = Array.from(cardElement.querySelectorAll('*')).map((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === 'string' ? element.className : '',
        text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        left: Math.round((box.left - cardBox.left) * 10) / 10,
        right: Math.round((box.right - cardBox.left) * 10) / 10,
        width: Math.round(box.width * 10) / 10,
        overflowX: style.overflowX,
        position: style.position
      };
    }).filter((record) => (
      record.scrollWidth > record.clientWidth + 1
      || record.right > cardBox.width + 1
      || record.left < -1
    ));
    return {
      width: cardBox.width,
      clientWidth: cardElement.clientWidth,
      scrollWidth: cardElement.scrollWidth,
      overflowingDescendants: records
    };
  })
}));

const dismissNotifications = page.getByRole('button', { name: 'Dismiss notification' });
await page.waitForTimeout(750);
for (let index = 0; index < 8 && await dismissNotifications.count(); index += 1) {
  await dismissNotifications.first().click({ timeout: 1_000 }).catch(() => undefined);
}

await page.screenshot({ path: path.join(outputDirectory, '06-resource-overflow-probe.png'), animations: 'disabled' });
await writeFile(path.join(outputDirectory, '06-resource-overflow-probe.json'), `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
await context.close();
await browser.close();
