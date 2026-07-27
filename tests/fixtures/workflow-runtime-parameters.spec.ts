import { expect, test } from '@playwright/test';

test('default workflows are directly editable without creating a copy', async ({ page }) => {
  await page.goto(
    '/workspaces/fixture-workspace/workflows?workflow=fixture-template-target-diagnostics',
    { waitUntil: 'domcontentloaded' }
  );

  await expect(page.getByRole('button', { name: 'Create editable copy' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Launch', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Workflow name')).toHaveValue('Target diagnostics');
});

test('parameterized workflow launch supports keyboard resource selection and resets on close', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow', {
    waitUntil: 'domcontentloaded'
  });

  const launchFromOverview = page.getByRole('button', { name: 'Launch', exact: true });
  await expect(launchFromOverview).toBeEnabled();
  await launchFromOverview.click();

  const drawer = page.getByRole('dialog', { name: 'Run workflow' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('{{target:target}}', { exact: false })).toBeVisible();

  const target = drawer.getByRole('combobox', { name: 'Target' });
  await target.fill('Singapore');
  const targetOption = drawer.getByRole('option', { name: /Singapore Production/ });
  await expect(targetOption).toBeVisible();
  await expect(targetOption).toHaveAttribute('tabindex', '-1');
  await target.press('ArrowDown');
  await target.press('Enter');
  await expect(target).toHaveValue('Singapore Production');
  await expect(drawer.getByRole('button', { name: 'Launch workflow' })).toBeEnabled();

  await target.fill('Payments');
  const replacementOption = drawer.getByRole('option', { name: /Payments VM/ });
  await expect(replacementOption).toBeVisible();
  await target.press('Enter');
  await expect(target).toHaveValue('Payments VM');

  await drawer.getByRole('button', { name: 'Cancel' }).click();
  await expect(drawer).toBeHidden();
  await launchFromOverview.click();
  await expect(page.getByRole('dialog', { name: 'Run workflow' }).getByRole('combobox', { name: 'Target' })).toHaveValue('');
});

test('workflow authoring parameter palette supports keyboard, mouse, escape, and errors', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Create workflow' }).click();

  const drawer = page.getByRole('dialog', { name: 'Create workflow' });
  const prompt = drawer.getByRole('combobox', { name: 'Workflow prompt' });
  await prompt.fill('{{');
  const parameterTypes = drawer.getByRole('listbox', { name: 'Workflow parameter types' });
  await expect(parameterTypes).toBeVisible();
  await expect(prompt).toHaveAttribute('aria-expanded', 'true');
  await expect(prompt).toHaveAttribute('aria-activedescendant', /option-0$/);

  await prompt.press('ArrowDown');
  await expect(parameterTypes.getByRole('option', { name: /Target/ })).toHaveAttribute('aria-selected', 'true');
  await expect(prompt).toHaveAttribute('aria-activedescendant', /option-1$/);
  await prompt.press('Enter');
  await expect(prompt).toHaveValue('{{target:');
  await prompt.type('cluster');
  await prompt.press('Tab');
  await expect(prompt).toHaveValue('{{target:cluster}}');
  await expect(drawer.locator('code').filter({ hasText: '{{target:cluster}}' })).toBeVisible();

  await prompt.fill('{{');
  await parameterTypes.getByRole('option', { name: /Chat/ }).click();
  await expect(prompt).toHaveValue('{{chat:');
  await expect(prompt).toBeFocused();

  await prompt.fill('{{');
  await prompt.press('Escape');
  await expect(parameterTypes).toBeHidden();
  await expect(prompt).toHaveAttribute('aria-expanded', 'false');
  await expect(prompt).toBeFocused();

  await prompt.fill('{{text:Bad Key}}');
  await expect(drawer.getByRole('alert')).toContainText('lowercase snake_case key');
  await expect(prompt).toHaveAttribute('aria-invalid', 'true');
  await expect(prompt).toHaveAttribute('aria-describedby', /workflow-prompt-error/);
});

test('schedule creation uses the same generated runtime parameter controls', async ({ page }) => {
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow', {
    waitUntil: 'domcontentloaded'
  });
  await page.getByRole('button', { name: 'Schedule', exact: true }).click();

  const drawer = page.getByRole('dialog', { name: 'Schedule workflow' });
  await expect(drawer.getByRole('heading', { name: 'Workflow inputs' })).toBeVisible();
  const target = drawer.getByRole('combobox', { name: 'Target' });
  await target.fill('Singapore');
  await expect(drawer.getByRole('option', { name: /Singapore Production/ })).toBeVisible();
  await target.press('Enter');
  await expect(target).toHaveValue('Singapore Production');
  await expect(drawer.getByRole('button', { name: 'Create schedule' })).toBeEnabled();
});
