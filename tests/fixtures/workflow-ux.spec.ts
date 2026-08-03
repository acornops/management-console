import { expect, test } from '@playwright/test';

test('workflow library identifies assigned agents by name', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows', { waitUntil: 'domcontentloaded' });

  const library = page.getByLabel('Workflow library');
  const kubernetesWorkflow = library.getByRole('button', { name: 'Select workflow Kubernetes health check' });
  const virtualMachineWorkflow = library.getByRole('button', { name: 'Select workflow Virtual machine health check' });
  const coordinatedWorkflow = library.getByRole('button', { name: 'Select workflow Production health review' });

  await expect(kubernetesWorkflow.getByText('Kubernetes Agent', { exact: true })).toBeVisible();
  await expect(virtualMachineWorkflow.getByText('Virtual Machine Agent', { exact: true })).toBeVisible();
  await expect(coordinatedWorkflow.getByText('Kubernetes Specialist, Workflow Analyst', { exact: true })).toBeVisible();
  await expect(library.getByText(/^\d+ agents?$/)).toHaveCount(0);
});

test('default workflows open editable settings inline without creating a copy', async ({ page }) => {
  await page.goto(
    '/workspaces/fixture-workspace/workflows?workflow=fixture-template-kubernetes-health',
    { waitUntil: 'domcontentloaded' }
  );

  await expect(page.getByRole('button', { name: 'Create editable copy' })).toHaveCount(0);
  await expect(page.getByLabel('Selected workflow actions').getByRole('button')).toHaveCount(2);
  await expect(page.getByLabel('Selected workflow actions').getByRole('button', { name: 'Schedules', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tablist', { name: 'Workflow detail sections' }).getByRole('tab', { name: 'Schedules', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Launch', exact: true })).toBeVisible();
  await expect(page.getByLabel('Workflow library').getByText('active', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Selected workflow actions').getByText('Ready', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Selected workflow actions').getByText('Readiness checks passed', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Read/write policy', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Execution setup', exact: true })).toBeVisible();
  await expect(page.getByText('Effective access', { exact: true })).toBeVisible();
  await expect(page.getByText(/^Read\/write · \d+ tools?/)).toBeVisible();
  await expect(page.getByText('Inherited from assigned Agents and revalidated before every run.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View access', exact: true })).toBeVisible();
  await expect(page.getByText('Documents create, Infrastructure diagnostics read, Infrastructure remediation write', { exact: true })).toHaveCount(0);
  await expect(page.getByText('AcornOps-coordinated', { exact: true })).toHaveCount(0);
  await expect(page.getByText('This workflow runs directly with Kubernetes Agent.', { exact: true })).toBeVisible();
  await expect(page.getByText('Direct', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page).toHaveURL(/tab=settings/);
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByLabel('Workflow name')).toHaveValue('Kubernetes health check');
  await expect(page.getByRole('button', { name: 'Back to workflow', exact: true })).toBeVisible();
});

test('workflow header actions stay below the description and right aligned', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    '/workspaces/fixture-workspace/workflows?workflow=fixture-template-kubernetes-health',
    { waitUntil: 'domcontentloaded' }
  );

  const actionRow = page.getByLabel('Selected workflow actions');
  const launchButton = actionRow.getByRole('button', { name: 'Launch', exact: true });
  const description = page.locator('[data-master-detail-pane-header="true"] p');
  await expect(launchButton).toBeVisible();

  const [actionRowBox, launchButtonBox, descriptionBox] = await Promise.all([
    actionRow.boundingBox(),
    launchButton.boundingBox(),
    description.boundingBox()
  ]);
  expect(actionRowBox).not.toBeNull();
  expect(launchButtonBox).not.toBeNull();
  expect(descriptionBox).not.toBeNull();
  expect(actionRowBox!.y).toBeGreaterThan(descriptionBox!.y + descriptionBox!.height);
  expect(Math.abs(
    actionRowBox!.x + actionRowBox!.width - launchButtonBox!.x - launchButtonBox!.width
  )).toBeLessThanOrEqual(1);
});

test('workflow capability inventory uses scan-first labels', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    '/workspaces/fixture-workspace/workflows?workflow=fixture-template-kubernetes-health',
    { waitUntil: 'domcontentloaded' }
  );

  await page.getByRole('button', { name: 'View access', exact: true }).click();
  const capabilities = page.getByRole('tabpanel', { name: 'Capabilities' });
  await expect(capabilities).toBeVisible();
  await expect(capabilities.locator('[data-agent-avatar="true"]').first()).toHaveText('☸️');
  await expect(capabilities.locator('dt')).toHaveText([
    'Write policy',
    'MCP servers',
    'Skills',
    'Tools'
  ]);
  await expect(capabilities.getByText('Direct MCP servers', { exact: true })).toHaveCount(0);
  await expect(capabilities.getByText('Installed skills', { exact: true })).toHaveCount(0);
  await expect(capabilities.getByText('Write access', { exact: true })).toHaveCount(0);
  const mcpServerValue = capabilities.locator('dt', { hasText: 'MCP servers' }).locator('xpath=following-sibling::dd[1]').locator('span').first();
  await expect(mcpServerValue).not.toHaveClass(/font-mono/);
});

