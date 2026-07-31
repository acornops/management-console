import { expect, test } from '@playwright/test';

test('default workflows are directly editable without creating a copy', async ({ page }) => {
  await page.goto(
    '/workspaces/fixture-workspace/workflows?workflow=fixture-template-kubernetes-health',
    { waitUntil: 'domcontentloaded' }
  );

  await expect(page.getByRole('button', { name: 'Create editable copy' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Schedules', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Launch', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const editDrawer = page.getByRole('dialog', { name: 'Edit workflow' });
  await expect(editDrawer).toBeVisible();
  await expect(editDrawer.getByLabel('Workflow name')).toHaveValue('Kubernetes health check');
});

test('workflow detail keeps primary navigation lean across contextual and compact views', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow', {
    waitUntil: 'domcontentloaded'
  });

  await expect(page.getByRole('heading', { name: 'Production health review' })).toBeVisible();
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.getByRole('searchbox', { name: 'Search workflow library' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Back to workflows' })).toBeVisible();

  const workflowActions = page.getByLabel('Workflow actions').getByRole('button');
  await expect(workflowActions).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Run activity', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Schedules', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Incoming webhooks', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Edit agents' }).click();
  await expect(page).toHaveURL(/tab=agents/);
  const agentsDrawer = page.getByRole('dialog', { name: 'Agents' });
  await expect(agentsDrawer).toBeVisible();
  await expect(agentsDrawer.getByRole('checkbox').first()).toBeVisible();
  await agentsDrawer.getByRole('button', { name: 'Close' }).click();
  await expect(page).not.toHaveURL(/tab=/);

  await page.getByRole('button', { name: 'Run activity', exact: true }).click();
  await expect(page).toHaveURL(/tab=runs/);
  const activityDrawer = page.getByRole('dialog', { name: 'Run activity' });
  await expect(activityDrawer).toBeVisible();
  await activityDrawer.getByRole('button', { name: 'Close' }).click();

  const geometry = await page.evaluate(() => {
    const pageShell = document.querySelector<HTMLElement>('.page-shell');
    const detail = document.querySelector<HTMLElement>('[data-master-detail-detail="true"]');
    const detailBody = document.querySelector<HTMLElement>('[data-master-detail-pane-body="true"]');
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      pageOverflowY: pageShell ? getComputedStyle(pageShell).overflowY : null,
      detailOverflowY: detail ? getComputedStyle(detail).overflowY : null,
      detailBodyOverflowY: detailBody ? getComputedStyle(detailBody).overflowY : null
    };
  });
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  expect(geometry.pageOverflowY).toBe('auto');
  expect(geometry.detailOverflowY).not.toBe('hidden');
  expect(geometry.detailBodyOverflowY).not.toBe('auto');
});

test('workflow workspace stacks discovery controls below its views and keeps empty Activity compact', async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.goto('/workspaces/fixture-workspace/workflows', { waitUntil: 'domcontentloaded' });

  const viewTabs = page.getByRole('tablist', { name: 'Workflow views' });
  const workflowSearch = page.getByRole('searchbox', { name: 'Search workflow library' });
  const workflowDiscoveryFrame = page.locator('[data-search-filter-frame="true"]').filter({ has: workflowSearch });
  const [tabsBox, workflowSearchBox, workflowDiscoveryFrameBox] = await Promise.all([
    viewTabs.boundingBox(),
    workflowSearch.boundingBox(),
    workflowDiscoveryFrame.boundingBox()
  ]);
  expect(tabsBox).not.toBeNull();
  expect(workflowSearchBox).not.toBeNull();
  expect(workflowDiscoveryFrameBox).not.toBeNull();
  expect(workflowDiscoveryFrameBox!.y).toBeGreaterThanOrEqual(tabsBox!.y + tabsBox!.height + 8);
  expect(Math.abs(workflowDiscoveryFrameBox!.x - tabsBox!.x)).toBeLessThanOrEqual(1);
  expect(workflowSearchBox!.width).toBeGreaterThan(600);
  await expect(workflowDiscoveryFrame).toHaveCSS('border-top-width', '1px');

  await page.getByRole('tab', { name: 'Activity' }).click();
  const activitySearch = page.getByRole('searchbox', { name: 'Search Activity' });
  await expect(activitySearch).toBeVisible();
  const activitySearchBox = await activitySearch.boundingBox();
  expect(activitySearchBox).not.toBeNull();
  expect(activitySearchBox!.width).toBeGreaterThan(400);

  await activitySearch.fill('no-matching-workflow-activity');
  await expect(page.getByRole('heading', { name: 'No activity matches these filters' })).toBeVisible();
  const emptyLedgerBox = await page.getByRole('region', { name: 'Workflow execution ledger' }).boundingBox();
  expect(emptyLedgerBox).not.toBeNull();
  expect(emptyLedgerBox!.height).toBeLessThan(350);
});

