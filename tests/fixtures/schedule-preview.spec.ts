import { expect, test, type Page } from '@playwright/test';
import { FIXTURE_CLOCK } from '../../src/fixtures/store';
import { fixtureScheduleOccurrences } from '../../src/fixtures/workflowCapabilityPreview';

const previewTimes = fixtureScheduleOccurrences(FIXTURE_CLOCK);

async function openSchedule(page: Page, scenario = '') {
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow&tab=schedules');
  await page.evaluate((value) => sessionStorage.setItem('preview-case', value), scenario);
  await page.getByRole('button', { name: 'Create schedule', exact: true }).click();
  return page.getByRole('dialog', { name: 'Create schedule', exact: true });
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_CLOCK);
  await page.addInitScript((nextRunTimes) => {
    const original = window.fetch.bind(window);
    let previewRequests = 0;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const scenario = sessionStorage.getItem('preview-case');
      if (scenario === 'other-owner' && url.includes('/workflow-schedules') && (!init?.method || init.method === 'GET')) {
        const response = await original(input, init);
        const payload = await response.json();
        payload.items = payload.items.map((item: Record<string, unknown>) => ({ ...item, principal: { type: 'user', id: 'another-owner' } }));
        return new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } });
      }
      if (url.endsWith('/workflow-schedules/preview')) {
        const body = JSON.parse(String(init?.body));
        sessionStorage.setItem('preview-body', JSON.stringify(body));
        previewRequests += 1;
        if (scenario === 'retry' && previewRequests === 1) return new Response('{}', { status: 503, headers: { 'content-type': 'application/json' } });
        if (scenario === 'stale' && body.timezone === 'UTC') {
          sessionStorage.setItem('old-preview-started', 'true');
          await new Promise((resolve) => setTimeout(resolve, 1200));
          sessionStorage.setItem('old-preview-finished', 'true');
          return new Response(JSON.stringify({ valid: false, summary: '', nextRunTimes: [], errors: [{ field: 'timezone', message: 'Stale timezone error' }] }), { headers: { 'content-type': 'application/json' } });
        }
        const errors = scenario === 'guided' ? [{ field: 'cron', message: 'This guided cadence has no upcoming run.' }] : body.cron === '0 0 31 2 *'
          ? [{ field: 'cron', message: 'February has no 31st day. Choose another date.' }]
          : [];
        return new Response(JSON.stringify({ valid: !errors.length, summary: 'Checked cadence',
          nextRunTimes: errors.length || scenario === 'empty' ? [] : scenario === 'dst' ? ['2026-11-01T05:30:00.000Z', '2026-11-01T06:30:00.000Z'] : nextRunTimes, errors
        }), { headers: { 'content-type': 'application/json' } });
      }
      if (url.endsWith('/workflow-schedules') && init?.method === 'POST') {
        return new Response(JSON.stringify({ error: { code: 'INVALID_CRON',
          message: 'Review this cadence before saving.', retryable: false } }),
        { status: 400, headers: { 'content-type': 'application/json' } });
      }
      return original(input, init);
    };
  }, previewTimes);
});

test('server DST occurrences retain distinct instants and zone offsets', async ({ page }) => {
  const dialog = await openSchedule(page, 'dst');
  await dialog.getByLabel(/^Timezone/).fill('America/New_York');
  const times = dialog.getByRole('region', { name: 'Upcoming runs' }).locator('time');
  await expect(times).toHaveCount(2);
  await expect(times.nth(0)).toHaveAttribute('datetime', '2026-11-01T05:30:00.000Z');
  await expect(times.nth(1)).toHaveAttribute('datetime', '2026-11-01T06:30:00.000Z');
  await expect(times.nth(0)).toContainText('EDT');
  await expect(times.nth(1)).toContainText('EST');
});

test('transport failure is retryable and keeps Save disabled until a usable preview returns', async ({ page }) => {
  const dialog = await openSchedule(page, 'retry');
  const preview = dialog.getByRole('region', { name: 'Upcoming runs' });
  await expect(preview.getByText('Run times could not be checked. Retry before saving.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Save schedule', exact: true })).toBeDisabled();
  await preview.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(preview.locator('time')).toHaveCount(2);
  await expect(dialog.getByRole('button', { name: 'Save schedule', exact: true })).toBeEnabled();
});

