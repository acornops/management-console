import { expect, test, type Locator, type Page } from '@playwright/test';

interface TargetCatalogScenario {
  route: string;
  catalogHeading: string;
  actionMenuLabel: string;
  firstMenuItem: string;
  lastMenuItem: string;
  primaryActionName: RegExp;
  telemetryRegionName: string;
  telemetryTableName?: string;
}

const scenarios: TargetCatalogScenario[] = [
  {
    route: '/workspaces/fixture-workspace/kubernetes-clusters',
    catalogHeading: 'Cluster catalog',
    actionMenuLabel: 'Cluster actions for Singapore Production',
    firstMenuItem: 'Cluster Settings',
    lastMenuItem: 'Delete Cluster',
    primaryActionName: /Investigate cluster Singapore Production|View cluster Singapore Production/,
    telemetryRegionName: 'Singapore Production CPU and memory telemetry over time',
    telemetryTableName: 'Singapore Production CPU and memory telemetry over time'
  },
  {
    route: '/workspaces/fixture-workspace/virtual-machines',
    catalogHeading: 'Virtual machine catalog',
    actionMenuLabel: 'VM actions for Payments VM',
    firstMenuItem: 'VM Settings',
    lastMenuItem: 'Delete VM',
    primaryActionName: /Investigate Payments VM|Open Payments VM/,
    telemetryRegionName: 'Telemetry for Payments VM'
  }
];

async function expectMinimumTouchTarget(control: Locator) {
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

async function verifyCatalogScenario(page: Page, scenario: TargetCatalogScenario) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(scenario.route, { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { level: 2, name: scenario.catalogHeading })).toBeAttached();
  await expect(page.getByRole('button', { name: scenario.primaryActionName })).toBeVisible();

  const trigger = page.getByRole('button', { name: scenario.actionMenuLabel });
  await expect(trigger).toBeVisible();
  await expectMinimumTouchTarget(trigger);

  await trigger.focus();
  await trigger.press('ArrowDown');

  const menu = page.getByRole('menu', { name: scenario.actionMenuLabel });
  const firstItem = menu.getByRole('menuitem', { name: scenario.firstMenuItem });
  const lastItem = menu.getByRole('menuitem', { name: scenario.lastMenuItem });
  await expect(menu).toBeVisible();
  await expect(firstItem).toBeFocused();

  await firstItem.press('End');
  await expect(lastItem).toBeFocused();
  await lastItem.press('Home');
  await expect(firstItem).toBeFocused();
  await firstItem.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  const telemetryRegion = page.getByRole('region', { name: scenario.telemetryRegionName });
  await expect(telemetryRegion).toBeVisible();
  await expect(telemetryRegion.locator('svg[viewBox="0 0 180 108"]')).toHaveAttribute('aria-hidden', 'true');
  if (scenario.telemetryTableName) {
    await expect(page.getByRole('table', { name: scenario.telemetryTableName, includeHidden: true })).toBeAttached();
  }
}

for (const scenario of scenarios) {
  test(`${scenario.catalogHeading} shares accessible catalog behavior`, async ({ page }) => {
    await verifyCatalogScenario(page, scenario);
  });
}
