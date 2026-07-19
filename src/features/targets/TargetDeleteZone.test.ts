import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const targetDeleteZone = readFileSync(resolve(root, 'src/features/targets/TargetDeleteZone.tsx'), 'utf8');

describe('TargetDeleteZone', () => {
  it('keeps the standing surface neutral and requires explicit typed confirmation', () => {
    expect(targetDeleteZone).toContain("import { DangerZone, DangerZoneRow } from '@/components/common/DangerZone';");
    expect(targetDeleteZone).toContain('tone="danger"');
    expect(targetDeleteZone).toContain('confirmation !== targetName');
    expect(targetDeleteZone).toContain('disabled={isDeleting || confirmation !== targetName}');
    expect(targetDeleteZone).toContain('initialFocusRef={inputRef}');
    expect(targetDeleteZone).toContain('closeDisabled={isDeleting}');
  });

  it('formats API failures and keeps strong danger color inside the active dialog', () => {
    expect(targetDeleteZone).toContain('formatControlPlaneError(cause, errorFallback, { area: errorArea })');
    expect(targetDeleteZone).toContain('role="alert"');
    expect(targetDeleteZone).toContain('bg-status-danger-soft');
    expect(targetDeleteZone).toContain('variant="danger"');
  });
});
