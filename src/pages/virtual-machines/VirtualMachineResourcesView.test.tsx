import { renderToStaticMarkup } from 'react-dom/server';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/i18n/locales/en.js';
import { zh } from '@/i18n/locales/zh.js';
import { VirtualMachineResourcesView } from './VirtualMachineResourcesView';

vi.mock('@/utils/dateTime', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/utils/dateTime')>(),
  getUserTimeZone: () => 'Asia/Singapore'
}));

async function renderLog(timestamp: string, language = 'en'): Promise<string> {
  const translation = createInstance();
  await translation.init({ resources: { en: { translation: en }, zh: { translation: zh } }, lng: language });
  return renderToStaticMarkup(
    <I18nextProvider i18n={translation}>
      <VirtualMachineResourcesView
        vmName="Production VM"
        activeCategory="logs"
        inventory={[]}
        logs={[{ timestamp, source: 'journald', unit: 'worker.service', message: 'first line\nsecond line' }]}
        isLoading={false}
        error={null}
        isLogsLoading={false}
        logsError={null}
        onCategoryChange={vi.fn()}
        onRetry={vi.fn()}
      />
    </I18nextProvider>
  );
}

describe('VM log timestamps', () => {
  it.each([
    { language: 'en', date: 'Jul 15, 2026', time: '4:30 PM GMT+8' },
    { language: 'zh', date: '2026年7月15日', time: 'GMT+8 16:30' }
  ])('shows localized date and zoned time separately in $language', async ({ language, date, time }) => {
    const html = await renderLog('2026-07-15T10:30:00.123456+02:00', language);

    expect(html).toContain('dateTime="2026-07-15T10:30:00.123456+02:00"');
    expect(html).toContain(`>${date}</span>`);
    expect(html).toContain(`>${time}</span>`);
    expect(html).toContain('journald / worker.service');
    expect(html).toContain('first line\nsecond line');
  });

  it.each(['', 'invalid'])('shows one unknown label without inventing a time for %j', async (timestamp) => {
    const html = await renderLog(timestamp);

    expect(html.match(/Timestamp unknown/g)).toHaveLength(1);
    expect(html).not.toContain('<time');
    expect(html).toContain('journald / worker.service');
    expect(html).toContain('first line\nsecond line');
  });
});
