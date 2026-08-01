import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';

import { en } from './locales/en.js';

describe('catalog status translations', () => {
  it('keeps warning and finding counts visible with correct English plurals', async () => {
    const translation = createInstance();
    await translation.init({
      resources: { en: { translation: en } },
      lng: 'en'
    });

    expect(translation.t('dashboard.warningStatus', { count: 1 })).toBe('1 warning');
    expect(translation.t('dashboard.warningStatus', { count: 3 })).toBe('3 warnings');
    expect(translation.t('dashboard.findingStatus', { count: 3 })).toBe('3 findings');
    expect(translation.t('virtualMachines.list.vmStateWarningIssues', { count: 3 })).toBe('3 warning issues need review.');
    expect(translation.t('dashboard.clusterStateWarningIssues', { count: 3 })).toBe('3 warning issues need review.');
  });
});
