import { expect, test } from '@playwright/test';

const alias = 'm_40ad20abc2fe4669a5d259107c56cc55_get_resource_log_ca829ba628';

for (const width of [1440, 390]) {
  test(`workflow MCP labels use full canonical names at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(({ alias }) => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const response = await originalFetch(input, init);
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
        if (!url.pathname.endsWith('/workspaces/fixture-workspace/agents')) return response;
        const body = await response.json();
        const agent = body.items.find((item: { name: string }) => item.name === 'Virtual Machine Agent');
        agent.tools = [];
        agent.mcpInstallations = [{
          id: 'server-1', name: 'AcornOps Targets', url: 'builtin://targets', enabled: true,
          credentialMode: 'none', revision: 1,
          tools: [{ toolName: 'get_resource_logs', serverId: 'server-1', alias,
            description: 'Get resource logs from the selected target.', capability: 'read', enabled: true,
            reviewState: 'approved', riskLevel: 'read_only', autoAllowed: false },
          { toolName: 'list_target_issues', serverId: 'server-1',
            alias: 'm_40ad20abc2fe4669a5d259107c56cc55_list_target_issu_fdd43adb80',
            description: 'List issues for a target.', capability: 'read', enabled: true,
            reviewState: 'approved', riskLevel: 'read_only', autoAllowed: false }]
        }];
        return new Response(JSON.stringify(body), { status: response.status, headers: response.headers });
      };
    }, { alias });

    await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-template-virtual-machine-health&tab=capabilities');
    const panel = page.getByRole('tabpanel', { name: 'Capabilities' });
    await expect(panel.getByText('get_resource_logs', { exact: true })).toBeVisible();
    await expect(panel.getByText('list_target_issues', { exact: true })).toBeVisible();
    await expect(panel).not.toContainText(alias);
    await expect(panel.getByText('AcornOps Targets', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`workflow-tool-labels-${width}.png`), fullPage: true });
  });
}
