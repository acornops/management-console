import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const mobileNavigation = readFileSync(resolve(root, 'src/app/AppMobileNavigation.tsx'), 'utf8');

describe('mobile navigation structure', () => {
  it('uses named sections instead of vague More groups', () => {
    expect(mobileNavigation).not.toContain("t('app.more')");
    expect(mobileNavigation).toContain("t('app.primaryDestinations')");
    expect(mobileNavigation).toContain("t('app.workspaceAdministration')");
    expect(mobileNavigation).toContain("['mcpServers', t('app.mcpServers'), ICONS.Server, 0]");
    expect(mobileNavigation).toContain("['settings', t('app.clusterSettings'), ICONS.Settings, 0]");
  });

  it('uses the shared dialog behavior for the open navigation panel', () => {
    expect(mobileNavigation).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(mobileNavigation).toContain('const mobileNavButtonRef = React.useRef<HTMLButtonElement>(null);');
    expect(mobileNavigation).toContain('const mobileNavCloseButtonRef = React.useRef<HTMLButtonElement>(null);');
    expect(mobileNavigation).toContain('<Dialog');
    expect(mobileNavigation).toContain('titleId={mobileNavTitleId}');
    expect(mobileNavigation).toContain('initialFocusRef={mobileNavCloseButtonRef}');
    expect(mobileNavigation).not.toContain('onMouseDown={() => onSetMobileNavOpen(false)}');
  });

  it('keeps mobile drawer controls as flat scan groups with large touch targets', () => {
    expect(mobileNavigation).toContain("min-h-11");
    expect(mobileNavigation).not.toContain('<details');
    expect(mobileNavigation).not.toContain('<summary');
    expect(mobileNavigation).toContain("t('app.workspaceContext')");
    expect(mobileNavigation).toContain("t('app.userSettings')");
    expect(mobileNavigation).toContain("{t('app.auditLog')}");
    expect(mobileNavigation).toContain("{t('app.aiSettings')}");
    expect(mobileNavigation).toContain("{t('app.workspaceSettings')}");
    expect(mobileNavigation).toContain("{hasWorkspaceDataAccess && (\n                            <button\n                              type=\"button\"\n                              onClick={() => {\n                                onSetMobileNavOpen(false);\n                                selectedWorkspaceId && navigate(AppPaths.workspaceAiSettings(selectedWorkspaceId));");
    expect(mobileNavigation.indexOf("{t('app.auditLog')}")).toBeLessThan(
      mobileNavigation.indexOf("{t('app.aiSettings')}")
    );
    expect(mobileNavigation.indexOf("{t('app.aiSettings')}")).toBeLessThan(
      mobileNavigation.indexOf("{t('app.workspaceSettings')}")
    );
  });

  it('links virtual machines between clusters and investigations', () => {
    expect(mobileNavigation).toContain("t('app.virtualMachines')");
    expect(mobileNavigation).toContain("['virtualMachines', t('app.virtualMachines'), AppPaths.workspaceVirtualMachines, 0]");
    expect(mobileNavigation).not.toContain("title={t('app.virtualMachinesTooltip')}");
    expect(mobileNavigation.indexOf("['clusters', t('app.clusters')")).toBeLessThan(
      mobileNavigation.indexOf("t('app.virtualMachines')")
    );
    expect(mobileNavigation.indexOf("t('app.virtualMachines')")).toBeLessThan(
      mobileNavigation.indexOf("['investigations', t('app.investigations')")
    );
  });
});
