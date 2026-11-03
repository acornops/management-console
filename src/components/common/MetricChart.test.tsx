import { renderToStaticMarkup } from 'react-dom/server';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/locales/en.js';
import { MetricChart } from './MetricChart';

async function renderChart(values: number[], unit = 'cores', language = 'en-US') {
  const i18n = createInstance();
  await i18n.init({ resources: { en: { translation: en } }, lng: language, fallbackLng: 'en' });
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <MetricChart title="CPU" description="Recent samples" icon={() => null}
        points={values.map((value, index) => ({ label: `Sample ${index + 1}`, value }))}
        unit={unit} type="line" emptyTitle="No samples" loadingTitle="Loading samples"
        emptyDescription="Waiting for samples" />
    </I18nextProvider>
  );
}

function readTicks(html: string) {
  return [...html.matchAll(/<g><line[^>]* y1="([^"]+)"[^>]*><\/line><text[^>]*>([^<]+)<\/text><\/g>/g)]
    .map((match) => ({ y: Number(match[1]), label: match[2] }));
}

describe('MetricChart y-axis', () => {
  it.each([
    { name: 'zero values', value: 0, unit: 'cores', labels: ['0', '0.25 cores', '0.5 cores', '0.75 cores', '1 cores'] },
    { name: 'small positive values', value: 0.0001, unit: 'cores', labels: ['0', '0.25 cores', '0.5 cores', '0.75 cores', '1 cores'] },
    { name: 'fractional CPU cores', value: 0.81, unit: 'cores', labels: ['0', '0.25 cores', '0.5 cores', '0.75 cores', '1 cores'] },
    { name: 'memory near one GiB', value: 0.96, unit: 'GiB', labels: ['0', '0.5 GiB', '1 GiB', '1.5 GiB'] },
    { name: 'fractional ticks on a larger scale', value: 8, unit: 'cores', labels: ['0', '2.5 cores', '5 cores', '7.5 cores', '10 cores'] },
    { name: 'percentages', value: 61.5, unit: '%', labels: ['0', '20%', '40%', '60%', '80%'] },
    { name: 'percentages above 100', value: 151.5, unit: '%', labels: ['0', '50%', '100%', '150%', '200%'] },
    { name: 'large ranges', value: 12345, unit: '', labels: ['0', '5,000', '10,000', '15,000'] },
  ])('uses readable, exact gridline labels for $name', async ({ value, unit, labels }) => {
    const html = await renderChart([0, value], unit);
    const ticks = readTicks(html);
    expect(ticks.map((tick) => tick.label)).toEqual(labels);

    const tickValues = labels.map((label) => Number.parseFloat(label.replaceAll(',', '')));
    const maximum = tickValues.at(-1)!;
    const bottom = ticks[0].y;
    const plotHeight = bottom - ticks.at(-1)!.y;
    expect(maximum).toBeGreaterThanOrEqual(Math.max(value * 1.12, 1));
    for (const [index, tick] of ticks.entries()) {
      expect((bottom - tick.y) / plotHeight).toBeCloseTo(tickValues[index] / maximum, 10);
    }
    const pointY = [...html.matchAll(/<circle[^>]* cy="([^"]+)"/g)].map((match) => Number(match[1]));
    expect(pointY).toHaveLength(2);
    expect(pointY[0]).toBe(bottom);
    expect((bottom - pointY[1]) / plotHeight).toBeCloseTo(value / maximum, 10);
  });

  it('formats fractional ticks with the current locale', async () => {
    const html = await renderChart([0.5, 0.81], 'cores', 'de-DE');
    expect(readTicks(html).map((tick) => tick.label)).toEqual([
      '0', '0,25 cores', '0,5 cores', '0,75 cores', '1 cores',
    ]);
  });

  it('preserves sample values in the accessible table', async () => {
    const html = await renderChart([0.73, 0.81]);
    const table = html.match(/<table[\s\S]*<\/table>/)?.[0];
    expect(table).toContain('CPU data');
    expect(table).toContain('>Sample 1<');
    expect(table).toContain('>0.73 cores<');
    expect(table).toContain('>Sample 2<');
    expect(table).toContain('>0.81 cores<');
  });
});