test('guided cadence errors are visible and described by the time input', async ({ page }) => {
  const dialog = await openSchedule(page, 'guided');
  await expect(dialog.getByText('This guided cadence has no upcoming run.')).toBeVisible();
  const time = dialog.locator('input[type="time"]');
  await expect(time).toHaveAttribute('aria-invalid', 'true');
  await expect(time).toHaveAttribute('aria-describedby', 'schedule-cron-error');
  await expect(dialog.getByRole('button', { name: 'Save schedule', exact: true })).toBeDisabled();
});

test('an empty occurrence result fails closed even when the server marks it valid', async ({ page }) => {
  const dialog = await openSchedule(page, 'empty');
  await expect(dialog.getByText('No upcoming run was found. Choose a different cadence.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Save schedule', exact: true })).toBeDisabled();
});

test('changing timezone invalidates pending results and ignores a late old error', async ({ page }) => {
  const dialog = await openSchedule(page, 'stale');
  await dialog.getByLabel(/^Timezone/).fill('UTC');
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('old-preview-started'))).toBe('true');
  await dialog.getByLabel(/^Timezone/).fill('Asia/Singapore');
  await expect(dialog.getByRole('button', { name: 'Save schedule', exact: true })).toBeDisabled();
  await expect(dialog.getByRole('region', { name: 'Upcoming runs' }).locator('time')).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('old-preview-finished'))).toBe('true');
  await expect(dialog.getByText('Stale timezone error')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Save schedule', exact: true })).toBeEnabled();
});

test('editing another owner uses the current user only for cadence preview', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('preview-case', 'other-owner'));
  await page.goto('/workspaces/fixture-workspace/workflows?workflow=fixture-workflow&tab=schedules');
  await page.getByRole('button', { name: 'Schedule actions for Weekday morning review', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit schedule', exact: true });
  await expect(dialog.getByText(/This schedule runs as another user/)).toBeVisible();
  await expect(dialog.getByRole('region', { name: 'Upcoming runs' }).locator('time')).toHaveCount(2);
  const body = await page.evaluate(() => JSON.parse(sessionStorage.getItem('preview-body')!));
  expect(body.enabled).toBe(false);
  expect(body.principal).toEqual({ type: 'user', id: 'fixture-user' });
});

test('schedule preview renders server occurrences in the selected timezone', async ({ page }) => {
  const dialog = await openSchedule(page);
  await dialog.getByLabel(/^Timezone/).fill('Asia/Singapore');
  const preview = dialog.getByRole('region', { name: /Upcoming runs/ });
  await expect(preview).toBeVisible({ timeout: 3_000 });
  await expect(preview.locator('time')).toHaveCount(2);
  await expect(preview.locator('time').first()).toHaveAttribute('datetime', '2026-07-16T01:00:00.000Z');
  expect(previewTimes.every((time) => Date.parse(time) > Date.parse(FIXTURE_CLOCK))).toBe(true);
  await expect(preview.locator('time').first()).toContainText(/9:00|09:00/);
});

test('schedule preview displays server field errors and prevents an invalid save', async ({ page }) => {
  const dialog = await openSchedule(page);
  await dialog.getByRole('button', { name: 'Frequency', exact: true }).click();
  await page.getByRole('option', { name: 'Custom cron', exact: true }).click();
  await dialog.getByLabel(/Cron expression/).fill('0 0 31 2 *');
  await expect(dialog.getByText('February has no 31st day. Choose another date.')).toBeVisible({ timeout: 3_000 });
  await expect(dialog.getByLabel(/Cron expression/)).toHaveAttribute('aria-invalid', 'true');
  await expect(dialog.getByRole('button', { name: 'Save schedule', exact: true })).toBeDisabled();
});

test('save rejection preserves the draft and associates the server error with its field', async ({ page }) => {
  const dialog = await openSchedule(page);
  await dialog.getByLabel(/^Name/).fill('My retained schedule');
  await dialog.getByRole('button', { name: 'Frequency', exact: true }).click();
  await page.getByRole('option', { name: 'Custom cron', exact: true }).click();
  await dialog.getByRole('button', { name: 'Save schedule', exact: true }).click();
  await expect(dialog.getByText('Review this cadence before saving.', { exact: true })).toBeVisible({ timeout: 3_000 });
  await expect(dialog.getByLabel(/^Name/)).toHaveValue('My retained schedule');
  await expect(dialog.getByLabel(/Cron expression/)).toHaveAttribute('aria-invalid', 'true');
});
