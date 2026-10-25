import { expect, test } from '@playwright/test';

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test.describe(`connect dialog motion (${reducedMotion})`, () => {
    test.use({ reducedMotion });

    for (const target of [
      { path: 'kubernetes-clusters', name: 'Connect Cluster', input: 'Cluster Name' },
      { path: 'virtual-machines', name: 'Connect VM', input: 'VM name' }
    ]) {
      test(`${target.name} stays visible through the animation handoff`, async ({ page }) => {
        await page.goto(`/workspaces/fixture-workspace/${target.path}`);
        const trigger = page.getByRole('button', { name: target.name, exact: true });
        await expect(trigger).toBeVisible();

        // Exercise both the first opening and a repeat opening with loaded code.
        for (let opening = 0; opening < 2; opening += 1) {
          const [opacities] = await Promise.all([
            page.evaluate(() => new Promise<number[]>((resolve) => {
              const startedAt = performance.now();
              let appearedAt: number | undefined;
              const samples: number[] = [];
              const sample = () => {
                const now = performance.now();
                const dialog = document.querySelector('[role="dialog"]');
                if (dialog) {
                  appearedAt ??= now;
                  let opacity = 1;
                  // A transparent ancestor also hides an otherwise opaque panel.
                  for (let element: Element | null = dialog; element; element = element.parentElement) {
                    opacity *= Number(getComputedStyle(element).opacity);
                  }
                  samples.push(opacity);
                } else if (appearedAt !== undefined) {
                  samples.push(0);
                }
                // Keep sampling beyond the entrance so the final style handoff is covered.
                if ((appearedAt !== undefined && now - appearedAt >= 700) || now - startedAt >= 5_000) {
                  resolve(samples);
                } else {
                  requestAnimationFrame(sample);
                }
              };
              requestAnimationFrame(sample);
            })),
            trigger.click()
          ]);

          expect(opacities.length).toBeGreaterThan(1);
          expect(opacities.at(-1)).toBeCloseTo(1);
          const drops = opacities.filter((opacity, index) => index > 0 && opacity < opacities[index - 1] - 0.05);
          expect(drops, 'An opening dialog must not fade out again when its animation finishes').toEqual([]);

          const dialog = page.getByRole('dialog', { name: target.name, exact: true });
          await expect(dialog.getByRole('textbox', { name: target.input, exact: true })).toBeFocused();
          await page.keyboard.press('Escape');
          await expect(dialog).toBeHidden();
          await expect(trigger).toBeFocused();
        }
      });
    }
  });
}