test('workflow selection does not restart the launch capability check', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  let capabilityPreviewRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/capabilities-preview')) capabilityPreviewRequests += 1;
  });
  await page.goto(
    '/workspaces/fixture-workspace/workflows?workflow=fixture-template-kubernetes-health',
    { waitUntil: 'domcontentloaded' }
  );

  await expect(page.getByRole('heading', { name: /Kubernetes health check/ })).toBeVisible();
  expect(capabilityPreviewRequests).toBe(0);

  await page.getByRole('button', { name: 'Select workflow Virtual machine health check' }).click();
  await expect(page.getByRole('heading', { name: /Virtual machine health check/ })).toBeVisible();
  expect(capabilityPreviewRequests).toBe(0);

  await page.getByRole('button', { name: 'Launch', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Run workflow', exact: true })).toBeVisible();
  await expect.poll(() => capabilityPreviewRequests).toBe(1);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('button', { name: 'Select workflow Kubernetes health check' }).click();
  await expect(page.getByRole('heading', { name: /Kubernetes health check/ })).toBeVisible();
  expect(capabilityPreviewRequests).toBe(1);
});

test('compact workflow discovery keeps every workspace section visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workspaces/fixture-workspace/workflows', { waitUntil: 'domcontentloaded' });

  const workflowSections = page.getByRole('tablist', { name: 'Workflow sections' });
  await expect(workflowSections.getByRole('tab')).toHaveCount(3);
  for (const name of ['Workflows', 'Schedules']) {
    await expect(workflowSections.getByRole('tab', { name, exact: true })).toBeInViewport();
  }
  await expect(workflowSections.getByRole('tab', { name: 'Webhooks', exact: true })).toHaveCount(0);
  await expect(workflowSections.getByRole('tab', { name: /^Runs/ })).toBeInViewport();

  const discoveryFrame = page.locator('[data-search-filter-frame="true"]').first();
  const discoveryBox = await discoveryFrame.boundingBox();
  expect(discoveryBox).not.toBeNull();
  expect(discoveryBox!.height).toBeLessThan(120);

  const previewRow = page.getByRole('button', { name: 'Select workflow Production health review', exact: true });
  const nextRow = page.getByRole('button', { name: 'Select workflow Kubernetes health check', exact: true });
  await expect(previewRow).toHaveAttribute('aria-pressed', 'false');
  await expect(previewRow).not.toHaveAttribute('aria-current', 'true');
  const [previewBackground, nextBackground] = await Promise.all([
    previewRow.evaluate((element) => getComputedStyle(element).backgroundColor),
    nextRow.evaluate((element) => getComputedStyle(element).backgroundColor)
  ]);
  expect(previewBackground).toBe(nextBackground);
});

