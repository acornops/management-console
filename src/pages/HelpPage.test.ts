import { describe, expect, it } from 'vitest';
import { DEFAULT_HELP_LINKS, resolveHelpLinks } from './HelpPage';

describe('HelpPage links', () => {
  it('uses configured safe destinations', () => {
    expect(resolveHelpLinks({
      documentationUrl: 'https://docs.example.com/platform',
      supportUrl: 'mailto:support@example.com'
    })).toEqual({
      documentationUrl: 'https://docs.example.com/platform',
      supportUrl: 'mailto:support@example.com'
    });
  });

  it('preserves product defaults for missing or unsafe rolling-upgrade values', () => {
    expect(resolveHelpLinks()).toEqual(DEFAULT_HELP_LINKS);
    expect(resolveHelpLinks({
      documentationUrl: 'javascript:alert(1)',
      supportUrl: 'https://user:secret@support.example.com'
    })).toEqual(DEFAULT_HELP_LINKS);
  });
});
