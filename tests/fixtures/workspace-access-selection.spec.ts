import { expect, test } from '@playwright/test';

test('member search counts distinguish zero, one and many loaded matches', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/members?fixtureMembers=125&fixtureMemberNames=duplicate-long');
  const search = page.getByRole('textbox', { name: 'Search members', exact: true });
  for (const [query, count] of [['no-matching-person', '0 loaded matches'], ['member-125', '1 loaded match'], ['Alex', '2 loaded matches']]) {
    await search.fill(query);
    await expect(page.getByText(count, { exact: true })).toBeVisible();
  }
});

test('shared role Select ignores disabled mouse choices and skips them during keyboard navigation', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('acornops-fixture-role', 'admin'));
  await page.goto('/workspaces/fixture-workspace/members?fixtureRoles=custom-reordered', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Invite Member', exact: true }).click();
  const role = page.getByRole('dialog', { name: 'Invite Member', exact: true }).getByRole('button', { name: 'Role', exact: true });
  await role.click();
  const allowed = page.getByRole('option', { name: 'Incident reviewer', exact: true });
  const protectedRole = page.getByRole('option', { name: 'Owner', exact: true });
  await expect(protectedRole).toBeDisabled();
  await role.press('Home');
  await expect(role).toHaveAttribute('aria-activedescendant', (await allowed.getAttribute('id'))!);
  await protectedRole.hover();
  const box = await protectedRole.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(role).toHaveAttribute('aria-expanded', 'true');
  await expect(role).toContainText('Select role');
  await expect(role).toHaveAttribute('aria-activedescendant', (await allowed.getAttribute('id'))!);
  await role.press('End');
  await role.press('Enter');
  await expect(role).toContainText('Incident reviewer');
});

for (const { width, theme } of [1440, 390].flatMap(width => (['light', 'dark'] as const).map(theme => ({ width, theme })))) {
  test(`invitation and direct-add require explicit roles and distinct identities at ${width}px ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ colorScheme: theme });
    // The existing general fixture lacks candidate discovery. Supply only that
    // HTTP response here; form controls and membership/invitation mutations stay real.
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.origin);
        if (!url.pathname.endsWith('/member-candidates')) return originalFetch(input, init);
        const query = url.searchParams.get('q') || '';
        const items = query.toLowerCase().includes('alex') ? [1, 2].map((number) => ({ userId: `new-alex-${number}`, displayName: 'Alex Chen', email: `alex${number}@example.test`, authMethods: ['oidc'], status: 'available' })) : [];
        return Promise.resolve(new Response(JSON.stringify({ mode: 'directory', items }), { status: 200, headers: { 'content-type': 'application/json' } }));
      };
    });
    await page.goto('/workspaces/fixture-workspace/members?fixtureRoles=custom-reordered', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark).*$/);
    const mutations: Array<{ path: string; body: any }> = [];
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (request.method() === 'POST' && /\/(members|invitations)$/.test(path)) mutations.push({ path, body: request.postDataJSON() });
    });
    await page.getByRole('button', { name: 'Invite Member', exact: true }).click();
    let dialog = page.getByRole('dialog', { name: 'Invite Member', exact: true });
    const identity = () => dialog.getByLabel('Person or email', { exact: true });
    const role = () => dialog.getByRole('button', { name: 'Role', exact: true });
    await expect(role()).toContainText('Select role');
    await expect(dialog.getByRole('button', { name: 'Create Link', exact: true })).toBeDisabled();
    await identity().fill('new-person@example.test');
    await expect(dialog.getByRole('button', { name: 'Create Link', exact: true })).toBeDisabled();
    await role().focus(); await page.mouse.move(0, 0); await role().press('ArrowDown'); await role().press('Enter');
    await expect(role()).toContainText('Viewer');
    await expect(dialog.getByRole('button', { name: 'Create Link', exact: true })).toBeEnabled();
    await identity().fill('invalid');
    await expect(dialog.getByRole('button', { name: 'Create Link', exact: true })).toBeDisabled();
    expect(mutations).toEqual([]);
    await identity().fill('new-person@example.test');
    await dialog.getByRole('button', { name: 'Create Link', exact: true }).click();
    await expect(dialog.getByText('Invite Link', { exact: true })).toBeVisible();
    expect(mutations).toEqual([{ path: '/api/v1/workspaces/fixture-workspace/invitations', body: { email: 'new-person@example.test', role: 'viewer' } }]);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Invite Member', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Invite Member', exact: true });
    await identity().fill('Alex');
    await expect(page.getByRole('option', { name: /Alex Chen.*alex1@example.test/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /Alex Chen.*alex2@example.test/ })).toBeVisible();
    await page.mouse.move(0, 0);
    await identity().press('ArrowDown'); await identity().press('Enter');
    await expect(identity()).toHaveValue('alex2@example.test');
    await expect(dialog.getByRole('button', { name: 'Add Member', exact: true })).toBeDisabled();
    await role().focus(); await role().press('ArrowDown'); await role().press('ArrowDown'); await role().press('Enter');
    await expect(role()).toContainText('Incident reviewer');
    await expect(dialog.getByText('Alex Chen (alex2@example.test) will be added immediately.')).toBeVisible();
    await page.screenshot({ path: `/tmp/acornops-phase03-mc-invite-${width}-${theme}.png` });
    await dialog.getByRole('button', { name: 'Add Member', exact: true }).click();
    await expect(dialog.getByText('Access added', { exact: true })).toBeVisible();
    expect(mutations[1]).toEqual({ path: '/api/v1/workspaces/fixture-workspace/members', body: { userId: 'new-alex-2', email: 'alex2@example.test', role: 'incident-reviewer' } });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}