test('workflow detail keeps primary navigation lean across contextual and compact views', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow', {
    waitUntil: 'domcontentloaded'
  });

  await expect(page.getByRole('heading', { name: 'Production health review', exact: true })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Workflow detail sections' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Workflow sections' })).toBeHidden();
  await expect(page.getByRole('searchbox', { name: 'Search workflow library' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Back to workflows' })).toBeVisible();
  await expect(page.getByText('Workflow terms', { exact: true })).toHaveCount(0);

  const workflowActions = page.getByLabel('Selected workflow actions').getByRole('button');
  await expect(workflowActions).toHaveCount(2);
  await expect(page.getByLabel('Selected workflow actions').getByRole('button', { name: 'Schedules', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Selected workflow actions').getByRole('button', { name: 'Webhooks', exact: true })).toHaveCount(0);

  const workflowDetailTabs = page.getByRole('tablist', { name: 'Workflow detail sections' });
  await expect(workflowDetailTabs.getByRole('tab')).toHaveCount(5);
  await expect(workflowDetailTabs.getByRole('tab', { name: 'Schedules', exact: true })).toBeAttached();
  await expect(workflowDetailTabs.getByRole('tab', { name: 'Webhooks', exact: true })).toBeAttached();
  await expect(workflowDetailTabs.getByRole('tab', { name: 'Agents', exact: true })).toHaveCount(0);
  await expect(page.getByText('Scroll for more sections', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Execution setup', exact: true })).toBeVisible();
  await expect(page.getByText('This workflow coordinates 2 assigned Agents as peers.', { exact: true })).toBeVisible();
  await expect(page.getByText('Effective access', { exact: true })).toBeVisible();
  await expect(page.getByText('Inherited from assigned Agents and revalidated before every run.', { exact: true })).toBeVisible();
  await expect(page.getByText('Choose one Agent for a direct run, or multiple Agents to coordinate.', { exact: true })).toHaveCount(0);
  await expect(page.getByText('AcornOps will coordinate work across 2 selected agents.', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit agents', exact: true }).click();
  await expect(page.getByText('Select at least one Agent. Choose one for a direct run, or multiple Agents to coordinate.', { exact: true })).toBeVisible();
  await expect(page.getByText('AcornOps will coordinate work across 2 selected agents.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save agents', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.getByRole('button', { name: 'View access', exact: true }).click();
  await expect(page).toHaveURL(/tab=capabilities/);
  await expect(page.getByRole('tab', { name: 'Capabilities', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Write policy', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('MCP servers', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Skills', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Direct MCP servers', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Installed skills', { exact: true })).toHaveCount(0);

  await page.getByRole('tab', { name: 'Runs', exact: true }).click();
  await expect(page).toHaveURL(/tab=runs/);
  await expect(page.getByRole('tab', { name: 'Runs', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Runs', exact: true })).toBeInViewport();

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

test('workflow workspace integrates discovery into the library and keeps empty Activity compact', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/workspaces/fixture-workspace/workflows', { waitUntil: 'domcontentloaded' });

  const workflowSearch = page.getByRole('searchbox', { name: 'Search workflow library' });
  const workflowDiscoveryFrame = page.locator('[data-search-filter-frame="true"]').filter({ has: workflowSearch });
  const workflowLibrary = page.locator('[data-master-detail-list="true"]');
  const workflowListHeader = workflowLibrary.locator('[data-master-detail-list-header="true"]');
  const workflowSections = page.getByRole('tablist', { name: 'Workflow sections' });
  const workflowDetailSections = page.getByRole('tablist', { name: 'Workflow detail sections' });
  const workflowIntro = page.getByText('Choose who runs each automation, what they can access, when it runs, and whether changes need approval.', { exact: true });
  const [workflowSearchBox, workflowDiscoveryFrameBox, workflowLibraryBox, workflowListHeaderBox] = await Promise.all([
    workflowSearch.boundingBox(),
    workflowDiscoveryFrame.boundingBox(),
    workflowLibrary.boundingBox(),
    workflowListHeader.boundingBox()
  ]);
  expect(workflowSearchBox).not.toBeNull();
  expect(workflowDiscoveryFrameBox).not.toBeNull();
  expect(workflowLibraryBox).not.toBeNull();
  expect(workflowDiscoveryFrameBox!.x).toBeGreaterThanOrEqual(workflowLibraryBox!.x);
  expect(workflowDiscoveryFrameBox!.x + workflowDiscoveryFrameBox!.width).toBeLessThanOrEqual(workflowLibraryBox!.x + workflowLibraryBox!.width + 1);
  expect(workflowLibraryBox!.width).toBeGreaterThanOrEqual(383);
  expect(workflowDiscoveryFrameBox!.height).toBeLessThan(120);
  expect(workflowListHeaderBox!.y - (workflowDiscoveryFrameBox!.y + workflowDiscoveryFrameBox!.height)).toBeLessThan(40);
  expect(workflowSearchBox!.width).toBeGreaterThan(200);
  await expect(workflowDiscoveryFrame).toHaveCSS('border-top-width', '0px');
  await expect(workflowDiscoveryFrame.getByText(/^\d+ workflows · Press \/ to focus search$/)).toBeVisible();
  await expect(workflowSections.getByText('Workspace', { exact: true })).toHaveCount(0);
  await expect(workflowDetailSections.locator('..').getByText('Workflow', { exact: true })).toHaveCount(0);
  const introMetrics = await workflowIntro.evaluate((element) => {
    const style = getComputedStyle(element);
    return { height: element.getBoundingClientRect().height, lineHeight: Number.parseFloat(style.lineHeight) };
  });
  expect(introMetrics.height).toBeLessThanOrEqual(introMetrics.lineHeight + 1);

  await workflowSections.getByRole('tab', { name: /^Runs/ }).click();
  const activitySearch = page.getByRole('searchbox', { name: 'Search runs' });
  await expect(activitySearch).toBeVisible();
  const activitySearchBox = await activitySearch.boundingBox();
  expect(activitySearchBox).not.toBeNull();
  expect(activitySearchBox!.width).toBeGreaterThan(400);

  await activitySearch.fill('no-matching-workflow-activity');
  await expect(page.getByRole('heading', { name: 'No runs match these filters' })).toBeVisible();
  const emptyLedgerBox = await page.getByRole('region', { name: 'Workflow runs' }).boundingBox();
  expect(emptyLedgerBox).not.toBeNull();
  expect(emptyLedgerBox!.height).toBeLessThan(350);
});

test('workflow schedule and run empty states share compact geometry and section icons', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    '/workspaces/fixture-workspace/workflows/schedules',
    { waitUntil: 'domcontentloaded' }
  );

  const schedulesTab = page.getByRole('tablist', { name: 'Workflow sections' }).getByRole('tab', { name: 'Schedules', exact: true });
  const scheduleSearch = page.getByRole('searchbox', { name: 'Search schedules' });
  await expect(scheduleSearch).toBeVisible();
  await scheduleSearch.fill('no-matching-workflow-schedule');
  const scheduleEmpty = page.locator('[data-empty-state="true"]:visible');
  await expect(scheduleEmpty.getByRole('heading', { name: 'No schedules match these filters' })).toBeVisible();
  await expect(schedulesTab.locator('.lucide-calendar-clock')).toBeVisible();
  await expect(scheduleEmpty.locator('.lucide-calendar-clock')).toBeVisible();
  const scheduleEmptyBox = await scheduleEmpty.boundingBox();
  expect(scheduleEmptyBox).not.toBeNull();

  await page.goto(
    '/workspaces/fixture-workspace/workflows?view=activity',
    { waitUntil: 'domcontentloaded' }
  );

  const runsTab = page.getByRole('tablist', { name: 'Workflow sections' }).getByRole('tab', { name: /^Runs/ });
  const activitySearch = page.getByRole('searchbox', { name: 'Search runs' });
  await expect(activitySearch).toBeVisible();
  await activitySearch.fill('no-matching-workflow-activity');
  const activityEmpty = page.locator('[data-empty-state="true"]:visible');
  await expect(activityEmpty.getByRole('heading', { name: 'No runs match these filters' })).toBeVisible();
  await expect(runsTab.locator('.lucide-activity')).toBeVisible();
  await expect(activityEmpty.locator('.lucide-activity')).toBeVisible();
  const activityEmptyBox = await activityEmpty.boundingBox();
  expect(activityEmptyBox).not.toBeNull();
  expect(Math.abs(scheduleEmptyBox!.height - activityEmptyBox!.height)).toBeLessThanOrEqual(1);
});

test('workflow workspace routes preserve stable scope and responsive geometry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/workspaces/fixture-workspace/workflows', { waitUntil: 'domcontentloaded' });

  const destinations = [
    { tab: 'Schedules', title: 'Schedules', search: 'Search schedules' },
    { tab: /^Runs/, title: 'Runs', search: 'Search runs' },
    { tab: 'Workflows', title: 'Workflows', search: 'Search workflow library' }
  ] as const;
  const workflowSections = page.getByRole('tablist', { name: 'Workflow sections' });
  await expect(workflowSections.getByRole('tab', { name: 'Inbound Webhooks' })).toHaveCount(0);

  for (const destination of destinations) {
    await workflowSections.getByRole('tab', { name: destination.tab }).click();
    await expect(page.getByRole('heading', { level: 1, name: destination.title })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: destination.search })).toBeVisible();
    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  }

  await workflowSections.getByRole('tab', { name: 'Schedules', exact: true }).click();
  const schedulesPanel = page.locator('#workflow-section-schedules-panel');
  const schedulesFrame = schedulesPanel.locator('[data-search-filter-frame="true"]');
  await expect(schedulesFrame).toBeVisible();
  const schedulesFrameBox = await schedulesFrame.boundingBox();
  const scheduleRowPadding = await schedulesPanel.locator('tbody tr').first().locator('th, td').first().evaluate((element) => {
    const style = getComputedStyle(element);
    return { left: style.paddingLeft, top: style.paddingTop };
  });
  const scheduleTableGeometry = await schedulesPanel.locator('table').first().evaluate((table) => {
    const scroller = table.parentElement;
    return {
      clientWidth: scroller?.clientWidth || 0,
      scrollWidth: scroller?.scrollWidth || 0
    };
  });
  expect(scheduleTableGeometry.scrollWidth).toBeLessThanOrEqual(scheduleTableGeometry.clientWidth + 1);

  await workflowSections.getByRole('tab', { name: /^Runs/ }).click();
  const runsPanel = page.locator('#workflow-section-activity-panel');
  const runsFrame = runsPanel.locator('[data-search-filter-frame="true"]');
  const runsLedger = runsPanel.getByRole('region', { name: 'Workflow runs' });
  await expect(runsFrame).toBeVisible();
  const [runsFrameBox, runsSearchBox, runsFiltersBox, runsSummaryBox, runsLedgerBox, runRowPadding] = await Promise.all([
    runsFrame.boundingBox(),
    runsFrame.locator('[data-search-filter-frame-search="true"]').boundingBox(),
    runsFrame.locator('[data-search-filter-frame-filters="true"] > *').first().boundingBox(),
    runsFrame.locator('[data-search-filter-frame-summary="true"]').boundingBox(),
    runsLedger.boundingBox(),
    runsLedger.locator('a').first().evaluate((element) => {
      const style = getComputedStyle(element);
      return { left: style.paddingLeft, top: style.paddingTop };
    })
  ]);
  expect(schedulesFrameBox).not.toBeNull();
  expect(runsFrameBox).not.toBeNull();
  expect(runsSearchBox).not.toBeNull();
  expect(runsFiltersBox).not.toBeNull();
  expect(runsSummaryBox).not.toBeNull();
  expect(runsLedgerBox).not.toBeNull();
  expect(runsFrameBox!.height).toBeLessThanOrEqual(schedulesFrameBox!.height + 1);
  expect(Math.abs(runsSearchBox!.y - runsFiltersBox!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(runsSearchBox!.y - runsSummaryBox!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(runsLedgerBox!.y - (runsFrameBox!.y + runsFrameBox!.height) - 16)).toBeLessThanOrEqual(1);
  expect(runRowPadding).toEqual(scheduleRowPadding);
});

test('workflow detail uses one full-width page-scrolled pane on smaller desktops', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow', {
    waitUntil: 'domcontentloaded'
  });
  await expect(page.getByRole('heading', { name: 'Production health review' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to workflows' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Workflow sections' })).toBeHidden();
  await expect(page.locator('[data-master-detail-list="true"]')).toBeHidden();

  const detailBody = page.locator('[data-master-detail-pane-body="true"]');
  const geometry = await page.evaluate(() => {
    const pageShell = document.querySelector<HTMLElement>('.page-shell');
    const layout = document.querySelector<HTMLElement>('[data-master-detail-layout="true"]');
    const detail = document.querySelector<HTMLElement>('[data-master-detail-detail="true"]');
    const detailBody = document.querySelector<HTMLElement>('[data-master-detail-pane-body="true"]');
    const detailHeader = document.querySelector<HTMLElement>('[data-master-detail-pane-header="true"]');
    return {
      pageOverflowY: pageShell ? getComputedStyle(pageShell).overflowY : null,
      layoutWidth: layout?.getBoundingClientRect().width ?? 0,
      detailWidth: detail?.getBoundingClientRect().width ?? 0,
      detailOverflowY: detail ? getComputedStyle(detail).overflowY : null,
      bodyOverflowY: detailBody ? getComputedStyle(detailBody).overflowY : null,
      headerDensity: detailHeader?.dataset.density,
      headerHeight: detailHeader?.getBoundingClientRect().height ?? 0,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth
    };
  });

  expect(geometry.pageOverflowY).toBe('auto');
  expect(geometry.detailOverflowY).not.toBe('hidden');
  expect(geometry.bodyOverflowY).not.toBe('auto');
  expect(Math.abs(geometry.layoutWidth - geometry.detailWidth)).toBeLessThanOrEqual(2);
  expect(geometry.headerDensity).toBe('default');
  expect(geometry.headerHeight).toBeLessThanOrEqual(250);
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.documentClientWidth + 1);
  await expect(page.getByRole('tab', { name: 'Runs', exact: true })).toBeInViewport();
  await expect(page.getByRole('heading', { name: 'Execution setup', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Back to workflows' }).click();
  await expect(page).not.toHaveURL(/workflow=/);
  await expect(page.getByRole('region', { name: 'Workflow library' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select workflow Production health review' })).toBeFocused();
});

test('workflow split view begins at the 1440px boundary', async ({ page }) => {
  await page.setViewportSize({ width: 1439, height: 900 });
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow', {
    waitUntil: 'domcontentloaded'
  });

  const library = page.locator('[data-master-detail-list="true"]');
  const back = page.getByRole('button', { name: 'Back to workflows' });
  await expect(library).toBeHidden();
  await expect(back).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(library).toBeVisible();
  await expect(back).toBeHidden();
  await expect(page.locator('.page-shell')).toHaveCSS('overflow-y', 'hidden');
});

test('workflow wide workspace keeps chrome fixed and scrolls detail content independently', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 720 });
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
  expect(initial.headerHeight).toBeLessThanOrEqual(250);

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

  await page.getByRole('tab', { name: 'Runs', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Runs', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(detailBody).toHaveCSS('overflow-y', 'auto');
  await expect(page.locator('.page-shell')).toHaveCSS('overflow-y', 'hidden');
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
  await expect(drawer.getByRole('combobox')).toHaveCount(0);
  await drawer.getByRole('button', { name: 'Launch workflow' }).click();
  await expect(drawer).toBeHidden();
  await expect(page.getByRole('tab', { name: 'Runs', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('workflow authoring keeps optional details out of the required path', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Add workflow' }).click();

  const drawer = page.getByRole('dialog', { name: 'Create workflow' });
  const setup = drawer.getByLabel('Create workflow setup');
  await expect(setup.getByText('Name', { exact: true })).toBeVisible();
  await expect(setup.getByText('Agents', { exact: true })).toBeVisible();
  await expect(setup.getByText('Review', { exact: true })).toHaveCount(0);
  await expect(drawer.getByRole('button', { name: 'Reset' })).toHaveCount(0);
  await expect(drawer.getByRole('button', { name: 'Back to name' })).toHaveCount(0);
  await expect(drawer.getByRole('combobox', { name: 'Default instructions' })).toHaveCount(0);
  await drawer.getByText('Add optional details', { exact: true }).click();
  const prompt = drawer.getByRole('combobox', { name: 'Default instructions' });
  await expect(prompt).toHaveAttribute('aria-autocomplete', 'list');
  await expect(drawer.getByRole('listbox')).toHaveCount(0);

  await drawer.locator('#create-workflow-name-input').fill('Lean workflow');
  await expect(drawer.getByText('Copied into every launch. Leave blank to use “Start Lean workflow.”')).toBeVisible();
  await prompt.fill('Review production health and summarize the result.');
  await drawer.getByRole('button', { name: 'Choose Agents' }).click();
  await expect(drawer.getByRole('button', { name: 'Back to name' })).toBeVisible();
  await expect(drawer.getByText('Select at least one Agent. Choose one for a direct run, or multiple Agents to coordinate.')).toBeVisible();
  await expect(drawer.getByRole('status')).toHaveCount(0);
  await expect(drawer.getByText('Inspects repository state and prepares bounded operational changes.')).toBeVisible();
  const createButton = drawer.getByRole('button', { name: 'Create workflow', exact: true });
  await expect(createButton).toBeDisabled();
  await drawer.getByRole('checkbox').first().check();
  await expect(drawer.getByText('This workflow runs directly with Workflow Analyst.')).toBeVisible();
  await expect(drawer.getByRole('status')).toHaveText('This workflow runs directly with Workflow Analyst.');
  await expect(createButton).toBeEnabled();
  await drawer.getByRole('button', { name: 'Close create workflow drawer' }).click();
  await expect(drawer.getByText('Discard workflow draft?')).toBeVisible();
  await drawer.getByRole('button', { name: 'Continue editing' }).click();
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: 'Close create workflow drawer' }).click();
  await drawer.getByRole('button', { name: 'Discard draft' }).click();
  await expect(drawer).toBeHidden();
});

test('workflow help and keyboard shortcuts keep advanced help close at hand', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows', { waitUntil: 'domcontentloaded' });

  const helpButton = page.getByRole('button', { name: 'Workflow help' });
  await helpButton.click();
  const help = page.getByRole('dialog', { name: 'Workflow help' });
  await expect(help).toBeVisible();
  await expect(page).toHaveURL(/panel=help/);
  await help.getByRole('textbox', { name: 'Search workflow help' }).fill('MCP');
  await expect(help.getByRole('heading', { name: 'Capabilities and MCP' })).toBeVisible();
  await expect(help.getByRole('heading', { name: 'Schedules and cron' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(help).toBeHidden();
  await expect(page).not.toHaveURL(/panel=help/);
  await expect(helpButton).toBeFocused();

  await page.keyboard.press('/');
  const search = page.getByRole('searchbox', { name: 'Search workflow library' });
  await expect(search).toBeFocused();
  await search.fill('');
  await page.keyboard.press('Escape');

  const firstWorkflow = page.getByRole('button', { name: /^Select workflow/ }).first();
  const secondWorkflow = page.getByRole('button', { name: /^Select workflow/ }).nth(1);
  await firstWorkflow.focus();
  await page.keyboard.press('ArrowDown');
  await expect(secondWorkflow).toBeFocused();

  await page.keyboard.press('Control+Enter');
  await expect(page.getByRole('dialog', { name: 'Run workflow' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Run workflow' }).getByRole('button', { name: 'Launch workflow' })).toBeVisible();
});

test('workflow edits offer a one-click undo', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const name = page.getByLabel('Workflow name');
  await name.fill('Production health review updated');
  await page.getByRole('button', { name: 'Save workflow' }).click();
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await expect(undo).toBeVisible();
  await undo.click();
  await expect(page.getByRole('heading', { name: 'Production health review', exact: true })).toBeVisible();
  await expect(undo).toHaveCount(0);
});

test('workflow mutations use one aligned undo notice', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-template-virtual-machine-health', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Edit agents', exact: true }).click();
  await page.getByRole('button', { name: 'Save agents', exact: true }).click();

  const notice = page.getByRole('status').filter({ hasText: 'Agent assignment updated.' });
  await expect(notice).toBeVisible();
  await expect(notice).toHaveClass(/bg-status-success-soft\/40/);
  await expect(page.getByText('Agent assignment updated.', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Selected Agents saved.', { exact: false })).toHaveCount(0);
  await expect(notice.getByRole('button', { name: 'Dismiss workflow update notification' })).toBeVisible();

  const alignment = await notice.evaluate((element) => {
    const styles = getComputedStyle(element);
    const message = element.querySelector<HTMLElement>('.min-w-0.flex-1');
    const undo = element.querySelector<HTMLElement>('button');
    const messageBox = message?.getBoundingClientRect();
    const undoBox = undo?.getBoundingClientRect();
    return {
      alignItems: styles.alignItems,
      paddingLeft: styles.paddingLeft,
      centerDelta: messageBox && undoBox
        ? Math.abs((messageBox.top + messageBox.height / 2) - (undoBox.top + undoBox.height / 2))
        : Number.POSITIVE_INFINITY
    };
  });
  expect(alignment.alignItems).toBe('center');
  expect(alignment.paddingLeft).toBe('24px');
  expect(alignment.centerDelta).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Workflow name').fill('Virtual machine health check updated');
  await page.getByRole('button', { name: 'Save workflow', exact: true }).click();
  const updatedNotice = page.getByRole('status').filter({ hasText: 'Workflow updated.' });
  await expect(updatedNotice).toBeVisible();
  await updatedNotice.getByRole('button', { name: 'Dismiss workflow update notification' }).click();
  await expect(updatedNotice).toHaveCount(0);
});

test('workflow trigger tabs share the same toolbar and data-surface rhythm', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow', { waitUntil: 'domcontentloaded' });

  const tabs = page.getByRole('tablist', { name: 'Workflow detail sections' });
  const overviewPanel = page.getByRole('tabpanel', { name: 'Overview' });
  const overviewContentBox = await overviewPanel.locator('section section').first().boundingBox();
  expect(overviewContentBox).not.toBeNull();
  const measurements: Array<{ surfaceX: number; surfaceY: number; surfaceWidth: number; toolbarX: number; toolbarY: number; toolbarWidth: number; toolbarHeight: number }> = [];
  for (const triggerTab of [
    { name: 'Schedules', summary: '2 schedules' },
    { name: 'Webhooks', summary: '1 webhook' }
  ]) {
    await tabs.getByRole('tab', { name: triggerTab.name, exact: true }).click();
    const panel = page.getByRole('tabpanel', { name: triggerTab.name });
    const toolbar = panel.locator('[data-workflow-trigger-toolbar="true"]');
    const surface = panel.locator('.data-surface').first();
    await expect(toolbar.getByRole('status')).toHaveText(triggerTab.summary);
    await expect(surface).toBeVisible();
    const [toolbarBox, surfaceBox] = await Promise.all([toolbar.boundingBox(), surface.boundingBox()]);
    expect(toolbarBox).not.toBeNull();
    expect(surfaceBox).not.toBeNull();
    measurements.push({
      surfaceX: surfaceBox!.x,
      surfaceY: surfaceBox!.y,
      surfaceWidth: surfaceBox!.width,
      toolbarX: toolbarBox!.x,
      toolbarY: toolbarBox!.y,
      toolbarWidth: toolbarBox!.width,
      toolbarHeight: toolbarBox!.height
    });
  }

  for (const measurement of measurements) {
    expect(Math.abs(measurement.toolbarX - overviewContentBox!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(measurement.toolbarY - overviewContentBox!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(measurement.toolbarWidth - overviewContentBox!.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(measurement.surfaceX - overviewContentBox!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(measurement.surfaceWidth - overviewContentBox!.width)).toBeLessThanOrEqual(1);
  }
  expect(Math.abs(measurements[0].surfaceX - measurements[1].surfaceX)).toBeLessThanOrEqual(1);
  expect(Math.abs(measurements[0].surfaceY - measurements[1].surfaceY)).toBeLessThanOrEqual(1);
  expect(Math.abs(measurements[0].surfaceWidth - measurements[1].surfaceWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(measurements[0].toolbarHeight - measurements[1].toolbarHeight)).toBeLessThanOrEqual(1);
});

test('workflow schedule scope is not presented as a clearable filter', async ({ page }) => {
  await page.goto(
    '/workspaces/fixture-workspace/workflows?workflow=fixture-template-virtual-machine-health&tab=schedules',
    { waitUntil: 'domcontentloaded' }
  );

  const schedulesPanel = page.getByRole('tabpanel', { name: 'Schedules' });
  await expect(schedulesPanel.getByRole('heading', { name: 'No workflow schedules' })).toBeVisible();
  await expect(schedulesPanel.getByRole('heading', { name: 'No schedules match these filters' })).toHaveCount(0);
  await expect(schedulesPanel.getByRole('button', { name: 'Clear all' })).toHaveCount(0);
});

test('workflow deletion identifies the exact confirmation name', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('button', { name: 'Delete workflow', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Delete workflow' });
  const confirmation = dialog.getByRole('textbox', { name: 'Type Production health review to confirm' });
  const deleteButton = dialog.getByRole('button', { name: 'Delete workflow', exact: true });
  await expect(confirmation).toBeVisible();
  await expect(deleteButton).toBeDisabled();
  await confirmation.fill('Production health review');
  await expect(deleteButton).toBeEnabled();
});

test('workflow schedule tab creates a schedule in a bounded dialog', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow', {
    waitUntil: 'domcontentloaded'
  });
  await page.getByRole('tablist', { name: 'Workflow detail sections' }).getByRole('tab', { name: 'Schedules', exact: true }).click();
  await expect(page).toHaveURL(/tab=schedules/);
  const schedulesPanel = page.getByRole('tabpanel', { name: 'Schedules' });
  await expect(schedulesPanel).toBeVisible();
  await schedulesPanel.getByRole('button', { name: 'Create schedule' }).click();

  const dialog = page.getByRole('dialog', { name: 'Create schedule' });
  await expect(dialog.getByRole('heading', { name: 'Workflow inputs' })).toHaveCount(0);
  await expect(dialog.getByRole('combobox', { name: 'Target' })).toHaveCount(0);
  const scheduleBox = await dialog.boundingBox();
  expect(scheduleBox?.width).toBeLessThanOrEqual(578);
  expect(scheduleBox?.height).toBeLessThanOrEqual(578);
  await expect(dialog.getByRole('button', { name: 'Frequency' })).toBeVisible();
  await expect(dialog.getByText('Search or enter an IANA timezone')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Save schedule' })).toBeEnabled();

  await dialog.getByRole('button', { name: 'Frequency' }).click();
  await page.getByRole('option', { name: 'Custom' }).click();
  const cron = dialog.getByLabel(/Cron expression/);
  await cron.fill('60 24 * * 1-5');
  await dialog.getByRole('button', { name: 'Save schedule' }).click();
  await expect(dialog.getByText('Enter a valid five-part cron expression.')).toBeVisible();

  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog.getByText('Discard unsaved schedule changes?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Continue editing' }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await dialog.getByRole('button', { name: 'Discard changes' }).click();
  await expect(dialog).toBeHidden();
});

test('workflow webhook management stays scoped in a table-first detail tab and creates in a modal', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow&panel=webhooks', {
    waitUntil: 'domcontentloaded'
  });

  const webhooksPanel = page.getByRole('tabpanel', { name: 'Webhooks' });
  await expect(webhooksPanel).toBeVisible();
  await expect(page).toHaveURL(/tab=webhooks/);
  await expect(webhooksPanel.getByRole('table', { name: 'Inbound workflow webhooks' })).toBeVisible();
  await expect(webhooksPanel.getByRole('columnheader', { name: 'Status' })).toBeVisible();
  await expect(webhooksPanel.getByRole('columnheader', { name: 'Last dispatch' })).toBeVisible();
  await expect(webhooksPanel.getByRole('rowheader', { name: 'External production review' })).toBeVisible();

  await webhooksPanel.getByRole('button', { name: 'Create webhook' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create inbound webhook' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Production health review', { exact: true })).toBeVisible();
  const webhookBox = await dialog.boundingBox();
  expect(webhookBox?.width).toBeLessThanOrEqual(578);
  expect(webhookBox?.height).toBeLessThanOrEqual(578);
});