test('workflow desktop workspace keeps chrome fixed and scrolls detail content independently', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow', {
    waitUntil: 'domcontentloaded'
  });
  await expect(page.getByRole('heading', { name: 'Production health review' })).toBeVisible();

  const detailBody = page.locator('[data-master-detail-pane-body="true"]');
  const initial = await page.evaluate(() => {
    const pageShell = document.querySelector<HTMLElement>('.page-shell');
    const library = document.querySelector<HTMLElement>('[data-master-detail-list="true"]');
    const detail = document.querySelector<HTMLElement>('[data-master-detail-detail="true"]');
    const detailBody = document.querySelector<HTMLElement>('[data-master-detail-pane-body="true"]');
    const detailHeader = document.querySelector<HTMLElement>('[data-master-detail-pane-header="true"]');
    return {
      pageClientHeight: pageShell?.clientHeight ?? 0,
      pageScrollHeight: pageShell?.scrollHeight ?? 0,
      pageScrollTop: pageShell?.scrollTop ?? -1,
      pageOverflowY: pageShell ? getComputedStyle(pageShell).overflowY : null,
      libraryOverflowY: library ? getComputedStyle(library).overflowY : null,
      detailOverflowY: detail ? getComputedStyle(detail).overflowY : null,
      bodyClientHeight: detailBody?.clientHeight ?? 0,
      bodyScrollHeight: detailBody?.scrollHeight ?? 0,
      bodyOverflowY: detailBody ? getComputedStyle(detailBody).overflowY : null,
      headerTop: detailHeader?.getBoundingClientRect().top ?? -1,
      headerHeight: detailHeader?.getBoundingClientRect().height ?? 0
    };
  });

  expect(initial.pageOverflowY).toBe('hidden');
  expect(initial.pageScrollHeight).toBeLessThanOrEqual(initial.pageClientHeight + 1);
  expect(initial.libraryOverflowY).toBe('auto');
  expect(initial.detailOverflowY).toBe('hidden');
  expect(initial.bodyOverflowY).toBe('auto');
  expect(initial.bodyScrollHeight).toBeGreaterThan(initial.bodyClientHeight);
  expect(initial.headerHeight).toBeLessThanOrEqual(145);

  await detailBody.evaluate((element) => element.scrollTo(0, 160));
  const afterScroll = await page.evaluate(() => {
    const pageShell = document.querySelector<HTMLElement>('.page-shell');
    const detailBody = document.querySelector<HTMLElement>('[data-master-detail-pane-body="true"]');
    const detailHeader = document.querySelector<HTMLElement>('[data-master-detail-pane-header="true"]');
    return {
      pageScrollTop: pageShell?.scrollTop ?? -1,
      bodyScrollTop: detailBody?.scrollTop ?? -1,
      headerTop: detailHeader?.getBoundingClientRect().top ?? -1
    };
  });

  expect(afterScroll.pageScrollTop).toBe(initial.pageScrollTop);
  expect(afterScroll.bodyScrollTop).toBeGreaterThan(0);
  expect(afterScroll.headerTop).toBe(initial.headerTop);

  await page.getByRole('button', { name: 'Run activity', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Run activity' })).toBeVisible();
  await expect(detailBody).toHaveCSS('overflow-y', 'auto');
});

