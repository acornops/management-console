import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const chatComposer = readFileSync(
  resolve(__dirname, 'features/targets/chat/components/TargetChatComposer.tsx'),
  'utf8'
);

describe('chat composer focus contract', () => {
  it('keeps focus on the shared composer surface without outlining its textarea', () => {
    expect(chatComposer).toContain(
      'focus-within:border-accent/45 focus-within:ring-2 focus-within:ring-accent/10'
    );
    expect(chatComposer).toContain(
      'shadow-none outline-none placeholder:text-ui-text-muted/60 hover:bg-transparent focus:bg-transparent focus:ring-0'
    );
  });
});
