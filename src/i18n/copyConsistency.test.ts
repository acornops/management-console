import { describe, expect, it } from 'vitest';
import { en } from './locales/en.js';
import { zh } from './locales/zh.js';

function stringEntries(value: unknown, path = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[path, value]];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => stringEntries(child, path ? `${path}.${key}` : key));
}

describe('interface copy consistency', () => {
  it('uses a typographic ellipsis instead of three full stops', () => {
    for (const [locale, messages] of [['en', en], ['zh', zh]] as const) {
      const offenders = stringEntries(messages).filter(([, value]) => value.includes('...'));
      expect(offenders, `${locale} strings with ASCII ellipses`).toEqual([]);
    }
  });

  it('keeps input and search placeholders free of terminal punctuation', () => {
    for (const [locale, messages] of [['en', en], ['zh', zh]] as const) {
      const offenders = stringEntries(messages).filter(([path, value]) => /placeholder/i.test(path) && /[.…。！!?？]$/.test(value));
      expect(offenders, `${locale} punctuated placeholders`).toEqual([]);
    }
  });

  it('names the workspace settings route consistently', () => {
    expect(en.app.workspaceSettings).toBe(en.settingsPage.title);
    expect(zh.app.workspaceSettings).toBe(zh.settingsPage.title);
    expect(en.app.backToWorkspace).toBe('Back to workspace');
  });
});