test('workflow launch uses the saved prompt without runtime template inputs', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow', {
    waitUntil: 'domcontentloaded'
  });

  const launchFromOverview = page.getByRole('button', { name: 'Launch', exact: true });
  await expect(launchFromOverview).toBeEnabled();
  await launchFromOverview.click();

  const drawer = page.getByRole('dialog', { name: 'Run workflow' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('Review production health and produce a concise operational summary.', { exact: true })).toBeVisible();
  await expect(drawer.getByRole('combobox')).toHaveCount(0);
  await expect(drawer.getByRole('listbox')).toHaveCount(0);
  await expect(drawer.getByRole('button', { name: 'Launch workflow' })).toBeEnabled();

  await drawer.getByRole('button', { name: 'Cancel' }).click();
  await expect(drawer).toBeHidden();
  await launchFromOverview.click();
  await expect(page.getByRole('dialog', { name: 'Run workflow' }).getByRole('combobox')).toHaveCount(0);
});

test('workflow authoring uses a plain prompt field and a two-step setup', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Create workflow' }).click();

  const drawer = page.getByRole('dialog', { name: 'Create workflow' });
  const setup = drawer.getByLabel('Create workflow setup');
  await expect(setup.getByText('Describe', { exact: true })).toBeVisible();
  await expect(setup.getByText('Agents', { exact: true })).toBeVisible();
  await expect(setup.getByText('Review', { exact: true })).toHaveCount(0);
  await expect(drawer.getByRole('button', { name: 'Reset' })).toBeDisabled();
  const prompt = drawer.getByRole('textbox', { name: 'Workflow prompt' });
  await expect(prompt).not.toHaveAttribute('role', 'combobox');
  await expect(drawer.getByRole('listbox')).toHaveCount(0);

  await drawer.locator('#create-workflow-name-input').fill('Lean workflow');
  await prompt.fill('Review production health and summarize the result.');
  await drawer.getByRole('button', { name: 'Next' }).click();
  const createButton = drawer.getByRole('button', { name: 'Create workflow', exact: true });
  await expect(createButton).toBeDisabled();
  await drawer.getByRole('checkbox').first().check();
  await expect(createButton).toBeEnabled();
});

test('schedule creation omits runtime inputs and stays a bounded dialog', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow', {
    waitUntil: 'domcontentloaded'
  });
  await page.getByRole('button', { name: 'Schedules', exact: true }).click();

  const schedulesDrawer = page.getByRole('dialog', { name: 'Schedules' });
  await expect(schedulesDrawer).toBeVisible();
  await schedulesDrawer.getByRole('button', { name: 'Create schedule' }).click();

  const dialog = page.getByRole('dialog', { name: 'Create schedule' });
  await expect(dialog.getByRole('heading', { name: 'Workflow inputs' })).toHaveCount(0);
  await expect(dialog.getByRole('combobox', { name: 'Target' })).toHaveCount(0);
  const scheduleBox = await dialog.boundingBox();
  expect(scheduleBox?.width).toBeLessThanOrEqual(578);
  expect(scheduleBox?.height).toBeLessThanOrEqual(578);
  await expect(dialog.getByRole('button', { name: 'Save schedule' })).toBeEnabled();
});

test('workflow webhook management stays scoped in a table-first drawer and creates in a modal', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow', {
    waitUntil: 'domcontentloaded'
  });
  await page.getByRole('button', { name: 'Incoming webhooks', exact: true }).click();

  const drawer = page.getByRole('dialog', { name: 'Webhooks' });
  await expect(drawer).toBeVisible();
  await expect(page).toHaveURL(/panel=webhooks/);
  await expect(drawer.getByRole('table', { name: 'Incoming workflow webhooks' })).toBeVisible();
  await expect(drawer.getByRole('columnheader', { name: 'Status' })).toBeVisible();
  await expect(drawer.getByRole('columnheader', { name: 'Last dispatch' })).toBeVisible();
  await expect(drawer.getByRole('rowheader', { name: 'External production review' })).toBeVisible();

  await drawer.getByRole('button', { name: 'Create webhook' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create incoming webhook' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Production health review', { exact: true })).toBeVisible();
  const webhookBox = await dialog.boundingBox();
  expect(webhookBox?.width).toBeLessThanOrEqual(578);
  expect(webhookBox?.height).toBeLessThanOrEqual(578);
});
